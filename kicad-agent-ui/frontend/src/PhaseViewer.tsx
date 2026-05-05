import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ALL_PHASES,
  Beat,
  DemoEvent,
  Phase,
  PHASE_LABELS,
  extractBeats,
  loadAllReplays,
} from "./replay";
import { PHASE1_TERMINAL, PHASE1_AGENT } from "./terminal_phase1";
import type { TerminalLine } from "./terminal_phase1";
import { TerminalPanel } from "./TerminalPanel";

type PlayState = "idle" | "playing" | "paused";

// ─── Tag badges ───
const TAG_COLORS: Record<string, { bg: string; fg: string }> = {
  published: { bg: "#1b5e20", fg: "#66bb6a" },
  "photo-derived": { bg: "#e65100", fg: "#ffa726" },
  reconstruction: { bg: "#01579b", fg: "#4fc3f7" },
};

// ─── Animated counter ───
function useAnimatedValue(target: number, duration = 500): number {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number>(0);
  const startRef = useRef({ value: target, time: 0 });

  useEffect(() => {
    const start = display;
    const diff = target - start;
    if (diff === 0) return;
    startRef.current = { value: start, time: performance.now() };
    const animate = (now: number) => {
      const elapsed = now - startRef.current.time;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startRef.current.value + diff * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

// ─── Phase 1: Research ───
function ResearchView({ events }: { events: DemoEvent[] }) {
  const sources = events.filter((e) => e.type === "source_fetched");
  const facts = events.filter((e) => e.type === "fact_added");
  const questions = events.filter((e) => e.type === "question_added");
  const sourceListRef = useRef<HTMLDivElement>(null);
  const factListRef = useRef<HTMLDivElement>(null);
  const questionListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    [sourceListRef.current, factListRef.current, questionListRef.current].forEach((list) => {
      if (list) list.scrollTop = list.scrollHeight;
    });
  }, [sources.length, facts.length, questions.length]);

  return (
    <div className="phase-content research-view">
      <div className="research-sources">
        <div className="section-label">Sources Consulted ({sources.length})</div>
        <div className="research-list" ref={sourceListRef}>
          {sources.map((e) => (
            <div key={e.t} className="source-row fade-in">
              <span className="source-icon">{e.payload.icon as string}</span>
              <span className="source-name">{e.payload.source as string}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="research-facts">
        <div className="section-label">Fact Ledger ({facts.length})</div>
        <div className="research-list" ref={factListRef}>
          {facts.map((e) => {
            const tag = e.payload.tag as string;
            const colors = TAG_COLORS[tag] || TAG_COLORS.reconstruction;
            return (
              <div key={e.t} className="fact-row fade-in">
                <span className="fact-tag" style={{ background: colors.bg, color: colors.fg }}>
                  {tag}
                </span>
                <span className="fact-claim">{e.payload.claim as string}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="research-questions">
        <div className="section-label">Unresolved Questions ({questions.length})</div>
        <div className="research-list" ref={questionListRef}>
          {questions.map((e) => (
            <div key={e.t} className="question-row fade-in">
              <span className="question-icon">?</span>
              <span className="question-text">{e.payload.question as string}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Phase 2: Design ───
function designTerminalLines(events: DemoEvent[]): TerminalLine[] {
  return events.flatMap((event): TerminalLine[] => {
    if (event.type === "phase_start") {
      return [
        {
          t: event.t,
          type: "user_prompt",
          content: "Consolidate the Phase 1 research brief into a buildable KiCad spec. Use separate reviewer agents to fact-check risky claims before build.",
        },
        {
          t: event.t + 80,
          type: "agent_text",
          content: `Starting design review. ${event.payload.goal as string}.`,
        },
        {
          t: event.t + 160,
          type: "tool_call",
          content: "spawn_agents([spec-normalizer, design-research, electrical-reviewer, critic])",
        },
      ];
    }

    if (event.type === "version_created") {
      const version = event.payload.version as string;
      const status = event.payload.status as string;
      return [
        {
          t: event.t,
          type: "tool_call",
          content: `spec-normalizer.propose_spec(version="${version}")`,
        },
        {
          t: event.t + 80,
          type: status === "active" ? "status_ok" : status === "blocked" ? "status_warn" : "tool_result",
          content: `${status.toUpperCase()} · ${event.payload.summary as string}`,
        },
      ];
    }

    if (event.type === "error_caught") {
      const claim = event.payload.claim as string;
      const reviewer = claim.includes("MCP") ? "electrical-reviewer" : "design-research";
      return [
        {
          t: event.t,
          type: "tool_call",
          content: `${reviewer}.review_claim("${claim}")`,
        },
        {
          t: event.t + 80,
          type: "status_warn",
          content: `CLAIM REJECTED · ${claim}`,
        },
        {
          t: event.t + 160,
          type: "tool_result",
          content: `Verdict: ${event.payload.critic as string}\nPatch: ${event.payload.action as string}`,
        },
        {
          t: event.t + 240,
          type: "tool_result",
          content: `diff --spec\n- ${claim}\n+ ${event.payload.action as string}`,
        },
      ];
    }

    if (event.type === "build_refused") {
      return [
        {
          t: event.t,
          type: "tool_call",
          content: "critic.build_gate(version=\"v4_faithful\")",
        },
        {
          t: event.t + 80,
          type: "status_warn",
          content: "BUILD REFUSED · unresolved architecture risk",
        },
        {
          t: event.t + 160,
          type: "tool_result",
          content: `Reason: ${event.payload.reason as string}\nDecision: ${event.payload.decision as string}\nInsight: "${event.payload.insight as string}"`,
        },
      ];
    }

    if (event.type === "branch_decision") {
      return [
        {
          t: event.t,
          type: "tool_call",
          content: "orchestrator.branch_decision(faithful, derivative)",
        },
        {
          t: event.t + 80,
          type: "tool_result",
          content: `faithful: ${event.payload.faithful_path as string}\nderivative: ${event.payload.derivative_path as string}\nselected: ${event.payload.chosen as string}`,
        },
        {
          t: event.t + 160,
          type: "agent_text",
          content: event.payload.rationale as string,
        },
      ];
    }

    if (event.type === "phase_complete") {
      return [
        {
          t: event.t,
          type: "status_ok",
          content: `Design review complete · ${event.payload.versions as number} versions · ${event.payload.errors_caught as number} errors caught · target ${event.payload.build_target as string}`,
        },
        {
          t: event.t + 80,
          type: "handoff",
          content: "Handing off to kicad-spec-to-schematic with v5_modernized as the build target.",
        },
      ];
    }

    return [];
  });
}

function DesignView({ events }: { events: DemoEvent[] }) {
  const versions = events.filter((e) => e.type === "version_created");
  const errors = events.filter((e) => e.type === "error_caught");
  const refused = events.find((e) => e.type === "build_refused");
  const branch = events.find((e) => e.type === "branch_decision");
  const terminalLines = designTerminalLines(events);

  return (
    <div className="phase-content design-review-view">
      <div className="design-review-summary">
        <div className="design-timeline compact">
          <div className="section-label">Spec Evolution</div>
          <div className="design-summary-list">
            {versions.map((e, i) => {
              const status = e.payload.status as string;
              return (
                <div key={i} className={`version-card fade-in ${status}`}>
                  <div className="version-header">
                    <span className="version-name">{e.payload.version as string}</span>
                    <span className={`version-status status-${status}`}>{status}</span>
                  </div>
                  <div className="version-summary">{e.payload.summary as string}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="design-events compact">
          <div className="section-label">Review Pressure</div>
          <div className="design-summary-list">
            {errors.map((e, i) => (
              <div key={i} className="error-card fade-in">
                <div className="error-header">ERROR CAUGHT</div>
                <div className="error-claim">
                  <span className="error-label">Claim:</span> "{e.payload.claim as string}"
                </div>
                <div className="error-critic">
                  <span className="error-label">Critic:</span> {e.payload.critic as string}
                </div>
                <div className="error-action">
                  <span className="error-label">Action:</span> {e.payload.action as string}
                </div>
              </div>
            ))}
            {refused && (
              <div className="refused-card fade-in">
                <div className="refused-header">BUILD REFUSED</div>
                <div className="refused-reason">{refused.payload.reason as string}</div>
                <div className="refused-decision">{refused.payload.decision as string}</div>
                <div className="refused-insight">"{refused.payload.insight as string}"</div>
              </div>
            )}
            {branch && (
              <div className="branch-card fade-in">
                <div className="branch-header">BRANCH POINT</div>
                <div className="branch-option blocked">
                  <span className="branch-label">Faithful:</span> {branch.payload.faithful_path as string}
                </div>
                <div className="branch-option chosen">
                  <span className="branch-label">Derivative:</span> {branch.payload.derivative_path as string}
                </div>
                <div className="branch-rationale">{branch.payload.rationale as string}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="phase-content terminal-container design-terminal-container">
        <TerminalPanel
          lines={terminalLines}
          visibleCount={terminalLines.length}
          agent="multi-agent-review"
          title="claude-code · phase: design · mode: multi-agent review"
          isStreaming={false}
        />
      </div>
    </div>
  );
}

// ─── Phase 3: Build ───
const BUILD_COMPONENT_GROUPS = [
  {
    refs: "D1-D128",
    value: "WW_2700K",
    footprint: "candle:Candle_LED_0603_Matrix",
    qty: 128,
    role: "Front 8x16 flame field",
    step: "LED field (left)",
  },
  {
    refs: "D129-D256",
    value: "WW_2700K",
    footprint: "candle:Candle_LED_0603_Matrix",
    qty: 128,
    role: "Rear 8x16 flame field on B.Cu",
    step: "LED field (right)",
  },
  {
    refs: "U2, U3",
    value: "IS31FL3731-QF",
    footprint: "Package_DFN_QFN:QFN-28-1EP_4x4mm_P0.4mm",
    qty: 2,
    role: "One charlieplex matrix driver per face",
    step: "Driver ICs",
  },
  {
    refs: "U1",
    value: "ATtiny1616-M",
    footprint: "Package_DFN_QFN:VQFN-20-1EP_3x3mm_P0.4mm",
    qty: 1,
    role: "Stem MCU, I2C, UPDI, button control",
    step: "MCU placement",
  },
  {
    refs: "C1-C8, R1-R2",
    value: "100n / 4.7u / 1u / 20k",
    footprint: "0603 + 0805 passives",
    qty: 10,
    role: "Decoupling, filter caps, current set",
    step: "Passive placement",
  },
  {
    refs: "J1, J2, SW1",
    value: "Stem socket, UPDI pads, PCB button",
    footprint: "candle.pretty + CK KMR2 switch",
    qty: 3,
    role: "Base interface, service, user input",
    step: "Board outline",
  },
];

const BUILD_AGENTS = [
  {
    name: "build-orchestrator",
    call: "handoff(v5_modernized)",
    role: "Locks spec target and starts deterministic KiCad generation.",
    result: "target: candle.kicad_pcb",
    step: "Board outline",
  },
  {
    name: "schematic-architect",
    call: "schematic_architect.py",
    role: "Captures base power path plus stem MCU/driver partition.",
    result: "candle.kicad_sch",
    step: "MCU placement",
  },
  {
    name: "pcb-generator",
    call: "tools/generate_candle.py",
    role: "Creates outline, local footprints, placement, routes, and zones.",
    result: "272 footprints",
    step: "LED field (right)",
  },
  {
    name: "matrix-placement",
    call: "matrix_leds(front, rear)",
    role: "Places D1-D256 as dual 8x16 LED fields on opposite faces.",
    result: "256 LEDs",
    step: "LED field (right)",
  },
  {
    name: "route-strategist",
    call: "route_charlieplex()",
    role: "Assigns F.Cu/In1/In2/B.Cu routes for matrix, I2C, power.",
    result: "1060 segments",
    step: "Routing",
  },
  {
    name: "board-validator",
    call: "canonicalize + stabilize",
    role: "Canonicalizes board output and checks deterministic SHA stability.",
    result: "sha 972e3653",
    step: "gen_complete",
  },
];

const PCB_WIDTH_MM = 30;
const PCB_HEIGHT_MM = 430;

const PCB_PARTS = [
  { ref: "U2", x: 15, y: 328, w: 4.6, h: 4.6, side: "top", kind: "chip", label: "U2", step: "Driver ICs" },
  { ref: "U3", x: 15, y: 328, w: 4.6, h: 4.6, side: "bottom", kind: "chip", label: "U3", step: "Driver ICs" },
  { ref: "U1", x: 15, y: 236, w: 3.4, h: 3.4, side: "top", kind: "mcu", label: "U1", step: "MCU placement", rotate: 45 },
  { ref: "SW1", x: 15, y: 160, w: 5.2, h: 3.0, side: "top", kind: "switch", label: "SW1", step: "MCU placement" },
  { ref: "C6", x: 15, y: 55, w: 2.2, h: 1.45, side: "top", kind: "passive", label: "C6", step: "Passive placement", rotate: 90 },
  { ref: "C5", x: 20.2, y: 236, w: 1.7, h: 1.0, side: "top", kind: "passive", label: "C5", step: "Passive placement", rotate: 90 },
  { ref: "R1", x: 6.8, y: 323, w: 1.8, h: 1.0, side: "top", kind: "passive", label: "R1", step: "Passive placement", rotate: 90 },
  { ref: "R2", x: 6.8, y: 323, w: 1.8, h: 1.0, side: "bottom", kind: "passive", label: "R2", step: "Passive placement", rotate: 90 },
  { ref: "C1", x: 23.2, y: 343, w: 1.7, h: 1.0, side: "top", kind: "passive", label: "C1", step: "Passive placement", rotate: 90 },
  { ref: "C2", x: 6.8, y: 343, w: 2.2, h: 1.45, side: "top", kind: "passive", label: "C2", step: "Passive placement", rotate: 90 },
  { ref: "C3", x: 6.8, y: 343, w: 1.7, h: 1.0, side: "bottom", kind: "passive", label: "C3", step: "Passive placement", rotate: 90 },
  { ref: "C4", x: 23.2, y: 343, w: 2.2, h: 1.45, side: "bottom", kind: "passive", label: "C4", step: "Passive placement", rotate: 90 },
  { ref: "C7", x: 20, y: 324, w: 1.7, h: 1.0, side: "top", kind: "passive", label: "C7", step: "Passive placement", rotate: 90 },
  { ref: "C8", x: 18, y: 324, w: 1.7, h: 1.0, side: "bottom", kind: "passive", label: "C8", step: "Passive placement", rotate: 90 },
] as const;

function footprintShortName(footprint: string) {
  return footprint.split(":").pop() || footprint;
}

function pcbY(yMm: number) {
  return PCB_HEIGHT_MM - yMm;
}

function ledPositions(startRef: number, side: "top" | "bottom") {
  const x0 = 4.85;
  const y0 = 416;
  const pitch = 2.9;

  return Array.from({ length: 16 * 8 }, (_, index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    return {
      ref: `D${startRef + index}`,
      side,
      x: x0 + col * pitch,
      y: y0 - row * pitch,
    };
  });
}

function PcbRect({
  x,
  y,
  w,
  h,
  className,
  rotate = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  className: string;
  rotate?: number;
}) {
  const cy = pcbY(y);
  return (
    <rect
      className={className}
      x={x - w / 2}
      y={cy - h / 2}
      width={w}
      height={h}
      rx={Math.min(w, h) * 0.18}
      transform={rotate ? `rotate(${-rotate} ${x} ${cy})` : undefined}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function BuildPcbMap({
  isStepDone,
  viewBox = `0 0 ${PCB_WIDTH_MM} ${PCB_HEIGHT_MM}`,
  compact = false,
}: {
  isStepDone: (step: string) => boolean;
  viewBox?: string;
  compact?: boolean;
}) {
  const frontLeds = ledPositions(1, "top");
  const rearLeds = ledPositions(129, "bottom");
  const gridX = [5, 10, 15, 20, 25];
  const gridY = [50, 100, 150, 200, 250, 300, 350, 400];

  return (
    <svg className={`pcb-map-svg ${compact ? "compact" : ""}`} viewBox={viewBox} aria-label="Actual generated KiCad PCB coordinate map">
      <defs>
        <linearGradient id="pcbCopper" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#163c21" />
          <stop offset="1" stopColor="#0d2416" />
        </linearGradient>
      </defs>
      <path className="pcb-outline-fill" d="M0 430 L30 430 L30 3 Q30 0 27 0 L3 0 Q0 0 0 3 Z" />
      <path className="pcb-outline-stroke" d="M0 430 L30 430 L30 3 Q30 0 27 0 L3 0 Q0 0 0 3 Z" vectorEffect="non-scaling-stroke" />
      {gridX.map((x) => (
        <line key={`x${x}`} className="pcb-grid-line" x1={x} y1={0} x2={x} y2={430} vectorEffect="non-scaling-stroke" />
      ))}
      {gridY.map((y) => (
        <line key={`y${y}`} className="pcb-grid-line" x1={0} y1={pcbY(y)} x2={30} y2={pcbY(y)} vectorEffect="non-scaling-stroke" />
      ))}

      <g className={`pcb-led-layer rear ${isStepDone("LED field (right)") ? "active" : ""}`}>
        {rearLeds.map((led) => (
          <PcbRect key={led.ref} x={led.x} y={led.y} w={0.95} h={1.75} rotate={90} className="pcb-led bottom-side" />
        ))}
      </g>
      <g className={`pcb-led-layer front ${isStepDone("LED field (left)") ? "active" : ""}`}>
        {frontLeds.map((led) => (
          <PcbRect key={led.ref} x={led.x} y={led.y} w={0.8} h={1.6} rotate={90} className="pcb-led top-side" />
        ))}
      </g>

      <g className={`pcb-part-layer ${isStepDone("Board outline") ? "active" : ""}`}>
        {[10, 20].map((x) => (
          <PcbRect key={`j1-top-${x}`} x={x} y={12} w={4.2} h={8} className="pcb-pad top-side socket-pad" />
        ))}
        {[10, 20].map((x) => (
          <PcbRect key={`j1-bottom-${x}`} x={x} y={12} w={4.6} h={8.4} className="pcb-pad bottom-side socket-pad" />
        ))}
        {[13.73, 15, 16.27].map((x) => (
          <PcbRect key={`j2-${x}`} x={x} y={33} w={1} h={1.8} className="pcb-pad top-side service-pad" />
        ))}
        <text className="pcb-ref-label" x={15} y={pcbY(12) + 6}>J1</text>
        <text className="pcb-ref-label small" x={15} y={pcbY(33) - 3}>J2</text>
      </g>

      <g>
        {PCB_PARTS.map((part) => {
          const active = isStepDone(part.step);
          return (
            <g key={`${part.ref}-${part.side}`} className={`pcb-part ${part.kind} ${part.side}-side ${active ? "active" : ""}`}>
              <PcbRect
                x={part.x}
                y={part.y}
                w={part.w}
                h={part.h}
                rotate={"rotate" in part ? part.rotate : 0}
                className={`pcb-part-body ${part.kind} ${part.side}-side`}
              />
              {["U1", "U2", "U3", "SW1", "C6"].includes(part.ref) && (
                <text className={`pcb-ref-label ${part.ref === "U3" ? "bottom-label" : ""}`} x={part.x} y={pcbY(part.y) + 1.1}>
                  {part.ref}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {!compact && (
        <>
          <text className="pcb-axis-label" x={1.2} y={pcbY(430) + 7}>y=430 top radius</text>
          <text className="pcb-axis-label" x={1.2} y={pcbY(0) - 4}>y=0 base contacts</text>
        </>
      )}
    </svg>
  );
}

function BuildView({ events }: { events: DemoEvent[] }) {
  const steps = events.filter((e) => e.type === "gen_step" || e.type === "gen_complete");
  const complete = events.find((e) => e.type === "gen_complete");
  const visibleStepNames = new Set(
    events.filter((e) => e.type === "gen_step").map((e) => e.payload.step as string)
  );
  const isStepDone = useCallback(
    (step: string) => Boolean(complete) || visibleStepNames.has(step),
    [complete, visibleStepNames]
  );
  const placedCount = BUILD_COMPONENT_GROUPS.reduce((sum, group) => sum + (isStepDone(group.step) ? group.qty : 0), 0);
  const completedSteps = steps.filter((e) => e.type === "gen_step").length;
  const componentTotal = (complete?.payload.components as number | undefined) || 272;
  const netTotal = (complete?.payload.nets as number | undefined) || 45;
  const currentStepName = [...events]
    .reverse()
    .find((e) => e.type === "gen_step")?.payload.step as string | undefined;
  const isAgentCalled = useCallback(
    (step: string) => (step === "gen_complete" ? Boolean(complete) : isStepDone(step)),
    [complete, isStepDone]
  );

  return (
    <div className="phase-content build-view">
      <div className="build-board-panel">
        <div className="section-label">KiCad Board Generated</div>
        <div className="build-board-meta">
          <div>
            <span className="build-meta-label">Target</span>
            <span className="build-meta-value">v5_modernized</span>
          </div>
          <div>
            <span className="build-meta-label">Board</span>
            <span className="build-meta-value">430 x 30 x 3 mm</span>
          </div>
          <div>
            <span className="build-meta-label">Stackup</span>
            <span className="build-meta-value">F.Cu / In1 / In2 / B.Cu</span>
          </div>
        </div>
        <div className="pcb-map-shell">
          <div className="pcb-map">
            <div className="pcb-overview">
              <BuildPcbMap isStepDone={isStepDone} />
            </div>
            <div className="pcb-detail-stack">
              <div className="pcb-detail-pane">
                <span className="pcb-detail-label">LED matrices · y 372.5-416</span>
                <BuildPcbMap isStepDone={isStepDone} viewBox="-1 -2 32 74" compact />
              </div>
              <div className="pcb-detail-pane">
                <span className="pcb-detail-label">Drivers + passives · y 323-343</span>
                <BuildPcbMap isStepDone={isStepDone} viewBox="-1 82 32 32" compact />
              </div>
              <div className="pcb-detail-pane">
                <span className="pcb-detail-label">Base contacts + service · y 0-55</span>
                <BuildPcbMap isStepDone={isStepDone} viewBox="-1 372 32 60" compact />
              </div>
            </div>
          </div>
          <div className="pcb-map-legend">
            <span>Scaled from `candle.kicad_pcb`: actual footprint coordinates, 30 x 430mm outline</span>
            <span>F.Cu amber + B.Cu blue overlaid · {placedCount} / {componentTotal} PCB components placed</span>
          </div>
        </div>
      </div>

      <div className="build-manifest-panel">
        <div className="build-stats">
          <div className="build-stat">
            <span className="build-stat-value">{placedCount}</span>
            <span className="build-stat-label">components placed</span>
          </div>
          <div className="build-stat">
            <span className="build-stat-value">{netTotal}</span>
            <span className="build-stat-label">named nets</span>
          </div>
          <div className="build-stat">
            <span className="build-stat-value">{isStepDone("Routing") ? "1060" : "0"}</span>
            <span className="build-stat-label">segments routed</span>
          </div>
          <div className="build-stat">
            <span className="build-stat-value">{isStepDone("Routing") ? "361" : "0"}</span>
            <span className="build-stat-label">vias emitted</span>
          </div>
        </div>

        <div className="build-main-grid">
          <div className="build-table-panel">
            <div className="section-label">Component Manifest</div>
            <div className="build-component-list">
              {BUILD_COMPONENT_GROUPS.map((group) => {
                const done = isStepDone(group.step);
                return (
                  <div key={group.refs} className={`build-component-row ${done ? "done" : "pending"} fade-in`}>
                    <div className="build-component-primary">
                      <span className="build-component-refs">{group.refs}</span>
                      <span className="build-component-value">{group.value}</span>
                    </div>
                    <div className="build-component-role">{group.role}</div>
                    <div className="build-component-footprint">{footprintShortName(group.footprint)}</div>
                    <div className="build-component-qty">x{group.qty}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="build-side-panels">
            <div className="build-output-panel build-agents-panel">
              <div className="section-label">Agents Invoked</div>
              <div className="build-agent-list">
                {BUILD_AGENTS.map((agent) => {
                  const called = isAgentCalled(agent.step);
                  const active = !complete && currentStepName === agent.step;
                  return (
                    <div
                      key={agent.name}
                      className={`build-agent-row ${called ? "called" : "pending"} ${active ? "active" : ""}`}
                    >
                      <div className="build-agent-header">
                        <span className="build-agent-name">{agent.name}</span>
                        <span className="build-agent-status">{called ? (active ? "running" : "done") : "queued"}</span>
                      </div>
                      <div className="build-agent-call">{agent.call}</div>
                      <div className="build-agent-role">{agent.role}</div>
                      <div className="build-agent-result">{agent.result}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="build-progress">
          <div className="section-label">Generator Pipeline ({completedSteps} / 8)</div>
          <div className="build-step-list">
            {steps.map((e, i) => (
              <div key={i} className={`build-step ${e.type === "gen_complete" ? "complete" : ""} fade-in`}>
                {e.type === "gen_complete" ? (
                  <div className="build-complete">
                    <span className="build-check">✓</span>
                    <span>Board generated: {e.payload.components as number} components, SHA {e.payload.sha as string}</span>
                  </div>
                ) : (
                  <>
                    <div className="build-step-name">{e.payload.step as string}</div>
                    <div className="build-step-detail">{e.payload.detail as string}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Phase 4: Validate (DRC) ───
function ValidateView({ currentBeat, beats }: { currentBeat: number; beats: Beat[] }) {
  const animatedDrc = useAnimatedValue(
    currentBeat < 0 ? 451 : beats[currentBeat].reverted ? beats[currentBeat].drc_before : beats[currentBeat].drc_after
  );
  const color = animatedDrc === 0 ? "#66bb6a" : animatedDrc < 50 ? "#4fc3f7" : animatedDrc < 200 ? "#ffa726" : "#ef5350";
  const pct = ((451 - animatedDrc) / 451) * 100;

  const activeBeat = currentBeat >= 0 ? beats[currentBeat] : null;

  return (
    <div className="phase-content validate-view">
      <div className={`drc-hero ${animatedDrc === 0 ? "complete" : ""}`}>
        <div className="drc-hero-label">DRC VIOLATIONS</div>
        <div className="drc-hero-value" style={{ color }}>{animatedDrc}</div>
        <div className="drc-hero-bar">
          <div className="drc-hero-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      {activeBeat && (
        <div className={`validate-beat ${activeBeat.reverted ? "reverted" : ""}`}>
          <div className="validate-beat-action">{activeBeat.action}</div>
          <div className="validate-beat-detail">{activeBeat.detail}</div>
          {activeBeat.reverted && <div className="validate-revert-badge">REVERTED — trying different approach</div>}
        </div>
      )}
      <div className="validate-log">
        <div className="section-label">Iteration Log ({Math.max(0, currentBeat + 1)} / {beats.length})</div>
        {beats.slice(0, Math.max(0, currentBeat + 1)).map((beat, i) => {
          const delta = beat.drc_after - beat.drc_before;
          return (
            <div key={i} className={`validate-entry ${beat.reverted ? "reverted" : ""} ${i === currentBeat ? "active" : ""}`}>
              <span className={`validate-delta ${delta > 0 ? "regression" : "improvement"}`}>
                {delta > 0 ? "+" : ""}{delta}
              </span>
              <span className="validate-action">{beat.action.substring(0, 50)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Phase 5: Export ───
function ExportView({ events }: { events: DemoEvent[] }) {
  const artifacts = events.filter((e) => e.type === "artifact");
  const bundle = events.find((e) => e.type === "bundle");

  return (
    <div className="phase-content export-view">
      <div className="export-list">
        <div className="section-label">Fabrication Artifacts</div>
        {artifacts.map((e, i) => (
          <div key={i} className="export-item fade-in">
            <span className="export-name">{e.payload.name as string}</span>
            <span className="export-size">{e.payload.size as string}</span>
          </div>
        ))}
        {bundle && (
          <div className="export-bundle fade-in">
            <div className="export-bundle-name">{bundle.payload.name as string}</div>
            <div className="export-bundle-size">{bundle.payload.size as string}</div>
            <div className="export-bundle-ready">Ready for fabrication</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main PhaseViewer ───
export function PhaseViewer() {
  const [replays, setReplays] = useState<Record<Phase, DemoEvent[]> | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [phase, setPhase] = useState<Phase>("research");
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [speed, setSpeed] = useState(1);
  const [visibleEvents, setVisibleEvents] = useState<DemoEvent[]>([]);
  const [drcBeat, setDrcBeat] = useState(-1);
  const [terminalCount, setTerminalCount] = useState(0);
  const timerRef = useRef<number>(0);
  const terminalTimerRef = useRef<number>(0);
  const phaseStartRef = useRef<number>(0);

  // Load replays from NDJSON on mount
  useEffect(() => {
    loadAllReplays().then((data) => {
      setReplays(data);
      setBeats(extractBeats(data.validate));
    });
  }, []);

  const resetPhase = useCallback((p: Phase) => {
    setPhase(p);
    setVisibleEvents([]);
    setTerminalCount(0);
    if (p === "validate") setDrcBeat(-1);
  }, []);

  // Event replay engine
  useEffect(() => {
    if (playState !== "playing" || !replays) return;
    if (phase === "validate") {
      const nextBeat = beats[drcBeat + 1];
      if (!nextBeat) {
        setPlayState("idle");
        phaseStartRef.current = 0;
        return;
      }
      const delay = nextBeat.signature ? 3000 / speed : 800 / speed;
      timerRef.current = window.setTimeout(() => {
        setDrcBeat((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timerRef.current);
    }

    const events = replays[phase].filter((e) => e.type !== "drc_beat");
    if (!events.length) {
      setPlayState("idle");
      phaseStartRef.current = 0;
      return;
    }

    phaseStartRef.current = phaseStartRef.current || performance.now();
    const elapsed = (performance.now() - phaseStartRef.current) * speed;
    const nextEvent = events.find((e) => e.t > elapsed && !visibleEvents.includes(e));

    if (!nextEvent) {
      setPlayState("idle");
      phaseStartRef.current = 0;
      return;
    }

    const delay = (nextEvent.t - elapsed) / speed;
    timerRef.current = window.setTimeout(() => {
      setVisibleEvents((prev) => [...prev, nextEvent]);
    }, Math.max(0, delay));

    return () => clearTimeout(timerRef.current);
  }, [playState, phase, visibleEvents, drcBeat, speed, resetPhase, replays, beats]);

  // Parallel terminal-line stream for the research phase.
  useEffect(() => {
    if (phase !== "research" || playState !== "playing") return;
    const next = PHASE1_TERMINAL[terminalCount];
    if (!next) return;
    const elapsed = (performance.now() - phaseStartRef.current) * speed;
    const delay = Math.max(0, (next.t - elapsed) / speed);
    terminalTimerRef.current = window.setTimeout(() => {
      setTerminalCount((c) => c + 1);
    }, delay);
    return () => clearTimeout(terminalTimerRef.current);
  }, [playState, phase, terminalCount, speed]);

  const handlePlay = () => {
    if (playState === "idle") {
      resetPhase(phase);
      phaseStartRef.current = performance.now();
    } else if (playState === "paused") {
      const elapsed =
        phase === "validate"
          ? 0
          : Math.max(0, ...visibleEvents.map((e) => e.t));
      phaseStartRef.current = performance.now() - elapsed / speed;
    }
    setPlayState("playing");
  };

  const handlePause = () => setPlayState("paused");

  const handleReset = () => {
    setPlayState("idle");
    resetPhase(phase);
    phaseStartRef.current = 0;
  };

  const handlePhaseClick = (p: Phase) => {
    if (!replays) return;
    setPlayState("idle");
    phaseStartRef.current = 0;
    setPhase(p);
    if (p !== "validate") {
      setVisibleEvents(replays[p].filter((e) => e.type !== "drc_beat"));
      setDrcBeat(-1);
    } else {
      setVisibleEvents([]);
      setDrcBeat(beats.length - 1);
    }
    setTerminalCount(p === "research" ? PHASE1_TERMINAL.length : 0);
  };

  if (!replays) {
    return (
      <div className="phase-viewer">
        <div className="pv-topbar"><h1>Loading replays...</h1></div>
      </div>
    );
  }

  return (
    <div className="phase-viewer">
      <div className="pv-topbar">
        <h1>KiCad Agent Pipeline</h1>
        <div className="pv-subtitle">candle · My New Flame · 430×30mm 4-layer</div>
        <div className="pv-controls">
          {playState === "playing" ? (
            <button className="pv-btn" onClick={handlePause}>⏸ Pause</button>
          ) : (
            <button className="pv-btn primary" onClick={handlePlay}>▶ Play</button>
          )}
          <button className="pv-btn" onClick={handleReset}>↺ Reset</button>
          <select className="pv-speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
        </div>
      </div>

      <div className="phase-tabs">
        {ALL_PHASES.map((p, i) => {
          const isActive = p === phase;
          const isPast = ALL_PHASES.indexOf(phase) > i;
          return (
            <button
              key={p}
              className={`phase-tab ${isActive ? "active" : ""} ${isPast ? "past" : ""}`}
              onClick={() => handlePhaseClick(p)}
            >
              <span className="phase-tab-num">{i + 1}</span>
              <span className="phase-tab-label">{PHASE_LABELS[p]}</span>
            </button>
          );
        })}
      </div>

      <div
        className={`phase-body ${phase === "research" ? "research-phase-body" : ""} ${
          phase === "design" ? "design-phase-body" : ""
        } ${
          phase === "build" ? "build-phase-body" : ""
        }`}
      >
        {phase === "research" && (
          <>
            <ResearchView events={visibleEvents} />
            <div className="phase-content terminal-container">
              <TerminalPanel
                lines={PHASE1_TERMINAL}
                visibleCount={terminalCount}
                agent={PHASE1_AGENT}
                isStreaming={playState === "playing"}
              />
            </div>
          </>
        )}
        {phase === "design" && <DesignView events={visibleEvents} />}
        {phase === "build" && <BuildView events={visibleEvents} />}
        {phase === "validate" && <ValidateView currentBeat={drcBeat} beats={beats} />}
        {phase === "export" && <ExportView events={visibleEvents} />}
      </div>
    </div>
  );
}
