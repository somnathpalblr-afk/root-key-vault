import { entropyToMnemonic, mnemonicToEntropy } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

/** QR payload holds only the seed entropy as opaque hex — no words, sites, settings or passwords. */
export function seedToPayload(mnemonic: string) {
  const m = mnemonic.trim().toLowerCase().split(/\s+/).join(" ");
  const e = mnemonicToEntropy(m, wordlist);
  const hex = bytesToHex(e);
  e.fill(0);
  return hex;
}

export function payloadToSeed(text: string) {
  const t = text.trim().toLowerCase();
  if (!/^([0-9a-f]{32}|[0-9a-f]{64})$/.test(t)) throw new Error("Not a SeedVault QR");
  const e = hexToBytes(t);
  const m = entropyToMnemonic(e, wordlist);
  e.fill(0);
  return m;
}
