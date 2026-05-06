# Candle — v3 Build Specification (Superseded)

> Superseded on 2026-04-23 by [`candle_spec_v4.md`](./candle_spec_v4.md).
> v3 is an image-driven approximation and is not source-faithful to the
> published dimensions, LED count, or power architecture of *My New Flame*.
> Keep this file only as an archived concept spec.

Archived concept for an image-driven PCB-sculpture lamp. Tall black PCB with
dense warm-white LED crown, fully populated decorative midsection, USB-C power
input through a solid metal base.

This archived file is no longer the active source of truth. Use
[`candle_spec_v4.md`](./candle_spec_v4.md) for any new work.

---

## 1. Design intent — read before generating

The reference for this archived concept is the provided render in
[`refs/provided_reference_render.png`](./refs/provided_reference_render.png). It
depicts a technical sculpture that
reads as a real, production electronic device. The visual grammar is:

- **Black soldermask + gold (ENIG) pads and traces.** No red, no matte white,
  no silkscreen art on the front face.
- **Dense, uniform rectangular LED crown** at the top — reads as a solid
  emissive block, not individual dots, from 1 m viewing distance.
- **Continuously populated PCB down the full length.** No empty stretches
  longer than 10 mm between the crown and the base.
- **Orthogonal trace art only.** 90° corners, parallel buses, thermal relief
  spokes. No curved, branching, organic, or 45° traces anywhere.
- **Every footprint is populated**, even if electrically inert. Unused
  decorative footprints receive non-connected ICs or 0 Ω / 100 nF passives
  of the correct package.
- **Solid metal-look base.** Brushed aluminium aesthetic, substantial
  proportions (visually heavy), cleanly machined appearance.
- **USB-C input on the back of the base.** Side-mounted receptacle, hidden
  from front view.

If a choice is ambiguous, pick the option that makes the finished board look
more like a production electronic device and less like a stylised rendering.

---

## 2. Overall dimensions — matched to reference proportions

The reference object has an aspect ratio of approximately **1 : 8** (base
width to total height), with the PCB occupying roughly 85% of the total
height.

| Parameter | Value |
|---|---|
| Total assembled height | **310 mm** |
| Base footprint | **58 × 58 × 28 mm** |
| PCB length | **275 mm** |
| PCB width | **22 mm** |
| PCB thickness | **1.6 mm** |
| PCB protrusion above base | **263 mm** |
| PCB insertion depth into base | **12 mm** |

The increase from v2 (215 → 275 mm PCB) better matches the reference's slender
tall silhouette. The base widens proportionally.

---

## 3. PCB mechanical

| Parameter | Value |
|---|---|
| Outline | 275 × 22 mm rectangle |
| Top corners | Rounded, R 2 mm |
| Bottom corners | Square |
| Thickness | 1.6 mm FR4 |
| Copper | 1 oz both sides |
| Soldermask | **Matte black** (non-negotiable) |
| Silkscreen front | **None** |
| Silkscreen back | White, reference designators only, 0.8 mm text height, near components only |
| Finish | **ENIG** (non-negotiable — gold pads are core to the aesthetic) |
| Layer count | 2 |

### Mounting holes
- 2× 3.2 mm clearance holes (M3), non-plated
- Position: 4 mm from bottom edge, 4 mm from each long side
- Keep-out: 2 mm radius both layers

### Base interface (bottom 20 mm)
- 4× spring-loaded pogo pin landing pads on back side
- Pad diameter: 2.0 mm, gold-plated (ENIG)
- Pad positions, measured from bottom edge of PCB:
  - Pad 1 (VCC): 10 mm up, 5 mm from left edge
  - Pad 2 (VCC): 10 mm up, 5 mm from right edge (redundant for current capacity)
  - Pad 3 (GND): 14 mm up, 5 mm from left edge
  - Pad 4 (GND): 14 mm up, 5 mm from right edge
- Dual VCC and GND pads distribute the 250 mA crown current safely across
  multiple pogo contacts
- Polarity markers ("+" / "−") in back silkscreen only, not in copper

---

## 4. Top LED crown — faithful density

This is the defining visual element. The reference's LED crown reads as a
dense block of emission approximately **16 × 10 mm** in active area with
visible individual LED positions only on close inspection.

