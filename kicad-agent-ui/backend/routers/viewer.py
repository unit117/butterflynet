import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from ..config import PROJECTS, SVG_CACHE_DIR, file_hash, get_kicad_cli

router = APIRouter()

DEFAULT_PCB_LAYERS = "F.Cu,B.Cu,Edge.Cuts,F.SilkS"
DARK_PCB_LAYERS = "F.Cu,B.Cu,Edge.Cuts,F.SilkS,B.SilkS,F.Mask,B.Mask"


def _svg_cache_path(board_hash: str, layers: str, view_type: str) -> Path:
    safe_layers = layers.replace(",", "_").replace(".", "")
    return SVG_CACHE_DIR / f"{view_type}_{board_hash}_{safe_layers}.svg"


@router.get("/{project_id}/pcb")
def view_pcb(
    project_id: str,
    layers: str = Query(DEFAULT_PCB_LAYERS),
    force: bool = Query(False),
):
    proj = PROJECTS.get(project_id)
    if not proj:
        raise HTTPException(404, f"Unknown project: {project_id}")

    pcb_path = proj["path"] / proj["pcb"]
    if not pcb_path.exists():
        raise HTTPException(404, f"PCB file not found: {pcb_path}")

    board_h = file_hash(pcb_path)
    cached = _svg_cache_path(board_h, layers, f"pcb_{project_id}")

    if cached.exists() and not force:
        return FileResponse(cached, media_type="image/svg+xml")

    kicad_cli = get_kicad_cli()
    result = subprocess.run(
        [
            kicad_cli,
            "pcb",
            "export",
            "svg",
            "--mode-single",
            "--layers",
            layers,
            "--page-size-mode",
            "2",
            "--fit-page-to-board",
            "--drill-shape-opt",
            "2",
            "-o",
            str(cached),
            str(pcb_path),
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )

    if result.returncode != 0 or not cached.exists():
        raise HTTPException(500, f"SVG export failed: {result.stderr}")

    return FileResponse(cached, media_type="image/svg+xml")


@router.get("/{project_id}/sch")
def view_sch(
    project_id: str,
    force: bool = Query(False),
):
    proj = PROJECTS.get(project_id)
    if not proj:
        raise HTTPException(404, f"Unknown project: {project_id}")

    sch_path = proj["path"] / proj["schematic"]
    if not sch_path.exists():
        raise HTTPException(404, f"Schematic file not found: {sch_path}")

    sch_h = file_hash(sch_path)
    cached = _svg_cache_path(sch_h, "all", f"sch_{project_id}")

    if cached.exists() and not force:
        return FileResponse(cached, media_type="image/svg+xml")

    kicad_cli = get_kicad_cli()

    with tempfile.TemporaryDirectory() as tmpdir:
        result = subprocess.run(
            [
                kicad_cli,
                "sch",
                "export",
                "svg",
                "--no-background-color",
                "-o",
                tmpdir,
                str(sch_path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            raise HTTPException(500, f"Schematic SVG export failed: {result.stderr}")

        svg_files = list(Path(tmpdir).glob("*.svg"))
        if not svg_files:
            raise HTTPException(500, "No SVG files generated")

        import shutil

        shutil.copy2(svg_files[0], cached)

    return FileResponse(cached, media_type="image/svg+xml")


@router.get("/{project_id}/layers")
def available_layers(project_id: str):
    return {
        "presets": {
            "front": "F.Cu,F.SilkS,Edge.Cuts",
            "back": "B.Cu,B.SilkS,Edge.Cuts",
            "both": DEFAULT_PCB_LAYERS,
            "all": DARK_PCB_LAYERS,
        },
        "layers": [
            "F.Cu",
            "B.Cu",
            "In1.Cu",
            "In2.Cu",
            "F.SilkS",
            "B.SilkS",
            "F.Mask",
            "B.Mask",
            "Edge.Cuts",
            "F.Fab",
            "B.Fab",
        ],
    }


@router.get("/{project_id}/model")
def view_model(project_id: str):
    proj = PROJECTS.get(project_id)
    if not proj:
        raise HTTPException(404, f"Unknown project: {project_id}")

    model_rel = proj.get("model")
    if not model_rel:
        raise HTTPException(404, f"No 3D model configured for: {project_id}")

    model_path = proj["path"] / model_rel
    if not model_path.exists():
        raise HTTPException(404, f"3D model not found: {model_path}")

    return FileResponse(
        model_path,
        media_type="model/gltf-binary",
        filename=model_path.name,
    )
