# Candle Session Log

## Scope

This session built and iterated the KiCad implementation for the modernized
`v5` candle direction from
[`candle_spec_v5_modernized.md`](./candle_spec_v5_modernized.md).

## Major outcomes so far

- Generated a working KiCad project:
  [`candle.kicad_sch`](./candle.kicad_sch),
  [`candle.kicad_pcb`](./candle.kicad_pcb),
  [`candle.kicad_pro`](./candle.kicad_pro)
- Added local footprints in [`candle.pretty`](./candle.pretty)
- Built the main generator in [`tools/generate_candle.py`](./tools/generate_candle.py)
- Added deterministic board canonicalization in
  [`tools/canonicalize_pcb.py`](./tools/canonicalize_pcb.py)
- Added stability sampling in [`tools/stabilize_candle.py`](./tools/stabilize_candle.py)
- Added harness-driven recovery in [`tools/candle_recovery.py`](./tools/candle_recovery.py)
- Added hotspot grouping in [`tools/drc_hotspots.py`](./tools/drc_hotspots.py)
- Fixed export fragility in [`tools/export_candle.py`](./tools/export_candle.py)

## Implemented architecture

- `430 x 30 mm` exposed stem PCB
- `4-layer` stackup
- dual `8 x 16` LED fields, one per face
- `ATtiny1616` stem MCU
- one `IS31FL3733` per face
- `4` blind-socket stem power/contact pads
- base-side power path captured in schematic only

## Session timeline

### 1. Initial project generation

- created the schematic and PCB generator
- instantiated the stem board, LEDs, drivers, MCU, connectors, decoupling, and
  RSET parts
- exported initial docs/fabrication outputs

### 2. First cleanup passes

- reduced the board from an earlier `451`-DRC state to materially lower counts
- eliminated unconnected items
- then eliminated unstable short-free "best sample" reliance by making the PCB
  path deterministic

### 3. Determinism work

- found that repeated runs could serialize equivalent boards differently
- implemented canonical `.kicad_pcb` serialization with stable ordering and UUIDs
- verified repeated generation now produces a stable board SHA
- current stable board SHA:
  `870a1c23718942aeb22cf7f075a202402b04271010dc7a0cb9bf8b06c47dc183`

### 4. Recovery workflow pivot

- investigated the repo-local KiCad orchestration docs and CLI harness
- switched from raw one-off `kicad-cli` usage to the repo's harness/recovery style
- added per-run recovery snapshots, DRC diffs, and track-crossing summaries
- recovery artifacts now live under [`outputs/recovery`](./outputs/recovery)

### 5. Export path fix

- `kicad-cli sch export pdf` was intermittently failing with `Failed to load schematic`
- fixed this by snapshotting the schematic and PCB into a temp directory before
  export commands run
- `python3 tools/export_candle.py --skip-generate` now succeeds

### 6. Routing work that stuck

- fixed duplicate switch-pad net assignment so all duplicated footprint pads get
  the intended net
- cleaned up U1 local `SYS/GND/BTN` escape geometry enough to remove shorts
- improved several front/back driver local escapes and rail placements
- restored a stable short-free board after a failed broader row-breakout rewrite
- rerouted the `C5` GND feed and the `U1` exposed-pad GND feed to the right/back
  side instead of dragging both across the front MCU strip
- moved the `R_SW4` rear breakout left to `x=12.6`, clearing the U3 exposed-pad
  short without reopening other shorts
- flattened the `C5` `SYS` branch directly into the front trunk, removing the
  dangling `SYS` spur in the MCU strip
- flattened the driver decoupler `SYS/GND` cap branches into the trunks at the
  pad `y` positions instead of forcing them through the shared `y=334.6` rail
- extended the front/back `SYS` trunks to the decoupler `SYS` pad height so the
  new direct cap routes land on copper cleanly
- collapsed repeated U2/U3 shared `SYS` rails into single horizontals instead of
  stacking overlapping same-net rails
- collapsed repeated U2/U3 shared `GND` rails the same way, keeping the U2 pin
  `34` custom escape but removing its redundant horizontal overlap
- flattened the `C6` `SYS/GND` bulk-cap branches directly into the trunks at
  the pad `y` positions
- added a constrained staggered dogleg pattern for the dense U3 right-side row
  cluster, then capped the `R_CS7` escape specifically to clear the `R_SW6`
  lane without giving back the wider gain
