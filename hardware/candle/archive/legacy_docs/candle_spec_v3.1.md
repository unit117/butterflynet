# Candle — v3.1 Delta Specification

**Scope of this document:** delta against `candle_spec_v3.md`. Everything in
v3 holds except where explicitly overridden here. When v3 and v3.1 disagree,
v3.1 wins.

**What v3.1 adds:** live candle flicker, smart-home integration, and motion
response, without compromising the v3 §1 design intent (dense, orthogonal,
black/ENIG, production-looking).

**Reference re-grounding:** the v3 reference image is functionally a Matrix
LED Candle Light (MAX7219 + 8×8 matrix). v3's "60 LEDs in parallel" topology
cannot produce a convincing candle flicker — flickering 60 LEDs in lockstep
reads as a failing fluorescent, not a flame. v3.1 replaces the crown
topology with a driven matrix so each pixel can PWM independently at high
refresh rate.

---

## §1 — Design intent addenda

Add to the existing §1 bullets:

- **Flicker must read as a flame, not a strobe.** Animation runs at ≥60 Hz
  per-pixel update, with temporal coherence across neighbouring pixels
  (Perlin-noise field, not independent RNG per LED). A still photo of the
  crown at any instant must show a plausible flame luminance distribution,
  not random noise.
- **Motion response must be invisible when the user is not looking for it.**
  No visible sensor window, no status LEDs other than the two v3 backscatter
  indicators, no fans or vents. The object reads as a sealed sculpture.
- **Smart-home integration is a feature, not a requirement.** The lamp must
  function standalone out of the box — plug in USB-C, it behaves as a
  candle. Matter/HomeKit pairing is opt-in via a reset combo (see §12).

---

## §2 — Dimensions unchanged

No change from v3.

---

## §3 — PCB mechanical, pogo interface expanded

### Base interface (bottom 20 mm) — revised

Replaces v3 §3 "Base interface" in full.

- **6× spring-loaded pogo pin landing pads** on back side (up from 4)
- Pad diameter: 2.0 mm, gold-plated (ENIG)
- Pad layout, from PCB bottom edge:

  | Pad | Signal | Distance up | Distance from left edge |
  |---|---|---|---|
  | PP1 | VCC (5 V) | 10 mm | 5 mm |
  | PP2 | VCC (5 V) | 10 mm | 17 mm (= 5 mm from right) |
  | PP3 | GND | 14 mm | 5 mm |
  | PP4 | GND | 14 mm | 17 mm |
  | PP5 | UART RX (from base → main) | 18 mm | 8 mm |
  | PP6 | UART TX (from main → base) | 18 mm | 14 mm |

- UART pair carries LD2410C presence/movement data from the base sensor
  module up to the main-PCB MCU at 256 000 baud
- ESD protection: 2× 5.1 V TVS diodes (0402 package) on the UART lines,
  placed within 3 mm of PP5/PP6 on the main PCB back side
- Polarity and signal labels in back silkscreen only

Mechanical note: the 6-pad pattern fits within the existing 22 mm PCB width
with 2 mm clearance. Pogo spacing is 12 mm horizontal × 4 mm vertical,
within Mill-Max 0906 minimum spacing.

---

## §4 — Top LED crown, redesigned as driven matrix

Replaces v3 §4 in full. **This is the central change in v3.1.**

### Array geometry
- **64 LEDs total**, arranged as **8 columns × 8 rows** (matches MAX7219
  natively; no mux tricks required)
- Package: **0603** warm white, 2700 K, Vf 3.0 V typical, If_segment 20 mA
- Horizontal pitch: **2.4 mm** centre-to-centre
- Vertical pitch: **2.0 mm** centre-to-centre
- Active emission area: **16.8 × 14.0 mm**
- Centred horizontally on PCB (2.6 mm margin each side)
- Top LED row: 4 mm from PCB top edge
- Bottom LED row: 18 mm from PCB top edge

Density note: v3's 19.8 × 8.0 mm block becomes 16.8 × 14.0 mm — taller
aspect, closer to a real flame silhouette. Pixel count drops 60 → 64 but
reads as substantially more *flame-shaped*. Side-by-side comparison renders
should confirm this before final fab.

### Electrical — MAX7219 driven

