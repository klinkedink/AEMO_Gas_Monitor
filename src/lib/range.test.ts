import { describe, expect, it } from "vitest";
import { formatTj, roundTj } from "./format";
import { windowEndingOn, windowForPreset } from "./range";
import { enumerateDateKeys, spanDays } from "./dates";

describe("format", () => {
  it("rounds displayed TJ to whole numbers", () => {
    expect(roundTj(5373.5)).toBe(5374);
    expect(formatTj(5371.3).replace(/,/g, "")).toBe("5371");
    expect(formatTj(0.4)).toBe("0");
  });
});

describe("date window", () => {
  it("31-day preset is inclusive ending on max gas date", () => {
    const w = windowEndingOn("2026-09-09", 31, "2018-09-29", "2026-09-09");
    expect(w.endKey).toBe("2026-09-09");
    expect(w.startKey).toBe("2026-08-10");
    expect(spanDays(w.startKey, w.endKey)).toBe(31);
    expect(enumerateDateKeys(w.startKey, w.endKey)).toHaveLength(31);
  });

  it("all preset uses the full loaded history", () => {
    const w = windowForPreset("all", "2018-09-29", "2026-09-09");
    expect(w).toEqual({ startKey: "2018-09-29", endKey: "2026-09-09" });
  });
});
