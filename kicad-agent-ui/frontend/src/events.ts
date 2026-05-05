export type Phase = "research" | "design" | "build" | "validate" | "export";

export interface DemoEvent {
  t: number;
  phase: Phase;
  type: string;
  payload: Record<string, unknown>;
}

// Phase 1: Research — source-tagged fact gathering
export const PHASE1_EVENTS: DemoEvent[] = [
  { t: 0, phase: "research", type: "phase_start", payload: { prompt: "Recreate the Ingo Maurer 'My New Flame' lamp, faithful to the product." } },
  { t: 800, phase: "research", type: "source_fetched", payload: { source: "Ingo Maurer product page", url: "ingo-maurer.com", icon: "🌐" } },
  { t: 1800, phase: "research", type: "source_fetched", payload: { source: "MoMA Design Store listing", url: "store.moma.org", icon: "🏛" } },
  { t: 2500, phase: "research", type: "fact_added", payload: { tag: "published", claim: "Product: 'My New Flame' by Ingo Maurer (not 'One New Flame')" } },
  { t: 3200, phase: "research", type: "source_fetched", payload: { source: "Official instruction manual (PDF)", url: "ingo-maurer.com/manual", icon: "📄" } },
  { t: 4000, phase: "research", type: "fact_added", payload: { tag: "published", claim: "Charges 4× AA NiMH cells from USB" } },
  { t: 4600, phase: "research", type: "fact_added", payload: { tag: "published", claim: "Can run while charging, or from USB with no batteries" } },
  { t: 5200, phase: "research", type: "fact_added", payload: { tag: "published", claim: "Base LED: yellow while charging, green when full" } },
  { t: 5800, phase: "research", type: "source_fetched", payload: { source: "USB-C product revision notes", url: "retailer page", icon: "🔌" } },
  { t: 6400, phase: "research", type: "fact_added", payload: { tag: "published", claim: "Current revision: USB-C input (5V max 1000mA)" } },
  { t: 7000, phase: "research", type: "fact_added", payload: { tag: "published", claim: "2×128 dimmable LEDs (256 total)" } },
  { t: 7800, phase: "research", type: "source_fetched", payload: { source: "Manual cover art (high-res scan)", url: "manual p.1", icon: "📷" } },
  { t: 8600, phase: "research", type: "fact_added", payload: { tag: "photo-derived", claim: "LED field is rectangular 8×16 array per face (128 LEDs each side)" } },
  { t: 9400, phase: "research", type: "fact_added", payload: { tag: "photo-derived", claim: "Four dark rectangular features on PCB edge → concealed socket/contacts" } },
  { t: 10200, phase: "research", type: "source_fetched", payload: { source: "IS31FL3731/3733 datasheets (ISSI)", url: "issi.com", icon: "📋" } },
  { t: 11000, phase: "research", type: "source_fetched", payload: { source: "ATtiny1616 datasheet (Microchip)", url: "microchip.com", icon: "📋" } },
  { t: 11800, phase: "research", type: "fact_added", payload: { tag: "reconstruction", claim: "Charger likely uses boost/SEPIC topology for 4S NiMH from 5V" } },
  { t: 12600, phase: "research", type: "fact_added", payload: { tag: "reconstruction", claim: "Stem/base interface: 4-feature edge pads (PWR, PWR, GND, GND hypothesis)" } },
  { t: 13400, phase: "research", type: "fact_added", payload: { tag: "photo-derived", claim: "Not flame-shaped physical population — rectangular layout, flame is rendered" } },
  { t: 14200, phase: "research", type: "question_added", payload: { question: "Charger topology: boost or SEPIC? Which IC?" } },
  { t: 14800, phase: "research", type: "question_added", payload: { question: "Contact geometry: spring pins, pogo pads, or edge connector?" } },
  { t: 15400, phase: "research", type: "question_added", payload: { question: "Exact LED driver IC (IS31FL3733 vs IS31FL3731)?" } },
  { t: 16000, phase: "research", type: "phase_complete", payload: { facts: 11, sources: 7, unresolved: 3 } },
];

