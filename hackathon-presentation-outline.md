# Hackathon Presentation Outline

## Slide Structure

Use 5 slides maximum.

### 1. Problem

Hardware design is slow, fragmented, and validation-heavy.

Key points:

- Requirements live in docs and datasheets.
- Design edits happen in KiCad.
- Validation happens through ERC/DRC loops.
- Fab preparation needs BOM, centroid, Gerbers, and packaging.
- Most of this is still manual glue work.

### 2. What We Built

Agentic KiCad workflow with closed-loop validation.

Key points:

- Natural-language hardware change request
- Orchestrator decomposes the task
- Deterministic tooling updates schematic and board files
- ERC/DRC runs automatically
- Agents iterate until outputs are acceptable
- Fab artifacts are packaged at the end

### 3. Why It’s Real

Real board, real Gerbers, real product lineage.

Key points:

- This is not a toy benchmark
- The workflow runs on an actual KiCad project
- It produces actual fabrication artifacts
- The board belongs to a real hardware system, not just a demo repo

### 4. Live Demo

One constrained board change, end to end.

Recommended demo:

- `Add an I2C ambient light sensor to the backplane`

Demo flow:

1. Start from the existing board
2. Enter the hardware request
3. Show agent task decomposition
4. Show one validation failure
5. Show autonomous fix
6. End with clean validation and exported fab files

### 5. Impact

Faster iteration for hardware teams, open-source workflow, sponsor-model reasoning layer.

Key points:

- Speeds up a painful professional workflow
- Keeps humans in control of the outputs
- Bridges LLM reasoning with deterministic EDA tooling
- Works inside an existing KiCad workflow instead of replacing it

## 30-Second Pitch

Hardware design is still a fragmented workflow across specs, datasheets, KiCad edits, validation loops, and fab packaging. We built a multi-agent KiCad workflow that can take a hardware change request, update the design through deterministic tooling, iterate against ERC and DRC, and export manufacturable outputs. This is running on a real board from a real product, not a toy example.

## 2-Minute Demo Script

1. Start with the physical device or board and say: this product already exists, and this is the board we are modifying.
2. Show the current board in KiCad or a render.
3. Enter a constrained hardware request in natural language.
4. Show the orchestrator breaking the request into steps.
5. Let the tooling run schematic update, validation, placement/routing, and checks.
6. Pause on one error and show the agent’s explanation and fix.
7. End on clean validation, Gerbers, BOM, and board output.
8. Close with: we did not build a chatbot for electronics, we built an agent that can operate a real EDA workflow.

## Claims To Make

- `multi-agent copilot for KiCad`
- `closed-loop ERC/DRC validation`
- `deterministic EDA actions`
- `real fabrication outputs`
- `real board, real workflow, real constraints`

## Claims To Avoid

- `first autonomous PCB designer`
- `fully solved hardware AI engineer`
- `one prompt to any production PCB`
- `no human oversight needed`

## Closing Line

We are not claiming that AI has solved hardware design. We are showing that EDA workflows can now be operated by agents in a way that is practical, auditable, and useful.
