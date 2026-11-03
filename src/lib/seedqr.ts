import { entropyToMnemonic, mnemonicToEntropy } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { base32crockford } from "@scure/base";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { scrypt } from "@noble/hashes/scrypt.js";
import { bytesToHex, concatBytes, hexToBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import type { SetKey } from "@/lib/vault";

/** QR payload holds only opaque data — seed entropy and (PIN-encrypted) site + settings. */

const PREFIX = "SV1";
const SALT_LEN = 16;
const NONCE_LEN = 24;
const TAG_LEN = 16;

const SET_CHARS: Record<SetKey, string> = { lower: "l", upper: "u", digits: "d", symbols: "s" };
const CHAR_SETS: Record<string, SetKey> = { l: "lower", u: "upper", d: "digits", s: "symbols" };

export interface VaultQrData {
  mnemonic: string;
  /** "" = not included in the QR */
  domain: string;
  /** -1 = not included in the QR */
  counter: number;
  /** [] = not included in the QR */
  sets: SetKey[];
}

const normalizeWords = (m: string) => m.trim().toLowerCase().split(/\s+/).join(" ");
const normalizeDomain = (d: string) =>
  d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";

function pinKey(pin: string, salt: Uint8Array) {
  return scrypt(utf8ToBytes(pin), salt, { N: 2 ** 15, r: 8, p: 1, dkLen: 32 });
}

function hexToMnemonic(hex: string) {
  const e = hexToBytes(hex);
  const m = entropyToMnemonic(e, wordlist);
  e.fill(0);
  return m;
}

/** Legacy seed-only payload: plain hex entropy, no site or settings. Still readable by any SeedVault QR. */
export function seedToPayload(mnemonic: string) {
  const e = mnemonicToEntropy(normalizeWords(mnemonic), wordlist);
  const hex = bytesToHex(e);
  e.fill(0);
  return hex;
}

/** PIN-encrypted payload: seed + site + rotation counter + character sets. Length is always chosen by the user. */
export function sealedToPayload(
  data: { mnemonic: string; domain?: string; counter?: number; sets?: SetKey[] },
  pin: string,
) {
  if (pin.length < 4) throw new Error("PIN must be at least 4 characters");
  const e = mnemonicToEntropy(normalizeWords(data.mnemonic), wordlist);
  const plaintext = utf8ToBytes(
    JSON.stringify({
      s: bytesToHex(e),
      d: normalizeDomain(data.domain ?? ""),
      c: data.counter ?? 0,
      t: (data.sets ?? []).map((k) => SET_CHARS[k]).join(""),
    }),
  );
  e.fill(0);
  const salt = randomBytes(SALT_LEN);
  const nonce = randomBytes(NONCE_LEN);
  const sealed = concatBytes(salt, nonce, xchacha20poly1305(pinKey(pin, salt), nonce).encrypt(plaintext));
  plaintext.fill(0);
  return PREFIX + base32crockford.encode(sealed);
}

/** Opens either a PIN-sealed payload or a legacy plain seed QR. Throws on wrong PIN or foreign content. */
export function openPayload(text: string, pin: string): VaultQrData {
  const t = text.trim();
  if (/^([0-9a-f]{32}|[0-9a-f]{64})$/i.test(t)) {
    return { mnemonic: hexToMnemonic(t.toLowerCase()), domain: "", counter: -1, sets: [] };
  }
  if (!t.startsWith(PREFIX)) throw new Error("Not a SeedVault QR");
  let sealed: Uint8Array;
  try {
    sealed = base32crockford.decode(t.slice(PREFIX.length));
  } catch {
    throw new Error("Not a SeedVault QR");
  }
  if (sealed.length < SALT_LEN + NONCE_LEN + TAG_LEN) throw new Error("Damaged QR");
  const salt = sealed.slice(0, SALT_LEN);
  const nonce = sealed.slice(SALT_LEN, SALT_LEN + NONCE_LEN);
  let plain: Uint8Array;
  try {
    plain = xchacha20poly1305(pinKey(pin, salt), nonce).decrypt(sealed.slice(SALT_LEN + NONCE_LEN));
  } catch {
    throw new Error("Wrong PIN");
  }
  let obj: { s?: string; d?: string; c?: number; t?: string };
  try {
    obj = JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw new Error("Corrupt payload");
  }
  plain.fill(0);
  if (typeof obj.s !== "string" || !/^[0-9a-f]{32,64}$/.test(obj.s)) throw new Error("Corrupt payload");
  return {
    mnemonic: hexToMnemonic(obj.s),
    domain: normalizeDomain(obj.d ?? ""),
    counter: typeof obj.c === "number" && Number.isInteger(obj.c) && obj.c >= 0 ? obj.c : 0,
    sets: (obj.t ?? "")
      .split("")
      .map((ch) => CHAR_SETS[ch])
      .filter((k): k is SetKey => Boolean(k)),
  };
}
