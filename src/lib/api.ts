import type { CompactFlowRow } from "./compact";

export interface GbbPayload {
  flowRows: CompactFlowRow[];
  facilitiesCsv: string;
  sources: { history: string; last31: string; facilities: string };
  fetchedAt: string;
  rowCount: number;
  fromCache: boolean;
  stale?: boolean;
  warnings?: string[];
}

export async function fetchGbb(force: boolean): Promise<GbbPayload> {
  const res = await fetch(`/api/gbb?force=${force ? "1" : "0"}`);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: string; detail?: string };
      detail = body.detail || body.error || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as GbbPayload;
}