- **1× MAX7219CWG** (SOIC-24 wide) in Zone 1, driving the 8×8 matrix
- Column current set by single ISET resistor: **28 kΩ 1% 0603** → ~20 mA
  segment current, ~2.5 mA per LED average at full brightness (1/8 duty)
- Supply decoupling: 1× 10 µF X7R 0805 + 2× 100 nF X7R 0603 on V+ pin
- Data interface: SPI (DIN, CLK, CS) from main MCU, 10 MHz max
- Brightness register controlled per-frame by MCU — no global dimmer
- No per-LED resistors needed (MAX7219 handles constant-current drive).
  The 60× 0402 resistors from v3 §4 are **removed** from the back side
  behind the crown.

### Aesthetic compensation for the removed resistors

Removing 60 back-side 0402 resistors leaves the crown back side looking
sparse, which conflicts with §1 "continuously populated." Compensation:

- **Populate the back side behind the crown with a 6 × 10 decorative 0402
  resistor bank** (60 resistors, 0 Ω, matching the front-side LED pitch).
  These are electrically inert but preserve the "dense fabrication" read
  from behind.
- MAX7219 column and row traces route through this region using orthogonal
  grid routing (§6 grammar applies).

### Routing
- Row drivers (SEG A–G, DP): 0.3 mm traces, horizontal bus across top
- Column drivers (DIG0–DIG7): 0.3 mm traces, vertical stripes from MAX7219
  up into the matrix
- This produces a visible orthogonal grid on the back that reinforces §6
  trace grammar — a genuine functional aesthetic win over v3.

### Current budget (crown)
- MAX7219 @ 20 mA segment, 8 segments multiplexed: effective peak 160 mA
- Averaged over mux cycle: ~100 mA continuous
- Substantially lower than v3's 360 mA — USB-C thermal load is trivial

---

## §5 — Midsection zones, revised for functional ICs

Replaces specific zones from v3 §5. Other zones unchanged.

**Principle:** convert v3 "dummy" footprints into functional ICs wherever
it doesn't compromise the zone's visual signature. A few dummies remain for
purely aesthetic density — preserves §1.

### Zone 1 — Driver cluster (14–44 mm) — revised

- **1× MAX7219CWG (SOIC-24 wide), centred, long axis vertical** — replaces
  the QFN-16 dummy. Footprint is larger than v3's QFN-16 but visually
  appropriate for "driver IC under the display."
- 6× 0603 decoupling capacitors (100 nF X7R), distributed around the SOIC
- 1× 10 µF X7R 0805 bulk cap on V+ pin
- 1× 0603 ISET resistor (28 kΩ 1%)
- 2× 0603 0 Ω flanking resistors preserved from v3 for density

### Zone 2 — Dual SOIC + MCU (44–74 mm) — revised

Keeps the "two-digit display" visual signature but promotes one of the two
SOIC-8s to the real MCU.

- 1× **ATtiny1616 (SOIC-20)** — **only if opting into Tier 1 (standalone,
  no connectivity)**. Runs flicker + SPI to MAX7219 + UART from base.
  OR:
- 1× SOIC-8 dummy (v3 unchanged) — **if opting into Tier 2/3**, where
  the real MCU lives in Zone 4

- 1× SOIC-8 dummy (second of the pair, always present for the visual
  two-digit look)
- 4× 0603 passives between them
- 2× 0603 passives below

### Zone 4 — Diamond IC (104–134 mm) — revised

The diamond footprint is the most distinctive element in the reference. v3.1
promotes it from dummy to the primary MCU.

- **1× ESP32-C6-MINI-1 module, rotated 45°** (replaces QFN-20 dummy).
  Module footprint is ~13.2 × 16.6 mm, which fits Zone 4 once rotated.
  The module's integrated antenna keeps clearance to the top edge — verify
  Wi-Fi/BLE/Thread radiation pattern in DRC (antenna keep-out 15 mm from
  any ground pour).
- Module includes: ESP32-C6 SoC, 4 MB flash, PCB antenna, crystal, RF
  passives. No additional RF work required.
- Power: 3.3 V supplied by a small LDO (see Zone 3 revision below)
- 4× 0402 capacitors at the four corners just outside the module, aligned
  to the board's orthogonal grid
- 4× 0603 passives in a ring one step out from the diamond (unchanged from
  v3)

**Tier choice:** which MCU populates which zone depends on product variant.