### Array geometry
- **60 LEDs total**, arranged as **12 columns × 5 rows**
- Package: **0603** warm white, 2700 K, Vf 3.0 V typical, If_max 20 mA
- Horizontal pitch: **1.8 mm** centre-to-centre
- Vertical pitch: **2.0 mm** centre-to-centre
- Active emission area: **19.8 × 8.0 mm**
- Centred horizontally on PCB (1.1 mm margin each side)
- Top LED row: 4 mm from PCB top edge
- Bottom LED row: 12 mm from PCB top edge

### Electrical
- All 60 LEDs in parallel with individual current-limit resistors
- Resistor package: **0402**, value **330 Ω 1%**
- Resistors mounted on **back side**, one directly behind each LED
- At 5 V USB-C input: (5.0 − 3.0) / 330 = **6 mA per LED**
- Total crown current: **360 mA**
- This is bright — matches the reference's visible emission intensity
- Each LED connects to its resistor via a 0.3 mm drill / 0.6 mm annular via
- Anodes bussed to a 1.0 mm wide VCC trace running horizontally above the array
- Resistor second terminals tie to a 1.0 mm wide GND pour on the back

### Routing note
At 1.8 × 2.0 mm pitch with 0402 resistors behind 0603 LEDs, clearances are
tight. Courtyard DRC exception is expected and acceptable in the crown region.
If necessary, fall back to **1.9 mm horizontal pitch** — do not reduce LED
count.

---

## 5. Midsection — six zones, fully populated

PCB region from 14 mm to 254 mm (240 mm length) divided into **8 zones of
30 mm each**. Every zone fully populated. No empty stretches.

Zone boundaries measured from PCB top edge.

### Zone 1 — Driver cluster (14–44 mm)
Just below the LED crown, mimicking the driver IC area.
- 1× QFN-16 footprint, 3×3 mm, centred — non-connected dummy IC
- 8× 0603 decoupling capacitors (100 nF X7R), 4 per side of the QFN
- 2× 0603 flanking resistors (0 Ω) at the top edge of the zone

### Zone 2 — Dual SOIC indicator block (44–74 mm)
Reference shows two rectangular IC packages side-by-side that read as a
two-digit display.
- 2× SOIC-8 footprints, long axes vertical, 5 mm centre-to-centre
- Populate with any non-connected SOIC-8 (74HC-series logic is cheapest)
- 4× 0603 passives between them (2× 100 nF caps, 2× 0 Ω resistors)
- 2× 0603 passives below (decoupling caps)

### Zone 3 — Small bus fanout (74–104 mm)
Visual variety — smaller packages, more passives.
- 1× SOT-23-6 footprint, centred, non-connected IC
- 6× 0402 passives distributed around it (3 above, 3 below)
- 2× parallel horizontal bus traces (0.2 mm, spaced 0.4 mm) crossing the zone

### Zone 4 — Diamond IC (104–134 mm)
The reference's most distinctive element. Central, rotated 45°.
- 1× **QFN-20 footprint, 4×4 mm, rotated 45°** — reads as a diamond
- Non-connected dummy IC
- 4× 0402 capacitors at the four corners just outside the package, aligned
  to the board's orthogonal grid (not rotated with the IC)
- 4× 0603 passives in a ring one step out from the diamond

### Zone 5 — Resistor network bank (134–164 mm)
Dense passive cluster.
- **2 rows × 10 columns of 0402 resistors** (20 total, all 0 Ω)
- Row pitch: 2.5 mm vertical
- Column pitch: 1.6 mm horizontal
- Block centred, long axes horizontal
- Flanked by 2× 0603 capacitors above and 2× below

### Zone 6 — Small IC + transistor (164–194 mm)
- 1× TSSOP-8 footprint, centred, non-connected IC
- 4× 0603 passives around it
- 1× SOT-23 transistor footprint offset right, non-connected
- 1× SOT-23 diode-like footprint offset left, non-connected
- 1× 0603 LED indicator (warm white, electrically live, 1 kΩ 0603 resistor)
  on centreline — first backscatter indicator

### Zone 7 — Dense passive cluster (194–224 mm)
- 3× SOT-23 footprints in a triangle pattern, all non-connected
- 8× 0402 passives distributed between them
- 4× 0603 passives at the zone corners
- Via field: 9 vias in a 3×3 grid, 1.5 mm pitch, bottom-right of zone

