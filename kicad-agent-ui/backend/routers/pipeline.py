from __future__ import annotations

import json
import os
import shutil
import signal
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException

from ..config import PROJECTS, RUNS_DIR, TOOLS_DIR, get_kicad_cli
from ..models import RunStatus

router = APIRouter()

_runs: dict[str, dict] = {}


def _create_run(project_id: str, action: str) -> dict:
    proj = PROJECTS.get(project_id)
    if not proj:
        raise HTTPException(404, f"Unknown project: {project_id}")

    run_id = uuid.uuid4().hex[:12]
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True)

    src = proj["path"]
    work = run_dir / "project"
    shutil.copytree(src, work, dirs_exist_ok=True)

    run = {
        "id": run_id,
        "project_id": project_id,
        "action": action,
        "status": RunStatus.PENDING,
        "work_dir": str(work),
        "created": datetime.now(timezone.utc).isoformat(),
        "events": [],
        "result": None,
    }
    _runs[run_id] = run
    return run


def _add_event(run: dict, event: str, detail: str = "", data: Optional[dict] = None):
    entry = {
        "event": event,
        "detail": detail,
        "data": data,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    run["events"].append(entry)


def _run_subprocess(cmd: list[str], cwd: str, timeout: int = 120, env: Optional[dict] = None) -> dict:
    full_env = os.environ.copy()
    if env:
        full_env.update(env)
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd,
            env=full_env,
        )
        crashed = result.returncode < 0
        sig_name = None
        if crashed:
            try:
                sig_name = signal.Signals(-result.returncode).name
            except (ValueError, AttributeError):
                sig_name = f"signal_{-result.returncode}"

        return {
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "crashed": crashed,
            "signal": sig_name,
        }
    except subprocess.TimeoutExpired:
        return {
            "returncode": -1,
            "stdout": "",
            "stderr": "timeout",
            "crashed": True,
            "signal": "TIMEOUT",
        }


@router.post("/{project_id}/drc")
def run_drc(project_id: str):
    run = _create_run(project_id, "drc")
    run["status"] = RunStatus.RUNNING
    _add_event(run, "started", f"DRC on {project_id}")

    proj = PROJECTS[project_id]
    work_dir = run["work_dir"]
    pcb_path = Path(work_dir) / proj["pcb"]
    kicad_cli = get_kicad_cli()

    out_dir = Path(work_dir) / "outputs"
    out_dir.mkdir(exist_ok=True)
    drc_json = out_dir / "drc.json"

    _add_event(run, "tool_called", f"kicad-cli pcb drc {pcb_path.name}")

    result = _run_subprocess(
        [kicad_cli, "pcb", "drc", "--format", "json", "--severity-all", "-o", str(drc_json), str(pcb_path)],
        cwd=work_dir,
        timeout=60,
    )

    if result["crashed"]:
        run["status"] = RunStatus.CRASH
        _add_event(run, "crashed", f"DRC crashed: {result.get('signal', 'unknown')}")
        run["result"] = {"status": "crash", "signal": result["signal"], "stderr": result["stderr"][:500]}
        return run

    if drc_json.exists():
        drc_data = json.loads(drc_json.read_text())
        violations = len(drc_data.get("violations", []))
        unconnected = len(drc_data.get("unconnected_items", []))
        shorting = len(drc_data.get("shorting_items", []))

        breakdown = {}
        for v in drc_data.get("violations", []):
            vtype = v.get("type", "unknown")
            breakdown[vtype] = breakdown.get(vtype, 0) + 1

        status = RunStatus.PASS if violations == 0 and unconnected == 0 else RunStatus.FAIL
        _add_event(run, "drc_complete", f"{violations} violations, {unconnected} unconnected")

        run["status"] = status
        run["result"] = {
            "status": status.value,
            "violations": violations,
            "unconnected": unconnected,
            "shorting": shorting,
            "breakdown": breakdown,
        }
    else:
        run["status"] = RunStatus.BLOCKED
        _add_event(run, "drc_complete", "DRC completed but no output file")
        run["result"] = {"status": "blocked", "stderr": result["stderr"][:500]}

    return run


