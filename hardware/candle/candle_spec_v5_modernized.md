# Candle — v5 Modernized Build Spec

Working build target for the next implementation session.

This spec intentionally shifts the project from:

- `historically faithful hidden architecture`

to:

- `externally faithful, internally modernized build`

The purpose is to remove teardown dependency and lock an architecture that is
practical to capture in KiCad next session.

---

## 1. Build intent

This path keeps the product identity that matters visually and behaviorally at
the object level:

- slender exposed PCB stem
- square metallic base
- dual-sided animated flame display
- PCB button
- base switch
- base status LED
- USB-C charging/power input

This path does **not** attempt to preserve the original hidden electrical
architecture where doing so would slow or weaken the build.

### Explicit decision

The next build effort should use this modernized spec as the source of truth,
not the faithful reconstruction documents.

---

## 2. What we are preserving

These remain important:

- overall silhouette and proportions
- published board and base envelopes:
  - PCB body: `430 x 30 x 3 mm`
  - base: `90 x 90 x 25 mm`
- polished metallic base appearance
- sparse lower stem composition
- animated flame at the top of the board
- two LED fields, one per face
- likely `8 x 16` visible LED field per face
- warm flame-like output
- base-mounted toggle switch
- base-mounted status LED
- PCB-mounted button for user control
- USB-C current-era external interface

---

## 3. What we are intentionally not preserving

These are no longer design constraints for the build path:

- original `4 x AA NiMH` charger topology
- historical battery chemistry
- original internal power-path implementation
- original stem/base contact mechanism
- exact original LED driver topology
- teardown dependency before schematic capture

This means the build is **not** a historically faithful reconstruction.
It is a modernized interpretation with high external fidelity.

---

## 4. Architecture decision

### Selected direction

Use a `1-cell rechargeable lithium` architecture in the base with USB-C power
input and a modern charger/power-path IC.

Reason:

- far easier than `5V -> 4-cell NiMH charging`
- better supported by modern charger ICs
- simpler simultaneous power + charging behavior
- simpler USB-only operation
- better part availability and reproducibility
- removes the biggest blocker from the faithful path

### Consequence

The base no longer needs to be architected around the original `4 x AA NiMH`
electrical behavior. It may still retain a removable cover for service access,
but the internal battery implementation is now a modern design choice.

---

## 5. Power architecture

### Base-side power blocks

- USB-C receptacle as a `5V sink only`
- USB-C CC resistors for standard `5V` sourcing
- input protection and filtering
- `1S` lithium charger with power-path / load-sharing behavior
- protected rechargeable lithium cell in the base
- charge-status LED driven from charger status outputs or MCU logic
- base toggle switch controlling lamp system power

### System behavior target

The build should support:

- normal operation from the battery
- operation while USB-C is connected
- charging while the lamp is operating
- operation from USB-C even if the battery is empty or disconnected

### Preferred implementation style

Keep charging and battery management in the base.

Keep only system power crossing the base-to-stem interface unless a later
mechanical decision forces otherwise.

---

## 6. Stem/base interconnect

### Selected direction

Use a concealed blind socket with `4` contact features.

Default pin strategy:

- `SYS+`
- `SYS+`
- `GND`
- `GND`

Reason:

- consistent with the official insertion drawing showing four edge features
- mechanically robust
- keeps the stem electrically simple
- avoids unnecessary logic lines through the socket
- allows the stem MCU to live entirely on the PCB

### Mechanical goal

Insertion should still feel guided and resistant, like a real socket
engagement, not a decorative drop-in slot.

The exact contact hardware is a modern design choice:

- spring contacts
- blade contacts
- custom socket features

Any of those are acceptable in this path.

---

## 7. Display architecture

### Selected direction

Treat each face as an `8 x 16` warm-white LED matrix.

Use:

- one matrix per face
- one dedicated driver per face, or an equivalent dual-matrix driver approach
- firmware-controlled animation rather than a hardwired flicker effect

### What matters

- the flame must read as a narrow animated candle flame
- the physical LED population should remain rectangular
- the emitted image can vary inside that rectangle

### What does not matter anymore

- matching the original hidden driver topology
- proving whether the original product multiplexed both faces in the same way

---

## 8. Control architecture

### Selected direction

Place the main control MCU on the stem.

Reason:

- the button is on the stem
- the display is on the stem
- the socket can then carry only power
- firmware and LED timing stay local to the display hardware

### Firmware scope

The modernized build should include:

- animated flame playback
- brightness control
- optional flame-speed control
- optional preset selection via long-press / multi-press behavior

### Explicit non-goals

Do **not** pull in the old `v3.1` smart-object direction:

- no ESP32 requirement
- no mmWave sensor
- no MQTT
- no Matter / Home Assistant work

Those features increase scope without helping the lamp build.

---

## 9. Working block split

### Base

- USB-C power entry
- charger / power-path
- lithium cell
- status LED
- toggle switch
- concealed stem socket

### Stem

- local regulator for logic if needed
- MCU
- two LED matrix driver blocks
- front LED matrix
- rear LED matrix
- PCB button

This is the default partition for the next session.

---

## 10. Build assumptions to lock now

These are intentionally locked so next session can build instead of reopening
the same questions:

1. The build is `modernized`, not historically faithful.
2. Teardown is optional, not blocking.
3. Battery chemistry is `1S rechargeable lithium`, not `4 x AA NiMH`.
4. USB input is `USB-C 5V sink only`.
5. Base-to-stem interface carries power only by default.
6. Display is `8 x 16` per face unless board-layout evidence forces adjustment.
7. MCU lives on the stem.
8. No wireless or sensor scope is included.

---

## 11. Open items that can stay open into schematic capture

These do **not** block next session:

- exact charger IC part number
- exact lithium cell format
- exact spring-contact hardware
- exact LED package selection
- exact MCU family
- exact matrix driver part number

Those should be decided during schematic capture and early layout, not before
the build session starts.

---

## 12. Build-readiness verdict

For the modernized path:

- production-faithful reconstruction readiness: `not the target`
- modernized architecture readiness: `yes`
- next-session schematic-capture readiness: `yes`

The main blocker from the faithful path, `4-cell NiMH charging from 5V`, is now
removed by design rather than solved by archaeology.

---

## 13. Relationship to the older documents

Use these as follows:

- `archive/legacy_docs/candle_spec_v4_faithful.md`
  - reference only for historical/product constraints
- `archive/legacy_docs/research_brief.md`
  - reference only for display/contact evidence and why the faithful path
    stalled
- `archive/legacy_docs/candle_spec_v4.md`
  - reference only for source-grounded external/product constraints
- `candle_spec_v5_modernized.md`
  - active build target for the next session

---

## 14. Next-session objective

Next session should begin with architecture-to-schematic work, not more product
forensics.

Suggested order:

1. draw the base power tree
2. define the 4-contact stem socket footprint/pinout
3. place the stem MCU and matrix-driver blocks
4. choose candidate parts for charger, MCU, and display drivers
5. capture the first full schematic
