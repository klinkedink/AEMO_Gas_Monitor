import { describe, expect, it } from "vitest";
import { isBeetaloo, isOriginAplng, isQgc, isSantosCsg } from "./operators";

describe("operator mapping", () => {
  it("matches QGC plants by operator name", () => {
    expect(isQgc("QGC Pty Limited")).toBe(true);
    expect(isQgc("Australia Pacific LNG Pty Limited")).toBe(false);
  });

  it("keeps Santos CSG / Toga and drops conventional hubs", () => {
    expect(isSantosCsg("Santos Toga Pty Ltd", "Fairview", "Fairview")).toBe(true);
    expect(isSantosCsg("Santos CSG Pty Ltd", "Roma Compressor Station", "Roma")).toBe(true);
    expect(isSantosCsg("Santos CSG Pty Ltd", "Scotia", "Scotia")).toBe(true);
    expect(isSantosCsg("Santos Toga Pty Ltd", "Arcadia Compression Facility", "Arcadia")).toBe(true);
    expect(isSantosCsg("Santos Limited", "Moomba Gas Plant", "Moomba")).toBe(false);
    expect(isSantosCsg("Santos Limited", "Ballera Gas Plant", "")).toBe(false);
    expect(isSantosCsg("Jemena Roma North Processing Pty Ltd", "Roma North Gas Processing Facility", "Roma North")).toBe(
      false,
    );
  });

  it("maps Origin CSG via APLNG operator names", () => {
    expect(isOriginAplng("Australia Pacific LNG Pty Limited")).toBe(true);
    expect(isOriginAplng("Origin Energy Electricity Limited")).toBe(true);
    expect(isOriginAplng("Denison Gas Ltd")).toBe(false);
  });

  it("identifies Beetaloo / Sturt Plateau without inventing extra fields", () => {
    expect(isBeetaloo({ facilityId: "580236", facilityName: "SPCF", facilityShortName: "SPCF" })).toBe(true);
    expect(
      isBeetaloo({
        facilityId: "999",
        facilityName: "Sturt Plateau Gas Plant",
        facilityShortName: "SPCF",
      }),
    ).toBe(true);
    expect(isBeetaloo({ facilityId: "540087", facilityName: "Woleebee Creek" })).toBe(false);
  });
});
