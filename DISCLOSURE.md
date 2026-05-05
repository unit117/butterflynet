# Disclosure — Pre-existing Work & Third-Party Dependencies

Per GOSIM Paris 2026 Hackathon Rules, Sections 5 and 13.

---

## Pre-existing components (Section 5)

| Component | Origin | Role in submission |
|---|---|---|
| candle KiCad project (`candle.kicad_pcb`, schematic, footprints) | Personal repo, created April 2026 | Dataset / fixture — the board the agents operate on |
| candle generator (`tools/generate_candle.py`, 76 KB) | Personal repo | Demonstrates deterministic tool use by agents |
| candle research brief + spec v3..v5 | Personal repo | Replay source for Phase 1 (Research) and Phase 2 (Design) |
| candle DRC reduction history (`SESSION_HISTORY.md`) | Personal repo | Replay source for Phase 4 (Validate) — 451→0 arc |
| candle 3D renders + GLB models | Personal repo | Visual assets for demo |
| KiCad 10.0 + kicad-cli | Upstream open source (GPL) | External tool operated by agents |
| Portable-kit PCB architect tools | Personal repo | Pipeline tooling for schematic/PCB manipulation |

---

## Hackathon-built components

| Component | What it does |
|---|---|
| **5-phase orchestrator pipeline** | Drives Research → Design → Build → Validate → Export |
| **Critic agent** | Catches overclaims (MCP73871 charger mismatch, flame silhouette) |
| **Phase replay engine** | Deterministic event-stream replay across all 5 phases |
| **5-phase provenance viewer** (`kicad-agent-ui/frontend/`) | The interactive demo UI — phase tabs, DRC counter, fact ledger |
| **Event stream architecture** | Turns session histories + briefs into replayable event streams |
| **DRC failure-recovery visualization** | Propose → run ��� measure → revert/keep loop with animated counter |
| **Source-discipline visualization** | Published/Photo-derived/Reconstruction fact tagging in Phase 1 |
| **Spec iteration viewer** | Version timeline + error-caught cards + branch decision in Phase 2 |
| **FastAPI backend** | Pipeline execution, SVG caching, KiCad CLI integration |
| **Sponsor LLM integration** | GLM reasoning at research, critique, and recovery decision points |

---

## Third-party dependencies (Section 13)

| Dependency | License | Purpose |
|---|---|---|
| KiCad 10.0 | GPL-3.0 | Schematic/board file format, CLI tools (DRC, SVG export) |
| Python 3.9+ | PSF | Orchestrator backend runtime |
| FastAPI | MIT | HTTP API framework |
| uvicorn | BSD | ASGI server |
| Vite | MIT | Frontend build tool |
| React 19 | MIT | UI framework |
| TypeScript | Apache-2.0 | Type-safe frontend |

---

## Methodology note

The candle project's DRC reduction history (451→0 violations) and research brief are **real artifacts from real agent sessions** — they are not fabricated demo data. The 5-phase viewer replays this documented provenance to show the full agentic workflow in a deterministic, auditable format.

The agent's judgment calls (retracting MCP73871, refusing to build while charger topology is unresolved, reverting DRC regressions) are historical events on disk. The hackathon contribution is the orchestration system and visualization layer that makes this process legible, replayable, and extensible to new KiCad projects.
