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
function BuildView({ events }: { events: DemoEvent[] }) {
  const steps = events.filter((e) => e.type === "gen_step" || e.type === "gen_complete");

  return (
    <div className="phase-content build-view">
      <div className="build-progress">
        <div className="section-label">Generator Pipeline</div>
        {steps.map((e, i) => (
          <div key={i} className="build-step fade-in">
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
