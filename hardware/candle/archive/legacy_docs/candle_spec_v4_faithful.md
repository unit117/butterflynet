# Candle — v4 Faithful Specification

> Reference only.
> The active build target is `candle_spec_v5_modernized.md`.

Faithful reconstruction brief for Ingo Maurer's *My New Flame*.

This file replaces the earlier `candle_spec_v4_faithful.md` draft, which mixed
published facts with unsupported internal implementation claims. This revision
separates:

- **Published fact**: stated in official product literature or instructions
- **Photo-derived observation**: inferred from visible product imagery
- **Reconstruction assumption**: a practical build choice for a faithful replica

The goal is to preserve the product identity without inventing hidden
architecture as if it were known.

---

## 1. Source basis

Primary sources used for this spec:

1. Ingo Maurer official product page for `My New Flame`
2. Current official instruction PDF linked from that page
3. Ingo Maurer shop listing
4. MoMA collection record
5. Provided local render in `refs/provided_reference_render.png`

If a requirement is not supported by those sources, it must be treated as a
reconstruction assumption, not a faithful fact.

---

## 2. Product identity

The following are confirmed and should be treated as the defining traits of a
faithful build:

- Bare slender PCB body
- Square metallic base
- Two LED arrays/displays, one on each face
- **128 LEDs per face, 256 total**
- **2700 K**, **CRI 80**, **5 V**, **0.6 W**
- Operation from **4 x AA NiMH rechargeable batteries** or external USB power
- **Base toggle switch**
- **Base control LED**
- **Button on the PCB** for flame adjustment
- Flame effect based on **video material**
- No smart-home, wireless, motion-sensor, or MQTT features in the faithful path

Published descriptions consistently frame the object as a portable electronic
candle, not as a docked sculpture or smart sensor product.

---

## 3. Published dimensions

These dimensions are directly supported by the official product page and shop
listing:

| Parameter | Value | Status |
|---|---|---|
| PCB body | **430 x 30 x 3 mm** | published fact |
| Base | **90 x 90 x 25 mm** | published fact |
| Light source | **2 x 128 dimmable LEDs** | published fact |
| Cable length | **150 cm** | published fact |

### Overall height

Some retailer listings report an overall height of about **400 mm / 15.75 in**.
That does not algebraically reconcile with a 430 mm PCB and a 25 mm base unless
the measurement convention differs from the published body dimensions.

For this reason:

- Use **430 x 30 x 3 mm** and **90 x 90 x 25 mm** as the governing dimensions
- Do **not** use a single assembled-height number as a hard mechanical
  constraint until a direct physical measurement is available

---

## 4. Revision target

There are at least two documented connection revisions:

- **Older official instructions (2020-era)**: USB A to mini USB (type B)
- **Current official product page and current instruction PDF**: **USB-C**

This faithful spec targets the **current USB-C revision** because that is what
the official product page and current linked manual describe as of
**2026-04-23**.

Do not mix mini-USB and USB-C details in one build without documenting that as
a deliberate hybrid.

---

## 5. Confirmed operational behavior

The current official instructions establish the following:

- The lamp uses **4 AA NiMH rechargeable cells**
- The lamp may also be powered by **standard AA 1.5 V batteries**
- Standard batteries must **never** be charged through the USB input
- When USB power is connected, the NiMH cells are charged and the lamp can be
  used normally at the same time
- The lamp can also operate directly from USB power **with no batteries
  inserted**
- The **base LED is yellow while charging** and **green when the batteries are
  fully charged**
- The lamp is switched using a **toggle switch in the base**
- The flame is dimmed by **pressing and holding the PCB button**
- Current official manual input specification: **5 V DC, max. 1000 mA**

This is enough to confirm that the faithful product includes:

- rechargeable NiMH support
- on-board charging logic somewhere in the product
- load sharing or equivalent behavior
- base status indication

It is **not** enough to identify the exact charger IC or the exact internal
power-path topology.

---

## 6. Materials and visible finish

Published sources describe the product using combinations of:

- circuit board / epoxy-resin board
- metal / stainless steel
- plastic
- chromed steel (MoMA collection wording)

Faithful external appearance requirement:

- The base must read as a **polished metallic square base**
- The stem must read as a **3 mm exposed PCB**
- Available PCB colourways are **black**, **red**, and **white**

The black version remains the primary reference colour for this project.

---

## 7. Flame display

### Published facts

- Two arrays/displays with **128 dimmable LEDs each**
- The flame effect is based on **video material**
- The flame is visible on both faces of the slim PCB body
- The LED output is **2700 K**, **CRI 80**, **0.6 W** total

### What is not published

The sources do **not** publish:

- exact LED package
- exact LED pitch
- exact matrix topology
- exact display window height
- exact pixel map
- exact driver IC

### Faithful interpretation