### Zone 8 — Final indicator + base approach (224–254 mm)
- 1× 0603 LED indicator (warm white, electrically live, 1 kΩ 0603 resistor)
  on centreline — second backscatter indicator
- 1× SOT-23-5 footprint, non-connected
- 4× 0402 passives around the SOT-23-5
- 2× parallel horizontal bus traces crossing the zone

---

## 6. Trace art grammar — strict

### Allowed
- Straight horizontal and vertical traces only. **90° corners only, no 45°.**
- **Parallel bus groups**: 3–8 parallel traces, 0.2 mm wide, 0.3 mm spaced,
  placed horizontally across the board at 5 locations along the length
- **Via fields**: uniform rectangular grids of decorative vias (0.3 mm drill)
  in empty zone corners
- **Test points**: 12 round copper pads, 1.5 mm diameter, soldermask opened,
  distributed down the board as punctuation
- **Ground pour thermal relief spokes** — 4-spoke pattern, 0.3 mm spoke width,
  around every through-hole and every QFN/SOIC thermal pad. Do not flood-
  connect thermals. The spoke pattern is core to the aesthetic.

### Forbidden
- Curved or arc traces
- 45° angle traces or corners
- Organic, branching, tree, vine, or fractal shapes
- Logos or text as front-face decoration (back silk only, for reference designators)
- Silkscreen art

### Trace widths
- Power bus (VCC, GND): 0.8 mm
- LED cathode returns: 0.2 mm
- Decorative buses: 0.2 mm
- Zone-internal signal traces: 0.15 mm

---

## 7. Base — metal-look USB-C dock

### Mechanical
- Outer: **58 × 58 × 28 mm**, rounded corners R 3 mm
- Top surface: flat, with a **22.4 × 2 mm PCB slot** centred, asymmetric-keyed
- Slot depth: 12 mm (PCB insertion depth)
- Wall thickness: 2.4 mm
- Material: **PLA with matte metallic grey finish** (e.g. Protopasta
  Aluminium-filled, Polymaker PolyLite Silver, or eSun PLA+ Silver). For a
  true metal option, the base can be CNC-machined from 6061 aluminium with
  a brushed finish — this is the premium SKU path.
- Bottom: 4× rubber feet (3M Bumpon SJ-5302, Ø 7.9 mm)

### USB-C receptacle
- **USB-C 2.0 receptacle**, through-hole or SMT, mounted to internal PCB
- Position: **back face of the base**, centred horizontally, 10 mm from
  the bottom of the base
- Cutout in base enclosure: 9.0 × 3.5 mm (fits standard USB-C receptacle
  bezel)
- No data lines required — **power-only USB-C** with correct **CC
  pull-down resistors (5.1 kΩ each to GND on CC1 and CC2)** so the cable
  negotiates 5 V / 3 A from any compliant USB-C source
- No PD negotiation needed at this power level (crown draws ~360 mA, well
  under 3 A default)

### Internal base PCB
A small 50 × 50 mm 2-layer PCB sits inside the base:
- USB-C receptacle (back edge)
- 2× 5.1 kΩ 0603 CC pull-downs
- 1× input protection diode (optional: SMD Schottky, 1 A, 20 V — e.g. SS14)
- 1× 10 µF input capacitor (X7R, 0805)
- 2× pogo pins for VCC (top face, pointing up), positioned to align with
  PCB back-side pogo pads
- 2× pogo pins for GND (top face, pointing up)
- Pogo pins: **Mill-Max 0906-2-15-20-75-14-11-0 or equivalent**, 1.0 mm
  shaft, 4.5 mm travel, 75 g spring force

No switch. The lamp is on whenever USB-C is connected — matches the dock
behaviour and removes a mechanical failure point.

### Assembly
1. Solder internal base PCB (USB-C, CC resistors, decoupling, pogo pins)
2. Press-fit base PCB into the 3D-printed or machined enclosure
3. Secure with 2× M2 × 6 mm screws into heat-set inserts (if 3D printed) or
   threaded holes (if machined aluminium)
4. PCB inserts from above through the keyed slot; pogo pins engage
   automatically on insertion

---

## 8. Electrical summary

