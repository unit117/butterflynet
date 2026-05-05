import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Project,
  RunResult,
  listProjects,
  pcbSvgUrl,
  schSvgUrl,
  modelUrl,
  runPipeline,
  getComponents,
} from "./api";

type ViewMode = "pcb" | "sch" | "model";

function ModelViewerEl({ src }: { src: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.setAttribute("src", src);
      ref.current.setAttribute("camera-controls", "");
      ref.current.setAttribute("auto-rotate", "");
      ref.current.setAttribute("rotation-per-second", "18deg");
      ref.current.setAttribute("shadow-intensity", "0.6");
      ref.current.setAttribute("exposure", "0.9");
      ref.current.setAttribute("environment-image", "neutral");
    }
  }, [src]);
  return React.createElement("model-viewer", {
    ref,
    style: { width: "100%", height: "100%" },
  });
}

const LAYER_PRESETS: Record<string, { label: string; layers: string }> = {
  front: { label: "Front", layers: "F.Cu,F.SilkS,Edge.Cuts" },
  back: { label: "Back", layers: "B.Cu,B.SilkS,Edge.Cuts" },
  both: { label: "F+B", layers: "F.Cu,B.Cu,Edge.Cuts,F.SilkS" },
  all: {
    label: "All",
    layers: "F.Cu,B.Cu,Edge.Cuts,F.SilkS,B.SilkS,F.Mask,B.Mask",
  },
};

const ACTIONS = [
  { id: "full-pipeline", label: "Full Pipeline", icon: "▶", desc: "Route + DRC + Fab Export" },
  { id: "drc", label: "Run DRC", icon: "✔", desc: "Design Rule Check" },
  { id: "erc", label: "Run ERC", icon: "⚡", desc: "Electrical Rule Check" },
  { id: "export", label: "Export for Fab", icon: "📦", desc: "JLCPCB Gerber package" },
  { id: "regression", label: "Run Regression", icon: "🧪", desc: "Full pipeline regression suite" },
];

interface DrcSummary {
  status: string;
  violations: number;
  unconnected: number;
  shorting: number;
  breakdown: Record<string, number>;
}

interface ErcSummary {
  status: string;
  errors: number;
  warnings: number;
}

