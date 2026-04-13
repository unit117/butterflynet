# Hackathon Story

## Core Story

We built a multi-agent KiCad workflow that turns hardware intent into validated fabrication outputs, and we proved it on a real board that powers a live product.

That framing does three jobs at once:

- It makes the project legible to non-hardware judges.
- It keeps the claim honest.
- It ties the AI work to a physical result.

The strongest narrative arc is:

`Real product need` -> `real board` -> `agentic workflow that can now modify and extend that board autonomously`

Do not lead with scripts, file formats, or line counts. Lead with the pain:

Hardware design is still fragmented across datasheets, spreadsheets, KiCad, DRC reports, BOM cleanup, and fab exports. We built agents that operate that workflow end to end.

## Positioning

Use one of these as the top-line:

- `From hardware spec to fab files: an agentic KiCad workflow`
- `A multi-agent copilot for real PCB design`
- `We turned KiCad into an agentic hardware productivity system`

Recommended one-liner:

`Most AI tools stop at suggestions. We built an agent that actually operates KiCad, iterates against ERC/DRC, and produces manufacturable outputs.`

Avoid:

- `first autonomous PCB designer`
- `fully solved AI hardware engineer`
- `LLM builds boards from scratch`

## What Judges Should Remember

You want them to leave with exactly three ideas:

- `This is real`: it uses the actual KiCad toolchain and exports real Gerbers/BOMs.
- `This is agentic`: it decomposes tasks, runs tools, inspects failures, and iterates.
- `This is useful`: it saves time in a painful professional workflow.

If they remember only one sentence, make it:

`We didn’t build a chatbot for electronics. We built an agent that works through the actual PCB design pipeline.`

## Best Demo Story

Do not demo "design any PCB from scratch." That is too open-ended and fragile.

Demo a constrained but legible change request:

- `Add an I2C ambient light sensor to the backplane`
- `Swap the regulator for a different current requirement`
- `Add a debug header and re-route around the change`

That sells much better because judges can understand:

`there was a board, we asked for a change, the agent updated it, validated it, and exported the result`

The money shot is:

`ERC/DRC fails` -> `agent explains why` -> `agent fixes` -> `clean validation` -> `Gerbers/BOM exported`

## Stage Flow

Use this sequence:

1. Show the physical device or board first.
2. Show the existing board in KiCad or a 3D render.
3. Type one natural-language hardware change.
4. Show the orchestrator breaking it into steps.
5. Show one validation failure and one autonomous recovery.
6. End on fab artifacts and a board render, not terminal logs.

Physical artifact beats slides. If the live LED device is there, use it.

## How To Explain The AI Stack

Make the hybrid architecture explicit:

`LLMs do reasoning-heavy work like spec interpretation, datasheet extraction, part tradeoff analysis, and review summaries. Deterministic KiCad tooling does the actual file mutation, validation, routing, and export.`

Also make sponsor models visible:

`We use GLM/Kimi/MiniMax where language reasoning matters, and deterministic local tooling where correctness matters.`

## What To Say

Use language like:

- `agentic copilot`
- `closed-loop validation`
- `human-reviewable outputs`
- `deterministic EDA actions`
- `real KiCad workflow`
- `fab-ready artifacts`

## What Not To Say

Avoid:

- `fully autonomous hardware engineer`
- `production-ready for any board`
- `one prompt to any PCB`
- `no human needed`

Those claims invite the wrong questions.

## Simple Pitch

PCB design is still a fragmented manual workflow across specs, datasheets, KiCad edits, validation loops, and fab packaging. We built a multi-agent KiCad workflow that can take a hardware change request, update the design through deterministic tooling, iterate against ERC/DRC, and export manufacturable outputs. We’re proving it on a real board from a real product, not a toy benchmark.

## The Key Reframe

You are not selling:

`AI designed my PCB`

You are selling:

`We made EDA operable by agents`

That is the story.