@router.post("/{project_id}/erc")
def run_erc(project_id: str):
    run = _create_run(project_id, "erc")
    run["status"] = RunStatus.RUNNING
    _add_event(run, "started", f"ERC on {project_id}")

    proj = PROJECTS[project_id]
    work_dir = run["work_dir"]
    sch_path = Path(work_dir) / proj["schematic"]
    kicad_cli = get_kicad_cli()

    out_dir = Path(work_dir) / "outputs"
    out_dir.mkdir(exist_ok=True)
    erc_json = out_dir / "erc.json"

    _add_event(run, "tool_called", f"kicad-cli sch erc {sch_path.name}")

    result = _run_subprocess(
        [kicad_cli, "sch", "erc", "--format", "json", "--severity-all", "-o", str(erc_json), str(sch_path)],
        cwd=work_dir,
        timeout=60,
    )

    if result["crashed"]:
        run["status"] = RunStatus.CRASH
        _add_event(run, "crashed", f"ERC crashed: {result.get('signal', 'unknown')}")
        run["result"] = {"status": "crash", "signal": result["signal"]}
        return run

    if erc_json.exists():
        erc_data = json.loads(erc_json.read_text())
        sheets = erc_data.get("sheets", [])
        errors = sum(
            1 for s in sheets for v in s.get("violations", []) if v.get("severity") == "error"
        )
        warnings = sum(
            1 for s in sheets for v in s.get("violations", []) if v.get("severity") == "warning"
        )

        status = RunStatus.PASS if errors == 0 else RunStatus.FAIL
        _add_event(run, "erc_complete", f"{errors} errors, {warnings} warnings")

        run["status"] = status
        run["result"] = {"status": status.value, "errors": errors, "warnings": warnings}
    else:
        run["status"] = RunStatus.BLOCKED
        run["result"] = {"status": "blocked", "stderr": result["stderr"][:500]}

    return run


@router.post("/{project_id}/validate")
def run_validate(project_id: str):
    run = _create_run(project_id, "validate")
    run["status"] = RunStatus.RUNNING
    _add_event(run, "started", f"PCB validate on {project_id}")

    proj = PROJECTS[project_id]
    work_dir = run["work_dir"]
    pcb_path = Path(work_dir) / proj["pcb"]

    _add_event(run, "tool_called", f"pcb_architect.py validate {pcb_path.name}")

    result = _run_subprocess(
        ["python3", str(TOOLS_DIR / "pcb_architect.py"), "validate", str(pcb_path)],
        cwd=work_dir,
    )

    run["status"] = RunStatus.PASS if result["returncode"] == 0 else RunStatus.FAIL
    _add_event(run, "validate_complete", result["stdout"][:500])
    run["result"] = {
        "status": run["status"].value,
        "output": result["stdout"],
        "error": result["stderr"] if result["returncode"] != 0 else None,
    }
    return run


@router.post("/{project_id}/export")
def run_export(project_id: str):
    run = _create_run(project_id, "export")
    run["status"] = RunStatus.RUNNING
    _add_event(run, "started", f"Fab export on {project_id}")

    proj = PROJECTS[project_id]
    work_dir = run["work_dir"]
    pcb_path = Path(work_dir) / proj["pcb"]
    fab_dir = Path(work_dir) / "outputs" / "fab"
    fab_dir.mkdir(parents=True, exist_ok=True)

    fab_profile = Path("/Users/unit117/Dev/kicad-test/portable-kit/constraints/fab_profile_jlcpcb.json")

    _add_event(run, "tool_called", f"pcb_architect.py export {pcb_path.name}")

    result = _run_subprocess(
        [
            "python3",
            str(TOOLS_DIR / "pcb_architect.py"),
            "export",
            str(pcb_path),
            str(fab_profile),
            "-o",
            str(fab_dir),
            "--mode",
            "full",
        ],
        cwd=work_dir,
        timeout=120,
    )

    if result["returncode"] != 0:
        run["status"] = RunStatus.FAIL
        _add_event(run, "export_failed", result["stderr"][:500])
        run["result"] = {"status": "fail", "error": result["stderr"][:500]}
        return run

    artifacts = [f.name for f in fab_dir.iterdir()] if fab_dir.exists() else []
    _add_event(run, "export_ready", f"{len(artifacts)} artifacts")
    run["status"] = RunStatus.PASS
    run["result"] = {"status": "pass", "artifacts": artifacts, "output": result["stdout"][:500]}
    return run