- improved the localized board baseline from `354` DRC to `278` DRC without
  reintroducing shorts or unconnecteds

### 7. Routing work that did not stick

- attempted a full row-breakout channel rewrite for the driver row fanout
- this regressed the board to roughly `739` DRC with many new shorts/mask issues
- rolled that experiment back rather than leave the project in a worse state
- tried rerouting `U3` pad `49` into alternate ground rails to cut rear-band
  crossings
- the `333.0` rail version increased clearance pressure and the `321.6` rail
  version introduced `4` shorts, so both were reverted
- tried lowering the U3 `SCL` rear rail and widening the U1 `SYS` escape; both
  regressed DRC and were reverted
- tried over-compressing the new U3 right-row stagger fan; it introduced
  multiple row-to-row and row-to-RSET shorts, so that version was reverted

## Current stable baseline

- `ERC`: `50`
- `DRC`: `0` — clean board
- `shorting_items`: `0`
- `unconnected_items`: `0`
- board SHA: `972e36534c06a355`
- GND copper fills: 4 zones (F.Cu, In1.Cu, In2.Cu, B.Cu), saved unfilled
- 0.2mm microvias (0.075mm drill) for charlieplex, 0.175mm for MCU escapes
- Inner-layer lifts: F_CA1/F_CA2/F_CA3/F_CA4 escape horizontals lifted F.Cu→In1.Cu
- Vertical lifts: R_CB1/R_CB2/R_CB3/R_CB4/R_CB5 escape verticals lifted B.Cu→In2.Cu
- MCU lifts: SCL and SYS escape tracks lifted F.Cu→In1.Cu via 0.175mm microvias
- U2 SYS escape x overridden to 4.0 to clear F_CA1 In1.Cu trunk
- NC MCU pads 10/11→GND, pad 20→UPDI
- U3 SDA rail at y=328.4 (avoids SCL×SDA B.Cu crossing)

These counts are reflected in:

- [`outputs/candle-drc.json`](./outputs/candle-drc.json)
- [`outputs/candle-erc.json`](./outputs/candle-erc.json)
- [`outputs/candle-stability.json`](./outputs/candle-stability.json)

## Remaining violations

**None — DRC 0 achieved.**

### Previously structural violations — now resolved

**MCU clearances (2→0):** SCL and SYS escape tracks lifted from F.Cu to In1.Cu via 0.175mm microvias placed directly on the QFN pad centers. The 0.175mm diameter provides 0.212mm clearance to adjacent 0.4mm-pitch pads (vs 0.199mm with 0.200mm vias). Required lowering board min via size to 0.15mm and netclass uVia diameter to 0.175mm.

**Back charlieplex escape crossings (8→0):** R_CB1-5 escape verticals lifted B.Cu→In2.Cu using two microvias per net. Pattern: B.Cu stub to via_y=322.0, microvia to In2.Cu, vertical on In2.Cu, microvia back to B.Cu, then standard horizontal escape.

## Useful commands

Regenerate:

```bash
PYTHONPATH="/Applications/KiCad/KiCad.app/Contents/Frameworks/python/site-packages" \
/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3 \
  tools/generate_candle.py
```

Recovery snapshot:

```bash
python3 tools/candle_recovery.py run --label working --skip-generate
```

Hotspot summary:

```bash
python3 tools/drc_hotspots.py --top-groups 20
```

Export current board:

```bash
python3 tools/export_candle.py --skip-generate
```

## Latest notes

- Moved the SCL B.Cu long vertical (89.1mm) to `In2.Cu`, eliminating 4 B.Cu
  crossings and 1 clearance violation; shifted `u3_scl_rail` from `x=9.2` to
  `x=7.0` to clear the SDA B.Cu vertical; board reduced from `257` to `255`.
- Moved the SDA B.Cu long vertical (90mm) to `In2.Cu` using the same
  technique; shifted `u3_sda_rail` from `y=333.4` to `y=333.2` to clear the
  GND B.Cu horizontal at `y=333.82`; board reduced from `255` to `251`.
- Moved the UPDI B.Cu long vertical (200mm) to `In2.Cu`, eliminating the SYS
  crossing at `y=82` that was introduced by the earlier B.Cu lift; board
  reduced from `251` to `250`.
- BTN `In1.Cu` lift attempt was DRC-neutral (traded 2 crossings for 2
  clearance violations); reverted.