Use the flame region as a **rectangular or near-rectangular display window** on
each face unless direct photo analysis proves a more irregular arrangement.

This is the safer interpretation because the Ingo Maurer shop description says
the LEDs form a **rectangle** on both sides of the board.

Therefore:

- Do **not** hard-code a flame-shaped physical LED mask as a faithful fact
- Do **not** hard-code `0402`, `0603`, `8x16`, `charlieplex`, or any other
  topology as a faithful fact
- Document the final pixel map separately once it is derived from product
  photography

### Clarification: physical rectangle vs emitted flame

The safest reading of the published and visual material is:

- the **physical LED field** is likely arranged as a rectangular display area
- the **emitted flame image** within that field reads as a flame silhouette
  during operation

Those two statements are compatible and should not be collapsed into one.

For a faithful build:

- do **not** build a literal always-on rectangular emission block
- do **not** claim a physically flame-shaped LED placement unless confirmed by
  photo analysis or teardown evidence

---

## 8. Stem-to-base interface

### Published facts

The official instructions state that the PCB inserts into the base and that a
**noticeable resistance** must be overcome during insertion.

### What remains unresolved

The public sources do not reveal whether the hidden interface is:

- edge fingers into a blind socket
- spring contacts on pads
- blade contacts
- a custom socketed assembly

### Faithful requirement

Preserve the visible behavior:

- the stem inserts vertically into the base
- the electrical/mechanical interface is concealed
- there are no visible mounting holes or obvious front-face fasteners on the
  stem
- insertion should feel like a guided socket engagement, not a loose decorative
  drop-in

### Reconstruction guidance

Treat the exact contact mechanism as **TBD**. If you choose edge fingers,
spring pads, or another socket approach, log it as a reconstruction assumption.

Do **not** describe edge fingers as known original hardware without teardown
evidence.

---

## 9. PCB composition

### Photo-derived observations

Based on the provided render and public product imagery:

- The upper region is dominated by the LED display area
- The mid-stem contains visible electronics and the user button
- The lower stem is **sparser** than the earlier v3 concept
- The product does **not** support the old "continuous population" rule from v3

### Faithful layout rule

Prioritize:

- visible negative space where the product photos show it
- legible real electronics over decorative filler parts
- no fake dense component banks introduced only for visual texture

The faithful path should look like a production electronic object, not like
stylized PCB art.

---

## 10. Power architecture

### Published facts

- Battery chemistry: **AA NiMH rechargeable**
- Battery count: **4**
- USB-powered operation is supported
- Charging from USB is supported for NiMH cells
- USB input specification in current instructions: **5 V DC max. 1000 mA**
- USB-only operation without batteries inserted is supported
- Standard AA 1.5 V cells may power the lamp, but must not be charged through
  USB

### What is not published

- exact charger IC
- exact charge algorithm implementation
- exact power-path switching architecture
- exact battery-holder form factor
- whether the LED rail is generated directly from battery voltage or through a
  regulated rail

### Hard constraint for reconstruction

Any chosen charger/controller must explicitly support the published use case:

- **4-cell NiMH charging**
- simultaneous USB-powered operation
- safe behavior when standard AA primary cells are installed instead of NiMH

### Topology implication from published behavior

The published behavior implies an additional reconstruction-level constraint:

- the lamp must operate from **USB only with no cells installed**
- the lamp must also operate from a **4-cell pack** spanning roughly
  **4.0 V to 6.4 V**, depending on chemistry and state of charge

This strongly suggests a **regulated intermediate rail** or equivalent
multi-input power stage rather than direct battery-to-LED drive.

That is an engineering inference from the documented behavior, not proof of the
original converter family or exact power-path implementation.

### Explicit prohibition

Do **not** use a charger intended only for **single-cell Li-Ion / Li-Poly**
packs, such as `MCP73871`, as the faithful solution for this product.

That part family does not match the published 4xAA NiMH architecture.

### Highest-priority unresolved implementation item

The exact **4-cell NiMH USB charging / load-sharing architecture** remains the
single most important open engineering question in the faithful reconstruction.

Until that research is completed:

- keep the charger section at the behavior/constraint level
- do not freeze a charger IC in the schematic or BOM
- treat any candidate controller or discrete topology as a reconstruction
  choice pending dedicated research

---

## 11. Controls and indicators

### Published facts

- **Toggle switch in the base**
- **Control LED in the base**
- **Button on the PCB**
- Button changes flame intensity and speed per official product text
- Current instructions explicitly document press-and-hold dimming

### Faithful UI requirements

- The base must contain an on/off toggle switch
- The base must contain a status LED that at minimum supports:
  - charging indication
  - charge-complete indication
- The PCB stem must contain a button usable while the lamp is assembled

### Version note

