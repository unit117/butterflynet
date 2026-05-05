const BASE = "/api";

export interface Project {
  id: string;
  name: string;
  path: string;
  schematic: string;
  pcb: string;
  status: string;
  model?: string | null;
}

export interface RunResult {
  id: string;
  project_id: string;
  action: string;
  status: string;
  created: string;
  events: RunEvent[];
  result: Record<string, unknown> | null;
}

export interface RunEvent {
  event: string;
  detail: string;
  data?: Record<string, unknown>;
  ts: string;
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${BASE}/project/list`);
  return res.json();
}

export async function getProjectInfo(id: string) {
  const res = await fetch(`${BASE}/project/${id}/info`);
  return res.json();
}


export async function getComponents(id: string) {
  const res = await fetch(`${BASE}/project/${id}/components`);
  return res.json();
}

export function pcbSvgUrl(id: string, layers: string): string {
  return `${BASE}/view/${id}/pcb?layers=${encodeURIComponent(layers)}`;
}

export function schSvgUrl(id: string): string {
  return `${BASE}/view/${id}/sch`;
}

export function modelUrl(id: string): string {
  return `${BASE}/view/${id}/model`;
}

export async function runPipeline(
  projectId: string,
  action: string
): Promise<RunResult> {
  const res = await fetch(`${BASE}/pipeline/${projectId}/${action}`, {
    method: "POST",
  });
  return res.json();
}

export async function listRuns() {
  const res = await fetch(`${BASE}/pipeline/runs`);
  return res.json();
}

export async function getRun(runId: string): Promise<RunResult> {
  const res = await fetch(`${BASE}/pipeline/runs/${runId}`);
  return res.json();
}
