# Candle Research Brief — 2026-04-24

> Reference only.
> This brief documents the faithful-research pass.
> The active build target is `candle_spec_v5_modernized.md`.

Focused research handoff for the faithful `My New Flame` reconstruction path.

This document is narrower than the main faithful spec. Its job is to capture
what this session actually narrowed down about:

- `4xAA NiMH + USB` charging behavior
- stem/base contact clues
- display pixel-map structure
- the architecture classes still compatible with the published product behavior

All claims below are tagged as one of:

- `Published fact`
- `Illustration/photo-derived observation`
- `Reconstruction inference`

---

## 1. Sources used in this pass

### Product-specific sources

- Ingo Maurer current instruction PDF (`USB-C`, accessed 2026-04-24)
- Ingo Maurer older instruction PDF (`USB A -> mini USB B`, accessed 2026-04-24)
- Ingo Maurer official product page
- City Lights SF product page and technical drawing image
- eBay product listing photos for external close-up review

### Charger/power-path reference sources

- TI E2E thread on charging `4x NiMH` from a `5V` source
- Analog Devices `DS2715` product page
- Analog Devices `DS2715` alkaline-detection FAQ
- Analog Devices `LTC4060` product page
- Microchip `AN960` NiMH charger application note

These charger references are not evidence of the original product internals.
They are only used to constrain what is electrically plausible.

---

## 2. Product-side findings

### 2.1 USB and battery behavior

- `Published fact`: the current manual states that the lamp:
  - charges `4 x AA NiMH` cells from USB
  - can be used while charging
  - can run from USB with no batteries inserted
  - shows `yellow` while charging and `green` when full on the base LED
  - accepts standard `1.5V` AA cells for operation, but they must never be
    charged through the USB input

- `Published fact`: the older manual says the same core behavior, but with
  `USB A -> mini USB B`, a `5V DC max. 2000mA` input spec, and an explicit
  low-battery red LED on the candle PCB.

- `Published fact`: the current manual changes the cable and input wording to
  `USB-C` and `5V DC max. 1000mA`, but keeps the same core operating model.

### 2.2 Display field / pixel map

- `Published fact`: the product literature says there are `2 x 128` dimmable
  LEDs.

- `Illustration/photo-derived observation`: the current official manual cover
  art shows a rectangular LED field at the top of the PCB, not a flame-shaped
  physical population.

- `Illustration/photo-derived observation`: local counting of the LED apertures
  in the current official manual cover illustration yields an `8 x 16` array,
  which matches `128` LEDs on one face.

- `Illustration/photo-derived observation`: the City Lights technical drawing
  agrees with the same `8 x 16` rectangular field structure.

- `Reconstruction inference`: the strongest current display hypothesis is:
  - `8 columns x 16 rows` per face
  - one such field on each side of the PCB
  - rectangular physical LED population
  - animated flame image rendered inside that rectangle

- `Still unresolved`:
  - exact LED package
  - exact pitch
  - exact driver ICs
  - whether the two faces are electrically mirrored, independently driven, or
    multiplexed from the same controller block

### 2.3 Stem/base interface

- `Published fact`: the official instructions say insertion into the base
  requires overcoming noticeable resistance.

- `Illustration/photo-derived observation`: the current manual step-5 insertion
  drawing shows `four` dark rectangular features on the lower PCB insertion
  edge.

- `Reconstruction inference`: this makes a concealed socket/contact system more
  likely than a purely decorative friction slot. The most plausible families
  are:
  - edge pads into spring contacts
  - blade-style contact tongues
  - a custom spring socket

- `Reconstruction inference`: the four visible edge features could be:
  - four electrical contacts
  - two duplicated power contacts plus two duplicated ground contacts
  - two electrical contacts plus two auxiliary/mechanical features

- `Still unresolved`:
  - exact contact geometry
  - actual pin count below the visible edge
  - whether any logic/control signals cross the base/stem interface

### 2.4 Teardown search status

- `Illustration/photo-derived observation`: first-pass search across official,
  retailer, and auction/listing sources did not surface a true teardown or
  internal base photo.

- `Reconstruction inference`: we now have better external-geometry evidence,
  but we still do not have teardown-grade proof of the charger IC, socket
  hardware, or internal base PCB layout.

---

## 3. Charger and power-path constraints

### 3.1 What the manuals force us to support

Any faithful charger architecture must explain all of the following at once:

- USB input is `5V`
- the product charges `4` series AA-size NiMH cells
- the lamp can run while charging
- the lamp can run from USB with no batteries installed
- the base has a charge-status LED

### 3.2 What this means electrically

- `Reconstruction inference`: a plain direct linear charger from `5V` into a
  `4S NiMH` pack is not sufficient for faithful fast charging.

- `Reference-backed constraint`: TI support explicitly notes that charging
  `4 x 1.2V` NiMH from a `4.7V–5V` source requires the charger to maintain
  current up to about `2V per cell` worst-case pack voltage, and therefore
  needs a `boost converter` ahead of the current source.

- `Reference-backed constraint`: Analog Devices' `LTC4060` product page states
  that its `4-cell` demo setup needs `8.6V to 10V` input for four series cells.

- `Reference-backed constraint`: Microchip `AN960` uses a dedicated switching
  charger architecture for `4-cell NiMH`, with a charge profile extending above
  the nominal pack voltage.

- `Reconstruction inference`: for this product, the USB charging path therefore
  almost certainly belongs to one of these classes:
  - `5V -> boost/SEPIC/current-regulated 4S charger`
  - `4 loose-cell charger` inside the base
  - a more integrated programmable charger architecture that still includes
    voltage step-up behavior

### 3.3 What the alkaline warning does and does not prove

