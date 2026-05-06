#!/usr/bin/env python3
"""Candle PCB recovery wrapper around the repo's KiCad CLI-Anything harness.

This keeps board cleanup iterations measurable:
- optionally regenerate the board
- capture full DRC via the KiCad harness
- compute DRC diff against a saved baseline
- extract track-crossing hotspots
- write a single machine-readable recovery summary for each run
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from shutil import which


PROJECT_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = PROJECT_DIR.parent
OUTPUTS_DIR = PROJECT_DIR / "outputs"
RECOVERY_DIR = OUTPUTS_DIR / "recovery"
BOARD_PATH = PROJECT_DIR / "candle.kicad_pcb"
SCHEMATIC_PATH = PROJECT_DIR / "candle.kicad_sch"
GENERATOR = PROJECT_DIR / "tools" / "generate_candle.py"
CLI_HARNESS_ROOT = REPO_ROOT / "CLI-Anything" / "kicad" / "agent-harness"
HARNESS_PYTHONPATH = str(CLI_HARNESS_ROOT)
HARNESS_MODULE = "cli_anything.kicad.kicad_cli"
KICAD_CLI_PATH = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"

KICAD_PYTHON = Path(
    "/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3"
)
KICAD_PYTHONPATH = "/Applications/KiCad/KiCad.app/Contents/Frameworks/python/site-packages"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(cmd: list[str], *, cwd: Path | None = None, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(cmd, cwd=cwd, env=env, text=True, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed: {' '.join(cmd)}\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )
    return result


def run_generator() -> list[str]:
    env = os.environ.copy()
    env["PYTHONPATH"] = KICAD_PYTHONPATH
    result = run([str(KICAD_PYTHON), str(GENERATOR)], cwd=PROJECT_DIR, env=env)
    return result.stdout.strip().splitlines()


def harness_command() -> list[str]:
    installed = which("cli-anything-kicad")
    if installed:
        return [installed]
    return ["python3", "-m", HARNESS_MODULE]


def run_harness_json(*args: str) -> dict:
    env = os.environ.copy()
    env["PYTHONPATH"] = HARNESS_PYTHONPATH
    env["KICAD_CLI_PATH"] = KICAD_CLI_PATH
    result = run([*harness_command(), "--json", *args], cwd=CLI_HARNESS_ROOT, env=env)
    return json.loads(result.stdout)


def summarize_crossings(crossings: dict, limit: int = 12) -> list[dict]:
    groups = crossings.get("groups", [])
    return [
        {
            "net_pair": group.get("net_pair"),
            "count": group.get("count"),
            "layers": group.get("layers", []),
        }
        for group in groups[:limit]
    ]


def write_report(path: Path, summary: dict) -> None:
    lines = [
        f"# Candle Recovery Report: {summary['label']}",
        "",
        f"- Timestamp: `{summary['timestamp_utc']}`",
        f"- Board SHA256: `{summary['board_sha256']}`",
        f"- Generator run: `{summary['generated']}`",
        f"- DRC total: `{summary['drc']['summary']['violations']}`",
        f"- Unconnected items: `{summary['drc']['summary']['unconnected_items']}`",
        "",
        "## Violation Types",
        "",
    ]
    for key, value in summary["drc"].get("violation_types", {}).items():
        lines.append(f"- `{key}`: `{value}`")

    baseline = summary.get("baseline_diff")
    if baseline:
        lines.extend(
            [
                "",
                "## Baseline Delta",
                "",
                f"- Before total: `{baseline['before']['total']}`",
                f"- After total: `{baseline['after']['total']}`",
                f"- Delta total: `{baseline['delta']['total']}`",
                f"- Added: `{baseline['added']['count']}`",
                f"- Resolved: `{baseline['resolved']['count']}`",
            ]
        )

    lines.extend(["", "## Top Crossing Hotspots", ""])
    for hotspot in summary["top_crossings"]:
        layers = ", ".join(hotspot["layers"])
        lines.append(f"- `{hotspot['net_pair']}`: `{hotspot['count']}` crossings on `{layers}`")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def snapshot(label: str, *, generate: bool, baseline_path: Path | None, update_baseline: bool) -> dict:
    run_dir = RECOVERY_DIR / label
    run_dir.mkdir(parents=True, exist_ok=True)

    generator_stdout: list[str] = []
    if generate:
        generator_stdout = run_generator()

    project_info = run_harness_json("project", "info", str(PROJECT_DIR))
    pcb_objects = run_harness_json("pcb", "objects", str(PROJECT_DIR))

    drc_full_path = run_dir / "drc-full.json"
    drc_summary = run_harness_json("pcb", "drc", str(PROJECT_DIR))
    drc_full = run_harness_json("pcb", "drc", "--full", "-o", str(drc_full_path), str(PROJECT_DIR))
    crossings_path = run_dir / "track-crossings.json"
    crossings = run_harness_json("pcb", "track-crossings", "-o", str(crossings_path), str(drc_full_path))

    baseline_diff = None
    if baseline_path is not None and baseline_path.exists():
        baseline_diff = run_harness_json("pcb", "drc", "--diff", str(baseline_path), str(PROJECT_DIR))
        (run_dir / "drc-diff.json").write_text(json.dumps(baseline_diff, indent=2) + "\n", encoding="utf-8")

    summary = {
        "label": label,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "generated": generate,
        "generator_stdout": generator_stdout,
        "board_path": str(BOARD_PATH),
        "schematic_path": str(SCHEMATIC_PATH),
        "board_sha256": sha256(BOARD_PATH),
        "project_info": project_info,
        "pcb_objects": pcb_objects,
        "drc": drc_summary,
        "drc_full_path": str(drc_full_path),
        "track_crossings_path": str(crossings_path),
        "top_crossings": summarize_crossings(crossings),
        "baseline_diff": baseline_diff,
    }

    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    write_report(run_dir / "report.md", summary)

    latest_summary = RECOVERY_DIR / "latest-summary.json"
    latest_report = RECOVERY_DIR / "latest-report.md"
    latest_summary.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    latest_report.write_text((run_dir / "report.md").read_text(encoding="utf-8"), encoding="utf-8")

    if update_baseline:
        baseline_copy = RECOVERY_DIR / "baseline-drc.json"
        shutil.copy2(drc_full_path, baseline_copy)

    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Generate/analyze the board and write a recovery snapshot.")
    run_parser.add_argument("--label", default="manual", help="Recovery snapshot label.")
    run_parser.add_argument("--skip-generate", action="store_true", help="Analyze the current board without regenerating it.")
    run_parser.add_argument(
        "--baseline",
        type=Path,
        default=RECOVERY_DIR / "baseline-drc.json",
        help="Baseline DRC JSON used for diffing.",
    )
    run_parser.add_argument(
        "--set-baseline",
        action="store_true",
        help="After this run, save the current full DRC report as the active baseline.",
    )

    base_parser = subparsers.add_parser("set-baseline", help="Save the current board's DRC as the active baseline.")
    base_parser.add_argument("--label", default="baseline-refresh", help="Snapshot label for the baseline run.")
    base_parser.add_argument("--skip-generate", action="store_true", help="Use the existing board instead of regenerating it.")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    RECOVERY_DIR.mkdir(parents=True, exist_ok=True)

    if args.command == "run":
        summary = snapshot(
            args.label,
            generate=not args.skip_generate,
            baseline_path=args.baseline,
            update_baseline=args.set_baseline,
        )
    else:
        summary = snapshot(
            args.label,
            generate=not args.skip_generate,
            baseline_path=None,
            update_baseline=True,
        )

    print(f"Recovery snapshot: {RECOVERY_DIR / summary['label']}")
    print(f"Board SHA256: {summary['board_sha256']}")
    print(f"DRC total: {summary['drc']['summary']['violations']}")
    print(f"Top crossing hotspot: {summary['top_crossings'][0]['net_pair']} ({summary['top_crossings'][0]['count']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
