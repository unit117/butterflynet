#!/usr/bin/env python3
"""Export fabrication and review artifacts for the Candle project."""

from __future__ import annotations

import argparse
import csv
import os
import shutil
import subprocess
import zipfile
import tempfile
from pathlib import Path
from contextlib import contextmanager


PROJECT_DIR = Path(__file__).resolve().parents[1]
OUTPUTS_DIR = PROJECT_DIR / "outputs"
DOCS_DIR = OUTPUTS_DIR / "docs"
FAB_DIR = OUTPUTS_DIR / "fabrication"
GERBERS_DIR = FAB_DIR / "gerbers"
DRILL_DIR = FAB_DIR / "drill"

SCHEMATIC = PROJECT_DIR / "candle.kicad_sch"
BOARD = PROJECT_DIR / "candle.kicad_pcb"
GENERATOR = PROJECT_DIR / "tools" / "generate_candle.py"
STABILIZER = PROJECT_DIR / "tools" / "stabilize_candle.py"

KICAD_CLI = Path("/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli")
KICAD_PYTHON = Path(
    "/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3"
)
KICAD_PYTHONPATH = "/Applications/KiCad/KiCad.app/Contents/Frameworks/python/site-packages"


def run(cmd: list[str], *, env: dict[str, str] | None = None) -> None:
    result = subprocess.run(cmd, cwd=PROJECT_DIR, text=True, capture_output=True, env=env)
    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed: {' '.join(cmd)}\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )


@contextmanager
def snapshot_inputs(*paths: Path):
    with tempfile.TemporaryDirectory(prefix="candle_export_") as tmpdir:
        snapshot_dir = Path(tmpdir)
        snapshots: dict[Path, Path] = {}
        for path in paths:
            snapshot_path = snapshot_dir / path.name
            shutil.copy2(path, snapshot_path)
            snapshots[path] = snapshot_path
        yield snapshots


def clean_export_dirs() -> None:
    for path in (DOCS_DIR, FAB_DIR):
        if path.exists():
            shutil.rmtree(path)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    GERBERS_DIR.mkdir(parents=True, exist_ok=True)
    DRILL_DIR.mkdir(parents=True, exist_ok=True)


def regenerate(stabilize_runs: int) -> None:
    env = os.environ.copy()
    env["PYTHONPATH"] = KICAD_PYTHONPATH
    tool = STABILIZER if stabilize_runs > 1 else GENERATOR
    cmd = [str(KICAD_PYTHON), str(tool)]
    if stabilize_runs > 1:
        cmd.extend(["--runs", str(stabilize_runs)])
    run(cmd, env=env)


def export_schematic_artifacts(schematic: Path) -> None:
    run(
        [
            str(KICAD_CLI),
            "sch",
            "export",
            "netlist",
            "-o",
            str(FAB_DIR / "candle.net"),
            str(schematic),
        ]
    )
    run(
        [
            str(KICAD_CLI),
            "sch",
            "export",
            "pdf",
            "-o",
            str(DOCS_DIR / "candle-schematic.pdf"),
            str(schematic),
        ]
    )


def write_curated_bom() -> None:
    rows = [
        {"Refs": "D1-D256", "Value": "WW_2700K", "Footprint": "candle:Candle_LED_0603_Matrix", "Qty": "256", "Notes": "Dual 8x16 flame fields, one matrix per face"},
        {"Refs": "U1", "Value": "ATtiny1616-M", "Footprint": "Package_DFN_QFN:VQFN-20-1EP_3x3mm_P0.4mm_EP1.7x1.7mm", "Qty": "1", "Notes": "Stem MCU"},
        {"Refs": "U2,U3", "Value": "IS31FL3731-QF", "Footprint": "Package_DFN_QFN:QFN-28-1EP_4x4mm_P0.4mm_EP2.3x2.3mm", "Qty": "2", "Notes": "Front and rear charlieplex matrix drivers"},
        {"Refs": "SW1", "Value": "PCB_BUTTON", "Footprint": "Button_Switch_SMD:SW_Push_1P1T_NO_CK_KMR2", "Qty": "1", "Notes": "User control button on stem"},
        {"Refs": "C1,C3,C5", "Value": "100n", "Footprint": "Capacitor_SMD:C_0603_1608Metric", "Qty": "3", "Notes": "Local decoupling"},
        {"Refs": "C2,C4", "Value": "4.7u", "Footprint": "Capacitor_SMD:C_0805_2012Metric", "Qty": "2", "Notes": "Bulk bypass on driver power rail"},
        {"Refs": "C6", "Value": "10u", "Footprint": "Capacitor_SMD:C_0805_2012Metric", "Qty": "1", "Notes": "Bulk bypass on stem power rail"},
        {"Refs": "C7,C8", "Value": "1u", "Footprint": "Capacitor_SMD:C_0603_1608Metric", "Qty": "2", "Notes": "Driver C_FILT filter caps"},
        {"Refs": "R1,R2", "Value": "20k", "Footprint": "Resistor_SMD:R_0603_1608Metric", "Qty": "2", "Notes": "Driver current-set resistors"},
        {"Refs": "J1", "Value": "STEM_SOCKET", "Footprint": "candle:Candle_StemSocket_4Pad", "Qty": "1", "Notes": "Concealed blind-socket contact geometry; board-integrated, not a purchased part"},
        {"Refs": "J2", "Value": "UPDI_PADS", "Footprint": "candle:Candle_ServicePads_1x3", "Qty": "1", "Notes": "Board-integrated exposed service pads"},
        {"Refs": "UBASE1,JUSB1,BT1,SWBASE1,DBASE1,RCC1,RCC2,RLED1,RTS1,RISET1,RILIM1,RTMR1,CUSB1,CSYS1", "Value": "Base-side schematic only", "Footprint": "Off-board / base assembly", "Qty": "1 set", "Notes": "Captured in schematic, not laid out on the visible stem PCB"},
    ]
    out_path = FAB_DIR / "candle-assembly-bom.csv"
    with out_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Refs", "Value", "Footprint", "Qty", "Notes"])
        writer.writeheader()
        writer.writerows(rows)


