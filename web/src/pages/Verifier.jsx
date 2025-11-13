// src/pages/Verifier.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

/* ---- UI bits (token-friendly) ---- */
function Pill({ tone = "info", children }) {
  const map = {
    info: "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]",
    ok:   "border-emerald-400/30 bg-[color:var(--panel-2)] text-emerald-300",
    warn: "border-amber-400/30  bg-[color:var(--panel-2)] text-amber-300",
    err:  "border-rose-400/30   bg-[color:var(--panel-2)] text-rose-300",
  };
  return <div className={`text-xs rounded-lg px-3 py-2 border ${map[tone]}`}>{children}</div>;
}

function CopyBtn({ value, label = "Kopyala" }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value)}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs"
      title="Panoya kopyala"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <rect x="2" y="2" width="13" height="13" rx="2" />
      </svg>
      {label}
    </button>
  );
}

export default function Verifier() {
  const [qrUrl, setQrUrl] = useState("");
  const [challenge, setChallenge] = useState("");          // tek seferlik kod
  const [expiresAt, setExpiresAt] = useState(null);        // epoch (s) veya ISO
  const [aud, setAud] = useState("worldpass-demo");

  const [busy, setBusy] = useState(false);
  const [resp, setResp] = useState(null);
  const [msg, setMsg] = useState(null); // {type:'ok'|'err'|'info', text}
  const [tick, setTick] = useState(0);  // re-render için gerçek sayaç

  const canvasRef = useRef(null);

  // kalan süre
  const left = useMemo(() => {
    if (!expiresAt) return null;
    const targetMs =
      typeof expiresAt === "number" ? expiresAt * 1000 : new Date(expiresAt).getTime();
    return Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
  }, [expiresAt, tick]);

  const expired = useMemo(() => left !== null && left <= 0, [left]);

  // gerçekte tikleyen interval
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 500);
    return () => clearInterval(id);
  }, [expiresAt]);

  const drawCanvasQr = async (payload) => {
    if (!canvasRef.current) return;
    const size = 256;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const canvas = canvasRef.current;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const opts = {
      width: size * dpr,
      margin: 0,
      errorCorrectionLevel: "M",
      color: { dark: "#111111", light: "#00000000" },
    };
    await QRCode.toCanvas(canvas, payload, opts);
  };

  const newChallenge = async () => {
    setBusy(true);
    setResp(null);
    setMsg(null);
    setQrUrl("");
    try {
      const r = await fetch("/api/challenge/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: aud, exp_secs: 120 }),
      });
      if (!r.ok) {
        const errTxt = await r.text().catch(()=> "");
        throw new Error(`HTTP ${r.status} ${errTxt ? "- "+errTxt : ""}`);
      }
      const d = await r.json(); // { nonce, expires_at?, exp_secs? }
      const nonce = d.nonce || d.challenge || "";
      if (!nonce) throw new Error("Sunucudan kod dönmedi.");

      // expiry: backend verdiyse onu, yoksa now+exp_secs
      const exp = d.expires_at ?? Math.floor(Date.now()/1000 + (typeof d.exp_secs==="number" ? d.exp_secs : 120));

      setChallenge(nonce);
      setExpiresAt(exp);

      const payloadObj = { type: "present", challenge: nonce, aud, exp };
      const payloadStr = JSON.stringify(payloadObj);

      const dataUrl = await QRCode.toDataURL(payloadStr, {
        width: 256,
        errorCorrectionLevel: "M",
        margin: 0,
        color: { dark: "#111111", light: "#ffffff00" },
      });
      setQrUrl(dataUrl);
      await drawCanvasQr(payloadStr);

      setMsg({ type: "ok", text: "Yeni doğrulama isteği hazır." });
    } catch (e) {
      setMsg({ type: "err", text: "İstek oluşturulamadı: " + (e?.message || String(e)) });
    } finally {
      setBusy(false);
    }
  };

  // Kullanıcıdan gelen veriyi al ve doğrula (demo)
  const pasteAndVerify = async () => {
    setResp(null);
    try {
      const txt = prompt("Gösterim verisini (JSON) buraya yapıştır:");
      if (!txt) return;
      const r = await fetch("/api/present/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: txt,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setResp(d);
      if (d?.valid && !d?.revoked) setMsg({ type: "ok", text: "Sertifika geçerli görünüyor." });
      else setMsg({ type: "info", text: "Doğrulama sonucu aşağıda." });
    } catch (e) {
      setMsg({ type: "err", text: "Doğrulama hatası: " + (e?.message || String(e)) });
    }
  };

  const downloadQR = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `present_${challenge || "qr"}.png`;
    a.click();
  };

  const payloadText = useMemo(() => {
    if (!challenge) return "";
    return JSON.stringify({ type: "present", challenge, aud, exp: expiresAt }, null, 2);
  }, [challenge, aud, expiresAt]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)]/80 backdrop-blur-sm p-6 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Doğrulayıcı</h2>
          <p className="text-sm text-gray-600 mt-1">
            QR oluştur: kişi uygulamasıyla QR’ı okur → sana ürettiği metni yollar → buraya yapıştırıp doğrula.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Pill tone={challenge ? (expired ? "warn" : "ok") : "info"}>
            {challenge
              ? expired
                ? "İstek: süresi doldu"
                : `İstek: aktif${left != null ? ` (${left}s)` : ""}`
              : "İstek: yok"}
          </Pill>
        </div>
      </div>

      {/* Generate */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)]/80 backdrop-blur-sm p-6 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-[1fr,auto] gap-3">
          <div>
            <label className="text-sm text-gray-700 mb-1 block">Hedef / kullanım alanı (isteğe bağlı)</label>
            <input
              value={aud}
              onChange={(e) => setAud(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
              placeholder="ör: kampüs kapısı, sınav salonu, toplantı check-in"
            />
          </div>
          <button
            onClick={newChallenge}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-[color:var(--brand)] text-white disabled:opacity-50 hover:opacity-90"
          >
            {busy ? "Oluşturuluyor…" : "QR Oluştur"}
          </button>
        </div>

        {challenge && (
          <div className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
            {/* QR Görseli */}
            <div className="space-y-2">
              <img
                src={qrUrl}
                alt="doğrulama isteği qr"
                className="border border-[color:var(--border)] rounded-2xl p-3 w-64 bg-[color:var(--panel)] shadow-sm"
              />
              {/* Retina için gerçek canvas (gizli tutuyoruz; istersen görünür yap) */}
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex items-center gap-2">
                <CopyBtn value={payloadText} label="JSON’u Kopyala" />
                <button
                  onClick={downloadQR}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs"
                >
                  QR’ı İndir (PNG)
                </button>
                <button
                  onClick={() => {
                    setChallenge("");
                    setExpiresAt(null);
                    setQrUrl("");
                    setResp(null);
                    setMsg({ type: "info", text: "İstek temizlendi." });
                  }}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs"
                >
                  Sıfırla
                </button>
              </div>
            </div>

            {/* Bilgi kutusu */}
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] p-3 text-xs font-mono overflow-auto">
              <div className="flex items-center gap-2">
                <span className="text-[color:var(--muted)]">Tek-seferlik kod:</span>
                <span className="truncate">{challenge}</span>
                <CopyBtn value={challenge} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[color:var(--muted)]">Hedef:</span>
                <span className="truncate">{aud}</span>
                <CopyBtn value={aud} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[color:var(--muted)]">Son geçerlilik:</span>
                <span>
                  {expiresAt
                    ? typeof expiresAt === "number"
                      ? new Date(expiresAt * 1000).toISOString()
                      : String(expiresAt)
                    : "—"}
                </span>
                {left != null && (
                  <span className={`ml-2 ${expired ? "text-rose-400" : "text-[color:var(--muted)]"}`}>
                    ({left}s)
                  </span>
                )}
              </div>
              <div className="mt-3 text-[color:var(--text)]">Teknik JSON (gelişmiş):</div>
              <pre className="mt-1 bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-lg p-2">
{payloadText}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Verify (paste) */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)]/80 backdrop-blur-sm p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[color:var(--text)]">Gönderiyi Doğrula</h3>
          <button
            onClick={pasteAndVerify}
            className="px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
          >
            Yapıştır ve Doğrula
          </button>
        </div>
        {msg && (
          <Pill tone={msg.type === "ok" ? "ok" : msg.type === "err" ? "err" : "info"}>
            {msg.text}
          </Pill>
        )}
        {resp && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={resp.valid && !resp.revoked ? "ok" : "warn"}>
                {resp.valid ? "Geçerli" : "Geçersiz"}
              </Pill>
              {resp.revoked ? <Pill tone="err">İptal edilmiş</Pill> : null}
              {resp.reason && <span className="text-sm text-[color:var(--text)]">Açıklama: {resp.reason}</span>}
            </div>
            <pre className="text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-xl p-3 overflow-auto">
{JSON.stringify(resp, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