interface ExportSummary {
  status: string;
  artifacts: string[];
}

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string>("ecc83");
  const [viewMode, setViewMode] = useState<ViewMode>("pcb");
  const [layerPreset, setLayerPreset] = useState("both");
  const [svgKey, setSvgKey] = useState(0);

  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [runHistory, setRunHistory] = useState<RunResult[]>([]);

  const [drcResult, setDrcResult] = useState<DrcSummary | null>(null);
  const [ercResult, setErcResult] = useState<ErcSummary | null>(null);
  const [exportResult, setExportResult] = useState<ExportSummary | null>(null);
  const [components, setComponents] = useState<unknown[]>([]);

  useEffect(() => {
    listProjects().then(setProjects);
  }, []);

  useEffect(() => {
    getComponents(activeProject).then((d) =>
      setComponents(d.components || [])
    );
    setDrcResult(null);
    setErcResult(null);
    setExportResult(null);
    setLastRun(null);
    setRunHistory([]);
    setSvgKey((k) => k + 1);
  }, [activeProject]);

  useEffect(() => {
    const project = projects.find((p) => p.id === activeProject);
    if (viewMode === "model" && !project?.model) {
      setViewMode("pcb");
    }
  }, [activeProject, projects, viewMode]);

  const handleAction = useCallback(
    async (action: string) => {
      setRunningAction(action);
      try {
        const result = await runPipeline(activeProject, action);
        setLastRun(result);
        setRunHistory((h) => [result, ...h]);

        if (result.result) {
          const r = result.result as Record<string, unknown>;
          if (action === "drc" || action === "full-pipeline") {
            setDrcResult({
              status: String(r.status || ""),
              violations: Number(r.violations ?? 0),
              unconnected: Number(r.unconnected ?? 0),
              shorting: Number(r.shorting ?? 0),
              breakdown: (r.breakdown as Record<string, number>) || {},
            });
          }
          if (action === "erc") {
            setErcResult(r as unknown as ErcSummary);
          }
          if (action === "export" || action === "full-pipeline") {
            if (r.artifacts) {
              setExportResult({
                status: String(r.status || ""),
                artifacts: r.artifacts as string[],
              });
            }
          }
        }
      } finally {
        setRunningAction(null);
      }
    },
    [activeProject]
  );

  const currentLayers =
    LAYER_PRESETS[layerPreset]?.layers || LAYER_PRESETS.both.layers;
  const svgUrl =
    viewMode === "pcb"
      ? pcbSvgUrl(activeProject, currentLayers)
      : schSvgUrl(activeProject);

  const currentProject = projects.find((p) => p.id === activeProject);
  const hasModel = Boolean(currentProject?.model);

  return (
    <div className="workbench">
      {/* Top bar */}
      <div className="topbar">
        <h1>KiCad Agent Workbench</h1>
        <div className="project-selector">
          {projects.map((p) => (
            <button
              key={p.id}
              className={`project-btn ${p.id === activeProject ? "active" : ""}`}
              onClick={() => setActiveProject(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="view-toggle">
          <button
            className={`project-btn ${viewMode === "pcb" ? "active" : ""}`}
            onClick={() => setViewMode("pcb")}
          >
            PCB
          </button>
          <button
            className={`project-btn ${viewMode === "sch" ? "active" : ""}`}
            onClick={() => setViewMode("sch")}
          >
            Schematic
          </button>
          {hasModel && (
            <button
              className={`project-btn ${viewMode === "model" ? "active" : ""}`}
              onClick={() => setViewMode("model")}
            >
              3D
            </button>
          )}
        </div>
      </div>

      {/* Left panel: actions + event log */}
      <div className="panel left-panel">
        <div className="panel-header">Pipeline Actions</div>
        <div className="actions-grid">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              className="action-btn"
              disabled={runningAction !== null}
              onClick={() => handleAction(a.id)}
            >
              <span className="icon">
                {runningAction === a.id ? (
                  <span className="loading-spinner" />
                ) : (
                  a.icon
                )}
              </span>
              <span>
                <div>{a.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {a.desc}
                </div>
              </span>
            </button>
          ))}
        </div>

        {lastRun && (
          <>
            <div className="panel-header">Last Run</div>
            <div className="event-log">
              <div style={{ marginBottom: 8 }}>
                <span className={`status-badge ${lastRun.status}`}>
                  {lastRun.status}
                </span>
                <span
                  style={{
                    marginLeft: 8,
                    color: "var(--text-secondary)",
                    fontSize: 12,
                  }}
                >
                  {lastRun.action}
                </span>
              </div>
              {lastRun.events?.map((ev, i) => (
                <div key={i} className="event-entry">
                  <span className="event-type">{ev.event}</span>
                  <span className="event-detail">{ev.detail}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {runHistory.length > 1 && (
          <>
            <div className="panel-header">History</div>
            <div className="event-log">
              {runHistory.slice(1, 10).map((r) => (
                <div key={r.id} className="event-entry">
                  <span className={`status-badge ${r.status}`}>
                    {r.status}
                  </span>
                  <span className="event-detail">{r.action}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Center panel: board/schematic viewer */}
      <div className="center-panel">
        <div className="viewer-container">
          {viewMode === "model" ? (
            <div className="model-stage">
              <ModelViewerEl src={modelUrl(activeProject)} />
            </div>
          ) : (
            <img
              key={`${svgUrl}-${svgKey}`}
              src={svgUrl}
              alt={viewMode === "pcb" ? "PCB Layout" : "Schematic"}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          )}
        </div>
        {viewMode === "pcb" && (
          <div className="layer-bar">
            {Object.entries(LAYER_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                className={`layer-btn ${key === layerPreset ? "active" : ""}`}
                onClick={() => setLayerPreset(key)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right panel: project info + live results */}
      <div className="panel right-panel">
        <div className="panel-header">
          {currentProject?.name || activeProject}
        </div>

        {/* Project status */}
        <div className="result-card">
          <h3>Project Status</h3>
          <div className="stat-row">
            <span>Status</span>
            <span
              className={`status-badge ${
                currentProject?.status === "RELEASE_CLEAN"
                  ? "pass"
                  : currentProject?.status === "IN_PROGRESS"
                  ? "running"
                  : "pending"
              }`}
            >
              {currentProject?.status || "unknown"}
            </span>
          </div>
          <div className="stat-row">
            <span>PCB</span>
            <span className="stat-value">{currentProject?.pcb}</span>
          </div>
          <div className="stat-row">
            <span>Schematic</span>
            <span className="stat-value">{currentProject?.schematic}</span>
          </div>
        </div>

        {/* DRC results — from live run only */}
        <div className="result-card">
          <h3>DRC Results</h3>
          {drcResult ? (
            <>
              <div className="stat-row">
                <span>Status</span>
                <span className={`status-badge ${drcResult.status}`}>
                  {drcResult.status}
                </span>
              </div>
              <div className="stat-row">
                <span>Violations</span>
                <span
                  className="stat-value"
                  style={{
                    color:
                      drcResult.violations === 0
                        ? "var(--success)"
                        : "var(--error)",
                  }}
                >
                  {drcResult.violations}
                </span>
              </div>
              <div className="stat-row">
                <span>Unconnected</span>
                <span
                  className="stat-value"
                  style={{
                    color:
                      drcResult.unconnected === 0
                        ? "var(--success)"
                        : "var(--error)",
                  }}
                >
                  {drcResult.unconnected}
                </span>
              </div>
              {drcResult.breakdown &&
                Object.keys(drcResult.breakdown).length > 0 && (
                  <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
                      Breakdown
                    </div>
                    {Object.entries(drcResult.breakdown).map(([type, count]) => (
                      <div key={type} className="stat-row" style={{ fontSize: 12 }}>
                        <span style={{ color: "var(--text-secondary)" }}>{type}</span>
                        <span className="stat-value">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
            </>
          ) : (
            <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
              No run yet
            </div>
          )}
        </div>

        {/* ERC results — from live run only */}
        <div className="result-card">
          <h3>ERC Results</h3>
          {ercResult ? (
            <>
              <div className="stat-row">
                <span>Status</span>
                <span className={`status-badge ${ercResult.status}`}>
                  {ercResult.status}
                </span>
              </div>
              <div className="stat-row">
                <span>Errors</span>
                <span
                  className="stat-value"
                  style={{
                    color:
                      ercResult.errors === 0
                        ? "var(--success)"
                        : "var(--error)",
                  }}
                >
                  {ercResult.errors}
                </span>
              </div>
              <div className="stat-row">
                <span>Warnings</span>
                <span className="stat-value" style={{ color: "var(--warning)" }}>
                  {ercResult.warnings}
                </span>
              </div>
            </>
          ) : (
            <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
              No run yet
            </div>
          )}
        </div>

        {/* Export results — from live run only */}
        {exportResult && (
          <div className="result-card">
            <h3>Fab Export</h3>
            <div className="stat-row">
              <span>Status</span>
              <span className={`status-badge ${exportResult.status}`}>
                {exportResult.status}
              </span>
            </div>
            {exportResult.artifacts && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Artifacts ({exportResult.artifacts.length})
                </div>
                {exportResult.artifacts.map((name) => (
                  <div
                    key={name}
                    style={{
                      fontSize: 11,
                      padding: "2px 0",
                      color: "var(--text-primary)",
                      fontFamily: "'SF Mono', 'Fira Code', monospace",
                    }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Components */}
        {components.length > 0 && (
          <>
            <div className="panel-header">
              Components ({components.length})
            </div>
            <div style={{ padding: "0 12px 12px" }}>
              <table className="component-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Footprint</th>
                  </tr>
                </thead>
                <tbody>
                  {components.slice(0, 30).map((c: any, i) => (
                    <tr key={i}>
                      <td>{c.reference || c.ref || "?"}</td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {(c.footprint || c.name || "").split(":").pop()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