def write_assembly_notes() -> None:
    notes = """# Candle Assembly Notes

- `J1` and `J2` are integrated copper features on the stem board and are excluded from position output.
- The base power path, charger, battery, USB-C receptacle, and base status LED are captured only in the schematic.
- The stem board uses a 4-layer stack to keep both 8x16 LED matrices on a 30 mm wide exposed PCB.
- The matrix driver pin-to-pixel mapping is firmware-defined; row and column ordering was chosen for routeability.
"""
    (FAB_DIR / "candle-assembly-notes.md").write_text(notes, encoding="utf-8")


def export_board_artifacts(board: Path) -> None:
    run(
        [
            str(KICAD_CLI),
            "pcb",
            "export",
            "pdf",
            "--mode-single",
            "--check-zones",
            "-l",
            "F.Cu,F.Mask,F.SilkS,Edge.Cuts",
            "-o",
            str(DOCS_DIR / "candle-board-front.pdf"),
            str(board),
        ]
    )
    run(
        [
            str(KICAD_CLI),
            "pcb",
            "export",
            "pdf",
            "--mode-single",
            "--check-zones",
            "--mirror",
            "-l",
            "B.Cu,B.Mask,B.SilkS,Edge.Cuts",
            "-o",
            str(DOCS_DIR / "candle-board-back.pdf"),
            str(board),
        ]
    )
    run(
        [
            str(KICAD_CLI),
            "pcb",
            "export",
            "gerbers",
            "--check-zones",
            "--exclude-refdes",
            "--exclude-value",
            "--subtract-soldermask",
            "-l",
            "F.Cu,In1.Cu,In2.Cu,B.Cu,F.Mask,B.Mask,F.SilkS,B.SilkS,Edge.Cuts",
            "-o",
            str(GERBERS_DIR),
            str(board),
        ]
    )
    run(
        [
            str(KICAD_CLI),
            "pcb",
            "export",
            "drill",
            "--format",
            "excellon",
            "--excellon-separate-th",
            "--generate-map",
            "--map-format",
            "pdf",
            "--generate-report",
            "--report-path",
            str(DRILL_DIR / "candle-drill-report.rpt"),
            "-o",
            str(DRILL_DIR),
            str(board),
        ]
    )
    run(
        [
            str(KICAD_CLI),
            "pcb",
            "export",
            "pos",
            "-o",
            str(FAB_DIR / "candle-pos.csv"),
            "--format",
            "csv",
            "--units",
            "mm",
            "--exclude-fp-th",
            "--exclude-dnp",
            str(board),
        ]
    )


def package_bundle() -> None:
    bundle_path = FAB_DIR / "candle-fabrication-bundle.zip"
    with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(FAB_DIR.rglob("*")):
            if path == bundle_path or path.is_dir():
                continue
            bundle.write(path, path.relative_to(FAB_DIR))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-generate", action="store_true")
    parser.add_argument("--stabilize-runs", type=int, default=1)
    args = parser.parse_args()

    clean_export_dirs()
    if not args.skip_generate:
        regenerate(args.stabilize_runs)

    with snapshot_inputs(SCHEMATIC, BOARD) as snapshots:
        export_schematic_artifacts(snapshots[SCHEMATIC])
        export_board_artifacts(snapshots[BOARD])
    write_curated_bom()
    write_assembly_notes()
    package_bundle()

    print(f"Wrote docs to {DOCS_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
