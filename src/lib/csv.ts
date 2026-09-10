import Papa from "papaparse";
import type { FacilityRow, FlowRow } from "../types";
import { parseGasDate, toDateKey } from "./dates";

function num(value: string | undefined, fallback = 0): number {
  if (value == null || value.trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function nullableNum(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cell(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] != null) return String(row[key]).trim();
  }
  const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
  for (const key of keys) {
    const hit = lower[key.toLowerCase()];
    if (hit != null) return String(hit).trim();
  }
  return "";
}

export function parseCsv(text: string): Record<string, string>[] {
  const cleaned = text.replace(/^\uFEFF/, "");
  const parsed = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return parsed.data.filter((row) => Object.values(row).some((v) => String(v ?? "").trim() !== ""));
}

export function parseFlowCsv(text: string): FlowRow[] {
  return parseCsv(text).flatMap((row) => {
    const rawDate = cell(row, "GasDate");
    const gasDate = parseGasDate(rawDate);
    if (!gasDate) return [];
    return [
      {
        gasDate,
        gasDateKey: toDateKey(gasDate),
        facilityName: cell(row, "FacilityName"),
        facilityId: cell(row, "FacilityId"),
        facilityType: cell(row, "FacilityType"),
        demand: num(cell(row, "Demand")),
        supply: num(cell(row, "Supply"), 0),
        transferIn: num(cell(row, "TransferIn")),
        transferOut: num(cell(row, "TransferOut")),
        heldInStorage: nullableNum(cell(row, "HeldInStorage")),
        cushionGasStorage: nullableNum(cell(row, "CushionGasStorage")),
        state: cell(row, "State"),
        locationName: cell(row, "LocationName"),
        locationId: cell(row, "LocationId"),
        lastUpdated: cell(row, "LastUpdated"),
      },
    ];
  });
}

export function parseFacilitiesCsv(text: string): FacilityRow[] {
  return parseCsv(text).map((row) => ({
    facilityName: cell(row, "FacilityName"),
    facilityShortName: cell(row, "FacilityShortName"),
    facilityId: cell(row, "FacilityId"),
    facilityType: cell(row, "FacilityType"),
    facilityTypeDescription: cell(row, "FacilityTypeDescription"),
    operatingState: cell(row, "OperatingState"),
    operatingStateDate: cell(row, "OperatingStateDate"),
    operatorName: cell(row, "OperatorName"),
    operatorId: cell(row, "OperatorId"),
    operatorChangeDate: cell(row, "OperatorChangeDate"),
    lastUpdated: cell(row, "LastUpdated"),
  }));
}
