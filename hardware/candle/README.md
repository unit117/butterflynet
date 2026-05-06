# Candle

This folder contains the KiCad candle hardware artifact for the agent pipeline
demo. The design target is the `v5 modernized` direction described in
[`candle_spec_v5_modernized.md`](./candle_spec_v5_modernized.md): a tall,
exposed LED stem inspired by the My New Flame lamp, with the battery and charge
electronics kept in a concealed base.

This is an auditable generated hardware snapshot, not a hand-polished consumer
product release. It includes the KiCad source project, local footprints,
generated docs, fabrication-format outputs, 3D assets, validation reports, and
the automation scripts used to regenerate or inspect the board.

## Reviewer quick start

- Open `candle.kicad_pro` in KiCad to inspect the schematic and PCB.
- Read `outputs/docs/candle-schematic.pdf` for the electrical architecture.
- Read `outputs/docs/candle-board-front.pdf` and
  `outputs/docs/candle-board-back.pdf` for board plots.
- Inspect `outputs/candle.glb` or `outputs/candle.step` for the 3D board model.
- Inspect `outputs/fabrication/candle-fabrication-bundle.zip` for the exported
  Gerbers, drill files, BOM, placement CSV, and netlist.
- Check `outputs/candle-drc.json`, `outputs/candle-erc.json`, and
  `outputs/recovery/latest-report.md` for validation state and recovery history.

## Status and caveats

The demo UI shows the full agent pipeline, including a validation replay where
agents iterate DRC fixes down to a clean board. This directory preserves the
checked-in KiCad project snapshot and its generated export artifacts for review.
That snapshot is useful for inspecting the real board structure and automation
outputs, but it still has known validation issues listed below.

Do not send this board directly to fabrication as a production design without
resolving the current ERC/DRC items and doing an electrical engineering review.
The fabrication files are included to demonstrate the exporter and the expected
manufacturing artifact shape.

## Active design assets

- `candle.kicad_sch`: architecture schematic for the base power path plus stem
  control/driver partition
- `candle.kicad_pcb`: generated `430 x 30 mm` stem board
- `candle.kicad_pro`: lightweight KiCad project file written by the generator
- `candle.pretty/`: local footprints for the blind-socket stem pads, compact
  matrix LEDs, and exposed service pads
- `tools/generate_candle.py`: repeatable schematic + PCB generator
- `tools/canonicalize_pcb.py`: deterministic `.kicad_pcb` canonicalizer for
  stable UUIDs and section ordering
- `tools/stabilize_candle.py`: optional repeated-run sampler kept for audit and
  comparison work
- `tools/export_candle.py`: repeatable docs/fabrication export helper
- `tools/candle_recovery.py`: harness-driven PCB recovery wrapper that captures
  DRC snapshots, diffs, and crossing hotspots per iteration
- `tools/drc_hotspots.py`: read-only DRC hotspot analyzer grouped by type, net
  pair, and coarse board region

## Exported artifacts

- `outputs/docs/`: schematic and board PDFs for quick review without opening
  KiCad
- `outputs/fabrication/gerbers/`: copper, mask, silkscreen, outline, and job
  files
- `outputs/fabrication/drill/`: plated, non-plated, and internal-layer drill
  files plus drill maps
- `outputs/fabrication/candle-assembly-bom.csv`: generated assembly BOM
- `outputs/fabrication/candle-pos.csv`: generated pick-and-place positions
- `outputs/fabrication/candle-assembly-notes.md`: assembly notes and exclusions
- `outputs/fabrication/candle-fabrication-bundle.zip`: bundled manufacturing
  export
- `outputs/candle.glb` and `outputs/candle.step`: 3D board assets

## Architecture captured here

- Exposed stem PCB sized to the published `430 x 30 mm` envelope
- Dual flame fields with `8 x 16` warm-white LEDs per face
- Stem MCU plus one matrix driver per face
- `4` duplicated bottom power contacts for the concealed base socket
- Base-side `USB-C -> charger/power-path -> battery -> switch -> stem` flow in
  the schematic

## Regeneration

Quick iteration:

```bash
PYTHONPATH="/Applications/KiCad/KiCad.app/Contents/Frameworks/python/site-packages" \
/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3 \
  tools/generate_candle.py
```

`generate_candle.py` now canonicalizes the saved `.kicad_pcb` before DRC, so a
fresh run produces one stable board file. The current source also reproduced
the same board hash and the same `266`-DRC result across `3/3` repeated
stability runs.

Optional repeated-run sampling:

```bash
PYTHONPATH="/Applications/KiCad/KiCad.app/Contents/Frameworks/python/site-packages" \
/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3 \
  tools/stabilize_candle.py --runs 8
```

## Export package

```bash
python3 tools/export_candle.py
```

`export_candle.py` now uses the deterministic single-run generator by default.
Use `--stabilize-runs N` only when you explicitly want sampling, or
`--skip-generate` to export the current board as-is. The exporter snapshots the
schematic and PCB into a temp directory before calling `kicad-cli`, which keeps
PDF/netlist generation stable even while the project is being regenerated.

DRC hotspot analysis:

```bash
python3 tools/drc_hotspots.py --top-groups 20
```

The analyzer reads `outputs/candle-drc.json` by default and prints stable
hotspot rollups that are useful for routing recovery and cleanup passes.

Harness-driven recovery snapshot:

```bash
python3 tools/candle_recovery.py run --label working --skip-generate
python3 tools/candle_recovery.py set-baseline --label baseline --skip-generate
```

This writes per-run reports under `outputs/recovery/` using the repo's
CLI-Anything KiCad harness for `pcb drc`, DRC diffing, and track-crossing
grouping.

## Current validation state

- Schematic ERC: `91` violations
- PCB DRC: `266` violations
- PCB shorting items: `0`
- PCB unconnected items: `0`
- Board SHA256: `870a1c23718942aeb22cf7f075a202402b04271010dc7a0cb9bf8b06c47dc183`

The current board is a generated first-pass implementation of the modernized
stem with real matrix placement, routing structure, and exported KiCad assets.
The remaining issues are concentrated in dense driver-fanout geometry,
clearance/track-crossing cleanup, and schematic cleanliness rather than missing
project scaffolding. The latest `stabilize_candle.py --runs 3` sample
reproduced the same `266` board in all three runs, which makes the snapshot
stable enough for audit and replay work even though it is not production-clean.

## Reference material

- `refs/source_documents.md`: reconciled external facts and dimension sources
- `refs/provided_reference_render.png`: visual composition reference
- `specs/candle_spec_deviations.md`: intentional deviations from the active
  modernized build path
- `archive/`: archived earlier specs and the superseded proof-of-concept project
