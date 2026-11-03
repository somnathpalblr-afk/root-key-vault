import { useEffect, useRef, useState } from "react";
import { payloadToSeed, seedToPayload } from "@/lib/seedqr";

export function SeedQR({ mnemonic, valid, onLoad }: { mnemonic: string; valid: boolean; onLoad: (m: string) => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => { setQr(null); }, [mnemonic]);
  useEffect(() => () => stop(), []);

  const show = async () => {
    const QR = (await import("qrcode")).default;
    setQr(await QR.toDataURL(seedToPayload(mnemonic), { margin: 2, width: 240, errorCorrectionLevel: "M" }));
  };

  const decode = async (data: ImageData) => {
    const jsQR = (await import("jsqr")).default;
    const r = jsQR(data.data, data.width, data.height);
    if (!r) return false;
    try { onLoad(payloadToSeed(r.data)); setMsg("✓ seed loaded from QR"); }
    catch { setMsg("✗ not a SeedVault QR"); }
    return true;
  };

  const upload = (f: File) => {
    const img = new Image();
    img.onload = async () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      if (!(await decode(ctx.getImageData(0, 0, c.width, c.height)))) setMsg("✗ no QR found in image");
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };

  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setScanning(false);
  }

  const scan = async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setScanning(true);
      setMsg("");
      requestAnimationFrame(async function tick() {
        const v = video.current;
        if (!stream.current) return;
        if (v && v.readyState >= 2) {
          if (!v.srcObject) v.srcObject = stream.current;
          const c = document.createElement("canvas");
          c.width = v.videoWidth; c.height = v.videoHeight;
          const ctx = c.getContext("2d")!;
          ctx.drawImage(v, 0, 0);
          if (await decode(ctx.getImageData(0, 0, c.width, c.height))) return stop();
        } else if (v && !v.srcObject) v.srcObject = stream.current;
        requestAnimationFrame(tick);
      });
    } catch { setMsg("✗ camera not available"); }
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap gap-3 text-xs">
        <button disabled={!valid} className="text-primary hover:underline disabled:opacity-30" onClick={qr ? () => setQr(null) : show}>
          {qr ? "hide QR" : "seed → QR"}
        </button>
        <label className="cursor-pointer text-primary hover:underline">
          upload QR
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
        <button className="text-primary hover:underline" onClick={scanning ? stop : scan}>{scanning ? "stop camera" : "scan QR"}</button>
      </div>
      {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
      {scanning && <video ref={video} autoPlay playsInline muted className="mt-3 w-full max-w-xs rounded border border-border" />}
      {qr && (
        <div className="mt-3">
          <img src={qr} alt="Seed QR" className="rounded" />
          <a href={qr} download="seed.png" className="mt-2 inline-block text-xs text-primary hover:underline">download</a>
          <p className="mt-2 max-w-sm text-xs text-muted-foreground">
            Contains only your seed as random-looking code — no sites, passwords or settings. Anyone holding it can still
            use it as your seed, so store it like the paper copy.
          </p>
        </div>
      )}
    </div>
  );
}
