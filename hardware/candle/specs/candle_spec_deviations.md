# Candle Spec Deviations

Track any intentional departures from
[`../candle_spec_v5_modernized.md`](../candle_spec_v5_modernized.md).

## Active deviations

| Date | Section | Deviation | Reason | Faithfulness impact |
|---|---|---|---|---|
| 2026-04-24 | `§5 Power architecture` / `§9 Working block split` | Captured the full base power tree in the schematic, but only laid out the exposed stem PCB in this project. | The visible stem PCB is the dominant artifact; the base mechanics and hidden packaging are still open. | low |
| 2026-04-24 | `§7 Display architecture` | Represented the two LED fields as driver net groups in the schematic rather than drawing all `256` individual LED symbols. | Keeps the schematic readable while the PCB still instantiates the full matrix population. | low |
| 2026-04-24 | `§7 Display architecture` / `§14 Next-session objective` | Implemented the stem as a `4-layer` board. | A `30 mm` wide dual-sided matrix stem is materially easier to route with modern inner-layer escape/routing resources. | medium |
| 2026-04-24 | `§6 Stem/base interconnect` | Used exposed duplicated copper contact pads on the stem as the modeled mating interface. | The concealed socket hardware remains a later mechanical/base decision; the stem still presents the intended `4` power contacts. | low |

## Entry format

| YYYY-MM-DD | e.g. `§4 Reconciled dimensional target` | Exact replacement decision | Evidence gap or implementation constraint | low / medium / high |

## Notes

- Do not use this file to retroactively justify the archived v3 concept.
- If the archived proof-of-concept project is revived, log each retained mismatch
  against the active v5 modernized spec explicitly.
