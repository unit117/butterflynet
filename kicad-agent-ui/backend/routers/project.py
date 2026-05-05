import json
import subprocess

from fastapi import APIRouter, HTTPException

from ..config import PROJECTS, TOOLS_DIR, get_kicad_cli
from ..models import ProjectInfo

router = APIRouter()


@router.get("/list")
def list_projects() -> list[ProjectInfo]:
    out = []
    for pid, proj in PROJECTS.items():
        out.append(
            ProjectInfo(
                id=pid,
                name=proj["name"],
                path=str(proj["path"]),
                schematic=proj["schematic"],
                pcb=proj["pcb"],
                status=proj["status"],
                model=proj.get("model"),
            )
        )
    return out


@router.get("/{project_id}/info")
def project_info(project_id: str):
    proj = PROJECTS.get(project_id)
    if not proj:
        raise HTTPException(404, f"Unknown project: {project_id}")

    pcb_path = proj["path"] / proj["pcb"]
    if not pcb_path.exists():
        raise HTTPException(404, f"PCB file not found: {pcb_path}")

    result = subprocess.run(
        ["python3", str(TOOLS_DIR / "pcb_architect.py"), "info", str(pcb_path)],
        capture_output=True,
        text=True,
        timeout=30,
    )
    return {
        "project": ProjectInfo(
            id=project_id,
            name=proj["name"],
            path=str(proj["path"]),
            schematic=proj["schematic"],
            pcb=proj["pcb"],
            status=proj["status"],
            model=proj.get("model"),
        ),
        "board_info": result.stdout,
        "error": result.stderr if result.returncode != 0 else None,
    }


@router.get("/{project_id}/drc")
def get_drc(project_id: str):
    proj = PROJECTS.get(project_id)
    if not proj:
        raise HTTPException(404, f"Unknown project: {project_id}")

    drc_candidates = [
        proj["path"] / "outputs" / f"{proj['pcb'].replace('.kicad_pcb', '')}-drc.json",
        proj["path"] / "outputs" / "candle-drc.json",
    ]
    for drc_path in drc_candidates:
        if drc_path.exists():
            return json.loads(drc_path.read_text())

    return {"status": "no_drc_data", "violations": None}


@router.get("/{project_id}/erc")
def get_erc(project_id: str):
    proj = PROJECTS.get(project_id)
    if not proj:
        raise HTTPException(404, f"Unknown project: {project_id}")

    erc_candidates = [
        proj["path"] / "outputs" / f"{proj['pcb'].replace('.kicad_pcb', '')}-erc.json",
        proj["path"] / "outputs" / "candle-erc.json",
    ]
    for erc_path in erc_candidates:
        if erc_path.exists():
            return json.loads(erc_path.read_text())

    return {"status": "no_erc_data", "errors": None}


@router.get("/{project_id}/components")
def get_components(project_id: str):
    proj = PROJECTS.get(project_id)
    if not proj:
        raise HTTPException(404, f"Unknown project: {project_id}")

    pcb_path = proj["path"] / proj["pcb"]
    if not pcb_path.exists():
        raise HTTPException(404, f"PCB file not found: {pcb_path}")

    result = subprocess.run(
        [
            "python3",
            str(TOOLS_DIR / "pcb_architect.py"),
            "parse",
            str(pcb_path),
            "--json",
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )

    if result.returncode != 0:
        return {"error": result.stderr, "components": []}

    try:
        data = json.loads(result.stdout)
        return {"components": data.get("footprints", [])}
    except json.JSONDecodeError:
        return {"raw": result.stdout, "components": []}