// Phase 2: Design — spec iteration with self-correction
export const PHASE2_EVENTS: DemoEvent[] = [
  { t: 0, phase: "design", type: "phase_start", payload: { goal: "Produce buildable spec from research brief" } },
  { t: 1000, phase: "design", type: "version_created", payload: { version: "v3", summary: "Initial spec: wrong geometry, wrong dock concept", status: "superseded" } },
  { t: 2500, phase: "design", type: "version_created", payload: { version: "v3.1", summary: "Improved animation model, added smart-home features (ESP32, mmWave)", status: "superseded" } },
  { t: 3800, phase: "design", type: "error_caught", payload: {
    claim: "Use MCP73871 charger IC",
    critic: "MCP73871 is single-cell Li-Ion. Spec requires 4×AA NiMH (4S, ~5.6V peak).",
    action: "Retract specific IC choice; mark charger topology as unresolved.",
    severity: "critical"
  }},
  { t: 6000, phase: "design", type: "version_created", payload: { version: "v4", summary: "First faithful-reconstruction attempt, charger topology TBD", status: "superseded" } },
  { t: 7500, phase: "design", type: "error_caught", payload: {
    claim: "Flame-silhouette LED arrangement",
    critic: "Manual states 8×16 rectangular array. Flame shape is the rendered animation, not the physical population.",
    action: "Distinguish physical population (rectangular) from emitted image (flame).",
    severity: "medium"
  }},
  { t: 9500, phase: "design", type: "version_created", payload: { version: "v4_faithful", summary: "Canonical faithful spec with source discipline (Published/Observation/Inference tags)", status: "blocked" } },
  { t: 11000, phase: "design", type: "build_refused", payload: {
    reason: "Charger topology unresolved — cannot produce a fabricable board without knowing the boost/charge architecture.",
    decision: "STOP at architecture level. Do not proceed to PCB layout.",
    insight: "Agent knows what it doesn't know."
  }},
  { t: 13500, phase: "design", type: "branch_decision", payload: {
    faithful_path: "Charger/contact unresolved — STOP at architecture",
    derivative_path: "Modernized 1S Li-ion base + ATtiny1616 + dual charlieplex drivers — proceed to build",
    chosen: "derivative",
    rationale: "Faithful path blocked on charger unknowns. Derivative path (v5_modernized) uses ATtiny1616 + 2× IS31FL3731-QF — all specs resolved, buildable today."
  }},
  { t: 16000, phase: "design", type: "version_created", payload: { version: "v5_modernized", summary: "Active build target: ATtiny1616, 2× IS31FL3731-QF, 4-layer 430×30mm, all specs resolved", status: "active" } },
  { t: 17500, phase: "design", type: "phase_complete", payload: { versions: 5, errors_caught: 2, branches: 1, build_target: "v5_modernized" } },
];

// Phase 3: Build — generator events
export const PHASE3_EVENTS: DemoEvent[] = [
  { t: 0, phase: "build", type: "phase_start", payload: { target: "generate candle.kicad_pcb from v5_modernized spec" } },
  { t: 500, phase: "build", type: "gen_step", payload: { step: "Board outline", detail: "430×30×3mm 4-layer stackup defined" } },
  { t: 1500, phase: "build", type: "gen_step", payload: { step: "LED field (left)", detail: "8×16 charlieplex matrix, 128 LEDs at 2.9mm pitch" } },
  { t: 2500, phase: "build", type: "gen_step", payload: { step: "LED field (right)", detail: "Mirror population on B.Cu face" } },
  { t: 3500, phase: "build", type: "gen_step", payload: { step: "MCU placement", detail: "ATtiny1616 QFN-20 at y=236, I2C + UPDI escape" } },
  { t: 4500, phase: "build", type: "gen_step", payload: { step: "Driver ICs", detail: "2× IS31FL3731-QF QFN-28 (0.4mm pitch) at y=328" } },
  { t: 5500, phase: "build", type: "gen_step", payload: { step: "Passive placement", detail: "Decoupling caps, pull-ups, current-set resistors" } },
  { t: 6500, phase: "build", type: "gen_step", payload: { step: "Routing", detail: "Charlieplex columns, I2C bus, power rails, microvias" } },
  { t: 7500, phase: "build", type: "gen_step", payload: { step: "Copper zones", detail: "GND fill on all 4 layers" } },
  { t: 8500, phase: "build", type: "gen_complete", payload: { components: 272, nets: 45, file: "candle.kicad_pcb", sha: "972e3653" } },
  { t: 9000, phase: "build", type: "phase_complete", payload: { duration_sec: 8.5, deterministic: true } },
];

// Phase 5: Export — fab output
export const PHASE5_EVENTS: DemoEvent[] = [
  { t: 0, phase: "export", type: "phase_start", payload: { target: "JLCPCB fabrication package" } },
  { t: 500, phase: "export", type: "artifact", payload: { name: "F_Cu.gbr", size: "17.5 KB" } },
  { t: 800, phase: "export", type: "artifact", payload: { name: "B_Cu.gbr", size: "17.5 KB" } },
  { t: 1100, phase: "export", type: "artifact", payload: { name: "In1_Cu.gbr", size: "95 KB" } },
  { t: 1400, phase: "export", type: "artifact", payload: { name: "In2_Cu.gbr", size: "96 KB" } },
  { t: 1700, phase: "export", type: "artifact", payload: { name: "F_Mask.gbr + B_Mask.gbr", size: "28 KB" } },
  { t: 2000, phase: "export", type: "artifact", payload: { name: "Edge_Cuts.gbr", size: "1.2 KB" } },
  { t: 2300, phase: "export", type: "artifact", payload: { name: "candle-PTH.drl + NPTH.drl", size: "4.8 KB" } },
  { t: 2600, phase: "export", type: "artifact", payload: { name: "candle-assembly-bom.csv", size: "272 components" } },
  { t: 2900, phase: "export", type: "artifact", payload: { name: "candle-pos.csv", size: "21.5 KB" } },
  { t: 3200, phase: "export", type: "bundle", payload: { name: "candle-fabrication-bundle.zip", size: "246.8 KB", ready: true } },
  { t: 3500, phase: "export", type: "phase_complete", payload: { artifacts: 11, bundle: "candle-fabrication-bundle.zip" } },
];

export const ALL_PHASES: Phase[] = ["research", "design", "build", "validate", "export"];

export const PHASE_LABELS: Record<Phase, string> = {
  research: "Research",
  design: "Design",
  build: "Build",
  validate: "Validate",
  export: "Export",
};

export const PHASE_DURATIONS: Record<Phase, number> = {
  research: 16000,
  design: 17500,
  build: 9000,
  validate: 45000,
  export: 3500,
};
