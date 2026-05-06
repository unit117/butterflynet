# Candle — v4 Source-Grounded Replication Spec

> Reference only.
> The active build target is `candle_spec_v5_modernized.md`.

Source-grounded replication brief for the black variant of *My New Flame*
(`Moritz Waldemeyer, Ingo Maurer und Team, 2012`).

This file supersedes [`candle_spec_v3.md`](./candle_spec_v3.md) for any work
claiming visual or dimensional fidelity.

---

## 1. Source hierarchy

When sources disagree, use them in this order:

1. Official Ingo Maurer product page for `My New Flame`
2. MoMA collection record for object `169654`
3. MoMA Design Store listing
4. Provided render in [`refs/provided_reference_render.png`](./refs/provided_reference_render.png)

The render is visual-only. It does not override published dimensions or
electrical/product behavior.

---

## 2. Product target

Replicate the **table lamp** `My New Flame`, not the suspended `One New Flame`
variant.

The target object is:

- A narrow exposed PCB body
- A polished/chromed square metal base
- A **dual-sided** animated flame display at the top
- A black PCB colorway
- USB-powered and battery-capable consumer product behavior, not a fixed dock

Do **not** use the v3 assumptions of a small brushed-aluminium dock, pogo-only
power entry, or a static single-sided 60-LED crown.

---

## 3. Confirmed facts from published sources

### Form factor

- Official manufacturer dimensions: **PCB `430 x 30 x 3 mm`; base `90 x 90 x 25 mm`**
- MoMA collection dimensions: light element **`42.5 x 2.5 x 0.3 cm`**
- MoMA collection records the base at roughly **`25 mm` high** with a footprint
  near **`90–95 mm` square**

### Light engine

- **Two displays with `128` dimmable LEDs each**
- **`256` LEDs total**
- **`2700 K`**
- **CRI `80`**
- Published product power: **`5 V`, `0.6 W`**

### Power and controls

- Operates from **`4 x NiMH AA`** batteries **or** a **USB-C cable**
- The base includes a **switch** and a **control LED**
- The PCB includes a **button** used to adjust flame intensity and speed

### Finishes and variants

- PCB colors offered publicly: **black**, **red**, **white**
- The black board is the reference target for this folder

---

## 4. Reconciled dimensional target

Use the official manufacturer envelope as the implementation target unless a
museum-specific repro is explicitly requested:

| Element | Target |
|---|---|
| PCB body | **`430 x 30 x 3 mm`** |
| Base | **`90 x 90 x 25 mm`** |
| PCB thickness | **`3.0 mm` visual thickness** |

Notes:

- The museum record is slightly smaller (`425 x 25 x 3 mm` for the light
  element). Treat this as measured-object variance, not grounds to shrink the
  entire design by a third as v3 did.
- If a museum-dimension build is chosen instead of the manufacturer nominal,
  log it in [`specs/candle_spec_deviations.md`](./specs/candle_spec_deviations.md).

---

## 5. Visual replication requirements

### Overall read

- The object must read as a **real production lamp**, not as generic PCB art
- The top flame region must be **narrow, vertical, dense, and emissive**
- The base must read as **polished metal / chromed steel**, not brushed billet
  aluminium and not powder-coated grey

### PCB composition

Use the provided render as the composition reference:

- Upper section: dense flame display plus supporting electronics
- Midsection: visible controller/driver area, a small pushbutton, passives, and
  exposed routing
- Lower section: materially **sparser** than v3, with negative space above the
  base rather than continuous full-length population

The v3 rule "`no empty stretch longer than 10 mm`" is not faithful to the
published product photography and should not be reused.

### Flame region

- The flame is a **display-like block**, not a handful of discrete indicator
  LEDs
- The effect must be **animated**, not static
- The flame must be readable from both front and rear, matching the published
  `128 LEDs each` claim

---

## 6. Electrical/product behavior requirements

### Required

- **USB-C powered operation**
- **Battery-capable operation** using `4 x NiMH AA`
- **On/off switching in the base**
- **At least one control/status LED in the base**
- **At least one button on the PCB** for brightness / flame-speed control
- **Animated flame rendering** driven by electronics on the PCB/base system

### Not acceptable as a "faithful" build

- Static warm-white crown with no animation
- Wired-only pogo dock with no battery path
- No control button on the PCB
- No switch in the base
- Single-sided flame display

Any of the above may still be built as a study model, but only if clearly
logged as a deviation.

---

## 7. Engineering assumptions for KiCad capture

The public sources do not fully disclose the internal implementation, so the
following are working assumptions, not yet confirmed by teardown data:

- A **2-layer PCB** is acceptable as an initial capture assumption
- The flame is implemented as a **top-mounted dual-sided LED matrix or paired
  display modules**
- The logic needed for flame playback, dimming, and speed control is distributed
  between the PCB stem and the base
- The base contains the battery holder and at least part of the power-path /
  charging hardware
- The stem-to-base electrical interconnect is unresolved and must not be
  invented as "authentic" without more evidence

### Secondary implementation reference

The user-supplied Instructables build
(<https://www.instructables.com/Matrix-LED-Light/>) is a useful **engineering
reference** for:

- video-driven flame playback on a matrix display
- rechargeable battery operation
- charger / switch / shaft packaging strategy

It is **not** a fidelity reference for `My New Flame` dimensions, materials, or
published product architecture.

---

## 8. Open items that still need evidence

These items are not recoverable with confidence from the supplied public
references alone:

- Exact LED package and pitch for the flame display
- Exact board-to-base electrical/mechanical interconnect
- Whether the USB-C path charges batteries, bypasses them, or both
- Exact MCU / driver topology
- Exact copper finish, soldermask sheen, and silkscreen treatment
- Exact component identities in the midsection

Do not hard-code any of those as "1:1 faithful" until they are backed by
additional photography, teardown data, or original documentation.

---

## 9. Known v3 mismatches

The archived v3 concept conflicts with the published product in at least these
ways:

- PCB was shrunk from roughly `430 x 30 x 3 mm` to `275 x 22 x 1.6 mm`
- Base was shrunk from roughly `90 x 90 x 25 mm` to `58 x 58 x 28 mm`
- Flame engine was reduced from `256` LEDs total to `60`
- Flame was made static instead of animated
- Power path was changed from battery-capable + USB-C to pogo-fed dock power
- Base switch and PCB control button were removed
- Lower-body sparsity was replaced with continuous decorative population

That older concept can still be useful as a tooling exercise, but not as a
faithful product reproduction.

---

## 10. Deviations policy

Any deliberate deviation from this v4 spec must be logged in
[`specs/candle_spec_deviations.md`](./specs/candle_spec_deviations.md) with:

1. The section being changed
2. The exact replacement decision
3. The source gap or implementation constraint that forced the change
4. The impact on faithfulness

If a build is intentionally simplified for a proof-of-concept, say so plainly.
Do not describe a simplified study model as a 1:1 replica.
