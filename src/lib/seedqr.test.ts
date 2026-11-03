import { describe, it, expect } from "vitest";
import { openPayload, sealedToPayload, seedToPayload } from "./seedqr";

const M = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const SETS = ["lower", "upper", "digits", "symbols"] as const;

describe("seed QR", () => {
  it("legacy plain payload is pure seed entropy", () => {
    expect(seedToPayload(M)).toBe("00000000000000000000000000000000");
  });

  it("sealed payload round-trips seed, site, counter and sets", () => {
    const p = sealedToPayload({ mnemonic: M, domain: "netflix.com", counter: 2, sets: [...SETS] }, "1234");
    expect(p.startsWith("SV1")).toBe(true);
    expect(p.toLowerCase()).not.toContain("abandon");
    expect(p.toLowerCase()).not.toContain("netflix");
    const d = openPayload(p, "1234");
    expect(d.mnemonic).toBe(M);
    expect(d.domain).toBe("netflix.com");
    expect(d.counter).toBe(2);
    expect(d.sets).toEqual([...SETS]);
  });

  it("rejects a wrong PIN", () => {
    const p = sealedToPayload({ mnemonic: M, domain: "netflix.com", counter: 0, sets: [...SETS] }, "1234");
    expect(() => openPayload(p, "9999")).toThrow();
  });

  it("still opens legacy plain seed QRs with seed only", () => {
    const d = openPayload("00000000000000000000000000000000", "");
    expect(d.mnemonic).toBe(M);
    expect(d.domain).toBe("");
    expect(d.counter).toBe(-1);
    expect(d.sets).toEqual([]);
  });

  it("rejects foreign QR content", () => {
    expect(() => openPayload("https://netflix.com", "")).toThrow();
  });
});