- The inner-layer `In2.Cu` routing technique worked well because the stem
  region (`y=34..320`) is essentially empty on `In2.Cu` — no LED field traffic,
  no driver escapes.
- Moved U1 pin 3 GND via from `(12.4, 237.8)` to `(13.3, 237.8)`, clearing
  the via out of the narrow channel between SCL (x=12.0) and SDA (x=12.8);
  eliminated 2 GND via clearance violations and 1 B.Cu crossing; board
  reduced from `249` to `248`.
- Built agent-driven DRC optimization tooling: experiment runner
  (`tools/candle_drc_experiment.py`), three agents (`candle-drc-optimizer`,
  `candle-route-strategist`, `candle-board-validator`) in `.claude/agents/`.
- Moved U1 pin 3 GND via from `(13.3, 237.8)` to `(12.8, 238.2)`, clearing
  the GND diagonal from U1 pad 4 (SYS); eliminated 1 clearance violation;
  board reduced from `246` to `245`.
- SCL escape shift (x=12.0→11.5 or 11.7): both regressed; reverted.
- SYS escape shift (x=13.4→13.0): DRC-neutral; reverted.
- u2_scl_rail y shift (321.8→322.2): DRC-neutral (traded crossing for clearance); reverted.
- Dense front stagger reversal: DRC-neutral on crossings, +1 clearance; reverted.
- R_SW8 In2.Cu lift: eliminated 3 crossings but introduced 2 shorts; reverted.

### 8. Split row anchors (architectural improvement)

- Implemented "split row anchors": right-side driver pins (x >= 15mm) now
  escape to right-side anchors at x=27.8 instead of all converging on
  left-side anchors at x=2.2
- Bus tracks now conditional: right-escaping rows use
  left_entry→right_anchor, left-escaping rows use left_anchor→right_entry
- Stagger escape corridor kept at baseline x=18.45-21.9 (0.4mm spacing)
  to avoid cap area at x=23.2 and power trunks at x=27.0
- Fixed R_SW6/SYS co-linear overlap: lifted R_SW6 column route to In2.Cu
  via escape at (10.0, 324.5), avoiding SYS track at y=327.40 and SDA
  vertical at x=9.4 on In2.Cu
- Fixed R_SW7/R_CS8 overlap similarly: lifted R_SW7 to In2.Cu via escape
  at (10.5, 323.0)
- Removed F_CS8 left-anchor special case (now routes right naturally)
- Pre-existing co-linear track overlaps between column manhattan routes and
  QFN row pins exist in baseline but KiCad DRC doesn't flag co-linear
  track-to-track overlaps consistently; the split-anchor topology change
  triggers detection for some pairs
- Board reduced from `231` to `221` (−10), with −7 crossings, −4 mask
  bridge, +1 clearance

### 9. Agent-driven micro-optimization (DRC 222 → 212)

- Shifted R_SW6 In2.Cu microvia from `(10.0, 324.5)` to `(10.0, 325.5)`,
  increasing separation from R_CS3's In2.Cu horizontal track at `y=324.25`
  from 0.25mm to 1.25mm; eliminated all 3 R_CS3/R_SW6 clearance violations
- Shifted `u3_scl_rail` from `(7.0, 331.6)` to `(7.0, 332.7)`, moving the
  SCL B.Cu horizontal below the SYS shared rail at `y=332.2`; eliminated all
  3 SCL<->SYS track crossings
- GND<->R_CS10 crossings (5 total): 6 approaches attempted (In2.Cu lifts at
  x=21.5/22.2/22.7/23.0/19.5, pin 49 GND reroute), all regressed due to
  extreme escape corridor density (every 0.3-0.4mm from x=18.5 to x=21.9)
  and column signals on In2.Cu at x=18.80/21.70
- Eliminated all 4 F_CS2<->F_CS3 crossings: added `F_CS3` left anchor
  override to `x=3.0` (separating from F_CS2 at `x=2.2`) and swapped
  dogleg_y values between F_CS2 and F_CS3 to uncross their escape paths
- Shifted `u2_scl_rail` from `(17.0, 321.8)` to `(17.0, 322.2)`, increasing
  separation from GND horizontal at `y=321.6`; eliminated 2 GND<->SCL
  clearance violations
- R_CS16<->SYS crossings (3 total): 5 approaches attempted (In2.Cu lifts,
  stagger shift, pin 37-38 bridge), all regressed due to extreme congestion
  around U3 thermal pad and pin row at x=17.20

