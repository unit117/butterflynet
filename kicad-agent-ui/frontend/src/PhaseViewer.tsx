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
type ResearchPane = "terminal" | "reference";

interface ResearchSourcePreview {
  eyebrow: string;
  title: string;
  detail: string;
  bullets: string[];
  showImage: boolean;
}

interface DesignSpecPreview {
  version: string;
  title: string;
  docPath: string;
  statusNote: string;
  excerpt: string[];
  diff: string[];
  takeaway: string;
}

const REPO_BLOB_BASE = "https://github.com/unit117/butterflynet/blob/main";

// ─── Demo Overview ───
function OverviewView() {
  const proofPoints = [
    { label: "Innovation", value: "Agents operate a real EDA app workflow" },
    { label: "Technical Depth", value: "KiCad files, DRC loops, routing, fabrication export" },
    { label: "Completeness", value: "Prompt to research, board, validation, and factory package" },
    { label: "Practicality", value: "Targets painful hardware iteration work" },
    { label: "Presentation", value: "Each phase hands a concrete artifact to the next" },
  ];
  const chainSteps = [
    { label: "Intent", detail: "plain design goal" },
    { label: "Research brief", detail: "sources, facts, unknowns" },
    { label: "Canonical spec", detail: "reviewed build target" },
    { label: "KiCad board", detail: "schematic and PCB" },
    { label: "Clean DRC", detail: "fix, check, revert loop" },
    { label: "Fab bundle", detail: "Gerbers, drills, BOM" },
  ];

  return (
    <div className="phase-content overview-view">
      <div className="overview-kicad-panel">
        <div className="overview-window">
          <div className="overview-window-titlebar">
            <div className="overview-window-dots">
              <span className="terminal-dot red" />
              <span className="terminal-dot yellow" />
              <span className="terminal-dot green" />
            </div>
            <div className="overview-window-title">candle - KiCad 10.0</div>
          </div>
          <div className="overview-kicad-body">
            <div className="overview-project-tree">
              <div className="overview-pane-title">Project Files</div>
              <div className="overview-tree-line project">candle.kicad_pro [main]</div>
              <div className="overview-tree-line folder">candle.pretty</div>
              <div className="overview-tree-line child">Candle_LED_0603_Matrix.kicad_mod</div>
              <div className="overview-tree-line child">Candle_StemSocket_4Pad.kicad_mod</div>
              <div className="overview-tree-line folder">outputs</div>
              <div className="overview-tree-line child">fabrication/gerbers</div>
              <div className="overview-tree-line selected">candle.kicad_pcb</div>
              <div className="overview-tree-line">candle.kicad_sch</div>
              <div className="overview-tree-line">tools/generate_candle.py</div>
            </div>
            <div className="overview-kicad-tools">
              <div className="overview-tool-row active">
                <div className="overview-tool-icon pcb-icon" />
                <div>
                  <div className="overview-tool-name">PCB Editor</div>
                  <div className="overview-tool-desc">Edit the project PCB design</div>
                </div>
              </div>
              <div className="overview-tool-row">
                <div className="overview-tool-icon sch-icon" />
                <div>
                  <div className="overview-tool-name">Schematic Editor</div>
                  <div className="overview-tool-desc">Edit the project schematic</div>
                </div>
              </div>
              <div className="overview-tool-row">
                <div className="overview-tool-icon gerber-icon" />
                <div>
                  <div className="overview-tool-name">Gerber Viewer</div>
                  <div className="overview-tool-desc">Preview manufacturing files</div>
                </div>
              </div>
              <div className="overview-kicad-caption">
                The demo runs on actual KiCad project files, not a mock board format.
              </div>
            </div>
          </div>
        </div>

        <div className="overview-object-strip">
          <div>
            <span className="overview-object-value">430x30mm</span>
            <span className="overview-object-label">4-layer board</span>
          </div>
          <div>
            <span className="overview-object-value">256</span>
            <span className="overview-object-label">LEDs</span>
          </div>
          <div>
            <span className="overview-object-value">272</span>
            <span className="overview-object-label">components</span>
          </div>
          <div>
            <span className="overview-object-value">451 -&gt; 0</span>
            <span className="overview-object-label">DRC violations</span>
          </div>
        </div>
      </div>

      <div className="overview-story-panel">
        <div className="overview-eyebrow">Overview</div>
        <h2>Agents meet KiCad, then keep working until the board is fab-ready.</h2>
        <p>
          KiCad gives the agents structured files and deterministic tools. The models reason about
          intent, specs, and failures; the toolchain mutates, checks, and exports the real hardware
          artifacts.
        </p>

        <div className="overview-chain">
          <div className="overview-chain-title">
            <span>Artifact chain</span>
            <strong>Every phase writes the next handoff</strong>
          </div>
          <ol className="overview-chain-flow" aria-label="Pipeline artifact chain">
            {chainSteps.map((step, index) => (
              <li key={step.label} className="overview-chain-step">
                <span className="overview-chain-index">{index + 1}</span>
                <span className="overview-chain-copy">
                  <strong>{step.label}</strong>
                  <span>{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="overview-proof-grid">
          {proofPoints.map((point) => (
            <div key={point.label} className="overview-proof-card">
              <div className="overview-proof-label">{point.label}</div>
              <div className="overview-proof-value">{point.value}</div>
            </div>
          ))}
        </div>

        <div className="overview-start-note">
          Press Start Phase 1 to begin with an empty agent session.
        </div>
      </div>
    </div>
  );
}

// ─── Tag badges ───
const TAG_COLORS: Record<string, { bg: string; fg: string }> = {
  published: { bg: "#1b5e20", fg: "#66bb6a" },
  "photo-derived": { bg: "#e65100", fg: "#ffa726" },
  reconstruction: { bg: "#01579b", fg: "#4fc3f7" },
};

const SOURCE_PREVIEWS: Record<string, ResearchSourcePreview> = {
  "Ingo Maurer product page": {
    eyebrow: "Official product source",
    title: "Ingo Maurer My New Flame",
    detail: "Canonical product identity, proportions, and visible interaction constraints for the lamp recreation.",
    bullets: ["Confirms product name", "Shows slim PCB stem and metal base", "Establishes visual target"],
    showImage: true,
  },
  "MoMA Design Store listing": {
    eyebrow: "Retail listing",
    title: "Commercial listing cross-check",
    detail: "Independent public listing used to verify product naming and published feature claims.",
    bullets: ["Name consistency", "Product category", "Public-facing specification sanity check"],
    showImage: true,
  },
  "Official instruction manual (PDF)": {
    eyebrow: "Official manual",
    title: "Power and operation constraints",
    detail: "Manual evidence for USB charging behavior, battery configuration, and charging status LED behavior.",
    bullets: ["4x AA NiMH cells", "Runs while charging", "Base LED status behavior"],
    showImage: false,
  },
  "USB-C product revision notes": {
    eyebrow: "Revision evidence",
    title: "USB-C input revision",
    detail: "Revision source for current connector and input power assumptions before the design branch.",
    bullets: ["USB-C input", "5V max 1000mA", "Modernized connector target"],
    showImage: false,
  },
  "Manual cover art (high-res scan)": {
    eyebrow: "Photo-derived evidence",
    title: "Visible PCB and LED layout",
    detail: "High-resolution visual source used to infer the rectangular LED matrix and concealed contact features.",
    bullets: ["8x16 LED field per face", "Rectangular physical population", "Visible stem/base contact clues"],
    showImage: true,
  },
  "IS31FL3731/3733 datasheets (ISSI)": {
    eyebrow: "Component datasheet",
    title: "LED matrix driver candidates",
    detail: "Datasheets used to compare the likely matrix-driver family and constrain the charlieplexed LED architecture.",
    bullets: ["ISSI LED driver family", "Matrix-driver capability", "IC ambiguity carried into review"],
    showImage: false,
  },
  "ATtiny1616 datasheet (Microchip)": {
    eyebrow: "MCU datasheet",
    title: "Stem controller candidate",
    detail: "Microcontroller source used for I2C, UPDI, and button-control assumptions in the reconstructed design.",
    bullets: ["20-pin AVR", "Hardware I2C", "UPDI programming path"],
    showImage: false,
  },
};

function getResearchPreview(sourceName: string): ResearchSourcePreview {
  return (
    SOURCE_PREVIEWS[sourceName] || {
      eyebrow: "Research source",
      title: sourceName,
      detail: "Source consulted by the research agent and carried into the tagged fact ledger.",
      bullets: ["Source-linked fact evidence", "Reviewable provenance", "Available to downstream spec agents"],
      showImage: false,
    }
  );
}

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
function ResearchView({
  events,
  onShowReference,
}: {
  events: DemoEvent[];
  onShowReference: (source: DemoEvent) => void;
}) {
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
            <button key={e.t} className="source-row fade-in" type="button" onClick={() => onShowReference(e)}>
              <span className="source-icon">{e.payload.icon as string}</span>
              <span className="source-name">{e.payload.source as string}</span>
              <span className="source-action">View</span>
            </button>
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

function ResearchReferencePane({
  source,
  onShowTerminal,
}: {
  source: DemoEvent | null;
  onShowTerminal: () => void;
}) {
  const sourceName = (source?.payload.source as string | undefined) || "Ingo Maurer product page";
  const sourceUrl = source?.payload.url as string | undefined;
  const preview = getResearchPreview(sourceName);

  return (
    <div className="phase-content research-reference-pane">
      <div className="terminal-panel reference-terminal-panel">
        <div className="terminal-chrome">
          <span className="terminal-dot red" />
          <span className="terminal-dot yellow" />
          <span className="terminal-dot green" />
          <span className="terminal-title">source-preview · {sourceName}</span>
          <button className="terminal-action-btn" type="button" onClick={onShowTerminal}>
            Show terminal
          </button>
        </div>
        <div className={`reference-preview-body ${preview.showImage ? "" : "no-image"}`}>
          {preview.showImage && (
            <div className="reference-preview-image-wrap">
              <img
                className="reference-preview-image"
                src="/reference/my-new-flame-reference.png"
                alt="Ingo Maurer My New Flame reference"
              />
            </div>
          )}
          <div className="reference-preview-meta">
            <div>
              <div className="reference-preview-eyebrow">{preview.eyebrow}</div>
              <div className="reference-preview-title">{preview.title}</div>
              {sourceUrl && <div className="reference-preview-url">{sourceUrl}</div>}
            </div>
            <div className="reference-preview-detail">{preview.detail}</div>
            <div className="reference-preview-bullets">
              {preview.bullets.map((bullet) => (
                <div key={bullet} className="reference-preview-bullet">
                  <span />
                  <strong>{bullet}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Phase 2: Design ───
const DESIGN_SPEC_PREVIEWS: Record<string, DesignSpecPreview> = {
  v3: {
    version: "v3",
    title: "Initial image-driven concept",
    docPath: "hardware/candle/archive/legacy_docs/candle_spec_v3.md",
    statusNote: "Superseded: wrong geometry, wrong dock concept",
    excerpt: [
      "Image-driven approximation with a 275 x 22 mm board, small metal base, 2-layer PCB, and visual assumptions from the supplied render.",
      "Useful as an early concept, but not source-faithful to the published dimensions, power architecture, or product behavior.",
    ],
    diff: [
      "- PCB length: 275 mm",
      "- PCB width: 22 mm",
      "- USB-C dock/base assumption",
      "+ Need source-grounded product dimensions",
      "+ Need official power and LED facts",
    ],
    takeaway: "First draft looked plausible, but it was not grounded enough to drive KiCad.",
  },
  "v3.1": {
    version: "v3.1",
    title: "Feature expansion pass",
    docPath: "hardware/candle/archive/legacy_docs/candle_spec_v3.1.md",
    statusNote: "Superseded: added complexity before product facts were locked",
    excerpt: [
      "Delta against v3 adding live flicker, smart-home integration, motion response, and a matrix animation model.",
      "This improved the animation idea, but introduced ESP32/mmWave-style features outside the faithful product target.",
    ],
    diff: [
      "+ Matrix LED animation model",
      "+ Smart-home / motion-response branch",
      "- Still inherits v3 geometry and base assumptions",
      "+ Review needed before any build target can be trusted",
    ],
    takeaway: "The agents learned animation requirements, then had to strip unrelated product features back out.",
  },
  v4: {
    version: "v4",
    title: "Source-grounded faithful spec",
    docPath: "hardware/candle/archive/legacy_docs/candle_spec_v4.md",
    statusNote: "Superseded: better facts, but hidden architecture still unresolved",
    excerpt: [
      "Replaces v3 for visual and dimensional fidelity. Confirms My New Flame, the 430 x 30 x 3 mm PCB body, 90 x 90 x 25 mm base, 2 x 128 LEDs, and 4 x NiMH AA power behavior.",
      "Rejects the small dock concept and resets the work around published sources.",
    ],
    diff: [
      "- 275 x 22 mm concept board",
      "- single-sided/static LED crown assumption",
      "+ 430 x 30 x 3 mm published PCB body",
      "+ two 128-LED displays, 256 LEDs total",
      "+ 4 x NiMH AA or USB-C power behavior",
    ],
    takeaway: "This is the first strong research-to-spec handoff, but it still cannot invent hidden charger details.",
  },
  v4_faithful: {
    version: "v4_faithful",
    title: "Faithful reconstruction with risk tags",
    docPath: "hardware/candle/archive/legacy_docs/candle_spec_v4_faithful.md",
    statusNote: "Blocked: canonical faithful path, but not fabricable without unknown charger/contact details",
    excerpt: [
      "Separates published facts, photo-derived observations, and reconstruction assumptions so unsupported internals are not treated as known facts.",
      "The build gate stops here because charger topology and stem/base contact geometry are still unresolved.",
    ],
    diff: [
      "- Treat hidden implementation guesses as facts",
      "+ Published / observation / reconstruction tags",
      "+ Charger topology marked unresolved",
      "+ Contact geometry marked unresolved",
      "x Build refused for faithful path",
    ],
    takeaway: "This is the important refusal: no KiCad layout from an unresolved faithful architecture.",
  },
  v5_modernized: {
    version: "v5_modernized",
    title: "Modernized build target",
    docPath: "hardware/candle/candle_spec_v5_modernized.md",
    statusNote: "Active: externally faithful, internally modernized and buildable",
    excerpt: [
      "Keeps the visible product identity: slender exposed stem, square metal base, dual-sided animated flame display, PCB button, base switch, status LED, and USB-C input.",
      "Drops teardown dependency by modernizing the hidden electrical architecture, allowing the KiCad generation phase to proceed.",
    ],
    diff: [
      "- Original 4 x AA NiMH charger topology as a build constraint",
      "- Exact original stem/base contact mechanism as a build constraint",
      "+ ATtiny1616 controller",
      "+ 2 x IS31FL3731-QF LED drivers",
      "+ 4-layer 430 x 30 mm board target",
    ],
    takeaway: "The selected branch is explicit: build the modernized board instead of guessing the original hidden charger.",
  },
};

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
          content: "spawn_agents([kicad-spec-normalizer, kicad-design-research, kicad-electrical-reviewer, kicad-critic])",
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
          content: `kicad-spec-normalizer.propose_spec(version="${version}")`,
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
      const reviewer = claim.includes("MCP") ? "kicad-electrical-reviewer" : "kicad-design-research";
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
          content: "kicad-critic.build_gate(version=\"v4_faithful\")",
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
          content: "kicad-design-orchestrator.branch_decision(faithful, derivative)",
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
          content: "Handing off to kicad-build-orchestrator with v5_modernized as the KiCad generation target.",
        },
      ];
    }

    return [];
  });
}

function DesignSpecPane({
  spec,
  onShowTerminal,
}: {
  spec: DesignSpecPreview;
  onShowTerminal: () => void;
}) {
  const docHref = `${REPO_BLOB_BASE}/${spec.docPath}`;

  return (
    <div className="phase-content terminal-container design-terminal-container">
      <div className="terminal-panel design-spec-panel">
        <div className="terminal-chrome">
          <span className="terminal-dot red" />
          <span className="terminal-dot yellow" />
          <span className="terminal-dot green" />
          <span className="terminal-title">spec-preview · {spec.version} · {spec.title}</span>
          <a className="terminal-action-btn spec-open-link" href={docHref} target="_blank" rel="noreferrer">
            Open doc
          </a>
          <button className="terminal-action-btn" type="button" onClick={onShowTerminal}>
            Show terminal
          </button>
        </div>
        <div className="design-spec-body">
          <div className="design-spec-hero">
            <div>
              <div className="design-spec-eyebrow">Spec artifact</div>
              <h2>{spec.version}</h2>
              <div className="design-spec-title">{spec.title}</div>
            </div>
            <div className="design-spec-status">{spec.statusNote}</div>
          </div>

          <div className="design-spec-grid">
            <div className="design-spec-section">
              <div className="section-label">Doc Excerpt</div>
              <div className="design-spec-excerpt">
                {spec.excerpt.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>

            <div className="design-spec-section">
              <div className="section-label">Progression Diff</div>
              <div className="design-spec-diff">
                {spec.diff.map((line) => {
                  const diffKind = line.startsWith("+") ? "add" : line.startsWith("-") ? "remove" : line.startsWith("x") ? "block" : "note";
                  return (
                    <div key={line} className={`design-spec-diff-line ${diffKind}`}>
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="design-spec-takeaway">
            <span>Decision</span>
            <strong>{spec.takeaway}</strong>
          </div>

          <div className="design-spec-path">{spec.docPath}</div>
        </div>
      </div>
    </div>
  );
}

function DesignView({ events }: { events: DemoEvent[] }) {
  const versions = events.filter((e) => e.type === "version_created");
  const terminalLines = designTerminalLines(events);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const selectedSpec = selectedVersion ? DESIGN_SPEC_PREVIEWS[selectedVersion] : null;

  useEffect(() => {
    if (selectedVersion && !versions.some((e) => e.payload.version === selectedVersion)) {
      setSelectedVersion(null);
    }
  }, [selectedVersion, versions]);

  return (
    <div className="phase-content design-review-view">
      <div className="design-timeline compact">
        <div className="section-label">Spec Evolution</div>
        <div className="design-summary-list">
          {versions.map((e, i) => {
            const status = e.payload.status as string;
            const version = e.payload.version as string;
            const preview = DESIGN_SPEC_PREVIEWS[version];
            return (
              <button
                key={i}
                className={`version-card fade-in ${status} ${selectedVersion === version ? "selected" : ""}`}
                type="button"
                onClick={() => setSelectedVersion(version)}
              >
                <div className="version-header">
                  <span className="version-name">{version}</span>
                  <span className={`version-status status-${status}`}>{status}</span>
                </div>
                <div className="version-summary">{e.payload.summary as string}</div>
                <div className="version-doc-hint">{preview?.docPath.split("/").pop() || "Spec preview"}</div>
              </button>
            );
          })}
        </div>
      </div>
      {selectedSpec ? (
        <DesignSpecPane spec={selectedSpec} onShowTerminal={() => setSelectedVersion(null)} />
      ) : (
        <div className="phase-content terminal-container design-terminal-container">
          <TerminalPanel
            lines={terminalLines}
            visibleCount={terminalLines.length}
            agent="multi-agent-review"
            title="claude-code · phase: design · mode: multi-agent review"
            isStreaming={false}
          />
        </div>
      )}
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
    name: "kicad-build-orchestrator",
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
  const pipelineSteps = events.filter((e) => e.type === "gen_step");
  const complete = events.find((e) => e.type === "gen_complete");
  const stepListRef = useRef<HTMLDivElement>(null);
  const visibleStepNames = new Set(
    pipelineSteps.map((e) => e.payload.step as string)
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

  useEffect(() => {
    if (stepListRef.current) {
      stepListRef.current.scrollTop = stepListRef.current.scrollHeight;
    }
  }, [steps.length]);

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

        <div className="build-progress">
          <div className="section-label">Generator Pipeline ({completedSteps} / 8)</div>
          <div className="build-step-list" ref={stepListRef}>
            {pipelineSteps.map((e, i) => (
              <div key={i} className="build-step fade-in">
                <div className="build-step-name">{e.payload.step as string}</div>
                <div className="build-step-detail">{e.payload.detail as string}</div>
              </div>
            ))}
            {complete && (
              <>
                <div className="build-complete build-complete-summary fade-in">
                  <span className="build-check">✓</span>
                  <span>Board generated: {complete.payload.components as number} components, SHA {complete.payload.sha as string}</span>
                </div>
                <div className="build-handoff-summary fade-in">
                  Handing off to kicad-drc-closure-loop with candle.kicad_pcb for automated validation.
                </div>
              </>
            )}
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
      </div>
    </div>
  );
}

// ─── Phase 4: Validate (DRC) ───
const VALIDATE_START_DRC = 451;

function ValidateView({ currentBeat, beats }: { currentBeat: number; beats: Beat[] }) {
  const visibleBeats = beats.slice(0, Math.max(0, currentBeat + 1));
  const logRef = useRef<HTMLDivElement>(null);
  const entryListRef = useRef<HTMLDivElement>(null);
  const animatedDrc = useAnimatedValue(
    currentBeat < 0 ? VALIDATE_START_DRC : beats[currentBeat].reverted ? beats[currentBeat].drc_before : beats[currentBeat].drc_after
  );
  const color = animatedDrc === 0 ? "#66bb6a" : animatedDrc < 50 ? "#4fc3f7" : animatedDrc < 200 ? "#ffa726" : "#ef5350";
  const pct = ((VALIDATE_START_DRC - animatedDrc) / VALIDATE_START_DRC) * 100;

  const activeBeat = currentBeat >= 0 ? beats[currentBeat] : null;
  const activeDelta = activeBeat ? activeBeat.drc_after - activeBeat.drc_before : 0;
  const acceptedCount = visibleBeats.filter((beat) => !beat.reverted).length;
  const revertedCount = visibleBeats.filter((beat) => beat.reverted).length;
  const agentsCalled = new Set(visibleBeats.map((beat) => beat.agent)).size;
  const terminalLines = visibleBeats.flatMap((beat) => {
    const delta = beat.drc_after - beat.drc_before;
    const verdict = beat.reverted ? "revert_patch()" : delta > 0 ? "accept_tradeoff()" : "accept_patch()";
    return [
      { kind: "cmd", text: `kicad-cli pcb drc candle.kicad_pcb -> ${beat.drc_before} violations` },
      { kind: "agent", text: `${beat.agent} · ${beat.technique} · ${beat.hotspot}` },
      { kind: "patch", text: `${beat.tool}: ${beat.action}` },
      {
        kind: beat.reverted ? "bad" : delta > 0 ? "warn" : "good",
        text: `${verdict} · DRC ${beat.drc_before} -> ${beat.drc_after} (${delta > 0 ? "+" : ""}${delta})`,
      },
    ];
  });

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
    if (entryListRef.current) {
      entryListRef.current.scrollTop = entryListRef.current.scrollHeight;
    }
  }, [visibleBeats.length]);

  return (
    <div className="phase-content validate-view">
      <div className="validate-left">
        <div className={`drc-hero ${animatedDrc === 0 ? "complete" : ""}`}>
          <div className="drc-hero-label">DRC CONVERGENCE</div>
          <div className="drc-hero-row">
            <span className="drc-hero-start">{VALIDATE_START_DRC}</span>
            <span className="drc-hero-arrow">{"->"}</span>
            <span className="drc-hero-value" style={{ color }}>{animatedDrc}</span>
          </div>
          <div className="drc-hero-bar">
            <div className="drc-hero-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>

        <div className="validate-stats">
          <div>
            <span className="validate-stat-value">{visibleBeats.length}</span>
            <span className="validate-stat-label">DRC runs</span>
          </div>
          <div>
            <span className="validate-stat-value">{acceptedCount}</span>
            <span className="validate-stat-label">accepted</span>
          </div>
          <div>
            <span className="validate-stat-value">{revertedCount}</span>
            <span className="validate-stat-label">reverted</span>
          </div>
          <div>
            <span className="validate-stat-value">{agentsCalled}</span>
            <span className="validate-stat-label">agents</span>
          </div>
        </div>

        {activeBeat ? (
          <div className={`validate-beat ${activeBeat.reverted ? "reverted" : ""}`}>
            <div className="validate-beat-meta">
              <span>{activeBeat.agent}</span>
              <span>{activeBeat.tool}</span>
            </div>
            <div className="validate-beat-action">{activeBeat.action}</div>
            <div className="validate-beat-grid">
              <span>Hotspot</span>
              <strong>{activeBeat.hotspot}</strong>
              <span>Patch</span>
              <strong>{activeBeat.technique}</strong>
              <span>Result</span>
              <strong className={activeDelta > 0 ? "validate-result-bad" : "validate-result-good"}>
                {activeBeat.drc_before} {"->"} {activeBeat.drc_after} ({activeDelta > 0 ? "+" : ""}{activeDelta})
              </strong>
            </div>
            <div className="validate-beat-detail">{activeBeat.detail}</div>
            {activeBeat.reverted && <div className="validate-revert-badge">REVERTED - trying different approach</div>}
          </div>
        ) : (
          <div className="validate-beat">
            <div className="validate-beat-action">Automated DRC loop queued</div>
            <div className="validate-beat-detail">
              KiCad CLI will run DRC, cluster violations, patch the generator, regenerate the board, and rerun until clean.
            </div>
          </div>
        )}

        <div className="validate-log">
          <div className="section-label">Iteration Log ({visibleBeats.length} / {beats.length})</div>
          <div className="validate-entry-list" ref={entryListRef}>
            {visibleBeats.map((beat, i) => {
              const delta = beat.drc_after - beat.drc_before;
              return (
                <div key={i} className={`validate-entry ${beat.reverted ? "reverted" : ""} ${i === currentBeat ? "active" : ""}`}>
                  <span className={`validate-delta ${delta > 0 ? "regression" : "improvement"}`}>
                    {delta > 0 ? "+" : ""}{delta}
                  </span>
                  <span className="validate-action">{beat.action.substring(0, 58)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="validate-right">
        <div className="validate-terminal">
          <div className="terminal-chrome">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
            <span className="terminal-title">claude-code · phase: validate · mode: drc-closure-loop</span>
          </div>
          <div className="validate-terminal-body" ref={logRef}>
            <div className="validate-terminal-line user">
              <span className="validate-terminal-prefix">USER</span>
              <span>Close all KiCad DRC errors before export.</span>
            </div>
            {visibleBeats.length === 0 && (
              <div className="validate-terminal-line muted">
                <span className="validate-terminal-prefix">$</span>
                <span>awaiting first kicad-cli pcb drc run...</span>
              </div>
            )}
            {terminalLines.map((line, i) => (
              <div key={i} className={`validate-terminal-line ${line.kind}`}>
                <span className="validate-terminal-prefix">
                  {line.kind === "cmd" ? "$" : line.kind === "agent" ? ">" : line.kind === "patch" ? "+" : line.kind === "bad" ? "!" : line.kind === "warn" ? "~" : "✓"}
                </span>
                <span>{line.text}</span>
              </div>
            ))}
            {animatedDrc === 0 && (
              <>
                <div className="validate-terminal-line good">
                  <span className="validate-terminal-prefix">✓</span>
                  <span>DRC clean. Board validated for fabrication export.</span>
                </div>
                <div className="validate-terminal-line patch">
                  <span className="validate-terminal-prefix">→</span>
                  <span>Handing off to kicad-fabrication-exporter to emit Gerbers, drills, BOM, and position data.</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Phase 5: Export ───
function ExportView({ events }: { events: DemoEvent[] }) {
  const artifacts = events.filter((e) => e.type === "artifact");
  const bundle = events.find((e) => e.type === "bundle");
  const bundlePayload = bundle?.payload || {
    name: "candle-fabrication-bundle.zip",
    size: "246.8 KB",
    href: "/exports/candle/fabrication/candle-fabrication-bundle.zip",
  };

  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  return (
    <div className="phase-content export-view">
      <div className="export-list-panel">
        <div className="section-label">Fabrication ZIP</div>
        <a
          className="export-bundle ready fade-in"
          href={bundlePayload.href as string | undefined}
          download
        >
          <div className="export-bundle-name">{bundlePayload.name as string}</div>
          <div className="export-bundle-size">{bundlePayload.size as string}</div>
          <div className="export-bundle-ready">Download fabrication ZIP</div>
        </a>

        <div className="section-label export-subsection-label">Individual Files ({artifacts.length})</div>
        <div className="export-list">
          {artifacts.map((e, i) => {
            const href = e.payload.href as string | undefined;
            return (
              <a key={i} className="export-item fade-in" href={href} download>
                <span className="export-name">{e.payload.name as string}</span>
                <span className="export-size">{e.payload.size as string}</span>
              </a>
            );
          })}
        </div>
      </div>

      <div className="export-model-panel">
        <div className="section-label">3D Board Preview</div>
        <div className="export-model-shell">
          {React.createElement("model-viewer", {
            className: "export-model-viewer",
            src: "/exports/candle/candle.glb",
            alt: "Candle PCB assembly",
            "auto-rotate": true,
            "camera-controls": true,
            "rotation-per-second": "18deg",
            "shadow-intensity": "0.75",
            "environment-image": "neutral",
            exposure: "0.9",
            "camera-target": "0.015m 0.0015m 0.215m",
            "camera-orbit": "42deg 64deg 0.72m",
            "field-of-view": "24deg",
          } as React.HTMLAttributes<HTMLElement> & Record<string, string | boolean>)}
        </div>
        <div className="export-model-meta">
          <span>candle.glb</span>
          <a href="/exports/candle/candle.glb" download>Download model</a>
        </div>
      </div>
    </div>
  );
}

// ─── Main PhaseViewer ───
export function PhaseViewer() {
  const [replays, setReplays] = useState<Record<Phase, DemoEvent[]> | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [phase, setPhase] = useState<Phase>("research");
  const [showOverview, setShowOverview] = useState(true);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [researchPane, setResearchPane] = useState<ResearchPane>("terminal");
  const [selectedResearchSource, setSelectedResearchSource] = useState<DemoEvent | null>(null);
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
    setDrcBeat(-1);
    if (p === "research") {
      setResearchPane("terminal");
      setSelectedResearchSource(null);
    }
  }, []);

  const handleResearchPreview = useCallback((source: DemoEvent) => {
    setSelectedResearchSource(source);
    setResearchPane("reference");
  }, []);

  // Event replay engine
  useEffect(() => {
    if (showOverview || playState !== "playing" || !replays) return;
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
  }, [showOverview, playState, phase, visibleEvents, drcBeat, speed, resetPhase, replays, beats]);

  // Parallel terminal-line stream for the research phase.
  useEffect(() => {
    if (showOverview || phase !== "research" || playState !== "playing") return;
    const next = PHASE1_TERMINAL[terminalCount];
    if (!next) return;
    const elapsed = (performance.now() - phaseStartRef.current) * speed;
    const delay = Math.max(0, (next.t - elapsed) / speed);
    terminalTimerRef.current = window.setTimeout(() => {
      setTerminalCount((c) => c + 1);
    }, delay);
    return () => clearTimeout(terminalTimerRef.current);
  }, [showOverview, playState, phase, terminalCount, speed]);

  const handlePlay = () => {
    if (showOverview) {
      setShowOverview(false);
      resetPhase("research");
      phaseStartRef.current = performance.now();
      setPlayState("playing");
      return;
    }
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
    clearTimeout(timerRef.current);
    clearTimeout(terminalTimerRef.current);
    if (!showOverview) resetPhase(phase);
    phaseStartRef.current = 0;
  };

  const handleOverviewClick = () => {
    setPlayState("idle");
    clearTimeout(timerRef.current);
    clearTimeout(terminalTimerRef.current);
    setShowOverview(true);
    resetPhase("research");
    phaseStartRef.current = 0;
  };

  const handlePhaseClick = (p: Phase) => {
    if (!replays) return;
    setPlayState("idle");
    clearTimeout(timerRef.current);
    clearTimeout(terminalTimerRef.current);
    setShowOverview(false);
    phaseStartRef.current = 0;
    resetPhase(p);
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
            <button className="pv-btn primary" onClick={handlePlay}>
              {showOverview ? "▶ Start Phase 1" : "▶ Play"}
            </button>
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
        <button
          className={`phase-tab overview-tab ${showOverview ? "active" : ""}`}
          onClick={handleOverviewClick}
        >
          <span className="phase-tab-num">0</span>
          <span className="phase-tab-label">Overview</span>
        </button>
        {ALL_PHASES.map((p, i) => {
          const isActive = !showOverview && p === phase;
          const isPast = !showOverview && ALL_PHASES.indexOf(phase) > i;
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
        className={`phase-body ${showOverview ? "overview-phase-body" : ""} ${
          !showOverview && phase === "research" ? "research-phase-body" : ""
        } ${
          !showOverview && phase === "design" ? "design-phase-body" : ""
        } ${
          !showOverview && phase === "build" ? "build-phase-body" : ""
        } ${
          !showOverview && phase === "validate" ? "validate-phase-body" : ""
        } ${
          !showOverview && phase === "export" ? "export-phase-body" : ""
        }`}
      >
        {showOverview && <OverviewView />}
        {!showOverview && phase === "research" && (
          <>
            <ResearchView events={visibleEvents} onShowReference={handleResearchPreview} />
            {researchPane === "terminal" ? (
              <div className="phase-content terminal-container">
                <TerminalPanel
                  lines={PHASE1_TERMINAL}
                  visibleCount={terminalCount}
                  agent={PHASE1_AGENT}
                  isStreaming={playState === "playing"}
                />
              </div>
            ) : (
              <ResearchReferencePane source={selectedResearchSource} onShowTerminal={() => setResearchPane("terminal")} />
            )}
          </>
        )}
        {!showOverview && phase === "design" && <DesignView events={visibleEvents} />}
        {!showOverview && phase === "build" && <BuildView events={visibleEvents} />}
        {!showOverview && phase === "validate" && <ValidateView currentBeat={drcBeat} beats={beats} />}
        {!showOverview && phase === "export" && <ExportView events={visibleEvents} />}
      </div>
    </div>
  );
}
