# Candle Session Summary — 2026-04-24

This file summarizes the full spec-research and cleanup session for the
`candle/` project.

---

## 1. Starting point

Initial state in `candle/`:

- `candle_spec_v3.md` existed as an image-driven concept spec
- `candle_spec_v3.1.md` existed as a delta adding matrix drive, ESP32, motion,
  and smart-home features
- `candle.zip` existed as an archived KiCad proof-of-concept from the same day
- The provided reference render showed black and red variants with a sparse
  lower stem and metallic base

Early problem discovered:

- `v3` and the archived `candle.zip` project were **not faithful** to the real
  product. They used a much smaller board/base and a static crown/dock concept.

---

## 2. What was verified from sources

Primary source set established:

- Ingo Maurer official product page
- Ingo Maurer shop listing
- MoMA collection record
- Current official instruction PDF
- Older official instruction PDF
- Provided local render
- Instructables matrix candle only as an implementation reference

Published product facts confirmed:

- Product: **My New Flame** table lamp, not `One New Flame`
- PCB body: **430 x 30 x 3 mm**
- Base: **90 x 90 x 25 mm**
- Light source: **2 x 128 dimmable LEDs**, `256` total
- Output: **5 V**, **0.6 W**, **2700 K**, **CRI 80**
- Power: **4 x AA NiMH rechargeable** cells or USB power
- Controls:
  - toggle switch in the base
  - control LED in the base
  - button on the PCB
- Current revision: **USB-C**
- Current manual behavior:
  - charges NiMH cells from USB
  - can run while charging
  - can run from USB with no batteries inserted
  - base LED is yellow while charging and green when full
  - standard 1.5 V AA cells may power the lamp but must never be charged

Important revision history discovered:

- Older official instructions document **USB A -> mini USB B**
- Current official product page and current official instructions document
  **USB-C**

---

## 3. What was wrong in the earlier specs

### v3 problems

- Wrong geometry:
  - smaller PCB
  - smaller base
- Wrong product concept:
  - dock / pogo-power approach
  - static single-sided crown
  - continuous decorative population down the whole stem
- Claimed faithfulness where there was none

### v3.1 problems

- Improved the animation idea, but still inherited the wrong v3 dimensions and
  dock concept
- Added invented product features:
  - mmWave sensor
  - UART pogo link
  - ESP32-C6 / Matter / smart-home path
  - removal of switch, battery, and button
- Reframed the lamp as a connected motion-responsive object rather than a
  faithful replica

Useful v3.1 takeaway retained:

- The old “parallel LEDs with simple flicker” concept is not good enough for a
  convincing flame. A **driven display / matrix-style animation path** is the
  right direction for any serious reconstruction.

---

## 4. Documentation created or updated

### Added

- [README.md](/Users/unit117/Dev/kicad/candle/README.md)
- [candle_spec_v4.md](/Users/unit117/Dev/kicad/candle/candle_spec_v4.md)
- [candle_spec_v4_faithful.md](/Users/unit117/Dev/kicad/candle/candle_spec_v4_faithful.md)
- [refs/source_documents.md](/Users/unit117/Dev/kicad/candle/refs/source_documents.md)
- [refs/provided_reference_render.png](/Users/unit117/Dev/kicad/candle/refs/provided_reference_render.png)
- [specs/candle_spec_deviations.md](/Users/unit117/Dev/kicad/candle/specs/candle_spec_deviations.md)

### Updated

- [candle_spec_v3.md](/Users/unit117/Dev/kicad/candle/candle_spec_v3.md)
  to mark it as superseded and archive-only

---

## 5. Most important spec improvements

### A. Source discipline

The faithful spec now explicitly separates:

- published fact
- photo-derived observation
- reconstruction assumption

This is the main structural improvement over the earlier drafts.

### B. Current-revision correction

The faithful path now targets the **current USB-C revision**, while preserving
the older mini-USB manual as revision history.

### C. Product behavior correction

The faithful path now correctly preserves:

- battery capability
- base switch
- base control LED
- PCB button
- USB charging and USB-only operation

### D. Rejection of unsupported internals

The faithful spec no longer presents hidden details as known facts, such as:

- exact charger IC
- exact driver IC
- exact contact mechanism
- exact layer count
- exact matrix topology

