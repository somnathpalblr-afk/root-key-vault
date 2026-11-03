import { describe, it, expect } from "vitest";
import { derivePassword, derivationPath, isValidMnemonic } from "./vault";

const M = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const opts = { length: 32, counter: 0, sets: ["lower", "upper", "digits", "symbols"] as const };

describe("vault", () => {
  it("is deterministic for same seed + domain", () => {
    const a = derivePassword(M, "netflix.com", { ...opts, sets: [...opts.sets] });
    const b = derivePassword(M, "https://www.Netflix.com/login", { ...opts, sets: [...opts.sets] });
    expect(a.password).toBe(b.password);
    expect(a.password).toHaveLength(32);
  });
  it("differs per domain and counter", () => {
    const s = [...opts.sets];
    const a = derivePassword(M, "github.com", { ...opts, sets: s }).password;
    expect(derivePassword(M, "twitter.com", { ...opts, sets: s }).password).not.toBe(a);
    expect(derivePassword(M, "github.com", { ...opts, counter: 1, sets: s }).password).not.toBe(a);
  });
  it("includes every chosen character class", () => {
    const p = derivePassword(M, "x.com", { ...opts, sets: [...opts.sets] }).password;
    expect(p).toMatch(/[a-z]/);
    expect(p).toMatch(/[A-Z]/);
    expect(p).toMatch(/[0-9]/);
    expect(p).toMatch(/[^a-zA-Z0-9]/);
  });
  it("validates mnemonics and builds hardened paths", () => {
    expect(isValidMnemonic(M)).toBe(true);
    expect(isValidMnemonic("hello world")).toBe(false);
    expect(derivationPath("github.com", 0)).toMatch(/^m\/44'\/1'\/0'\/\d+'\/0'$/);
  });
});
