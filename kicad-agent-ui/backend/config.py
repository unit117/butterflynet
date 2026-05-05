from __future__ import annotations

import hashlib
import shutil
import subprocess
from pathlib import Path
from typing import Optional

KICAD_CLI_SEARCH_PATHS = [
    "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli",
    "/usr/bin/kicad-cli",
    "/usr/local/bin/kicad-cli",
]

KICAD_PYTHON = (
    "/Applications/KiCad/KiCad.app/Contents/Frameworks/"
    "Python.framework/Versions/3.9/bin/python3"
)

KICAD_PYTHONPATH = (
    "/Applications/KiCad/KiCad.app/Contents/Frameworks/python/site-packages"
)

PORTABLE_KIT_ROOT = Path("/Users/unit117/Dev/kicad-test/portable-kit")
TOOLS_DIR = PORTABLE_KIT_ROOT / "tools"

PROJECTS = {
    "ecc83": {
        "name": "ECC83 Vacuum Tube Preamp",
        "path": PORTABLE_KIT_ROOT / "test-fixtures" / "ecc83",
        "schematic": "ecc83-pp.kicad_sch",
        "pcb": "ecc83-pp.kicad_pcb",
        "pcb_base": "ecc83-pp-base.kicad_pcb",
        "routing_json": "outputs/ecc83-pp-routing.json",
        "status": "RELEASE_CLEAN",
    },
    "candle": {
        "name": "Candle Stem (My New Flame)",
        "path": Path("/Users/unit117/Dev/kicad/candle"),
        "schematic": "candle.kicad_sch",
        "pcb": "candle.kicad_pcb",
        "model": "outputs/candle.glb",
        "status": "IN_PROGRESS",
    },
}

WORKSPACE_ROOT = Path("/Users/unit117/Dev/hackathon-paris/kicad-agent-ui/workspace")
SVG_CACHE_DIR = WORKSPACE_ROOT / ".svg-cache"
RUNS_DIR = WORKSPACE_ROOT / "runs"


def discover_kicad_cli() -> Optional[str]:
    for p in KICAD_CLI_SEARCH_PATHS:
        if Path(p).is_file():
            return p
    found = shutil.which("kicad-cli")
    return found


def get_kicad_cli() -> str:
    path = discover_kicad_cli()
    if path is None:
        raise RuntimeError(
            "kicad-cli not found. Searched: " + ", ".join(KICAD_CLI_SEARCH_PATHS)
        )
    return path


def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()[:16]


def ensure_dirs():
    WORKSPACE_ROOT.mkdir(parents=True, exist_ok=True)
    SVG_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