### Power
- Input: **USB-C 5 V / up to 3 A** (actual draw ~370 mA)
- No regulator. LEDs run directly from 5 V rail via per-LED resistors.
- Voltage tolerance: USB-C sources are tightly regulated to 5.0 V ±5%, so
  LED brightness is stable (unlike the AAA-powered v2 which dimmed over
  time).

### Current budget
| Load | Current |
|---|---|
| 60× crown LEDs @ 6 mA | 360 mA |
| 2× indicator LEDs @ 2 mA | 4 mA |
| Protection + decoupling quiescent | ~1 mA |
| **Total** | **~365 mA** |

At 5 V: **1.8 W** power draw. Trivial for USB-C.

### Runtime
Continuous, as long as USB-C is plugged in. No batteries.

---

## 9. BOM — populated parts

### Main PCB (candle column)
| Ref | Qty | Part | Package | Value |
|---|---|---|---|---|
| D1–D60 | 60 | Warm white LED 2700 K | 0603 | — |
| D61–D62 | 2 | Warm white LED 2700 K | 0603 | — (indicators) |
| R1–R60 | 60 | Resistor 1% | 0402 | 330 Ω |
| R61–R62 | 2 | Resistor 1% | 0603 | 1 kΩ |
| R63–R82 | 20 | Resistor | 0402 | 0 Ω (Zone 5 bank) |
| R83–R90 | 8 | Resistor | 0603 | 0 Ω (various zones) |
| C1–C30 | 30 | Capacitor X7R | 0603 | 100 nF |
| C31–C42 | 12 | Capacitor X7R | 0402 | 100 nF |
| U1 | 1 | Non-connected IC | QFN-16 3×3 | — (Zone 1) |
| U2, U3 | 2 | Non-connected IC | SOIC-8 | — (Zone 2) |
| U4 | 1 | Non-connected IC | SOT-23-6 | — (Zone 3) |
| U5 | 1 | Non-connected IC | QFN-20 4×4 | — (Zone 4, rotated 45°) |
| U6 | 1 | Non-connected IC | TSSOP-8 | — (Zone 6) |
| U7 | 1 | Non-connected IC | SOT-23-5 | — (Zone 8) |
| Q1, Q2 | 2 | Non-connected transistor | SOT-23 | — (Zones 6, 7) |
| Q3–Q5 | 3 | Non-connected transistor | SOT-23 | — (Zone 7) |

**Main PCB populated part count: 206**

### Base PCB
| Ref | Qty | Part | Package | Value |
|---|---|---|---|---|
| J1 | 1 | USB-C receptacle 2.0 | SMT | — |
| R1, R2 | 2 | Resistor 1% | 0603 | 5.1 kΩ (CC pulldowns) |
| D1 | 1 | Schottky diode | SMA | SS14 (protection, optional) |
| C1 | 1 | Capacitor X7R | 0805 | 10 µF (input decoupling) |
| PP1–PP4 | 4 | Pogo pin | Mill-Max 0906 | 1.0 mm × 4.5 mm |

---

## 10. Validation checklist

Before marking the design complete:

- [ ] Schematic ERC clean
- [ ] PCB DRC clean (documented courtyard exception for crown array)
- [ ] Visual: crown reads as a solid emissive rectangle from 1 m
- [ ] Visual: no empty stretch longer than 10 mm anywhere from zone 1 to 8
- [ ] Visual: no curved traces, no 45° angles, no branching shapes
- [ ] Visual: every placed footprint has a part assigned
- [ ] BOM confirms ~206 main-PCB populated parts
- [ ] 3D render at 1 m equivalent distance matches reference silhouette
- [ ] USB-C receptacle passes 3 A continuous test (actual draw is 370 mA)
- [ ] Pogo pin alignment: all 4 pogos make contact when PCB is fully inserted

---

## 11. Deviations-from-spec policy

Any forced deviation must be:

1. Documented in `specs/candle_spec_deviations.md` with the specific
   constraint violated and the measured issue
2. Minimal — e.g. shift LED pitch 1.8 → 1.9 mm, not to 3.0 mm
3. Never applied to §1 design intent items: density, continuous population,
   orthogonal traces, black/ENIG, metal-look base, USB-C are all
   non-negotiable

Ambiguous spec items resolve in favour of *more dense, more populated, more
production-looking*, closer to the reference image.