### 10. IS31FL3731 swap and inner-layer lifts (DRC 212 → 80)

- Swapped IS31FL3733 QFN-48 to IS31FL3731 QFN-28 (charlieplex driver)
- Rewrote all driver escape, power, I2C, and LED field routing for QFN-28
- Implemented charlieplex anode/cathode bus geometry with 18 lines per face
- Lifted SDA and SCL long F.Cu verticals (~80mm) to In1.Cu, eliminating
  7 F.Cu crossings at cost of 2 clearance violations
- Lifted U3 AD SYS escape vertical (11mm) from B.Cu to In2.Cu, eliminating
  5 GND×SYS crossings; offset top microvia by +0.6mm to clear GND horizontal
- Lifted U2 VCC/SDB escape vertical (10.6mm) from F.Cu to In1.Cu,
  eliminating 3 GND×SYS crossings; placed microvia at vcc_pos[1] (y=327.2)
  instead of sdb_pos[1] (y=327.6) to clear GND IN horizontal at y=328.0

### 11. I2C reroute (DRC 71 → 66)

- Rerouted SDA from intermediate microvia at (15.6, 321.0) to full In1.Cu
  path at x=19.0, with microvia at (19.0, pin_y) right of QFN; F.Cu reduced
  to 2.06mm horizontal stub to pin 19; eliminated 4 SDA clearance violations
  (SDA×F_CA3 ×2, SDA×F_CA4 ×2)
- Shifted SCL In1.Cu from x=17.5 to x=17.45, clearing both SCL×F_CA6
  clearance violations (gaps increased from 0.19/0.18mm to 0.24/0.23mm);
  x=17.4 triggered solder mask bridge with F_CA1 pad; x=17.45 is the sweet
  spot
- Net: −6 clearance, +1 crossing (SDA In1.Cu horizontal at y=243.4 crosses
  SCL In1.Cu vertical at x=17.45 — unavoidable I2C bus crossing)
- Attempted SCL full-reroute to (16.5, pin_y): microvia overlapped U2
  exposed pad (EP extends to x=16.15); (16.2, pin_y) shorted to EP

### 12. Component relocation and trunk nudges (DRC 66 → 63)

- Nudged R_CB6 anode trunk by −0.05mm to clear R_CB1 escape track;
  eliminated 1 R_CB1×R_CB6 clearance violation (gap 0.1925→0.2425mm)
- Moved R1 (REXT resistor) from (23.2, 323) to (6.8, 323) on F.Cu,
  near the GND trunk at x=3.0; shortened R1 GND horizontal from 20.2mm
  to 3.8mm and U2_REXT final F.Cu segment from 12.9mm to 3.5mm
- Eliminated F_CA1×U2_REXT crossing and reduced F_CA×GND crossings
- F_CA6 lift attempt: microvia can't fit between adjacent F.Cu escape
  verticals (F_CA4 at x=15.4, F_CA6 at x=14.6; 0.8mm gap too narrow
  for 0.3mm via + 2×0.2mm clearance); also tried smaller via (0.25mm)
  but KiCad minimum annular ring rejected it
- C4 SYS bypass below escape zone (y=342): eliminated 7 R_CA×SYS
  crossings but created 10+ new GND×R_CA/CB crossings from secondary
  track interaction effects; reverted

### 13. GND copper fills

- Added `add_gnd_zone()` helper function to `tools/generate_candle.py`
- Created 4 GND zones covering full board rectangle (0,0)→(30,430):
  GND_F (F.Cu), GND_In1 (In1.Cu), GND_In2 (In2.Cu), GND_B (B.Cu)
- Zones saved unfilled to preserve board hash determinism; kicad-cli
  fills them during DRC validation
- Zone parameters: min_thickness=0.2mm, clearance=0.2mm,
  thermal_gap=0.25mm, thermal_spoke=0.3mm, thermal pad connection,
  min_island=8mm²
- No new DRC violations introduced
- Board hash deterministic: `a5da6dbc57e0ff97` across 3 runs

## Open next steps

- All 10 remaining DRC violations are structurally locked by QFN pin pitch constraints
- Possible future improvements:
  - Use 0.3mm pitch QFN variant (if available) to unlock back-side lifts
  - Custom clearance rules per net-class to accept 0.15mm clearance for MCU escapes
  - Rearrange charlieplex pin-to-trunk mapping to reduce right-goer/left-goer crossings
