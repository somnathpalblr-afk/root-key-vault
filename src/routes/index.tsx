import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  SETS,
  derivePassword,
  derivationPath,
  isValidMnemonic,
  newMnemonic,
  normalizeDomain,
  type SetKey,
} from "@/lib/vault";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SeedVault — Stateless Seed-Derived Passwords" },
      { name: "description", content: "Derive every password from your 12-word seed phrase. Nothing stored, fully offline." },
      { property: "og:title", content: "SeedVault — Stateless Seed-Derived Passwords" },
      { property: "og:description", content: "Your 12 words contain your passwords. No vault file, no sync." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const CLEAR_SECONDS = 20;

function Index() {
  const [mnemonic, setMnemonic] = useState("");
  const [reveal, setReveal] = useState(false);
  const [domain, setDomain] = useState("");
  const [counter, setCounter] = useState(0);
  const [length, setLength] = useState(32);
  const [sets, setSets] = useState<SetKey[]>(["lower", "upper", "digits", "symbols"]);
  const [result, setResult] = useState<{ password: string; path: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const timer = useRef<number | null>(null);

  const valid = isValidMnemonic(mnemonic);
  const nd = normalizeDomain(domain);

  const wipe = () => {
    setResult(null);
    setLeft(0);
    if (timer.current) window.clearInterval(timer.current);
    navigator.clipboard?.writeText("").catch(() => {});
  };
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  useEffect(() => { setResult(null); }, [mnemonic, domain, counter, length, sets]);

  const generate = () => {
    if (!valid || !nd) return;
    setBusy(true);
    setTimeout(() => {
      const r = derivePassword(mnemonic, nd, { length, counter, sets });
      setResult(r);
      setBusy(false);
      setLeft(CLEAR_SECONDS);
      if (timer.current) window.clearInterval(timer.current);
      timer.current = window.setInterval(() => {
        setLeft((s) => {
          if (s <= 1) { wipe(); return 0; }
          return s - 1;
        });
      }, 1000);
    }, 20);
  };

  const toggle = (k: SetKey) =>
    setSets((s) => (s.includes(k) ? (s.length > 1 ? s.filter((x) => x !== k) : s) : [...s, k]));

  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">offline · stateless · deterministic</p>
        <h1 className="mt-3 font-display text-5xl font-bold tracking-tight">SeedVault</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Your 12 words <em>are</em> your vault. Passwords are recomputed on demand from
          BIP-39 → BIP-32 → scrypt. Nothing is stored or sent anywhere.
        </p>
      </header>

      <section className="rounded border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">01 · Master seed</label>
          <div className="flex gap-3 text-xs">
            <button className="text-primary hover:underline" onClick={() => { setMnemonic(newMnemonic()); setReveal(true); }}>generate new</button>
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setReveal((r) => !r)}>{reveal ? "hide" : "show"}</button>
            <button className="text-muted-foreground hover:text-destructive" onClick={() => { setMnemonic(""); wipe(); }}>clear</button>
          </div>
        </div>
        <textarea
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          rows={3}
          placeholder="enter your 12 or 24 word phrase…"
          className="w-full resize-none rounded border border-input bg-background p-3 text-sm outline-none focus:border-ring"
          style={reveal ? undefined : ({ WebkitTextSecurity: "disc" } as React.CSSProperties)}
        />
        <p className={`mt-2 text-xs ${mnemonic ? (valid ? "text-primary" : "text-destructive") : "text-muted-foreground"}`}>
          {mnemonic ? (valid ? "✓ valid BIP-39 checksum" : "✗ invalid phrase or checksum") : "Write new phrases on paper. Losing them means losing every password."}
        </p>
      </section>

      <section className="mt-5 rounded border border-border bg-card p-5">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">02 · Site</label>
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="netflix.com"
          className="mt-3 w-full rounded border border-input bg-background p-3 font-display text-xl outline-none focus:border-ring"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          path: <span className="text-accent">{nd ? derivationPath(nd, counter) : "m/44'/1'/0'/…"}</span>
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">length · {length}</p>
            <input type="range" min={12} max={64} value={length} onChange={(e) => setLength(+e.target.value)} className="mt-2 w-full accent-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">rotation counter</p>
            <div className="mt-1 flex items-center gap-2">
              <button className="rounded border border-border px-2" onClick={() => setCounter((c) => Math.max(0, c - 1))}>−</button>
              <span className="w-8 text-center">{counter}</span>
              <button className="rounded border border-border px-2" onClick={() => setCounter((c) => c + 1)}>+</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SETS) as SetKey[]).map((k) => (
              <button
                key={k}
                onClick={() => toggle(k)}
                className={`rounded border px-2 py-1 text-xs ${sets.includes(k) ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={!valid || !nd || busy}
          onClick={generate}
          className="mt-6 w-full rounded bg-primary py-3 font-display font-bold text-primary-foreground shadow-glow transition disabled:opacity-30"
        >
          {busy ? "deriving (scrypt)…" : "Derive password"}
        </button>
      </section>

      {result && (
        <section className="mt-5 rounded border border-primary bg-card p-5 shadow-glow">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>03 · {nd}</span>
            <span>auto-wipe in {left}s</span>
          </div>
          <p className="mt-3 break-all text-lg text-primary">{result.password}</p>
          <div className="mt-4 flex gap-3">
            <button
              className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
              onClick={() => navigator.clipboard.writeText(result.password)}
            >
              copy
            </button>
            <button className="rounded border border-border px-4 py-2 text-sm" onClick={wipe}>wipe now</button>
          </div>
        </section>
      )}

      <footer className="mt-12 text-xs leading-relaxed text-muted-foreground">
        Same seed + site + counter + length + character sets → same password, forever.
        Bump the counter to rotate a password. Seed bytes, keys and scrypt output are zeroed after each derivation;
        the clipboard is cleared after {CLEAR_SECONDS}s.
      </footer>
    </main>
  );
}
