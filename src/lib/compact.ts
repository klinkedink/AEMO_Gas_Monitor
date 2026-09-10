import type { FlowRow } from "../types";
import { parseGasDate, toDateKey } from "./dates";

/** Compact history row from /api/gbb: date, id, type, supply, demand, state, name. */
export type CompactFlowRow = [string, string, string, number, number, string, string];

export function parseCompactFlow(rows: CompactFlowRow[]): FlowRow[] {
  const out: FlowRow[] = [];
  for (const row of rows) {
    const gasDate = parseGasDate(row[0]);
    if (!gasDate) continue;
    out.push({
      gasDate,
      gasDateKey: toDateKey(gasDate),
      facilityId: row[1],
      facilityType: row[2],
      supply: Number.isFinite(row[3]) ? row[3] : 0,
      demand: Number.isFinite(row[4]) ? row[4] : 0,
      state: row[5] || "",
      facilityName: row[6] || "",
      transferIn: 0,
      transferOut: 0,
      heldInStorage: null,
      cushionGasStorage: null,
      locationName: "",
      locationId: "",
      lastUpdated: "",
    });
  }
  return out;
}
