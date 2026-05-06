#!/usr/bin/env python3
"""Sample repeated Candle generator runs and keep the best artifact set."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
OUTPUTS_DIR = PROJECT_DIR / "outputs"
BOARD = PROJECT_DIR / "candle.kicad_pcb"
SCHEMATIC = PROJECT_DIR / "candle.kicad_sch"
DRC_JSON = OUTPUTS_DIR / "candle-drc.json"
ERC_JSON = OUTPUTS_DIR / "candle-erc.json"
GENERATOR = PROJECT_DIR / "tools" / "generate_candle.py"
REPORT_JSON = OUTPUTS_DIR / "candle-stability.json"

KICAD_PYTHON = Path(
    "/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3"
)
KICAD_PYTHONPATH = "/Applications/KiCad/KiCad.app/Contents/Frameworks/python/site-packages"


def run_generator() -> str:
    env = os.environ.copy()
    env["PYTHONPATH"] = KICAD_PYTHONPATH
    result = subprocess.run(
        [str(KICAD_PYTHON), str(GENERATOR)],
        cwd=PROJECT_DIR,
        text=True,
        capture_output=True,
        env=env,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Generator failed with exit code {result.returncode}\n"
            f"STDOUT:\n{result.stdout}\n"
            f"STDERR:\n{result.stderr}"
        )
    return result.stdout


def sha256_prefix(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def load_metrics() -> dict[str, object]:
    drc = json.loads(DRC_JSON.read_text())
    erc = json.loads(ERC_JSON.read_text())

    drc_counts: dict[str, int] = {}
    for violation in drc.get("violations", []):
        key = violation.get("type", "unknown")
        drc_counts[key] = drc_counts.get(key, 0) + 1

    erc_total = sum(len(sheet.get("violations", [])) for sheet in erc.get("sheets", []))
    short_descriptions = [
        violation.get("description", "")
        for violation in drc.get("violations", [])
        if violation.get("type") == "shorting_items"
    ]

    return {
        "board_sha": sha256_prefix(BOARD),
        "schematic_sha": sha256_prefix(SCHEMATIC),
        "drc_total": len(drc.get("violations", [])),
        "erc_total": erc_total,
        "unconnected_total": len(drc.get("unconnected_items", [])),
        "drc_counts": drc_counts,
        "short_descriptions": short_descriptions,
    }


def score_metrics(metrics: dict[str, object]) -> tuple[int, ...]:
    drc_counts = metrics["drc_counts"]  # type: ignore[assignment]
    assert isinstance(drc_counts, dict)
    return (
        int(drc_counts.get("shorting_items", 0)),
        int(metrics["unconnected_total"]),
        int(metrics["drc_total"]),
        int(metrics["erc_total"]),
        int(drc_counts.get("clearance", 0)),
        int(drc_counts.get("tracks_crossing", 0)),
        int(drc_counts.get("solder_mask_bridge", 0)),
        int(drc_counts.get("track_dangling", 0)),
    )


def artifact_paths() -> list[Path]:
    return [BOARD, SCHEMATIC, DRC_JSON, ERC_JSON]


def copy_artifacts(destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for path in artifact_paths():
        if path.exists():
            shutil.copy2(path, destination / path.name)


def restore_artifacts(source: Path) -> None:
    OUTPUTS_DIR.mkdir(exist_ok=True)
    for path in artifact_paths():
        source_path = source / path.name
        if source_path.exists():
            shutil.copy2(source_path, path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--runs", type=int, default=8)
    args = parser.parse_args()

    if args.runs < 1:
        raise SystemExit("--runs must be at least 1")

    backup_dir_path = Path(tempfile.mkdtemp(prefix="candle_backup_"))
    best_dir_path = Path(tempfile.mkdtemp(prefix="candle_best_"))

    copy_artifacts(backup_dir_path)

    best_score: tuple[int, ...] | None = None
    best_summary: dict[str, object] | None = None
    run_summaries: list[dict[str, object]] = []

    try:
        for run_index in range(1, args.runs + 1):
            generator_stdout = run_generator().strip()
            metrics = load_metrics()
            score = score_metrics(metrics)
            summary = {
                "run": run_index,
                "score": list(score),
                "board_sha": metrics["board_sha"],
                "schematic_sha": metrics["schematic_sha"],
                "drc_total": metrics["drc_total"],
                "erc_total": metrics["erc_total"],
                "unconnected_total": metrics["unconnected_total"],
                "drc_counts": metrics["drc_counts"],
                "short_descriptions": metrics["short_descriptions"],
                "generator_stdout": generator_stdout.splitlines(),
            }
            run_summaries.append(summary)

            print(
                f"run {run_index}: score={score} "
                f"board={metrics['board_sha']} drc={metrics['drc_total']} "
                f"erc={metrics['erc_total']}"
            )

            if best_score is None or score < best_score:
                best_score = score
                best_summary = summary
                copy_artifacts(best_dir_path)

        if best_summary is None or best_score is None:
            raise RuntimeError("No successful generator runs were recorded")

        restore_artifacts(best_dir_path)
        OUTPUTS_DIR.mkdir(exist_ok=True)
        REPORT_JSON.write_text(
            json.dumps(
                {
                    "runs_requested": args.runs,
                    "best_run": best_summary["run"],
                    "best_score": list(best_score),
                    "best_board_sha": best_summary["board_sha"],
                    "best_drc_total": best_summary["drc_total"],
                    "best_erc_total": best_summary["erc_total"],
                    "best_drc_counts": best_summary["drc_counts"],
                    "runs": run_summaries,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        print(
            f"selected run {best_summary['run']} with score={best_score} "
            f"board={best_summary['board_sha']}"
        )
        print(f"wrote stability report to {REPORT_JSON}")
        return 0
    except Exception:
        restore_artifacts(backup_dir_path)
        raise
    finally:
        shutil.rmtree(best_dir_path, ignore_errors=True)
        shutil.rmtree(backup_dir_path, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
