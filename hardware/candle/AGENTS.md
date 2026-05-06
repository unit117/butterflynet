# AGENTS.md — Candle Stem PCB

## Project Overview

This is a deterministic KiCad PCB generator for a 430x30mm candle stem board.
All routing is done in `tools/generate_candle.py` — there is NO manual KiCad editing.

## Quick Commands

Regenerate board:
```bash
PYTHONPATH="/Applications/KiCad/KiCad.app/Contents/Frameworks/python/site-packages" \
/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3 \
  tools/generate_candle.py
```

DRC experiment (baseline/test/revert):
```bash
python3 tools/candle_drc_experiment.py baseline
python3 tools/candle_drc_experiment.py test --patch /tmp/patch.json
python3 tools/candle_drc_experiment.py revert
```

Stability check:
```bash
python3 tools/stabilize_candle.py --runs 3
```

Hotspot analysis:
```bash
python3 tools/drc_hotspots.py --top-groups 20
```

## Architecture

- 4-layer stackup: F.Cu, In1.Cu (FRONT_COL_LAYER), In2.Cu (BACK_COL_LAYER), B.Cu
- Dual 8x16 LED fields, one per face
- ATtiny1616 MCU at y=236
- IS31FL3733 drivers: U2 (front, F.Cu) and U3 (back, B.Cu) at y=328
- 4 blind-socket stem power/contact pads (J1) at y=12

## Board Constants (DO NOT CHANGE)

- BOARD_WIDTH_MM = 30.0
- DRIVER_Y_MM = 328.0, MCU_Y_MM = 236.0
- FRONT_SYS_TRUNK_X = 27.0, FRONT_GND_TRUNK_X = 3.0
- BACK_SYS_TRUNK_X = 3.0, BACK_GND_TRUNK_X = 27.0

## Hard Invariants

After every generator change:
- 0 shorting_items
- 0 unconnected_items
- DRC total must not increase (or revert)
- Board must be deterministic (same SHA across runs)

## DRC Reduction Workflow

1. Analyze hotspots → identify target
2. Read generator code for that area
3. Propose coordinate/layer change
4. Test via experiment runner
5. Keep wins, revert losses
6. Update SESSION.md and SESSION_HISTORY.md

## Proven Techniques

- **In2.Cu lift**: move long B.Cu verticals to In2.Cu (empty in stem region y=34-320)
- **Coordinate micro-shifts**: move vias/rails by 0.2-1.0mm to clear adjacent tracks
- **Single-net off-layer lifts**: move one row-return signal to inner layer

## Key Files

| File | Purpose |
|------|---------|
| `tools/generate_candle.py` | Board generator (all routing logic) |
| `tools/candle_drc_experiment.py` | Automated experiment runner |
| `tools/stabilize_candle.py` | Determinism validator |
| `tools/drc_hotspots.py` | Hotspot analysis |
| `tools/candle_recovery.py` | Recovery snapshots |
| `outputs/candle-drc.json` | Latest DRC results |
| `outputs/candle-stability.json` | Latest stability results |
| `SESSION.md` | Running session notes |
| `SESSION_HISTORY.md` | Full history and techniques |

## Current Baseline

- DRC: 0 — clean board
- ERC: 6 actionable (benign USB/charger warnings), 48 structural (LED-only labels, MCU extends)
- Shorts: 0, Unconnected: 0
- Board SHA: `972e36534c06a355`
- GND copper fills on all 4 layers (saved unfilled; kicad-cli fills during DRC)
- Inner-layer lifts: F_CA1/F_CA2/F_CA3/F_CA4 escape horizontals lifted F.Cu→In1.Cu
- Vertical lifts: R_CB1/R_CB2/R_CB3/R_CB4/R_CB5 escape verticals lifted B.Cu→In2.Cu (two microvias per net)
- MCU lifts: SCL and SYS escape tracks lifted F.Cu→In1.Cu via 0.175mm microvias at pad centers
- 0.2mm microvias (0.075mm drill) for charlieplex, 0.175mm for MCU escapes
- NC MCU pads 10/11 tied to GND, pad 20 tied to UPDI
- U3 SDA rail at y=328.4 (directly at pin y) to avoid SCL×SDA B.Cu crossing
- Schematic y-axis inverted: pin offsets use `sy - offset` (KiCad y increases downward)
- MCU wires use absolute coordinates (ATtiny1616-M extends issue in schematic_architect)
