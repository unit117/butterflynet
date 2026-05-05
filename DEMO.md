# Demo Verification Guide

Per GOSIM Paris 2026 Hackathon Section 8.

---

## What the project does

A multi-agent system that operates the KiCad EDA toolchain end-to-end: researching product specifications, iterating designs with self-correction, generating PCB layouts deterministically, recovering from DRC violations via propose-test-revert loops, and exporting fabrication packages.

## What is actually working

- **Phase 1 — Research**: Replay of source-tagged fact gathering from 7 external documents, producing a fact ledger with provenance badges (Published / Photo-derived / Reconstruction inference)
- **Phase 2 — Design**: Spec iteration v3→v5 with two documented self-corrections (MCP73871 charger mismatch, flame silhouette overclaim), a build-refusal decision, and an architectural branch point
- **Phase 3 — Build**: Deterministic KiCad PCB generation (272 components, 430×30mm 4-layer board, reproducible SHA)
- **Phase 4 — Validate**: DRC reduction 451→0 over 33 agent iterations, including failure-recovery beats with reverts
- **Phase 5 — Export**: JLCPCB fabrication package (Gerbers, drill files, BOM, centroid)

### Known limitations

- Research and design phases are replay-only (from documented session histories), not live LLM calls
- Routing recovery uses the historical session arc; live re-execution requires KiCad 10 installed locally
- Charger topology research path (faithful reconstruction) is documented but unresolved — the agent correctly identifies this and branches to the derivative path

## Where the agentic behavior appears

| Moment | Phase | What it proves |
|---|---|---|
| MCP73871 retraction | Phase 2 | Agent self-corrects: single-cell Li-Ion IC invalid for 4S NiMH |
| "Flame silhouette" overclaim catch | Phase 2 | Agent fact-checks itself against source material |
| BUILD REFUSED decision | Phase 2 | Agent declines to proceed when prerequisites unresolved |
| Branch point (faithful vs derivative) | Phase 2 | Architectural tradeoff reasoning |
| R_SW6 revert (DRC +5) → reattempt (DRC -4) | Phase 4 | Failure detection, revert, alternative strategy |
| R_SW6 second attempt succeeds after context change | Phase 4 | Same patch, different result — proves environment-aware judgment |
| Cascade lift after pattern recognition | Phase 4 | Generalizes from single success to batch application |

## Inputs, tools, and external systems

**Inputs:**
- Natural-language prompt: "Recreate the Ingo Maurer 'My New Flame' lamp, faithful to the product"
- See `examples/` directory for additional prompt templates

**Tools operated by agents:**
- `kicad-cli pcb drc` — Design Rule Check
- `kicad-cli pcb export svg` — Board visualization
- `kicad-cli sch export svg` — Schematic visualization
- `tools/generate_candle.py` — Deterministic PCB generator
- `tools/candle_drc_experiment.py` — Experiment runner (baseline/test/revert)
- `tools/drc_hotspots.py` — Violation region analyzer

**External systems:**
- KiCad 10.0 (local CLI)
- Sponsor LLM API (reasoning at research, critique, strategy steps)

## Outputs / decisions / actions

| Output | Format | Location |
|---|---|---|
| Source-tagged research brief | Structured event stream | `replays/candle-research.ndjson` |
| Iterated spec with retractions | Structured event stream | `replays/candle-design.ndjson` |
| Generated PCB | `.kicad_pcb` (deterministic SHA: `972e3653`) | `fixtures/candle/candle.kicad_pcb` |
| DRC-clean board | 0 violations (validated 3/3 runs) | Proven via `tools/stabilize_candle.py` |
| Fabrication bundle | `.zip` (Gerbers + drill + BOM + centroid) | `candle-fabrication-bundle.zip` (246.8 KB) |

## Running the demo locally

```bash
# Prerequisites: Node.js 18+, Python 3.9+, KiCad 10 (for live pipeline only)

# Frontend (replay mode — no backend needed)
cd kicad-agent-ui/frontend
npm install
npm run dev
# → http://localhost:5173

# Backend (for live pipeline execution)
cd kicad-agent-ui/backend
pip install -r requirements.txt
uvicorn main:app --port 8100
```

The replay mode runs entirely in the browser — judges can verify the 5-phase pipeline without installing KiCad.
