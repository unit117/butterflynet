# Replay Event Streams

These NDJSON files drive the 5-phase provenance viewer. Each line is a timestamped event from documented agent sessions.

## Files

| File | Phase | Events | Source |
|---|---|---|---|
| `candle-research.ndjson` | Research | 22 | `archive/legacy_docs/research_brief.md` |
| `candle-design.ndjson` | Design | 11 | `archive/legacy_docs/SESSION_SUMMARY_2026-04-24.md` |
| `candle-build.ndjson` | Build | 10 | `tools/generate_candle.py` execution trace |
| `candle-validate.ndjson` | Validate | 33 | `SESSION_HISTORY.md` DRC reduction arc |
| `candle-export.ndjson` | Export | 11 | `tools/export_candle.py` output |

## Format

```jsonl
{"t": 0, "phase": "research", "type": "phase_start", "payload": {"prompt": "..."}}
{"t": 800, "phase": "research", "type": "source_fetched", "payload": {"source": "...", "url": "..."}}
```

## Provenance

Every event in these files corresponds to a documented action in the candle project's session histories. They are not synthetic — they are structured representations of real agent work.

## Running

The frontend at `kicad-agent-ui/frontend/` reads these events from its bundled `src/events.ts` module. A future version will load them dynamically from this directory.
