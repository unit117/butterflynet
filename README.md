# KiCad Agentic Workflow

> A multi-agent system that operates KiCad end-to-end — research, spec iteration with self-correction, deterministic generation, DRC recovery with reverts, fab export — with LLM reasoning at every judgment step.

<!-- TODO: Replace with actual GIF/screenshot once captured -->
<!-- ![Demo](docs/demo.gif) -->

---

## The Pipeline

```
┌─ PHASE 1 ─┬─ PHASE 2 ──┬─ PHASE 3 ─┬─ PHASE 4 ───┬─ PHASE 5 ─┐
│ RESEARCH   │ DESIGN      │ BUILD     │ VALIDATE    │ EXPORT    │
│            │             │           │             │           │
│ 7 sources  │ v3→v5 specs │ 272 parts │ 451→0 DRC   │ Gerbers   │
│ 11 facts   │ 2 errors    │ 4 layers  │ 33 iters    │ BOM       │
│ 3 unknowns │ 1 refusal   │ SHA-stable│ 1+ reverts  │ drill     │
└────────────┴─────────────┴───────────┴─────────────┴───────────┘
```

**The agent catches its own mistakes, refuses to build when prerequisites are unresolved, and reverts decisions that make things worse.** That's not a chatbot — that's engineering judgment.

---

## Key Moments

**Phase 2 — Self-Correction** (the money shot):
- Agent proposes MCP73871 charger IC → catches that it's single-cell Li-Ion, invalid for 4S NiMH → retracts
- Agent asserts "flame silhouette LED arrangement" → fact-checks against manual → corrects to rectangular physical layout
- Agent **refuses to build** while charger topology is unresolved — declines to fabricate rather than hallucinate

**Phase 4 — Failure Recovery**:
- DRC violations: 451 → 0 over 33 iterations
- Agent proposes R_SW6 inner-layer lift → DRC worsens by 5 → **reverts** → reads hotspot map → tries different coordinate → succeeds (-4)
- Same patch succeeds later after context changes — proves environment-aware judgment

---

## Demo

```bash
cd kicad-agent-ui/frontend && npm install && npm run dev
```

Open http://localhost:5173 — click **Play** to watch the 5-phase pipeline replay.

The demo replays documented agent provenance deterministically. Every fact, every retraction, every DRC delta is from real sessions on disk.

## Hardware Source Files

This submission includes the candle KiCad project and outputs in [hardware/candle](hardware/candle), plus the original project history as [hardware/candle-git-history.bundle](hardware/candle-git-history.bundle).

Key files:

- `hardware/candle/candle.kicad_pro`
- `hardware/candle/candle.kicad_sch`
- `hardware/candle/candle.kicad_pcb`
- `hardware/candle/candle.pretty/`
- `hardware/candle/tools/generate_candle.py`
- `hardware/candle/outputs/fabrication/`
- `hardware/candle/outputs/candle.glb`

The frontend demo also serves a compact copy of the fabrication bundle and GLB from `kicad-agent-ui/frontend/public/exports/candle/`.

---

## What's pre-existing vs. hackathon work

| Pre-existing | Hackathon-built |
|---|---|
| candle KiCad project + generator | 5-phase orchestrator pipeline |
| Research brief + spec versions | Critic agent (catches MCP73871, flame overclaim) |
| DRC reduction session history | Phase replay engine + provenance viewer UI |
| KiCad CLI tooling | Failure-recovery visualization |

Full details: [DISCLOSURE.md](DISCLOSURE.md)

---

## Architecture

```
┌───────────────────────────────────────────────────┐
│                  ORCHESTRATOR                       │
│  Research → Design → Build → Validate → Export     │
└──────────┬──────────┬──────────┬──────────────────┘
           │          │          │
    ┌──────▼──┐  ┌────▼────┐  ┌─▼──────────┐
    │ Critic  │  │Strategist│  │ Validator  │
    │ Agent   │  │  Agent   │  │   Agent    │
    └────┬────┘  └────┬─────┘  └─────┬──────┘
         │            │               │
    ┌────▼────────────▼───────────────▼──────┐
    │            KiCad CLI + Tools            │
    │  generate_candle.py | drc_experiment   │
    │  kicad-cli pcb drc  | hotspot_analyzer │
    └────────────────────────────────────────┘
```

---

## Technology

- **EDA**: KiCad 10.0, kicad-cli
- **Backend**: Python 3.9, FastAPI, uvicorn
- **Frontend**: React 19, TypeScript, Vite
- **Target board**: candle.kicad_pcb — 430x30mm 4-layer, 256 LEDs, ATtiny1616, 2x IS31FL3731-QF

---

## Verification

See [DEMO.md](DEMO.md) for Section 8 compliance — inputs, tools, outputs, and where agentic behavior appears.

---

## License

[MIT](LICENSE)

---

*GOSIM Paris 2026 — Agentic AI Hackathon*
