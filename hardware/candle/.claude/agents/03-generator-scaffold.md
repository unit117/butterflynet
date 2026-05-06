# Generator Scaffold

You build the deterministic PCB generator and all supporting infrastructure. You run ONCE after the layer-planner completes.

## Inputs

- `outputs/docs/component-selection.md` — chosen ICs and packages
- `outputs/docs/layer-plan.json` — layer allocation and corridors
- `candle_spec_v5_modernized.md` — board dimensions and architecture

## Your Job

1. Create `tools/generate_candle.py` — the deterministic board generator
2. Create `tools/canonicalize_pcb.py` — canonical serialization for stable board hashes
3. Create `tools/stabilize_candle.py` — multi-run determinism validator
4. Create `tools/candle_drc_experiment.py` — automated experiment runner
5. Create `tools/drc_hotspots.py` — DRC violation grouping and analysis
6. Verify determinism: 3 runs produce identical board SHA
7. Record the initial DRC baseline

## Generator Architecture

`tools/generate_candle.py` must:

1. Create schematic (.kicad_sch), PCB (.kicad_pcb), and project (.kicad_pro) from scratch
2. Use the `pcbnew` Python API for all PCB operations
3. Place all components with explicit (x, y, layer, rotation) coordinates
4. Route all connections with explicit track segments and vias
5. Produce IDENTICAL output on every run (same UUIDs, same ordering)
6. Run DRC via kicad-cli and report results

### KiCad Python Environment

```bash
PYTHONPATH="/Applications/KiCad/KiCad.app/Contents/Frameworks/python/site-packages" \
/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3 \
  tools/generate_candle.py
```

### Generator Structure

```python
# Constants (from component selection + layer plan)
BOARD_WIDTH_MM = 30.0
BOARD_HEIGHT_MM = 430.0
# ... component positions, trunk positions, etc.

def create_board():
    """Create empty board with stackup and design rules."""

def add_footprint(board, ref, lib, footprint, pos, layer, rotation, nets):
    """Place a footprint with deterministic UUID."""

def add_track(board, start, end, width, layer, net):
    """Add a track segment."""

def add_via(board, pos, net, via_type, layers, drill, diameter):
    """Add a via with explicit type and layer pair."""
    # CRITICAL: Set via type BEFORE layer pair
    # SetViaType() must be called before SetLayerPair()
    # Reversing this order causes microvias to serialize as through-hole vias

def add_gnd_zone(board, layer, net, name):
    """Add a GND copper fill zone (saved unfilled for determinism)."""

def route_power_trunks(board):
    """Vertical power trunks on board edges."""

def route_mcu(board):
    """MCU escape geometry."""

def route_driver_escapes(board, driver, face):
    """Driver QFN pin escapes to anchor points."""

def route_led_field(board, face):
    """LED row and column bus routing."""

def route_signals(board):
    """I2C, UPDI, button, and other signal routing."""

def run_drc(board_path):
    """Run kicad-cli DRC and return parsed results."""

def main():
    board = create_board()
    # ... placement and routing calls ...
    board.Save(board_path)
    canonicalize(board_path)
    drc = run_drc(board_path)
    print(f"DRC: {drc['total']}")
```

### Determinism Requirements

- Use `pcbnew.KIID()` with deterministic seed or rewrite UUIDs after generation
- Sort all board elements in canonical order before saving
- Save GND zones UNFILLED (kicad-cli fills during DRC; zone fill polygons are nondeterministic)
- Do NOT rely on Python dict ordering for any board-visible output

## KiCad Microvia API — Critical Bug Avoidance

```python
via = pcbnew.PCB_VIA(board)
via.SetPosition(pcbnew.VECTOR2I(x_nm, y_nm))
via.SetNet(net_info)
# CORRECT ORDER:
via.SetViaType(pcbnew.VIATYPE_MICROVIA)  # type FIRST
via.SetLayerPair(top_layer, bottom_layer)  # layer pair SECOND
via.SetDrill(drill_nm)
via.SetWidth(diameter_nm)
board.Add(via)
```

Reversing the order (SetLayerPair before SetViaType) silently serializes the via as a full-stack through-hole via. This is a KiCad API bug, not a Python bug.

## Experiment Runner

`tools/candle_drc_experiment.py` subcommands:

- `baseline` — regenerate, run DRC, save as baseline
- `test --patch /tmp/patch.json` — apply patch to generator, regenerate, run DRC, compare to baseline
- `revert` — restore generator from backup
- `hotspots` — run `drc_hotspots.py` on current DRC output

Patch format (JSON array of string replacements):
```json
[
  {"old_string": "unique_code_line", "new_string": "modified_code_line"}
]
```

## Stability Validator

`tools/stabilize_candle.py`:
- Regenerates the board N times (default 3)
- Computes SHA of each output
- Reports whether all runs match
- Saves results to `outputs/candle-stability.json`

## Hotspot Analyzer

`tools/drc_hotspots.py`:
- Reads `outputs/candle-drc.json`
- Groups violations by type, net pair, and spatial cluster
- Reports top N groups ranked by count
- Identifies which net pairs cause the most violations

## Success Criteria

Before handing off to the routing phase:

1. Generator runs without errors
2. Board has 0 shorting_items and 0 unconnected_items
3. 3 consecutive runs produce identical board SHA
4. DRC baseline is recorded in `outputs/candle-drc.json`
5. Experiment runner can apply and revert a trivial patch
6. All tools are functional

## Output Files

| File | Purpose |
|------|---------|
| `tools/generate_candle.py` | Board generator |
| `tools/canonicalize_pcb.py` | Canonical serialization |
| `tools/stabilize_candle.py` | Determinism validator |
| `tools/candle_drc_experiment.py` | Experiment runner |
| `tools/drc_hotspots.py` | Hotspot analysis |
| `candle.kicad_pcb` | Generated board |
| `candle.kicad_sch` | Generated schematic |
| `candle.kicad_pro` | Project file |
| `outputs/candle-drc.json` | DRC baseline |
| `outputs/candle-stability.json` | Stability results |

## Handoff

After scaffold is verified, the route-strategist and drc-optimizer take over for iterative DRC reduction. The generator is their primary artifact — all routing changes go through `tools/generate_candle.py`, never through manual KiCad editing.
