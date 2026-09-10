import { describe, expect, it } from "vitest";
import { joinFlowWithFacilities, lngExportRows, pivotStacked, prodRows, totalSupplyByDate } from "./aggregate";
import { parseGasDate, toDateKey } from "./dates";
import type { FacilityRow, FlowRow } from "../types";

function flow(partial: Partial<FlowRow> & { facilityId: string; facilityType: string; supply?: number }): FlowRow {
  const gasDate = partial.gasDate ?? parseGasDate("2026/09/09")!;
  return {
    gasDate,
    gasDateKey: toDateKey(gasDate),
    facilityName: partial.facilityName ?? partial.facilityId,
    facilityId: partial.facilityId,
    facilityType: partial.facilityType,
    demand: 0,
    supply: partial.supply ?? 0,
    transferIn: 0,
    transferOut: 0,
    heldInStorage: null,
    cushionGasStorage: null,
    state: partial.state ?? "QLD",
    locationName: "",
    locationId: "",
    lastUpdated: "",
  };
}

function fac(partial: Partial<FacilityRow> & { facilityId: string; operatorName: string }): FacilityRow {
  return {
    facilityName: partial.facilityName ?? "Plant",
    facilityShortName: partial.facilityShortName ?? "",
    facilityId: partial.facilityId,
    facilityType: partial.facilityType ?? "PROD",
    facilityTypeDescription: "Production",
    operatingState: partial.operatingState ?? "ACTIVE",
    operatingStateDate: partial.operatingStateDate ?? "2020/01/01",
    operatorName: partial.operatorName,
    operatorId: "1",
    operatorChangeDate: partial.operatorChangeDate ?? "2020/01/01",
    lastUpdated: partial.lastUpdated ?? "01 Jan 2020 00:00:00",
  };
}

describe("aggregation", () => {
  it("treats missing supply as zero and sums PROD only", () => {
    const rows = joinFlowWithFacilities(
      [
        flow({ facilityId: "1", facilityType: "PROD", supply: 10, facilityName: "A" }),
        flow({ facilityId: "2", facilityType: "PIPE", supply: 999, facilityName: "Pipe" }),
        flow({ facilityId: "3", facilityType: "PROD", facilityName: "B" }),
      ],
      [],
    );
    const prod = prodRows(rows);
    expect(prod).toHaveLength(2);
    const { data } = totalSupplyByDate(prod);
    expect(data[0]["Total supply"]).toBe(10);
  });

  it("prefers latest ACTIVE facility operator on join", () => {
    const rows = joinFlowWithFacilities(
      [flow({ facilityId: "540070", facilityType: "PROD", supply: 5, facilityName: "Fairview" })],
      [
        fac({
          facilityId: "540070",
          facilityName: "Fairview",
          operatorName: "Santos Limited",
          operatingState: "ACTIVE",
          operatorChangeDate: "2017/01/01",
        }),
        fac({
          facilityId: "540070",
          facilityName: "Fairview",
          operatorName: "Santos Toga Pty Ltd",
          operatingState: "ACTIVE",
          operatorChangeDate: "2024/06/01",
        }),
        fac({
          facilityId: "540070",
          facilityName: "Fairview",
          operatorName: "Old",
          operatingState: "INACTIVE",
          operatorChangeDate: "2025/01/01",
        }),
      ],
    );
    expect(rows[0].operatorName).toBe("Santos Toga Pty Ltd");
  });

  it("stacks by series without inventing extra keys", () => {
    const rows = joinFlowWithFacilities(
      [
        flow({ facilityId: "a", facilityType: "PROD", supply: 1, facilityName: "Kenya", state: "QLD" }),
        flow({ facilityId: "b", facilityType: "PROD", supply: 2, facilityName: "Longford", state: "VIC" }),
      ],
      [
        fac({ facilityId: "a", facilityName: "Kenya Gas Plant", operatorName: "QGC Pty Limited" }),
        fac({ facilityId: "b", facilityName: "Longford Gas Plant", operatorName: "Esso" }),
      ],
    );
    const { keys, data } = pivotStacked(prodRows(rows), (r) => r.state);
    expect(keys.sort()).toEqual(["QLD", "VIC"]);
    expect(data[0].QLD).toBe(1);
    expect(data[0].VIC).toBe(2);
  });

  it("fills missing days with zero when a date spine is provided", () => {
    const rows = joinFlowWithFacilities(
      [flow({ facilityId: "580236", facilityType: "PROD", supply: 22, facilityName: "SPCF" })],
      [fac({ facilityId: "580236", facilityName: "Sturt Plateau Gas Plant", operatorName: "Sturt Plateau" })],
    );
    const { data } = pivotStacked(prodRows(rows), (r) => r.displayName, {
      dateKeys: ["2026-09-08", "2026-09-09"],
    });
    expect(data).toHaveLength(2);
    expect(data[0]["Sturt Plateau Gas Plant"]).toBe(0);
    expect(data[1]["Sturt Plateau Gas Plant"]).toBe(22);
  });

  it("charts LNGEXPORT using Demand not Supply", () => {
    const rows = joinFlowWithFacilities(
      [
        flow({
          facilityId: "544272",
          facilityType: "LNGEXPORT",
          supply: 0,
          facilityName: "QCLNG LNG Plant",
        }),
      ],
      [fac({ facilityId: "544272", facilityName: "QCLNG LNG Plant", operatorName: "QCLNG Operating Company Pty Ltd" })],
    );
    rows[0].demand = 1461;
    const { data, keys } = pivotStacked(lngExportRows(rows), (r) => r.displayName, {
      getValue: (r) => r.demand,
    });
    expect(keys).toEqual(["QCLNG LNG Plant"]);
    expect(data[0]["QCLNG LNG Plant"]).toBe(1461);
  });
});

describe("dates", () => {
  it("parses AEMO GasDate forms", () => {
    expect(toDateKey(parseGasDate("2026/08/11")!)).toBe("2026-08-11");
    expect(toDateKey(parseGasDate("2026-08-11")!)).toBe("2026-08-11");
  });
});
