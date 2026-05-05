# Prompt: Derivative Modern Build

## Input to orchestrator

```
Build a modernized derivative of "My New Flame" using ATtiny1616 + IS31FL3733 drivers.
430x30mm 4-layer PCB, dual 8x16 charlieplex LED fields.
Generate the board, run DRC to zero violations, export for JLCPCB fabrication.
```

## Expected agent behavior

1. **Build phase**: Deterministic generator produces candle.kicad_pcb (272 components)
2. **Validate phase**: DRC starts at 451 violations. Agent iterates:
   - Identifies hotspot regions via `drc_hotspots.py`
   - Proposes inner-layer lifts, component relocations, routing changes
   - Tests each proposal via `candle_drc_experiment.py`
   - Reverts regressions, retries with different coordinates
   - Reaches DRC 0 after 33 iterations
3. **Export phase**: Gerbers, drill files, BOM, centroid → fabrication bundle

## Key judgment moments

- Agent tries R_SW6 lift → gets worse → reverts → tries different y-coordinate → succeeds
- Agent changes design rules (0.2mm microvias) to unlock structural fixes
- Agent accepts +1 DRC trade-off for thermal improvement (deliberate decision)
