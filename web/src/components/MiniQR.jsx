// components/MiniQR.jsx
import { useEffect, useRef } from "react";

export default function MiniQR({ value = "", size = 120, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const QR = await import("qrcode");            // dinamik import
      if (!alive || !ref.current) return;
      await QR.toCanvas(ref.current, value, {
        width: size,
        margin: 2,                                  // “quiet zone”
        errorCorrectionLevel: "M",
        color: { dark: "#111111", light: "#00000000" }, // şeffaf zemin
      });
    })();
    return () => { alive = false; };
  }, [value, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className={`rounded-lg shadow-sm ${className}`}
      style={{ imageRendering: "pixelated" }}       // keskin görünüm
      aria-label="DID QR"
    />
  );
}