An older official instruction PDF also documents a **red LED on the candle
board** for low-battery indication. The current USB-C manual extracted in this
session clearly documents the base LED states but does not restate the red
board LED in the extracted English text.

Therefore:

- Treat the red low-battery LED as a **likely historical or revision-specific
  feature**
- Do not make it a hard non-negotiable of the current faithful spec unless
  confirmed from current-product imagery or current manual pages
- If a reconstruction build is started before that question is resolved,
  reserving a footprint/GPIO for an optional low-battery LED is reasonable, but
  populate it only after confirmation

---

## 12. Flame animation

### Published facts

- The effect is based on **video material**
- The result should look like a realistic candle flame

### Retailer corroboration

Retailer descriptions consistently describe the flame as:

- derived from real candle footage
- randomized or non-repeating in behavior

### Faithful behavior requirement

The faithful build should use:

- captured real flame footage or a very close video-derived equivalent
- a playback/randomization approach that avoids an obvious short visible loop

### What is not published

- exact frame rate
- exact frame memory size
- exact algorithm
- exact MCU

So the faithful requirement is behavioral, not implementation-specific.

---

## 13. Reconstruction assumptions

These are reasonable engineering choices for a faithful build, but they are
**not** published facts:

- **4-layer PCB** if needed for routing density
- non-wireless MCU such as `RP2040` or `ATSAMD21`
- LED matrix driver such as `IS31FL3731` or another suitable multi-channel
  driver
- blind spring-contact socket inside the base
- a dedicated NiMH charger / power-path design specific to the 4-cell pack

Use these as implementation candidates only.

If a specific IC or topology is selected, mark it as:

- `reconstruction choice`

not:

- `faithful original hardware`

---

## 14. Explicit non-features for the faithful path

The following do **not** belong in the faithful spec unless separately logged as
deviations:

- motion sensor
- PIR / mmWave / IMU
- wireless connectivity
- Wi-Fi / BLE / Thread / Matter
- MQTT / Home Assistant integration
- ambient light sensor
- accelerometer-reactive flame behavior
- decorative dummy ICs inserted only for visual density
- pogo-dock concept from v3
- smart-home commissioning UX from v3.1

Those belong in a derivative spec, not the faithful one.

---

## 15. Validation checklist

- [ ] PCB body matches **430 x 30 x 3 mm**
- [ ] Base matches **90 x 90 x 25 mm**
- [ ] Two LED arrays/displays are present, **128 LEDs per face**
- [ ] Current-target build uses **USB-C**
- [ ] Build supports **4 x AA NiMH rechargeable cells**
- [ ] Build can also operate directly from USB with no batteries inserted
- [ ] Build charges NiMH cells from USB
- [ ] Build does not attempt to charge standard 1.5 V AA primary cells
- [ ] Base includes a **toggle switch**
- [ ] Base includes a **control LED**
- [ ] PCB includes a **button**
- [ ] Flame effect is visibly video-derived and does not read as simple group
      blinking
- [ ] Lower stem composition preserves visible negative space
- [ ] Any hidden internal choices not supported by source literature are marked
      as reconstruction assumptions

---

## 16. Source provenance

Accessed on **2026-04-24**.

Primary source links:

- Ingo Maurer official product page:
  <https://www.ingo-maurer.com/en/products/my-new-flame/>
- Current official instruction PDF linked from that page:
  <https://www.ingo-maurer.com/download/8913404_mynewflameusb_www_dez2024.pdf>
- Older official instruction PDF, useful for revision history:
  <https://www.ingo-maurer.com/download/8913404_mynewflameusb_www_11_2020.pdf>
- Ingo Maurer shop listing:
  <https://shop.ingo-maurer.com/en/My-New-Flame/3331130>
- MoMA collection record:
  <https://www.moma.org/collection/works/169654>

Key facts confirmed from the official product page and current instructions:

- `430 x 30 x 3 mm` PCB
- `90 x 90 x 25 mm` base
- `2 x 128` LEDs
- `5 V`, `0.6 W`, `2700 K`, `CRI 80`
- `4 x AA NiMH`
- base switch
- base control LED
- PCB button
- USB-C current revision
- charging while powered via USB

Key facts clarified by the official manuals:

- current USB input spec: `5 V DC max. 1000 mA`
- current cable: `USB-C to USB-C, 1.5 m`
- charging LED states: yellow while charging, green when full
- standard AA primary cells may power the lamp, but must never be charged

---

## 17. Deviations policy

Any deviation from this faithful spec must be logged with:

1. the section being changed
2. the reason the published evidence was insufficient or impractical
3. the replacement engineering choice
4. the impact on faithfulness

Non-negotiables for the faithful classification:

- published outer dimensions
- dual-sided `2 x 128` LED concept
- 4xAA NiMH + USB power behavior
- base switch + base control LED + PCB button
- video-derived flame behavior
- absence of smart-home and sensor features