---

## 6. Technical errors caught and corrected

### MCP73871 error

Earlier draft problem:

- `MCP73871` was suggested as if it could serve the faithful `4xAA NiMH`
  architecture

Why it was wrong:

- MCP73871 is a **single-cell Li-Ion / Li-Poly** charger family, not a
  4-cell NiMH charger

Result:

- The faithful spec now explicitly forbids using a single-cell Li-ion charger
  as the assumed faithful solution
- The charger architecture is now marked as unresolved and requiring dedicated
  research

### “Flame silhouette” overclaim

Earlier draft problem:

- asserted a physically flame-shaped LED arrangement as if it were known

Correction:

- published text says the LEDs form a **rectangle**
- current faithful spec now distinguishes:
  - likely rectangular physical LED field
  - flame-shaped emitted image during operation

### Overall height inconsistency

Retailer listings often cite around `400 mm` overall height, but that does not
cleanly reconcile with `430 mm` PCB + `25 mm` base.

Current handling:

- use the published PCB/base body dimensions as hard constraints
- do not treat the single overall-height number as mechanically authoritative
  until physically measured

---

## 7. Current faithful-spec open items

These remain unresolved for a truly faithful PCB reconstruction:

1. **4-cell NiMH USB charging / load-sharing architecture**
   - highest-priority open engineering question
   - must support:
     - USB-only operation with no cells installed
     - charging 4xAA NiMH from USB
     - simultaneous powering + charging
     - safe handling of standard 1.5 V AA cells

2. **Display implementation**
   - exact LED package
   - exact pitch
   - exact pixel map
   - exact driver topology

3. **Stem-to-base interconnect**
   - the product clearly inserts into the base with noticeable resistance
   - hidden mechanism still unknown
   - could be edge fingers, spring contacts, blade contacts, or custom socket

4. **Current-revision low-battery indicator**
   - older manual documents a red low-battery LED on the board
   - current USB-C manual does not clearly restate it
   - likely revision-specific, but not yet fully confirmed

5. **Photo / teardown evidence**
   - high-resolution unlit photos
   - repair/teardown references
   - internal base photos
   - any evidence for charger IC, driver IC, or contact system

---

## 8. Readiness for next session

### Are we ready to build the PCB next session?

**Short answer: not for a final faithful PCB.**

We are **ready to continue**, but not ready to lock a faithful board design and
route it end-to-end without first resolving the main unknowns.

### What we are ready for

Next session can safely start any of these:

- targeted research on the **4-cell NiMH USB charging architecture**
- teardown / photo search for the **stem-to-base contact mechanism**
- photo analysis / pixel-map derivation for the **2 x 128 LED display**
- schematic planning using clearly marked `reconstruction assumptions`
- a derivative-spec branch if the goal shifts to ESP32 / IMU / MQTT

### What we are not ready for

We should **not** start a final faithful PCB layout if the goal is “close the
design and fabricate” while these are still open:

- charger / power-path topology
- hidden stem/base interconnect
- display topology and pixel map

### Practical verdict

- **Faithful production-ready PCB next session:** **No**
- **Faithful research-to-architecture session next session:** **Yes**
- **Derivative PCB (ESP32 + sensor + MQTT) next session:** **Yes**, if that is
  explicitly chosen as a non-faithful branch

---

## 9. Recommended next-session agenda

Suggested order:

1. Research and shortlist viable **4-cell NiMH USB charging** architectures
2. Search for teardown / repair / internal photos of `My New Flame`
3. Derive the **visible LED field / pixel map** from photography
4. Decide whether to:
   - continue the faithful reconstruction path
   - or fork a derivative smart/sensor build

If the faithful path stays active, the next document that would help most is a
short `research_brief.md` for:

- charger architecture
- contact mechanism
- pixel-map derivation

---

## 10. Current recommended source of truth

Use:

- [candle_spec_v4_faithful.md](/Users/unit117/Dev/kicad/candle/candle_spec_v4_faithful.md)

Treat these as archive/reference only:

- [candle_spec_v3.md](/Users/unit117/Dev/kicad/candle/candle_spec_v3.md)
- [candle_spec_v3.1.md](/Users/unit117/Dev/kicad/candle/candle_spec_v3.1.md)
- `candle.zip`
