// components/VisualIDCardVertical.jsx
import { forwardRef, useEffect, useMemo, useRef } from "react";

/** QR kanvası (sadece görsel, dışarıya control vermiyoruz) */
const QRCanvas = forwardRef(function QRCanvas({ value, size = 148 }, canvasRef) {
  const innerRef = useRef(null);

  useEffect(() => {
    const target = canvasRef?.current || innerRef.current;
    if (!target) return;
    let mounted = true;

    (async () => {
      try {
        const QRCode = await import("qrcode"); // dinamik import
        if (!mounted) return;

        const ctx = target.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, target.width, target.height);
        }

        await QRCode.toCanvas(target, String(value || ""), {
          width: size,
          margin: 0,
          errorCorrectionLevel: "M",
          color: { dark: "#0f172a", light: "#ffffff00" }, // şeffaf zemin
        });
      } catch {
        // sessiz geç
      }
    })();

    return () => {
      mounted = false;
    };
  }, [value, size, canvasRef]);

  return (
    <div
      className="relative grid place-items-center rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 shadow-inner"
      style={{ width: size + 14, height: size + 14, padding: "7px" }}
      aria-label="QR area"
    >
      <div
        className="absolute inset-0 rounded-2xl opacity-40 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px) 0 0/8px 8px, linear-gradient(0deg, rgba(0,0,0,.05) 1px, transparent 1px) 0 0/8px 8px",
        }}
      />
      <canvas
        ref={canvasRef || innerRef}
        width={size}
        height={size}
        className="relative z-10 rounded-[6px]"
        style={{ imageRendering: "pixelated", display: "block" }}
      />
      <div className="absolute inset-0 rounded-2xl pointer-events-none bg-gradient-to-br from-white/20 to-transparent" />
    </div>
  );
});

/* ---------- ID Kartı (sadece görsel) ---------- */
export default function VisualIDCardVertical({ did, name }) {
  if (!did) return null;

  const initials =
    (name || "Unnamed")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "WP";

  const shortDid =
    typeof did === "string" && did.length > 40 ? did.slice(0, 40) + "…" : did;

  // alt MRZ benzeri şerit
  const mrz = useMemo(() => {
    const clean = String(did).replace(/[^A-Z0-9]/gi, "").toUpperCase();
    const pad = (s, n) => (s + "<".repeat(n)).slice(0, n);
    const nm = (name || "UNNAMED").toUpperCase().replace(/[^A-Z ]/g, "<");
    const line1 = `WPID<${pad(nm.replace(/\s+/g, "<"), 30)}${pad(clean, 20)}`;
    const line2 = `${pad(clean, 30)}<${pad("WORLDPASS", 20)}`;
    return `${line1}\n${line2}`;
  }, [did, name]);

  const qrRef = useRef(null);

  return (
    <div
      className="relative w-full max-w-[380px] rounded-[28px] overflow-hidden shadow-2xl border border-black/40 mx-auto"
      style={{
        background: `
          radial-gradient(120% 90% at -20% -10%, rgba(125,211,252,.25) 0%, transparent 60%),
          radial-gradient(120% 100% at 120% 0%, rgba(168,85,247,.30) 0%, transparent 65%),
          radial-gradient(90%  90%  at 50% 120%, rgba(244,114,182,.22) 0%, transparent 60%),
          linear-gradient(165deg, #020617 0%, #020617 30%, #020617 100%)
        `,
        color: "#fff",
      }}
      aria-label="WorldPass Visual ID Card"
    >
      {/* üst highlight katmanı */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            conic-gradient(from 240deg at 30% 10%, rgba(255,255,255,.18), transparent 40%),
            conic-gradient(from 30deg  at 80% 20%, rgba(255,255,255,.12), transparent 40%)
          `,
          mixBlendMode: "soft-light",
          opacity: 0.9,
        }}
      />

      <div className="relative z-10 flex flex-col gap-4 px-5 pt-5 pb-4">
        {/* ÜST: isim + status badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center font-semibold text-white shadow-lg">
              {initials}
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">
                {name || "Unnamed"}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Kimlik hazır
              </div>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-200/80">
            WorldPass ID
          </span>
        </div>

        {/* ORTA: QR */}
        <div className="flex flex-col items-center gap-3 pt-1">
          <QRCanvas value={did} size={164} ref={qrRef} />
          <div className="text-center space-y-1">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-300/80">
              Digital Identity
            </div>
            <div className="mt-0.5 text-[11px] font-mono px-3 py-1 rounded-full bg-black/40 border border-white/10 text-white/80 max-w-[310px] mx-auto truncate">
              {shortDid}
            </div>
          </div>
        </div>

        {/* AYRAÇ */}
        <div className="mt-1 h-[3px] w-full rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-500 to-amber-300" />

        {/* ALT: MRZ şeridi */}
      <div className="w-full rounded-lg bg-black/80 text-white px-3 py-2 border border-slate-700/80 shadow-inner">
        <p className="font-mono text-[10px] leading-snug break-all whitespace-pre-wrap">
          {mrz}
        </p>
      </div>

        {/* FOOTER */}
        <div className="pt-1 text-[10px] text-slate-200/80 text-center leading-snug">
          Bu kart, cihazındaki şifreli anahtar deposuna bağlıdır.
          <br />
          Gizli anahtar hiçbir zaman cihazını terk etmez.
        </div>
      </div>
    </div>
  );
}