| Variant | Zone 2 | Zone 4 | BOM cost | Features |
|---|---|---|---|---|
| **Standalone** | ATtiny1616 | QFN-20 dummy | ~$4 | Flicker + motion only |
| **Smart (Matter)** | SOIC-8 dummy | ESP32-C6-MINI-1 | ~$7 | Flicker + motion + Matter/HomeKit/Thread |

Recommend **Smart** as the default SKU given the reference's "production
device" aesthetic reads more honestly when the diamond IC is functional.

### Zone 3 — Power regulation + bus fanout (74–104 mm) — revised

Existing zone keeps its visual signature but gains a real LDO.

- 1× **SOT-23-5 LDO (e.g. AP2112K-3.3 or equivalent, 3.3 V 600 mA)**,
  centred — replaces v3 SOT-23-6 dummy. Drops 5 V USB-C to 3.3 V for the
  ESP32-C6.
- 2× 10 µF 0805 bulk caps (input and output) flanking the LDO
- 4× 0402 passives distributed around it (4 rather than v3's 6 — two are
  consumed by the bulk caps)
- 2× parallel horizontal bus traces crossing the zone (unchanged)

### Zones 5, 6, 7, 8 — unchanged from v3

These zones remain populated as specified in v3. Exception in Zone 6: the
"LED indicator (warm white, electrically live, 1 kΩ 0603 resistor)" is now
driven by a **GPIO on the ESP32-C6** via a 0603 N-FET (replaces the
SOT-23 dummy transistor in that zone with a real 2N7002). This gives the
MCU a user-visible status LED for pairing/commissioning feedback.

Zone 8's second indicator is wired the same way, using the second
currently-dummy SOT-23.

**Net functional-IC promotion summary:**
- Zone 1 QFN-16 → MAX7219 SOIC-24 (functional)
- Zone 3 SOT-23-6 → AP2112K SOT-23-5 (functional)
- Zone 4 QFN-20 → ESP32-C6-MINI-1 (functional, Smart variant)
- Zone 6 SOT-23 transistor → 2N7002 N-FET (functional, drives indicator LED)
- Zone 8 SOT-23-5 → second 2N7002 for Zone 8 indicator (functional)
- All other footprints remain decorative per v3

---

## §6 — Trace art grammar, unchanged

No change. Orthogonal-only still holds. The new MAX7219 row/column fanout
under the crown naturally produces a grid pattern that reinforces the
grammar.

---

## §7 — Base, upgraded with mmWave sensor and UART bridge

Replaces v3 §7 internal-base-PCB section in full. Mechanical enclosure
dimensions unchanged.

### Internal base PCB — revised

A 50 × 50 mm 2-layer PCB sits inside the base:

| Ref | Qty | Part | Purpose |
|---|---|---|---|
| J1 | 1 | USB-C 2.0 receptacle, SMT | Power input, back edge |
| R1, R2 | 2 | 5.1 kΩ 0603 | CC1/CC2 pull-downs |
| D1 | 1 | SS14 SMA Schottky | Reverse-polarity + ESD |
| C1 | 1 | 10 µF X7R 0805 | Input bulk |
| C2 | 1 | 100 nF X7R 0603 | Input decoupling |
| U1 | 1 | **HLK-LD2410C module** | 24 GHz mmWave presence sensor |
| U2 | 1 | AP2112K-3.3 SOT-23-5 | 3.3 V rail for LD2410C |
| C3, C4 | 2 | 10 µF X7R 0805 | LDO in/out |
| PP1–PP4 | 4 | Mill-Max 0906 pogo pin | 2× VCC, 2× GND |
| PP5, PP6 | 2 | Mill-Max 0906 pogo pin | UART TX, UART RX (from base to main) |
| R3, R4 | 2 | 5.1 V TVS 0402 | UART ESD protection (optional mirror of main-side TVS) |

### LD2410C placement

- Module mounts component-side down (radar face pointing toward front of
  the enclosure for best field of view)
- **Requires radar-transparent enclosure window on the front of the base**
  — this is the single mechanical change vs v3.
