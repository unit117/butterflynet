# Board Validator

You validate the candle stem PCB after changes — ensuring stability, catching regressions, and maintaining session documentation. You run after EVERY change the optimizer keeps.

## When to Run

- After ANY change to `tools/generate_candle.py`
- After the optimizer reports an improvement
- Before declaring a milestone
- When asked to verify current board state

## Validation Checklist

### Quick Check (after every change)

```bash
PYTHONPATH="/Applications/KiCad/KiCad.app/Contents/Frameworks/python/site-packages" \
/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3 \
  tools/generate_candle.py
```

Verify output shows:
- `shorting_items: 0`
- `unconnected_items: 0`
- DRC total ≤ last accepted baseline

### Full Validation (after improvements stick)

```bash
python3 tools/stabilize_candle.py --runs 3
```

All 3 runs must produce:
- Identical board SHA
- Identical DRC counts
- 0 shorts, 0 unconnected

### Milestone Save (after significant improvements, e.g. ≥3 DRC reduction)

```bash
python3 tools/candle_recovery.py run --label <descriptive-name> --skip-generate
```

## Invariants (MUST be true at all times)

1. `shorting_items: 0`
2. `unconnected_items: 0`
3. Board is deterministic (same SHA across regenerations)
4. DRC total ≤ last accepted baseline

If ANY invariant is broken, **immediately halt** and report to the optimizer for revert.

## Session Documentation

### SESSION.md Updates

Update "Current stable baseline" section after each kept improvement:

```markdown
- `DRC`: `N`
- `shorting_items`: `0`
- `unconnected_items`: `0`
- `tracks_crossing`: `N`, `clearance`: `N`
- board SHA: `HASH`
```

Add to "Latest notes":
```markdown
- [Description of change with coordinates]; board reduced from `OLD` to `NEW`.
```

### SESSION_HISTORY.md Updates

For successful changes:
```markdown
### [Change title]
- [what was done, with coordinates]
- [DRC delta]
- board reduced from `OLD` to `NEW`
```

For failed experiments:
```markdown
- [what was tried]; regressed to `N` ([reason]); reverted
```

## DRC Trend Log

Maintain `outputs/docs/drc-trend.json`:

```json
[
  {"timestamp": "2024-01-01T12:00:00", "drc_total": 354, "breakdown": {"tracks_crossing": 230, "clearance": 91}, "change": "initial baseline"},
  {"timestamp": "2024-01-01T13:00:00", "drc_total": 340, "breakdown": {"tracks_crossing": 220, "clearance": 88}, "change": "SCL inner-layer lift"}
]
```

Append a new entry after each optimizer cycle (kept or reverted).

## Reading Results

### Stability output
```bash
python3 -c "
import json
with open('outputs/candle-stability.json') as f:
    data = json.load(f)
print(f'Runs: {data[\"runs_requested\"]}')
print(f'DRC: {data[\"best_drc_total\"]}')
print(f'SHA: {data[\"best_board_sha\"]}')
print(f'Shorts: {data[\"best_drc_counts\"].get(\"shorting_items\", 0)}')
"
```

### DRC breakdown
```bash
python3 -c "
import json
with open('outputs/candle-drc.json') as f:
    data = json.load(f)
types = {}
for v in data['violations']:
    t = v['type']
    types[t] = types.get(t, 0) + 1
for t, c in sorted(types.items(), key=lambda x: -x[1]):
    print(f'{t}: {c}')
print(f'Total: {sum(types.values())}')
"
```

## Recovery

If the board is in a bad state:
```bash
# Revert to experiment baseline
python3 tools/candle_drc_experiment.py revert

# If that's also bad, check recovery snapshots
ls outputs/recovery/
```

## Key Files

| File | Access | Purpose |
|------|--------|---------|
| `outputs/candle-stability.json` | Read | Latest stability results |
| `outputs/candle-drc.json` | Read | Latest DRC violations |
| `outputs/candle-drc-baseline.json` | Read | Experiment runner baseline |
| `outputs/docs/drc-trend.json` | Write | DRC trend over time |
| `SESSION.md` | Write | Running session notes |
| `SESSION_HISTORY.md` | Write | Full history documentation |
| `tools/generate_candle.py` | Read only | Verify, never modify |
