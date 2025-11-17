// src/pages/Verifier.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { t } from "../lib/i18n";

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

function CopyBtn({ value, label = t('copy') }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value)}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs"
      title={t('copy_title')}
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
  const videoRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);
  const [qrScanning, setQrScanning] = useState(false);
  const ndefRef = useRef(null);

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

  // cleanup scanners on unmount
  useEffect(() => {
    return () => {
      try { stopQrScan(); } catch {}
      try { stopNfcScan(); } catch {}
    };
  }, []);

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

      // Add QR generation animation (respecting user preferences)
      const qrContainer = document.querySelector('.qr-generation-container');
      if (qrContainer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        qrContainer.classList.add('animate-pulse');
      }

      const dataUrl = await QRCode.toDataURL(payloadStr, {
        width: 256,
        errorCorrectionLevel: "M",
        margin: 0,
        color: { dark: "#111111", light: "#ffffff00" },
      });
      setQrUrl(dataUrl);
      await drawCanvasQr(payloadStr);

      // Remove animation after generation
      if (qrContainer) {
        setTimeout(() => qrContainer.classList.remove('animate-pulse'), 500);
      }

      setMsg({ type: "ok", text: t('verifier.new_challenge_ready') });
    } catch (e) {
      setMsg({ type: "err", text: t('verifier.new_challenge_failed') + " : " + (e?.message || String(e)) });
    } finally {
      setBusy(false);
    }
  };

  // Kullanıcıdan gelen veriyi al ve doğrula (demo)
  const fileInputRef = useRef(null);
  const [dragVerify, setDragVerify] = useState(false);

  const handleVerifyFile = async (file) => {
    setResp(null); setMsg(null);
    if (!file) return;
    try {
      const txt = await file.text();
      const r = await fetch("/api/present/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: txt,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setResp(d);
      if (d?.valid && !d?.revoked) setMsg({ type: "ok", text: t('verifier.verify_ok') });
      else setMsg({ type: "info", text: t('verifier.verify_result') });
    } catch (e) {
      setMsg({ type: "err", text: t('verifier.verify_failed') + ": " + (e?.message || String(e)) });
    }
  };

  // submit raw presentation text (from scan or url)
  const submitPresentationText = async (txt) => {
    setResp(null); setMsg(null);
    if (!txt) return;
    try {
      // if txt is an object, stringify
      const body = typeof txt === 'string' ? txt : JSON.stringify(txt);
      const r = await fetch("/api/present/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setResp(d);
      if (d?.valid && !d?.revoked) setMsg({ type: "ok", text: t('verifier.verify_ok') });
      else setMsg({ type: "info", text: t('verifier.verify_result') });
    } catch (e) {
      setMsg({ type: "err", text: t('verifier.verify_failed') + ": " + (e?.message || String(e)) });
    }
  };

  const handleScanned = async (raw) => {
    if (!raw) return;
    try {
      if (/^https?:\/\//.test(raw)) {
        const r = await fetch(raw);
        const txt = await r.text();
        // try parse
        try { JSON.parse(txt); await submitPresentationText(txt); setMsg({ type: 'ok', text: t('scanned_payload_loaded') }); return; } catch {}
      }
      // try parse raw json
      try { const obj = JSON.parse(raw); await submitPresentationText(JSON.stringify(obj)); setMsg({ type: 'ok', text: t('scanned_payload_loaded') }); return; } catch {}
      // if not JSON, just try submit as-is
      await submitPresentationText(raw);
    } catch (e) {
      setMsg({ type: 'err', text: t('file_read_error') });
    }
  };

  const stopQrScan = async () => {
    try {
      if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    } catch {}
    setQrScanning(false);
  };

  const startQrScan = async () => {
    setMsg(null);
    if (!('BarcodeDetector' in window)) return setMsg({ type: 'info', text: t('scanner_not_supported') });
    try {
      detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanIntervalRef.current = setInterval(async () => {
        try {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          const w = videoRef.current.videoWidth, h = videoRef.current.videoHeight;
          if (!w || !h) return;
          const canvas = canvasRef.current || document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, w, h);
          const bitmap = await createImageBitmap(canvas);
          const codes = await detectorRef.current.detect(bitmap);
          if (codes && codes.length) {
            handleScanned(codes[0].rawValue);
            stopQrScan();
          }
        } catch (e) {
          // ignore
        }
      }, 500);
      setQrScanning(true);
    } catch (e) {
      setMsg({ type: 'err', text: (e?.message || String(e)) });
    }
  };

  const startNfcScan = async () => {
    setMsg(null);
    if (!('NDEFReader' in window)) return setMsg({ type: 'info', text: t('nfc_not_supported') });
    try {
      const reader = new NDEFReader();
      ndefRef.current = reader;
      await reader.scan();
      reader.onreading = (ev) => {
        try {
          for (const record of ev.message.records) {
            if (record.recordType === 'text') {
              const textDecoder = new TextDecoder(record.encoding || 'utf-8');
              const txt = textDecoder.decode(record.data);
              handleScanned(txt);
              break;
            }
            if (record.recordType === 'url') {
              const url = new TextDecoder().decode(record.data);
              handleScanned(url);
              break;
            }
          }
        } catch (e) {
          setMsg({ type: 'err', text: t('file_read_error') });
        }
      };
      reader.onreadingerror = () => setMsg({ type: 'err', text: t('file_read_error') });
      setMsg({ type: 'ok', text: t('scanning_qr') });
    } catch (e) {
      setMsg({ type: 'err', text: e?.message || String(e) });
    }
  };

  const stopNfcScan = async () => {
    try { if (ndefRef.current && ndefRef.current.onreading) ndefRef.current.onreading = null; ndefRef.current = null; } catch {}
  };

  const onVerifyInputFile = (e) => handleVerifyFile(e.target.files?.[0] || null);
  const onVerifyDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragVerify(false); const f = e.dataTransfer?.files?.[0]; handleVerifyFile(f || null); };

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
          <h2 className="text-lg font-semibold">{t('verifier.title')}</h2>
          <p className="text-sm text-gray-600 mt-1">{t('verifier.desc')}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Pill tone={challenge ? (expired ? "warn" : "ok") : "info"}>
            {challenge
              ? expired
                ? t('verifier.request_expired')
                : `${t('verifier.request_active')}${left != null ? ` (${left}s)` : ""}`
              : t('verifier.request_none')}
          </Pill>
        </div>
      </div>

      {/* Generate */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)]/80 backdrop-blur-sm p-6 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-[1fr,auto] gap-3">
          <div>
            <label className="text-sm text-gray-700 mb-1 block">{t('verifier.audience_label')}</label>
            <input
              value={aud}
              onChange={(e) => setAud(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
              placeholder={t('verifier.audience_placeholder')}
            />
          </div>
            <button
              onClick={newChallenge}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-[color:var(--brand)] text-white disabled:opacity-50 hover:opacity-90 focus:ring-2 focus:ring-[color:var(--brand-2)] focus:outline-none"
              aria-label={busy ? t('verifier.generating') : t('verifier.generate_qr')}
            >
              {busy ? t('verifier.generating') : t('verifier.generate_qr')}
            </button>
          </div>
        {challenge && (
          <div className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
            {/* QR Görseli */}
            <div className="space-y-2 qr-generation-container">
              <img
                src={qrUrl}
                alt="Doğrulama isteği için QR kod"
                aria-label="Doğrulama QR kodu"
                className="border border-[color:var(--border)] rounded-2xl p-3 w-64 bg-[color:var(--panel)] shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none will-change-transform"
              />
              {/* Retina için gerçek canvas (gizli tutuyoruz; istersen görünür yap) */}
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex items-center gap-2">
                <CopyBtn value={payloadText} label={t('copy_json')} />
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
                  <span className={`ml-2 ${expired ? "text-rose-400 animate-pulse" : "text-[color:var(--muted)]"} transition-colors duration-300 motion-reduce:animate-none`}>
                    ({left}s)
                  </span>
                )}
              </div>
              <div className="mt-3 text-[color:var(--text)]">{t('technical_payload')}</div>
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
            <h3 className="font-semibold text-[color:var(--text)]">{t('verifier.verify_title')}</h3>
        </div>
          <div
            onDragOver={(e)=>{e.preventDefault(); setDragVerify(true);}}
            onDragLeave={()=>setDragVerify(false)}
            onDrop={onVerifyDrop}
            className={[
              "rounded-xl border-2 border-dashed p-4 mt-3 transition select-none",
              dragVerify ? "border-[color:var(--brand-2)] bg-[color:var(--panel-2)]" : "border-[color:var(--border)] bg-[color:var(--panel-2)]/70"
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t('verifier.file_hint_title')}</div>
                <div className="text-xs text-[color:var(--muted)]">{t('verifier.file_hint')}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-black/10 bg-white hover:bg-white/90 cursor-pointer shrink-0">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>
                  <span className="text-sm">{t('choose_file')}</span>
                  <input ref={fileInputRef} type="file" accept=".wpvc" onChange={onVerifyInputFile} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        {msg && (
          <Pill tone={msg.type === "ok" ? "ok" : msg.type === "err" ? "err" : "info"}>
            {msg.text}
          </Pill>
        )}
        {resp && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={resp.valid && !resp.revoked ? "ok" : "warn"}>
                {resp.valid ? "Geçerli" : "Geçersiz"}
              </Pill>
              {resp.revoked ? <Pill tone="err">İptal edilmiş</Pill> : null}
              {resp.reason && <span className="text-sm text-[color:var(--text)]">Açıklama: {resp.reason}</span>}
            </div>
            <pre className="text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-xl p-3 overflow-auto transition-all duration-300 motion-reduce:transition-none">
{JSON.stringify(resp, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
