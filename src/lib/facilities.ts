import type { FacilityRow } from "../types";
import { parseTimestamp } from "./dates";

function rankTimestamp(raw: string): number {
  return parseTimestamp(raw)?.getTime() ?? 0;
}

/**
 * GasBBFacilitiesFull repeats FacilityId when operator or operating state changes.
 * Prefer an ACTIVE row; among those, take the latest OperatorChangeDate / LastUpdated.
 */
export function pickLatestFacility(rows: FacilityRow[]): FacilityRow {
  const active = rows.filter((r) => r.operatingState.toUpperCase() === "ACTIVE");
  const pool = active.length ? active : rows;
  return [...pool].sort((a, b) => {
    const op = rankTimestamp(a.operatorChangeDate) - rankTimestamp(b.operatorChangeDate);
    if (op !== 0) return op;
    const lu = rankTimestamp(a.lastUpdated) - rankTimestamp(b.lastUpdated);
    if (lu !== 0) return lu;
    return rankTimestamp(a.operatingStateDate) - rankTimestamp(b.operatingStateDate);
  }).at(-1)!;
}

export function indexFacilities(rows: FacilityRow[]): Map<string, FacilityRow> {
  const byId = new Map<string, FacilityRow[]>();
  for (const row of rows) {
    if (!row.facilityId) continue;
    const list = byId.get(row.facilityId) ?? [];
    list.push(row);
    byId.set(row.facilityId, list);
  }
  const picked = new Map<string, FacilityRow>();
  for (const [id, list] of byId) {
    picked.set(id, pickLatestFacility(list));
  }
  return picked;
}