@router.post("/{project_id}/full-pipeline")
def run_full_pipeline(project_id: str):
    run = _create_run(project_id, "full-pipeline")
    run["status"] = RunStatus.RUNNING
    _add_event(run, "started", f"Full pipeline on {project_id}")

    proj = PROJECTS[project_id]
    work_dir = run["work_dir"]
    pcb_path = Path(work_dir) / proj["pcb"]
    kicad_cli = get_kicad_cli()

    pcb_base = proj.get("pcb_base")
    routing_json_rel = proj.get("routing_json")

    # Step 1: Copy base board to working copy (fresh unrouted state)
    if pcb_base:
        base_path = Path(work_dir) / pcb_base
        if base_path.exists():
            shutil.copy2(str(base_path), str(pcb_path))
            _add_event(run, "artifact_written", f"Copied {pcb_base} -> {proj['pcb']}")
        else:
            _add_event(run, "tool_called", f"Base board not found: {pcb_base}")

    # Step 2: Route
    if routing_json_rel:
        routing_path = Path(work_dir) / routing_json_rel
        if routing_path.exists():
            _add_event(run, "tool_called", f"pcb_architect.py route {proj['pcb']}")
            result = _run_subprocess(
                ["python3", str(TOOLS_DIR / "pcb_architect.py"), "route",
                 str(pcb_path), str(routing_path), "--execute"],
                cwd=work_dir,
            )
            if result["returncode"] != 0:
                run["status"] = RunStatus.FAIL
                _add_event(run, "route_failed", result["stderr"][:300])
                run["result"] = {"status": "fail", "stage": "route", "error": result["stderr"][:300]}
                return run

            import re
            seg_match = re.search(r"Added:\s*(\d+)\s*segments", result["stdout"])
            via_match = re.search(r"(\d+)\s*vias", result["stdout"])
            segments = int(seg_match.group(1)) if seg_match else 0
            vias = int(via_match.group(1)) if via_match else 0
            _add_event(run, "route_complete", f"{segments} segments, {vias} vias")

    # Step 3: DRC
    out_dir = Path(work_dir) / "outputs"
    out_dir.mkdir(exist_ok=True)
    drc_json = out_dir / "drc.json"

    _add_event(run, "tool_called", f"kicad-cli pcb drc {proj['pcb']}")
    result = _run_subprocess(
        [kicad_cli, "pcb", "drc", "--format", "json", "--severity-all",
         "-o", str(drc_json), str(pcb_path)],
        cwd=work_dir,
        timeout=60,
    )

    if result["crashed"]:
        run["status"] = RunStatus.CRASH
        _add_event(run, "crashed", f"DRC crashed: {result.get('signal', 'unknown')}")
        run["result"] = {"status": "crash", "stage": "drc", "signal": result["signal"]}
        return run

    violations = 0
    unconnected = 0
    breakdown = {}
    if drc_json.exists():
        drc_data = json.loads(drc_json.read_text())
        violations = len(drc_data.get("violations", []))
        unconnected = len(drc_data.get("unconnected_items", []))
        for v in drc_data.get("violations", []):
            vtype = v.get("type", "unknown")
            breakdown[vtype] = breakdown.get(vtype, 0) + 1

    _add_event(run, "drc_complete", f"{violations} violations, {unconnected} unconnected")

    # Step 4: Export fab
    fab_dir = Path(work_dir) / "outputs" / "fab"
    fab_dir.mkdir(parents=True, exist_ok=True)
    fab_profile = Path("/Users/unit117/Dev/kicad-test/portable-kit/constraints/fab_profile_jlcpcb.json")

    _add_event(run, "tool_called", f"pcb_architect.py export {proj['pcb']}")
    result = _run_subprocess(
        ["python3", str(TOOLS_DIR / "pcb_architect.py"), "export",
         str(pcb_path), str(fab_profile), "-o", str(fab_dir), "--mode", "full"],
        cwd=work_dir,
        timeout=120,
    )

    artifacts = []
    if result["returncode"] == 0 and fab_dir.exists():
        artifacts = sorted(f.name for f in fab_dir.iterdir())
        _add_event(run, "export_ready", f"{len(artifacts)} artifacts")
    else:
        _add_event(run, "export_failed", result["stderr"][:300])

    drc_pass = violations == 0 and unconnected == 0
    run["status"] = RunStatus.PASS if drc_pass else RunStatus.FAIL
    run["result"] = {
        "status": run["status"].value,
        "violations": violations,
        "unconnected": unconnected,
        "shorting": 0,
        "breakdown": breakdown,
        "artifacts": artifacts,
    }
    return run


@router.post("/{project_id}/regression")
def run_regression(project_id: str):
    run = _create_run(project_id, "regression")
    run["status"] = RunStatus.RUNNING
    _add_event(run, "started", "Running regression suite")

    _add_event(run, "tool_called", "regress.py")

    result = _run_subprocess(
        ["python3", str(TOOLS_DIR / "regress.py")],
        cwd=str(TOOLS_DIR.parent),
        timeout=300,
    )

    run["status"] = RunStatus.PASS if result["returncode"] == 0 else RunStatus.FAIL
    _add_event(run, "regression_complete", f"exit code {result['returncode']}")
    run["result"] = {
        "status": run["status"].value,
        "output": result["stdout"][-2000:],
        "error": result["stderr"][-1000:] if result["returncode"] != 0 else None,
    }
    return run


@router.get("/runs")
def list_runs():
    return [
        {
            "id": r["id"],
            "project_id": r["project_id"],
            "action": r["action"],
            "status": r["status"].value if isinstance(r["status"], RunStatus) else r["status"],
            "created": r["created"],
            "event_count": len(r["events"]),
        }
        for r in reversed(list(_runs.values()))
    ]


@router.get("/runs/{run_id}")
def get_run(run_id: str):
    run = _runs.get(run_id)
    if not run:
        raise HTTPException(404, f"Unknown run: {run_id}")
    out = dict(run)
    if isinstance(out["status"], RunStatus):
        out["status"] = out["status"].value
    return out
