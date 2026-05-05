# Prompt: Faithful Product Reconstruction

## Input to orchestrator

```
Recreate the Ingo Maurer "My New Flame" lamp as a faithful reconstruction.
Research the original product thoroughly. Tag every claim with its source.
Do not proceed to PCB layout until all critical unknowns are resolved.
```

## Expected agent behavior

1. **Research phase**: Agent fetches product pages, manuals, retailer listings. Builds fact ledger with Published/Photo-derived/Reconstruction tags.
2. **Design phase**: Agent iterates spec versions. Catches errors (e.g., wrong charger IC for battery chemistry). Refuses to build when charger topology is unresolved.
3. **Branch decision**: Agent identifies that faithful path is blocked and proposes derivative path with resolved components.

## Key judgment moments

- Retracts MCP73871 suggestion (single-cell Li-Ion invalid for 4S NiMH)
- Distinguishes physical LED layout (rectangular) from rendered animation (flame shape)
- Stops at architecture rather than fabricating an answer
