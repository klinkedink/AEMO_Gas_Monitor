import { addUtcDays, dateKeyToUtc, toDateKey } from "./dates";

export const RANGE_PRESETS = [
  { id: "31d", label: "31 days", days: 31 },
  { id: "1y", label: "1 year", days: 365 },
  { id: "5y", label: "5 years", days: 1826 },
  { id: "all", label: "All", days: null },
] as const;

export type RangePresetId = (typeof RANGE_PRESETS)[number]["id"] | "custom";

export function clampDateKey(key: string, minKey: string, maxKey: string): string {
  if (key < minKey) return minKey;
  if (key > maxKey) return maxKey;
  return key;
}

/** Inclusive window of `days` gas days ending on `endKey`. */
export function windowEndingOn(endKey: string, days: number, minKey: string, maxKey: string): {
  startKey: string;
  endKey: string;
} {
  const end = clampDateKey(endKey, minKey, maxKey);
  const start = toDateKey(addUtcDays(dateKeyToUtc(end), -(days - 1)));
  return { startKey: clampDateKey(start, minKey, maxKey), endKey: end };
}

export function windowForPreset(
  preset: RangePresetId,
  minKey: string,
  maxKey: string,
): { startKey: string; endKey: string } {
  if (preset === "all" || preset === "custom") return { startKey: minKey, endKey: maxKey };
  const spec = RANGE_PRESETS.find((p) => p.id === preset);
  if (!spec?.days) return { startKey: minKey, endKey: maxKey };
  return windowEndingOn(maxKey, spec.days, minKey, maxKey);
}
