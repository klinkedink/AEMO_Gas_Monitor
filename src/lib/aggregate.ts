import type { FacilityRow, FlowRow, JoinedFlowRow, SeriesDef, SeriesPoint } from "../types";
import { formatChartTick } from "./dates";
import { indexFacilities } from "./facilities";
import { isBeetaloo, isOriginAplng, isProd, isQgc, isSantosCsg } from "./operators";

export function joinFlowWithFacilities(flow: FlowRow[], facilities: FacilityRow[]): JoinedFlowRow[] {
  const index = indexFacilities(facilities);
  return flow.map((row) => {
    const fac = index.get(row.facilityId);
    const registerName = fac?.facilityName || row.facilityName;
    const short = fac?.facilityShortName || "";
    return {
      ...row,
      operatorName: fac?.operatorName || "",
      facilityShortName: short,
      registerName,
      operatingState: fac?.operatingState || "",
      displayName: registerName || row.facilityName || row.facilityId,
    };
  });
}

export function prodRows(rows: JoinedFlowRow[]): JoinedFlowRow[] {
  return rows.filter(isProd);
}

export function lastGasDate(rows: { gasDate: Date }[]): Date | null {
  if (!rows.length) return null;
  return rows.reduce((max, r) => (r.gasDate > max ? r.gasDate : max), rows[0].gasDate);
}

function allDateKeys(rows: JoinedFlowRow[]): string[] {
  return [...new Set(rows.map((r) => r.gasDateKey))].sort();
}

export function dateSpine(rows: JoinedFlowRow[]): string[] {
  return allDateKeys(rows);
}

export function pivotStacked(
  rows: JoinedFlowRow[],
  seriesOf: (row: JoinedFlowRow) => string,
  options?: { includeZeros?: boolean; dateKeys?: string[] },
): { data: SeriesPoint[]; keys: string[]; totals: Record<string, number> } {
  const dates = options?.dateKeys?.length ? options.dateKeys : allDateKeys(rows);
  const totals: Record<string, number> = {};
  const byDate = new Map<string, Record<string, number>>();
  for (const d of dates) byDate.set(d, {});

  for (const row of rows) {
    const key = seriesOf(row) || "Unknown";
    const bucket = byDate.get(row.gasDateKey);
    if (!bucket) continue;
    bucket[key] = (bucket[key] ?? 0) + row.supply;
    totals[key] = (totals[key] ?? 0) + row.supply;
  }

  let keys = Object.keys(totals).sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0));
  if (!options?.includeZeros) {
    keys = keys.filter((k) => (totals[k] ?? 0) !== 0 || rows.some((r) => seriesOf(r) === k));
  }

  const data: SeriesPoint[] = dates.map((dateKey) => {
    const point: SeriesPoint = { date: formatChartTick(dateKey), dateKey };
    const bucket = byDate.get(dateKey) ?? {};
    for (const key of keys) {
      point[key] = bucket[key] ?? 0;
    }
    return point;
  });

  return { data, keys, totals };
}

export function totalSupplyByDate(
  rows: JoinedFlowRow[],
  dateKeys?: string[],
): { data: SeriesPoint[]; keys: string[] } {
  const { data, keys } = pivotStacked(rows, () => "Total supply", { dateKeys });
  return { data, keys };
}

export function seriesFromKeys(keys: string[], colorOf: (key: string, i: number) => string): SeriesDef[] {
  return keys.map((key, i) => ({ key, label: key, color: colorOf(key, i) }));
}

export function qgcProd(rows: JoinedFlowRow[]): JoinedFlowRow[] {
  return prodRows(rows).filter((r) => isQgc(r.operatorName));
}

export function santosCsgProd(rows: JoinedFlowRow[]): JoinedFlowRow[] {
  return prodRows(rows).filter((r) => isSantosCsg(r.operatorName, r.displayName, r.facilityShortName));
}

export function originAplngProd(rows: JoinedFlowRow[]): JoinedFlowRow[] {
  return prodRows(rows).filter((r) => isOriginAplng(r.operatorName));
}

export function beetalooProd(rows: JoinedFlowRow[]): JoinedFlowRow[] {
  return prodRows(rows).filter(isBeetaloo);
}

export function operatorTotals(rows: JoinedFlowRow[]): JoinedFlowRow[] {
  return [
    ...qgcProd(rows).map((r) => ({ ...r, displayName: "QGC" })),
    ...santosCsgProd(rows).map((r) => ({ ...r, displayName: "Santos CSG" })),
    ...originAplngProd(rows).map((r) => ({ ...r, displayName: "Origin / APLNG" })),
  ];
}

export function sumPoint(point: SeriesPoint, keys: string[]): number {
  return keys.reduce((acc, k) => acc + (typeof point[k] === "number" ? (point[k] as number) : 0), 0);
}
