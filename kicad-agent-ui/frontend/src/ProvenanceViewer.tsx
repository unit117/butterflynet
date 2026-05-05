import React, { useCallback, useEffect, useRef, useState } from "react";
import { BEATS, Beat, getDrcArc } from "./beats";

type PlayState = "idle" | "playing" | "paused";

const TECHNIQUE_COLORS: Record<string, string> = {
  "inner-layer-lift": "#4fc3f7",
  routing: "#66bb6a",
  "bug-fix": "#ffa726",
  "component-relocation": "#ab47bc",
  "zone-fill": "#78909c",
  "design-rule-change": "#ef5350",
};

const AGENT_LABELS: Record<string, string> = {
  "route-strategist": "Route Strategist",
  "drc-optimizer": "DRC Optimizer",
  "board-validator": "Board Validator",
};

function useAnimatedValue(target: number, duration = 600): number {
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

function DrcCounter({ value, max }: { value: number; max: number }) {
  const animatedValue = useAnimatedValue(value);
  const pct = ((max - animatedValue) / max) * 100;
  const color =
    animatedValue === 0 ? "#66bb6a" : animatedValue < 50 ? "#4fc3f7" : animatedValue < 200 ? "#ffa726" : "#ef5350";

  return (
    <div className={`drc-counter ${animatedValue === 0 ? "complete" : ""}`}>
      <div className="drc-counter-label">DRC VIOLATIONS</div>
      <div className="drc-counter-value" style={{ color }}>
        {animatedValue}
      </div>
      <div className="drc-counter-bar">
        <div
          className="drc-counter-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="drc-counter-range">
        <span>451</span>
        <span>0</span>
      </div>
    </div>
  );
}

function BeatCard({ beat, active, expanded }: { beat: Beat; active: boolean; expanded: boolean }) {
  const delta = beat.drc_after - beat.drc_before;
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
  const techniqueColor = TECHNIQUE_COLORS[beat.technique] || "#8892a4";

  return (
    <div className={`beat-card ${active ? "active" : ""} ${beat.reverted ? "reverted" : ""} ${beat.signature ? "signature" : ""}`}>
      <div className="beat-header">
        <span className="beat-agent" style={{ color: techniqueColor }}>
          {AGENT_LABELS[beat.agent] || beat.agent}
        </span>
        <span className={`beat-delta ${delta > 0 ? "regression" : delta < 0 ? "improvement" : ""}`}>
          {deltaStr}
        </span>
      </div>
      <div className="beat-action">{beat.action}</div>
      {expanded && (
        <div className="beat-expanded">
          <div className="beat-detail">{beat.detail}</div>
          <div className="beat-meta">
            <span className="beat-technique" style={{ borderColor: techniqueColor }}>
              {beat.technique}
            </span>
            <span className="beat-tool">{beat.tool}</span>
            <span className="beat-hotspot">{beat.hotspot}</span>
          </div>
          {beat.reverted && <div className="beat-revert-badge">REVERTED</div>}
        </div>
      )}
    </div>
  );
}

function IterationDiagram({ beat }: { beat: Beat }) {
  const delta = beat.drc_after - beat.drc_before;
  return (
    <div className="iteration-diagram">
      <div className="iter-step">
        <div className="iter-label">INPUT</div>
        <div className="iter-content">Hotspot: {beat.hotspot}</div>
      </div>
      <div className="iter-arrow">↓</div>
      <div className="iter-step">
        <div className="iter-label">DECOMPOSE</div>
        <div className="iter-content">
          orchestrator → {beat.agent}
          <br />
          proposes: {beat.action.substring(0, 60)}
        </div>
      </div>
      <div className="iter-arrow">↓</div>
      <div className="iter-step">
        <div className="iter-label">TOOL</div>
        <div className="iter-content">
          {beat.tool}
          {beat.tool === "candle_drc_experiment.py" && " test --patch"}
          <br />→ generate_candle.py → kicad-cli pcb drc
        </div>
      </div>
      <div className="iter-arrow">↓</div>
      <div className="iter-step">
        <div className="iter-label">DRC</div>
        <div className="iter-content">
          before: {beat.drc_before} → after: {beat.drc_after}{" "}
          <span className={delta > 0 ? "regression" : "improvement"}>
            ({delta > 0 ? "+" : ""}{delta})
          </span>
        </div>
      </div>
      <div className="iter-arrow">↓</div>
      <div className="iter-step">
        <div className="iter-label">OUTPUT</div>
        <div className="iter-content">
          {beat.reverted ? (
            <span className="regression">REVERT — try different coordinate</span>
          ) : (
            <span className="improvement">ACCEPT — update baseline</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProvenanceViewer() {
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [speed, setSpeed] = useState(1);
  const timeoutRef = useRef<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const currentDrc = currentBeat < 0 ? 451 : BEATS[currentBeat].reverted
    ? BEATS[currentBeat].drc_before
    : BEATS[currentBeat].drc_after;

  const advance = useCallback(() => {
    setCurrentBeat((prev) => {
      const next = prev + 1;
      if (next >= BEATS.length) {
        setPlayState("idle");
        return prev;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (playState !== "playing") return;

    const beat = BEATS[currentBeat + 1];
    if (!beat) {
      setPlayState("idle");
      return;
    }

    const delay = beat.signature ? 4000 / speed : 1200 / speed;
    timeoutRef.current = window.setTimeout(advance, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [playState, currentBeat, speed, advance]);

  useEffect(() => {
    if (logRef.current) {
      const active = logRef.current.querySelector(".beat-card.active");
      if (active) active.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentBeat]);

  const handlePlay = () => {
    if (currentBeat >= BEATS.length - 1) setCurrentBeat(-1);
    setPlayState("playing");
  };

  const handlePause = () => setPlayState("paused");
  const handleReset = () => {
    setPlayState("idle");
    setCurrentBeat(-1);
  };
  const handleStep = () => {
    if (currentBeat < BEATS.length - 1) advance();
  };

  const activeBeat = currentBeat >= 0 ? BEATS[currentBeat] : null;
  const arc = getDrcArc();

  return (
    <div className="provenance-viewer">
      <div className="pv-topbar">
        <h1>KiCad Agent — DRC Reduction Provenance</h1>
        <div className="pv-subtitle">
          candle.kicad_pcb · 430×30mm · 4-layer · 256 LEDs · ATtiny1616
        </div>
        <div className="pv-controls">
          {playState === "playing" ? (
            <button className="pv-btn" onClick={handlePause}>⏸ Pause</button>
          ) : (
            <button className="pv-btn primary" onClick={handlePlay}>▶ Play</button>
          )}
          <button className="pv-btn" onClick={handleStep}>⏭ Step</button>
          <button className="pv-btn" onClick={handleReset}>↺ Reset</button>
          <select
            className="pv-speed"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4× fast</option>
          </select>
          <span className="pv-beat-count">
            Beat {Math.max(0, currentBeat + 1)} / {BEATS.length}
          </span>
        </div>
      </div>

      <div className="pv-body">
        {/* Left: orchestrator log */}
        <div className="pv-log" ref={logRef}>
          <div className="pv-log-header">Orchestrator Timeline</div>
          {BEATS.map((beat, i) => (
            <BeatCard
              key={beat.id}
              beat={beat}
              active={i === currentBeat}
              expanded={i === currentBeat && (beat.signature || playState !== "playing")}
            />
          ))}
        </div>

        {/* Center: DRC counter + iteration diagram */}
        <div className="pv-center">
          <DrcCounter value={currentDrc} max={451} />

          {activeBeat ? (
            <IterationDiagram beat={activeBeat} />
          ) : (
            <div className="pv-ready">
              <div className="pv-ready-title">Ready to replay</div>
              <div className="pv-ready-sub">
                33 agent iterations · 20+ reverts · 451 → 0 DRC violations
              </div>
              <div className="pv-ready-sub">
                Every step is on disk, deterministic, and replayable.
              </div>
            </div>
          )}

          {/* Mini arc visualization */}
          <div className="pv-arc">
            <div className="pv-arc-label">DRC Arc</div>
            <div className="pv-arc-track">
              {arc.map((val, i) => {
                const x = (i / (arc.length - 1)) * 100;
                const y = (1 - val / 451) * 100;
                const isCurrent = i === currentBeat + 1;
                return (
                  <div
                    key={i}
                    className={`pv-arc-dot ${isCurrent ? "current" : ""}`}
                    style={{
                      left: `${x}%`,
                      bottom: `${y}%`,
                      opacity: i <= currentBeat + 1 ? 1 : 0.3,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: board info + stats */}
        <div className="pv-right">
          <div className="pv-right-header">Project</div>
          <div className="pv-info-card">
            <div className="pv-info-row">
              <span>Board</span>
              <span>Candle Stem (My New Flame)</span>
            </div>
            <div className="pv-info-row">
              <span>Size</span>
              <span>430 × 30 mm</span>
            </div>
            <div className="pv-info-row">
              <span>Layers</span>
              <span>4 (F.Cu / In1 / In2 / B.Cu)</span>
            </div>
            <div className="pv-info-row">
              <span>Components</span>
              <span>272</span>
            </div>
            <div className="pv-info-row">
              <span>LEDs</span>
              <span>256 (dual 8×16 charlieplex)</span>
            </div>
            <div className="pv-info-row">
              <span>MCU</span>
              <span>ATtiny1616</span>
            </div>
            <div className="pv-info-row">
              <span>Drivers</span>
              <span>2× IS31FL3733 (QFN-28)</span>
            </div>
          </div>

          <div className="pv-right-header">Agents</div>
          <div className="pv-info-card">
            <div className="pv-info-row">
              <span>Route Strategist</span>
              <span className="pv-agent-dot" style={{ background: "#4fc3f7" }} />
            </div>
            <div className="pv-info-row">
              <span>DRC Optimizer</span>
              <span className="pv-agent-dot" style={{ background: "#66bb6a" }} />
            </div>
            <div className="pv-info-row">
              <span>Board Validator</span>
              <span className="pv-agent-dot" style={{ background: "#78909c" }} />
            </div>
          </div>

          <div className="pv-right-header">Techniques Used</div>
          <div className="pv-info-card">
            {Object.entries(TECHNIQUE_COLORS).map(([tech, color]) => {
              const count = BEATS.filter((b) => b.technique === tech && !b.reverted).length;
              return (
                <div key={tech} className="pv-info-row">
                  <span style={{ color }}>{tech}</span>
                  <span>{count}×</span>
                </div>
              );
            })}
          </div>

          <div className="pv-right-header">Provenance</div>
          <div className="pv-info-card">
            <div className="pv-info-row">
              <span>Total iterations</span>
              <span>{BEATS.length}</span>
            </div>
            <div className="pv-info-row">
              <span>Reverted</span>
              <span>{BEATS.filter((b) => b.reverted).length}</span>
            </div>
            <div className="pv-info-row">
              <span>Board SHA</span>
              <span style={{ fontFamily: "monospace", fontSize: 11 }}>972e3653</span>
            </div>
            <div className="pv-info-row">
              <span>Deterministic</span>
              <span style={{ color: "#66bb6a" }}>✓ 3/3 runs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
