import { describe, it, expect } from "vitest";
import { payloadToSeed, seedToPayload } from "./seedqr";

const M = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("seed QR", () => {
  it("round-trips and contains no words", () => {
    const p = seedToPayload(M);
    expect(p).toBe("00000000000000000000000000000000");
    expect(p).not.toMatch(/abandon/);
    expect(payloadToSeed(p)).toBe(M);
  });
  it("rejects foreign QR content", () => {
    expect(() => payloadToSeed("https://netflix.com")).toThrow();
  });
});
