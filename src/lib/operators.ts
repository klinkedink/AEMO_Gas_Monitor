import type { JoinedFlowRow } from "../types";

const CONVENTIONAL_SANTOS = /\b(longford|moomba|otway|ballera|orbost)\b/i;

const SANTOS_CSG_NAMES = /\b(fairview|scotia|arcadia)\b|\broma compressor|\broma\b(?!\s+north)/i;

export function isProd(row: { facilityType: string }): boolean {
  return row.facilityType.toUpperCase() === "PROD";
}

export function isQgc(operatorName: string): boolean {
  return /qgc/i.test(operatorName);
}

/**
 * Queensland CSG plants operated by Santos CSG / Santos Toga.
 * Santos Limited conventional hubs (Moomba, Ballera, Orbost, …) are excluded.
 * Roma North is Jemena-operated in the live register and is excluded unless the
 * operator name is a Santos* entity.
 */
export function isSantosCsg(operatorName: string, facilityName: string, shortName = ""): boolean {
  const blob = `${facilityName} ${shortName}`;
  if (CONVENTIONAL_SANTOS.test(blob)) return false;
  if (/roma\s+north/i.test(blob) && !/santos/i.test(operatorName)) return false;
  if (/santos\s*(csg|toga)/i.test(operatorName)) return true;
  if (/santos/i.test(operatorName) && SANTOS_CSG_NAMES.test(blob)) return true;
  return false;
}

/** Origin CSG is reported under Australia Pacific LNG on the GBB (not Origin Energy GPG). */
export function isOriginAplng(operatorName: string): boolean {
  return /australia pacific lng|\baplng\b|\borigin\b/i.test(operatorName);
}

export function isBeetaloo(row: {
  facilityId: string;
  facilityName: string;
  facilityShortName?: string;
  displayName?: string;
}): boolean {
  if (row.facilityId === "580236") return true;
  const blob = `${row.facilityName} ${row.facilityShortName ?? ""} ${row.displayName ?? ""}`;
  return /sturt plateau|\bspcf\b|beetaloo/i.test(blob);
}

export function operatorGroup(row: JoinedFlowRow): "qgc" | "santosCsg" | "originAplng" | "other" {
  if (isQgc(row.operatorName)) return "qgc";
  if (isSantosCsg(row.operatorName, row.displayName, row.facilityShortName)) return "santosCsg";
  if (isOriginAplng(row.operatorName)) return "originAplng";
  return "other";
}

export const OPERATOR_LABELS = {
  qgc: "QGC",
  santosCsg: "Santos CSG",
  originAplng: "Origin / APLNG",
} as const;
