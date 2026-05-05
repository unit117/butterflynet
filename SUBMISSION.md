# Submission Metadata

## Project

- **Project name:** KiCad Agentic Workflow
- **Short description:** Multi-agent system that researches, designs, generates, validates (DRC 451→0), and exports KiCad PCBs — with self-correction and source discipline at every step.

## Team

- **Team name:** <!-- fill -->
- **Members:** <!-- fill: name, role, contact -->

## Links

- **Repo:** <!-- fill: GitHub URL -->
- **Demo (deployed):** <!-- fill: Vercel URL if deployed -->
- **Demo video:** <!-- fill: YouTube unlisted URL -->

## Problem

Existing AI hardware tools generate circuits without verifying feasibility, citing sources, or handling failures. They hallucinate component choices and ship broken designs. Engineers need agentic systems that research before building, refuse to fabricate when uncertain, and recover from validation failures — not chatbots that produce plausible-looking output.

## Technologies

- KiCad 10.0 (kicad-cli)
- Python 3.9, FastAPI
- React 19, TypeScript, Vite
- Sponsor LLM API (reasoning at research/critique/strategy)

## Sponsor Track

<!-- fill: Zhipu/MiniMax/other — must match actual API usage -->

## Architecture Diagram

See `docs/architecture.svg` or the ASCII diagram in [README.md](README.md).

## What makes it agentic

1. **Self-correction**: Agent catches MCP73871 mismatch (wrong battery chemistry), retracts its own suggestion
2. **Build refusal**: Agent declines to proceed when charger topology is unresolved
3. **Failure recovery**: Agent proposes DRC fix → measures regression → reverts → tries alternative
4. **Source discipline**: Every research claim tagged with provenance (Published / Photo-derived / Inference)
5. **Architectural reasoning**: Agent branches between faithful reconstruction (blocked) and derivative (buildable)