- Acceptable window materials:
  - Any PLA (transparent to 24 GHz) — no action needed for the 3D-printed
    SKU
  - Brushed aluminium is **opaque at 24 GHz** — the premium aluminium SKU
    needs a **machined window** on the front face: 20 × 15 mm cutout with
    a 1 mm PC or PETG radome insert, flush-mounted, finished to match the
    surrounding aluminium tone. This is the main manufacturing complexity
    v3.1 adds.
- Detection range: 0.75 – 6 m (configurable via UART), sensitivity per
  gate (0.75 m zones) programmable. Default profile: ignite at <2 m, slow
  fade at >3 m, off after 60 s with no presence.

### UART bridge

- LD2410C talks 256 000 baud 8N1 to the main MCU via the two UART pogo
  pins
- At firmware level, the main MCU polls the LD2410C every 100 ms and uses
  presence + engineering-mode energy values to drive the candle behaviour
  state machine (see §12)

### No switch, no battery, no button

All control is either automatic (motion) or via the smart-home app (Smart
variant). Commissioning reset is via a short-press sequence detected on the
USB-C VBUS rail (3 plug/unplug cycles within 5 s). This preserves the
sealed-sculpture aesthetic.

---

## §8 — Electrical summary, revised

### Current budget

| Load | Current |
|---|---|
| MAX7219 + 64× crown LEDs @ full brightness (1/8 mux) | ~110 mA @ 5 V |
| ESP32-C6, BLE idle, Wi-Fi disconnected | ~30 mA @ 3.3 V (≈ 20 mA @ 5 V) |
| ESP32-C6, Wi-Fi connected, Matter commissioned | ~80 mA avg @ 3.3 V (≈ 55 mA @ 5 V) |
| LD2410C module | ~80 mA @ 5 V |
| LDOs, decoupling, TVS quiescent | ~5 mA |
| 2× indicator LEDs @ 2 mA | 4 mA |
| **Total, worst case (Matter + all on)** | **~255 mA @ 5 V → 1.3 W** |

Comfortably under the USB-C 3 A default. Base PCB copper widths designed
for 500 mA continuous with >50% margin.

### Thermal

MAX7219 at full brightness dissipates ~0.4 W — handled by SOIC-24 package
thermal mass, no heatsink required. ESP32-C6 during Wi-Fi bursts peaks
briefly at 240 mA; MINI-1 module handles this with its integrated thermal
pad.

---

## §9 — BOM delta

Removed from main PCB vs v3:
- R1–R60 (60× 330 Ω 0402) — replaced by single MAX7219 ISET

Added to main PCB vs v3:
- 1× MAX7219CWG (Zone 1)
- 1× AP2112K-3.3 (Zone 3)
- 1× ESP32-C6-MINI-1 (Zone 4, Smart variant) OR 1× ATtiny1616 (Zone 2, Standalone variant)
- 2× 2N7002 N-FETs (Zones 6 & 8, replacing 2 SOT-23 dummies)
- 2× 5.1 V TVS 0402 (UART ESD near PP5/PP6)
- 2× 10 µF 0805 (LDO bulk)
- 1× 28 kΩ 0603 (MAX7219 ISET)
- **60× 0 Ω 0402 decorative resistor bank** behind the crown (aesthetic
  compensation for the removed current-limit resistors — net 0402 count
  approximately preserved)

Added to base PCB vs v3:
- 1× HLK-LD2410C mmWave module
- 1× AP2112K-3.3 LDO
- 2× additional pogo pins (PP5, PP6 for UART)
- 2× 10 µF bulk caps (LDO in/out)
- 2× 5.1 V TVS 0402 (UART ESD)

**Approximate BOM cost delta (Smart variant, qty 100):**
- Removed: 60× 330 Ω @ $0.002 = $0.12 saved
- Added: MAX7219 (~$1.80) + ESP32-C6-MINI-1 (~$2.20) + LD2410C (~$2.50) +
  2× LDO (~$0.30) + misc passives/FETs (~$0.30) = **~$7 per unit added**

Total BOM cost increase: ~$7 (Smart) or ~$2 (Standalone with ATtiny).
Justifiable for a product that transitions from "lamp" to "connected
object."

---

## §10 — Validation checklist, additions

Add to the v3 checklist:

- [ ] Flicker animation running on target MCU produces >60 Hz per-pixel
      updates with no visible tearing
- [ ] Still-frame captures of the crown at 10 random phases all look
      plausibly flame-shaped (not noise)
