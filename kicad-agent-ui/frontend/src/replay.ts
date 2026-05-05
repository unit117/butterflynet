export type Phase = "research" | "design" | "build" | "validate" | "export";

export interface DemoEvent {
  t: number;
  phase: Phase;
  type: string;
  payload: Record<string, unknown>;
}

export interface Beat {
  id: number;
  drc_before: number;
  drc_after: number;
  action: string;
  technique: string;
  hotspot: string;
  agent: string;
  tool: string;
  reverted: boolean;
  detail: string;
  signature?: boolean;
}

export const ALL_PHASES: Phase[] = ["research", "design", "build", "validate", "export"];

export const PHASE_LABELS: Record<Phase, string> = {
  research: "Research",
  design: "Design",
  build: "Build",
  validate: "Validate",
  export: "Export",
};

const REPLAY_FILES: Record<Phase, string> = {
  research: "/replays/candle-research.ndjson",
  design: "/replays/candle-design.ndjson",
  build: "/replays/candle-build.ndjson",
  validate: "/replays/candle-validate.ndjson",
  export: "/replays/candle-export.ndjson",
};

function parseNdjson(text: string): DemoEvent[] {
  return text
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

export async function loadPhaseEvents(phase: Phase): Promise<DemoEvent[]> {
  const res = await fetch(REPLAY_FILES[phase]);
  if (!res.ok) throw new Error(`Failed to load ${REPLAY_FILES[phase]}: ${res.status}`);
  const text = await res.text();
  return parseNdjson(text);
}

export async function loadAllReplays(): Promise<Record<Phase, DemoEvent[]>> {
  const entries = await Promise.all(
    ALL_PHASES.map(async (phase) => {
      const events = await loadPhaseEvents(phase);
      return [phase, events] as const;
    })
  );
  return Object.fromEntries(entries) as Record<Phase, DemoEvent[]>;
}

export function extractBeats(validateEvents: DemoEvent[]): Beat[] {
  return validateEvents
    .filter((e) => e.type === "drc_beat")
    .map((e) => e.payload as unknown as Beat);
}
