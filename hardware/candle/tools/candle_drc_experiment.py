#!/usr/bin/env python3
"""Candle DRC experiment runner.

Applies edits to generate_candle.py, regenerates the board, evaluates DRC,
and reverts on regression. Designed to be called by an agent in a loop.

Usage:
    python3 tools/candle_drc_experiment.py baseline
    python3 tools/candle_drc_experiment.py test --patch patch.json
    python3 tools/candle_drc_experiment.py revert
    python3 tools/candle_drc_experiment.py hotspots [--top N]
"""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
GENERATOR = PROJECT_DIR / "tools" / "generate_candle.py"
BACKUP = PROJECT_DIR / "tools" / ".generate_candle.py.backup"
DRC_OUTPUT = PROJECT_DIR / "outputs" / "candle-drc.json"
STABILITY_OUTPUT = PROJECT_DIR / "outputs" / "candle-stability.json"
BASELINE_FILE = PROJECT_DIR / "outputs" / "candle-drc-baseline.json"

KICAD_PYTHON = "/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3"
KICAD_PYTHONPATH = "/Applications/KiCad/KiCad.app/Contents/Frameworks/python/site-packages"


def regenerate():
    env = os.environ.copy()
    env["PYTHONPATH"] = KICAD_PYTHONPATH
    result = subprocess.run(
        [KICAD_PYTHON, str(GENERATOR)],
        capture_output=True, text=True, env=env, cwd=str(PROJECT_DIR),
        timeout=120,
    )
    return result.stdout + result.stderr


def read_drc():
    if not DRC_OUTPUT.exists():
        return None
    with open(DRC_OUTPUT) as f:
        data = json.load(f)
    violations = data.get("violations", [])
    types = {}
    shorts = 0
    unconnected = 0
    for v in violations:
        t = v.get("type", "")
        types[t] = types.get(t, 0) + 1
        if t == "shorting_items":
            shorts += 1
        if t == "unconnected_items":
            unconnected += 1
    return {
        "total": len(violations),
        "shorts": shorts,
        "unconnected": unconnected,
        "types": types,
        "tracks_crossing": types.get("tracks_crossing", 0),
        "clearance": types.get("clearance", 0),
        "solder_mask_bridge": types.get("solder_mask_bridge", 0),
        "track_dangling": types.get("track_dangling", 0),
    }


def save_baseline():
    output = regenerate()
    drc = read_drc()
    if drc is None:
        print("ERROR: could not read DRC output after regeneration")
        sys.exit(1)
    baseline = {
        "drc": drc,
        "generator_sha": hashlib.sha256(GENERATOR.read_bytes()).hexdigest()[:16],
        "generator_output": output.strip().split("\n"),
    }
    with open(BASELINE_FILE, "w") as f:
        json.dump(baseline, f, indent=2)
    shutil.copy2(GENERATOR, BACKUP)
    print(json.dumps(baseline, indent=2))


def load_baseline():
    if not BASELINE_FILE.exists():
        print("ERROR: no baseline. Run 'baseline' first.")
        sys.exit(1)
    with open(BASELINE_FILE) as f:
        return json.load(f)


def apply_patch(patch_file):
    """Apply a patch: list of {old_string, new_string} replacements."""
    with open(patch_file) as f:
        patches = json.load(f)
    content = GENERATOR.read_text()
    for p in patches:
        old = p["old_string"]
        new = p["new_string"]
        if old not in content:
            return False, f"old_string not found: {old[:60]}..."
        count = content.count(old)
        if count > 1 and not p.get("replace_all"):
            return False, f"old_string is ambiguous ({count} matches): {old[:60]}..."
        content = content.replace(old, new, 1)
    GENERATOR.write_text(content)
    return True, "patch applied"


def revert():
    if BACKUP.exists():
        shutil.copy2(BACKUP, GENERATOR)
        print("reverted to backup")
    else:
        print("ERROR: no backup to revert to")
        sys.exit(1)


def run_test(patch_file):
    baseline = load_baseline()
    base_drc = baseline["drc"]

    if not BACKUP.exists():
        shutil.copy2(GENERATOR, BACKUP)

    ok, msg = apply_patch(patch_file)
    if not ok:
        print(json.dumps({"status": "PATCH_FAILED", "error": msg}))
        return

    output = regenerate()
    drc = read_drc()
    if drc is None:
        revert()
        print(json.dumps({"status": "REGEN_FAILED", "error": "no DRC output"}))
        return

    improved = (
        drc["shorts"] == 0
        and drc["unconnected"] == 0
        and drc["total"] < base_drc["total"]
    )

    result = {
        "status": "IMPROVED" if improved else "REGRESSED",
        "baseline_drc": base_drc["total"],
        "new_drc": drc["total"],
        "delta": drc["total"] - base_drc["total"],
        "shorts": drc["shorts"],
        "unconnected": drc["unconnected"],
        "types": drc["types"],
        "generator_output": output.strip().split("\n"),
    }

    if improved:
        shutil.copy2(GENERATOR, BACKUP)
        baseline["drc"] = drc
        baseline["generator_sha"] = hashlib.sha256(GENERATOR.read_bytes()).hexdigest()[:16]
        with open(BASELINE_FILE, "w") as f:
            json.dump(baseline, f, indent=2)
        result["action"] = "KEPT — baseline updated"
    else:
        revert()
        regenerate()
        result["action"] = "REVERTED"

    print(json.dumps(result, indent=2))


def hotspots(top_n=15):
    subprocess.run(
        [sys.executable, str(PROJECT_DIR / "tools" / "drc_hotspots.py"), "--top-groups", str(top_n)],
        cwd=str(PROJECT_DIR),
    )


def main():
    parser = argparse.ArgumentParser(description="Candle DRC experiment runner")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("baseline", help="Regenerate and save current state as baseline")
    test_p = sub.add_parser("test", help="Apply a patch and test DRC")
    test_p.add_argument("--patch", required=True, help="JSON patch file")
    sub.add_parser("revert", help="Revert generator to backup")
    hot_p = sub.add_parser("hotspots", help="Show DRC hotspot summary")
    hot_p.add_argument("--top", type=int, default=15)

    args = parser.parse_args()
    if args.command == "baseline":
        save_baseline()
    elif args.command == "test":
        run_test(args.patch)
    elif args.command == "revert":
        revert()
    elif args.command == "hotspots":
        hotspots(args.top)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