- [ ] LD2410C detection range verified: ignite <2 m, fade at >3 m, off
      after configurable timeout
- [ ] mmWave radiation pattern verified through the front window of the
      base enclosure (1 mm PC radome for aluminium SKU; PLA front for
      printed SKU)
- [ ] UART ESD survives ±8 kV contact discharge per IEC 61000-4-2 on PP5/PP6
- [ ] Smart variant: Matter commissioning via Apple Home completes in <60 s
      from first USB-C plug-in
- [ ] Smart variant: Thread border router handover tested (if applicable to
      user's ecosystem)
- [ ] Firmware OTA path validated (ESP-IDF OTA partition layout, A/B
      rollback)
- [ ] Standalone variant: ATtiny1616 flicker routine fits in 16 KB flash
      with motion handling and SPI to MAX7219

---

## §11 — Deviations, unchanged policy

v3 §11 policy applies to v3.1. Non-negotiables are preserved:
- Black soldermask + ENIG
- Orthogonal traces only
- Continuous population, no gaps >10 mm
- Metal-look base
- USB-C input

v3.1 adds to the non-negotiables:
- **Per-pixel PWM flicker** (not group flicker)
- **Hidden motion sensor** (no visible sensor window on the column)

---

## §12 — Firmware architecture (new section)

### State machine

```
           ┌─────────┐
           │   OFF   │ (no USB-C, or hard commissioning reset)
           └────┬────┘
                │ USB-C plug-in
                ▼
           ┌─────────┐
           │  IDLE   │ very low brightness, slow flicker
           └────┬────┘
                │ LD2410C: presence within 2 m
                ▼
           ┌─────────┐
           │  BURN   │ full flicker animation
           └────┬────┘
                │ no presence for 60 s (configurable)
                ▼
           ┌─────────┐
           │ FADING  │ 10 s smooth fade back to IDLE
           └────┬────┘
                └───► IDLE
```

In Smart variant, each transition is also exposed via Matter as attribute
updates on a `LevelControl` + `OnOff` cluster, so scenes like "dim all
candles at 23:00" work through Home Assistant / Apple Home automation.

### Flicker algorithm

- 2D Perlin noise field, 8×8 resolution matching the matrix
- Time-varying: Z-axis of noise advances at ~1.5 "candle seconds" per real
  second
- Base luminance map biases bottom rows brighter (flame base) and top rows
  more volatile (flame tip turbulence)
- Global brightness modulated by a second 1/f noise signal (slow envelope)
- Frame rate: 60 Hz per-pixel update, MAX7219 refreshed at 800 Hz
  internally for flicker-free appearance on camera

Reference implementations:
- Evil Mad Scientist's original digital-candle work (public-domain
  algorithm sketches)
- The `esphome_candle` component if going ESPHome-native for the Smart
  variant (recommended — trivially integrates with Home Assistant)

### Commissioning UX (Smart variant)

- First plug-in: LED Zone 6 indicator slow-pulses while ESP32-C6 advertises
  Matter commissioning
- User scans Matter QR code printed on the base underside (and included on
  the packaging)
- Zone 8 indicator solid-on when commissioned
- Power-cycle 3× within 5 s to force-reset to uncommissioned state

---

## §13 — Open questions for v3.2

Parked for future iteration:

1. **Ambient light sensor?** A TSL2591 hidden under the crown could auto-dim
   the lamp in dark rooms. Adds ~$1.20 and one more I²C trace. Probably
   worth it, but not blocking v3.1.
2. **Colour temperature tuning?** Current spec is fixed 2700 K warm white.
   A bi-colour crown (alternating 2200 K + 3000 K LEDs) would allow
   warm/cool blend via per-column dimming. Doubles the matrix driver
   complexity (2× MAX7219) — probably v4 territory.
3. **Directional motion response.** LD2410C reports distance but not
   angle. A second LD2410C or a 2-antenna mmWave SoC (e.g. Infineon
   BGT60LTR11) would enable "flame leans toward you" behaviour. Novel,
   delightful, but ~$8 additional cost — probably a premium SKU feature.
4. **Haptic/acoustic cue on ignition?** A tiny piezo in the base could do
   a subtle "match strike" sound when BURN is entered. Risk: crosses the
   line from "subtle sculpture" to "toy." Probably no, but worth
   prototyping once.
