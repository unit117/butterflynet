# Candle Source Documents

Accessed on **2026-04-23**.

## Primary references

### 1. Ingo Maurer official product page

- URL: <https://www.ingo-maurer.com/en/products/my-new-flame/>
- Key facts used:
  - `My New Flame`, 2012
  - `Two displays with 128 dimmable LEDs each`
  - `5 Volt, 0.6 W LED, 2700 K, CRI 80`
  - `Operated with 4 x NiMH AA batteries ... or via USB-C cable`
  - `Circuit board 430 x 30 x 3 mm`
  - `Base: 90 x 90 x 25 mm`
  - `With switch and control LED in the base`
  - `Flame intensity and speed can be adjusted via a button on the PCB`
  - PCB colors `black`, `red`, `white`

### 2. MoMA collection record

- URL: <https://www.moma.org/collection/works/169654>
- Key facts used:
  - Object title `My New Flame`
  - Designer `Moritz Waldemeyer`
  - Manufacturer `Ingo Maurer GmbH, Germany`
  - Medium `Plastic, LEDs and chromed steel`
  - Light element measured about `42.5 x 2.5 x 0.3 cm`
  - Base measured about `25 mm` high with a footprint near `90–95 mm` square

### 3. MoMA Design Store listing

- URL: <https://store.moma.org/products/my-new-flame-portable-led-lamp-black>
- Key facts used:
  - `256 LED` flame description
  - `four AA rechargeable batteries`
  - `USB cable` included
  - `switch in the base`
  - `small button switch for dimming` on the plate
  - black variant sold through MoMA Design Store

## Provided visual reference

- Local file:
  [`provided_reference_render.png`](./provided_reference_render.png)
- Source path copied from:
  `/Users/unit117/Dev/kicad/candle/CleanShot 2026-04-23 at 23.28.09@2x.png`

Observed from the render:

- Black and red PCB variants are shown
- The flame is a narrow vertical display region, not a round bulb-like source
- The lower stem is sparser than the mid and upper sections
- The base reads as polished metal with a dark bottom pad/foot

## Secondary implementation reference

### 4. Instructables `Matrix LED Candle Light`

- URL: <https://www.instructables.com/Matrix-LED-Light/>
- Accessible summary mirror used for quick text extraction:
  <https://duino4projects.com/matrix-led-candle-light/>
- Why it is useful:
  - demonstrates a plausible hobby-scale animated flame architecture
  - uses a matrix display plus controller instead of a static LED cluster
  - packages battery, switch, charging, and control electronics into a narrow
    candle-like object
- Why it is **not** authoritative for this project:
  - different geometry and materials
  - concrete/aluminium hobby construction, not exposed PCB product styling
  - `18650` + `TP4056` architecture instead of the published `4 x NiMH AA`
    product behavior for `My New Flame`

## Reconciled facts

- The target product is the **table lamp** `My New Flame`, not `One New Flame`
- The PCB body is roughly **`430 x 30 x 3 mm`** in the manufacturer literature
- The museum-measured object is close, but slightly smaller
- The base is roughly **`90 x 90 x 25 mm`**
- The lamp uses **`256` total LEDs**
- The product behavior includes **USB-C**, **battery operation**, **base switch**,
  **base control LED**, and a **PCB-mounted button**
- The Instructables build is best treated as a **proof-of-concept electronics
  reference**, not as a shape or dimension reference

## Source conflicts

### Board size

- Manufacturer: `430 x 30 x 3 mm`
- MoMA collection: `42.5 x 2.5 x 0.3 cm`

Interpretation:

- Treat manufacturer dimensions as the nominal production target
- Treat museum dimensions as measured-object variance

### Base size

- Manufacturer: `90 x 90 x 25 mm`
- MoMA collection shows a slightly larger square footprint in imperial units

Interpretation:

- Treat the base as approximately `90 mm` square and `25 mm` high

### Overall height

- Public sources are not perfectly consistent once board insertion into the base
  is considered

Interpretation:

- Use the published PCB and base envelopes rather than a single assembled-height
  number until direct measurement or teardown data is available

## What not to reuse from the earlier v3 concept

- `275 x 22 mm` board
- `58 x 58 mm` base
- `60`-LED single-sided crown
- pogo-only dock architecture
- continuous full-length component population
- brushed aluminium base interpretation
