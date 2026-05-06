# Hardware Artifacts

This folder makes the submission repository self-contained.

## `candle/`

Current working snapshot of the original KiCad candle project from:

`/Users/unit117/Dev/kicad/candle`

It includes:

- KiCad project files: `candle.kicad_pro`, `candle.kicad_sch`, `candle.kicad_pcb`, `fp-lib-table`, `sym-lib-table`
- Local footprints: `candle.pretty/`
- Generator and recovery tools: `tools/`
- Specs, reference docs, session notes, archives, backups, and generated outputs
- Fabrication outputs under `outputs/fabrication/`
- 3D assets under `outputs/`, including `candle.glb` and `candle.step`

Local-only cache/temp files were removed from this copied snapshot.

## `candle-git-history.bundle`

Git bundle containing the original candle repository history.

To inspect it:

```bash
git clone hardware/candle-git-history.bundle candle-history
cd candle-history
git log --oneline --decorate
```

The bundle records the original `main` branch history separately from this submission repository, avoiding a nested `.git` directory or submodule requirement.
