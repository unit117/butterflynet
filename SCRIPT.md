# 3-Minute Demo Script

---

## 0:00 -- 0:30 | Overview

We built an agent pipeline around KiCad, the open-source software engineers use to lay out printed circuit boards. This works because KiCad is scriptable: board files are structured text, and automation tools can place parts, route traces, run design checks, and export manufacturing files. So the agents are not just writing a plan. They are operating KiCad, reading the errors, and editing the board.

I have no electrical engineering background, but I wanted to build my own device. I had used LLMs to write firmware for LED products, but board design is harder -- research, specs, electrical review, layout, validation, manufacturing outputs -- and every step can fail. Most AI tools stop after the first draft. We built a system that keeps going through the whole chain. Let me show you.

---

## 0:30 -- 0:50 | Phase 1: Research

[click Research tab]

The prompt was just "recreate the Ingo Maurer My New Flame lamp." The agent researches online, finds real websites, PDFs, images. Each fact is tagged by source -- green is official docs, orange is photo-derived, blue is the agent's best guess. At the bottom, unresolved questions. It doesn't pretend to know everything.

---

## 0:50 -- 1:14 | Phase 2: Design

[click Design tab]

This is a multi-agent review phase. Different models check the research and do a reality check. Here you can see the agents found a battery mismatch -- wrong charger chip for the battery chemistry. Rejected. And it caught that the LEDs are a rectangular grid, not flame-shaped.

Then the system refuses to build because the charger design is still unresolved. Instead of guessing, it branches to a modernized version. That becomes the build target.

---

## 1:14 -- 1:38 | Phase 3: Build

[click Build tab]

Now we generate the actual board. On the left, the highlighted areas show where agents placed components -- LEDs at the top, drivers in the middle, connectors at the bottom. But placing them isn't enough, you have to connect them. 272 components, over a thousand traces.

---

## 1:38 -- 2:10 | Phase 4: Validate

[click Validate tab]

The board starts with 451 design rule violations. The agents run a loop -- read violations, propose a fix, apply it, check again. If it improves, keep it. If it gets worse, revert. You can see the counter dropping. Green lines are improvements, red are reverts.

After 33 cycles: zero violations. Clean board.

---

## 2:10 -- 2:40 | Phase 5: Export

[click Export tab]

Now we can export the device. All the manufacturing files are here -- Gerbers, drill files, BOM, pick-and-place positions. You can download the bundle, send it to JLCPCB or any manufacturer, and they produce the board for you.

On the right, a 3D model of the board rendered live in the browser.

---

## 2:40 -- 3:00 | Close

Five phases, one artifact chain. From a vague prompt to files you can actually send to a factory. Agents that research with real sources, catch mistakes before they reach layout, refuse to build when something is unknown, and iterate until the board is clean.