- `Published fact`: the manuals warn that standard `1.5V` AA cells may power
  the lamp but must never be charged.

- `Reconstruction inference`: this warning does **not** prove that the product
  automatically detects alkaline cells before charging.

- `Reference-backed constraint`: Analog Devices notes that `DS2715`-class
  multi-cell series chargers do not integrate alkaline-cell detection because
  they observe the pack as a whole rather than each cell individually.

- `Reconstruction inference`: a faithful product could therefore rely mainly on
  user compliance plus normal NiMH charge protections, without guaranteeing
  automatic alkaline detection.

This matters because it keeps a series-pack charger architecture plausible.

### 3.4 What seems less likely now

- `Reconstruction inference`: a naive resistor-only or ultra-minimal charger is
  less likely, because the manuals explicitly talk about charging, full-charge
  indication, temperature caution, and broad protective circuitry.

- `Reconstruction inference`: a single-cell Li-ion power-path IC is still ruled
  out for the faithful path.

---

## 4. Architecture shortlist

### Option A — `4S pack + boost/SEPIC charger in base`

Status: `currently the strongest faithful hypothesis`

Why it fits:

- matches the straightforward reading of `4 x AA NiMH` as a pack
- explains why `5V USB` can still charge the pack
- easily supports `USB-only` operation by powering the lamp rail directly from
  USB while charging hardware operates in parallel
- fits a base-centric implementation with local status LED and switch
- remains compatible with only a small number of stem/base contacts

What is still unknown:

- exact charger controller family
- whether the lamp runs from raw pack voltage, a regulated rail, or an ORed
  USB/pack system rail
- exact pinout of the four visible edge features

### Option B — `4 loose-cell charger in base`

Status: `possible, but weaker`

Why it is still on the table:

- would make alkaline-cell avoidance easier in principle
- base has enough volume for a battery-management PCB

Why it is weaker:

- there is no direct evidence yet for per-cell sensing/charging hardware
- the tray illustration reads more like a conventional battery holder than an
  obviously instrumented loose-cell charger
- it does not currently explain the stem interface better than Option A

### Option C — modern integrated programmable charger redesign

Status: `derivative/serviceable, not the best faithful guess`

Why it works technically:

- a modern controller could implement the required behavior cleanly

Why it is weaker for faithful reconstruction:

- it says more about what we can build now than about what Ingo Maurer likely
  shipped around the original USB revisions

---

## 5. Working schematic assumptions for the next session

These are planning assumptions only. They are not locked facts.

### Base block candidates

- USB-C receptacle
- input protection / filtering
- charger power stage
- charge-status LED driver
- toggle power switch
- `4 x AA` battery holder
- concealed stem socket/contact assembly

### Stem block candidates

- `8 x 16` LED matrix on one face
- matching `8 x 16` matrix on the opposite face
- one or more LED-driver ICs near the top/mid section
- local MCU or controller on the stem
- PCB button for dimming / flame-speed control
- possible local low-battery indicator LED on older revision

### Stem/base contact hypotheses

`H1`:
four visible edge pads are really `PWR, PWR, GND, GND`

`H2`:
four visible edge pads are `power + ground + two logic/control lines`

`H3`:
the visible four rectangles are only the exposed part of a more custom contact
system that is not fully revealed by the manual drawing

For the next schematic-planning pass, `H1` should be the starting assumption
because it is the least committal and best aligned with the currently visible
evidence.

---

## 6. What is newly narrowed down

Compared with the previous session boundary, this pass materially improves
three things:

1. The display field is no longer just "some rectangle". The official manual
   artwork supports `8 x 16` per face.
2. The base interface is no longer fully unconstrained. The official insertion
   drawing supports a `4-feature` insertion edge and a concealed socketed
   contact mechanism.
3. The charger space is narrower. A faithful solution is now strongly biased
   toward a `boost/SEPIC-style 4S NiMH charging path in the base`, unless new
   teardown evidence proves a loose-cell charger instead.

What is **not** newly resolved:

- exact charger IC
- exact display driver topology
- exact contact mechanism
- exact interconnect pinout

---

## 7. Recommended next step

Use this brief plus `candle_spec_v4_faithful.md` to draft an
assumption-labeled architecture schematic, not a final PCB.

Suggested order:

1. Draw a base block diagram around `Option A`
2. Keep the stem interface as `H1` unless contradicted
3. Place the display as `8 x 16` per face
4. Mark charger IC, socket geometry, and display driver part numbers as `TBD`
5. Continue teardown search in parallel

---

## 8. Source URLs

- Official product page:
  `https://www.ingo-maurer.com/en/products/my-new-flame/`
- Current manual:
  `https://www.ingo-maurer.com/download/8913404_mynewflameusb_www_dez2024.pdf`
- Older manual:
  `https://www.ingo-maurer.com/download/8913404_mynewflameusb_www_11_2020.pdf`
- City Lights product page:
  `https://citylightssf.com/products/my-new-flame-led-table-lamp-by-ingo-maurer`
- TI E2E `4-cell NiMH from 5V` discussion:
  `https://e2e.ti.com/support/power-management-group/power-management/f/power-management-forum/123445/bq2002-charging-4-nimh-cells-with-5v-source`
- Analog Devices `DS2715`:
  `https://www.analog.com/en/products/ds2715.html`
- Analog Devices `DS2715` alkaline FAQ:
  `https://ez.analog.com/power/battery-management-system/w/documents/29821/ds2715-alkaline-cell-detection`
- Analog Devices `LTC4060`:
  `https://www.analog.com/en/products/ltc4060.html`
- Microchip `AN960`:
  `https://www.microchip.com/en-us/application-notes/an960`
