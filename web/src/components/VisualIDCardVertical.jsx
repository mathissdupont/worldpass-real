// components/VisualIDCardVertical.jsx
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";

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

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      className={`relative w-full max-w-[380px] rounded-[28px] overflow-hidden shadow-2xl border border-black/40 mx-auto transition-all duration-700 ease-out ${
        mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      } hover:scale-105 hover:shadow-3xl hover:rotate-1`}
      style={{
        background: `
          radial-gradient(120% 90% at -20% -10%, rgba(125,211,252,.35) 0%, transparent 60%),
          radial-gradient(120% 100% at 120% 0%, rgba(168,85,247,.40) 0%, transparent 65%),
          radial-gradient(90%  90%  at 50% 120%, rgba(244,114,182,.30) 0%, transparent 60%),
          radial-gradient(140% 120% at 80% -20%, rgba(34,197,94,.25) 0%, transparent 70%),
          linear-gradient(165deg, #020617 0%, #020617 30%, #020617 100%)
        `,
        color: "#fff",
        boxShadow: mounted ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
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

      <div className="relative z-10 flex flex-col gap-5 px-6 pt-6 pb-5">
        {/* ÜST: isim + status badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center font-bold text-white shadow-xl hover:scale-110 transition-transform duration-300">
              {initials}
            </div>
            <div>
              <div className="text-base font-bold leading-tight">
                {name || "Unnamed"}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Kimlik hazır
              </div>
            </div>
          </div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-200/80 font-medium">
            WorldPass ID
          </span>
        </div>

        {/* ORTA: QR */}
        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="relative">
            <QRCanvas value={did} size={164} ref={qrRef} />
            <div className="absolute inset-0 rounded-2xl border-2 border-white/20 shadow-lg pointer-events-none" />
          </div>
          <div className="text-center space-y-2">
            <div className="text-sm uppercase tracking-[0.2em] text-slate-300/80 font-medium">
              Digital Identity
            </div>
            <div className="mt-1 text-[12px] font-mono px-4 py-2 rounded-full bg-black/50 border border-white/20 text-white/90 max-w-[320px] mx-auto truncate shadow-md">
              {shortDid}
            </div>
          </div>
        </div>

        {/* AYRAÇ */}
        <div className="mt-1 h-[3px] w-full rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-500 to-amber-300" />

        {/* ALT: MRZ şeridi */}
        <div className="w-full rounded-xl bg-black/90 text-white px-4 py-3 border border-slate-600/60 shadow-lg">
          <p className="font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap font-semibold">
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
