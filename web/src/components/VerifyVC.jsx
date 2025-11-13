// src/pages/verify/VerifyVC.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { newChallenge, verifyVC } from "../lib/api";

/* ---------------- Small UI bits ---------------- */
function cx(...xs) { return xs.filter(Boolean).join(" "); }

function Pill({ ok, text }) {
  const cls = ok
    ? "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
    : "border-rose-300/60 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {text}
    </span>
  );
}

function CopyBtn({ value, label = "Copy", small=false }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(String(value || ""))}
      type="button"
      className={cx(
        "inline-flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]",
        small ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
      )}
    >
      <svg className={small ? "h-3 w-3" : "h-3.5 w-3.5"} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/>
      </svg>
      {label}
    </button>
  );
}

function Msg({ msg }) {
  if (!msg) return null;
  const cls =
    msg.type === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
      : msg.type === "err"
      ? "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30"
      : "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]";
  return <div className={`text-xs rounded-lg px-3 py-2 border ${cls}`}>{msg.text}</div>;
}

/* ---------------- VerifyVC ---------------- */
export default function VerifyVC() {
  // VC input state
  const [vcText, setVcText] = useState("");
  const [vcObj, setVcObj] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const fileRef = useRef(null);

  // challenge & results
  const [challenge, setChallenge] = useState(null); // { nonce|challenge, expires_at }
  const [left, setLeft] = useState(null);
  const [result, setResult] = useState(null);

  // ui
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type:'ok'|'err'|'info', text }

  /* ---------- helpers ---------- */
  const vcShort = useMemo(() => {
    if (!vcObj) return "VC yok";
    const id = vcObj.id || vcObj.jti || (Array.isArray(vcObj.type) ? vcObj.type.join(",") : vcObj.type) || "VC";
    return typeof id === "string" ? id : JSON.stringify(id).slice(0, 50);
  }, [vcObj]);

  const subjectId = vcObj?.credentialSubject?.id || "";
  const issuer = vcObj?.issuer || "";
  const nonceVal = challenge?.nonce || challenge?.challenge || "";

  const canVerify = pasteMode ? !!rawJson.trim() && !!challenge : !!vcObj && !!challenge;

  function safeParse(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  function clearVC() {
    setVcText(""); setVcObj(null); setRawJson(""); setResult(null); setMsg(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function clearChallenge() {
    setChallenge(null); setLeft(null); setResult(null);
  }

  /* ---------- file / drop ---------- */
  const handleFile = async (file) => {
    if (!file) return;
    setMsg(null); setResult(null);
    try {
      const txt = await file.text();
      const obj = safeParse(txt);
      if (!obj) throw new Error("Geçersiz JSON dosyası.");
      setVcText(txt);
      setVcObj(obj);
      setPasteMode(false);
      setShowPreview(false);
      setMsg({ type: "ok", text: "VC yüklendi." });
    } catch (e) {
      setVcText(""); setVcObj(null);
      setMsg({ type: "err", text: e?.message || "Dosya okunamadı veya geçersiz JSON." });
    }
  };
  const onInputFile = (e) => handleFile(e.target.files?.[0] || null);
  const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDrag(false); handleFile(e.dataTransfer?.files?.[0] || null); };

  /* ---------- challenge countdown ---------- */
  useEffect(() => {
    if (!challenge?.expires_at) { setLeft(null); return; }
    const tick = () => {
      const ms = Math.max(0, new Date(challenge.expires_at).getTime() - Date.now());
      setLeft(Math.ceil(ms / 1000));
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [challenge]);

  /* ---------- actions ---------- */
  const onChallenge = async () => {
    try {
      setBusy(true); setMsg(null); setResult(null);
      const host = window.location.hostname || "localhost";
      // newChallenge(host, ttlSeconds)
      const ch = await newChallenge(host, 180);
      setChallenge(ch);
      setMsg({ type: "ok", text: "Challenge alındı." });
    } catch (err) {
      setMsg({ type: "err", text: "Challenge alınamadı: " + (err?.message || String(err)) });
    } finally { setBusy(false); }
  };

  const materializeVC = () => {
    if (pasteMode) {
      const obj = safeParse(rawJson);
      if (!obj) throw new Error("Geçerli VC JSON yapıştır.");
      setVcObj(obj);
      setVcText(rawJson);
      return obj;
    }
    if (!vcObj) throw new Error("Önce VC yükle veya yapıştır.");
    return vcObj;
  };

  const onVerify = useCallback(async () => {
    try {
      setBusy(true); setMsg(null);
      const obj = materializeVC();
      if (!challenge) throw new Error("Challenge yok. Önce challenge al.");

      const resp = await verifyVC(
        obj,
        nonceVal,
        obj?.credentialSubject?.id ?? null
      );
      setResult(resp);
      if (resp?.valid && !resp?.revoked) setMsg({ type: "ok", text: "VC doğrulandı." });
      else setMsg({ type: "info", text: "VC doğrulama sonucu aşağıda." });
    } catch (err) {
      setResult(null);
      setMsg({ type: "err", text: "Doğrulama hatası: " + (err?.message || String(err)) });
    } finally { setBusy(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasteMode, rawJson, vcObj, challenge]);

  /* ---------- UI ---------- */
  const challengeActive = Boolean(challenge && left !== null && left > 0);

  return (
    <section className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)]/90 backdrop-blur p-5 shadow-sm space-y-5">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Verify a VC</h2>
          <p className="text-[12px] text-[color:var(--muted)] mt-0.5">Sunucu tabanlı doğrulama (challenge/nonce ile).</p>
        </div>
        <div className="flex items-center gap-2">
          <Pill ok={!!vcObj} text={vcObj ? "VC yüklendi" : "VC yok"} />
          <Pill ok={challengeActive} text={challengeActive ? `Challenge aktif (${left}s)` : "Challenge yok"} />
        </div>
      </div>

      {/* mode toggle */}
      <div className="inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--panel)] overflow-hidden text-sm">
        <button
          type="button"
          onClick={()=>{ setPasteMode(false); setMsg(null); }}
          className={`px-3 py-1.5 ${!pasteMode ? "bg-[color:var(--brand)] text-white" : "hover:bg-[color:var(--panel-2)]"}`}
        >
          File
        </button>
        <button
          type="button"
          onClick={()=>{ setPasteMode(true); setMsg(null); }}
          className={`px-3 py-1.5 ${pasteMode ? "bg-[color:var(--brand)] text-white" : "hover:bg-[color:var(--panel-2)]"}`}
        >
          Paste JSON
        </button>
      </div>

      {/* 1) VC input */}
      {!pasteMode ? (
        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-2">1) VC JSON yükle</label>
          <div
            onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
            onDragLeave={()=>setDrag(false)}
            onDrop={onDrop}
            className={cx(
              "rounded-xl border-2 border-dashed p-4 transition",
              drag ? "border-[color:var(--brand-2)] bg-[color:var(--panel-2)]"
                   : "border-[color:var(--border)] bg-[color:var(--panel-2)]/70"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{vcShort}</div>
                <div className="text-xs text-[color:var(--muted)]">
                  {vcObj ? "JSON yüklendi" : "Sürükle & bırak veya dosya seç"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {vcObj && (
                  <button
                    onClick={clearVC}
                    className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"
                  >
                    Clear
                  </button>
                )}
                <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] cursor-pointer">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>
                  <span className="text-sm">Dosya seç</span>
                  <input ref={fileRef} type="file" accept=".json,application/json" onChange={onInputFile} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {vcObj && (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-[11px] text-[color:var(--muted)]">
                {subjectId && <>Subject: <code className="font-mono">{subjectId}</code> <CopyBtn value={subjectId} label="Copy Subject" small /></>}
                {issuer && <>Issuer: <code className="font-mono">{issuer}</code> <CopyBtn value={issuer} label="Copy Issuer" small /></>}
              </div>
              <button type="button" onClick={() => setShowPreview(v => !v)} className="mt-2 text-xs underline">
                {showPreview ? "Önizlemeyi gizle" : "Önizlemeyi göster"}
              </button>
              {showPreview && (
                <pre className="mt-2 text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-xl p-3 max-h-56 overflow-auto whitespace-pre-wrap">
{vcText}
                </pre>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-2">1) VC JSON yapıştır</label>
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] p-3">
            <textarea
              rows={8}
              value={rawJson}
              onChange={(e)=>setRawJson(e.target.value)}
              placeholder='Paste VC JSON here…'
              className="w-full bg-transparent outline-none resize-y font-mono text-xs"
              spellCheck={false}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-[color:var(--muted)]">Geçerli JSON gerekli.</span>
              {rawJson && (
                <button onClick={()=>{ setRawJson(""); setResult(null); }} className="h-8 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2) Challenge */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-[color:var(--muted)]">2) Challenge al</div>
        <button
          onClick={onChallenge}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] disabled:opacity-50"
        >
          {busy ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 1-9 9" /></svg>
              New Challenge
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1"/></svg>
              New Challenge
            </>
          )}
        </button>

        {challenge && (
          <div className="ml-0 w-full sm:w-auto sm:ml-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] px-3 py-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="opacity-70">nonce:</span>
              <span className="truncate">{nonceVal}</span>
              <CopyBtn value={nonceVal} small />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="opacity-70">expires_at:</span>
              <span>{challenge.expires_at}</span>
              {left !== null && <span className="opacity-70">({left}s)</span>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button onClick={clearChallenge} className="h-7 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]">
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3) Verify */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-[color:var(--muted)]">3) Doğrula</div>
        <button
          onClick={onVerify}
          disabled={busy || !canVerify}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 1-9 9" /></svg>
              Verify
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5"/></svg>
              Verify
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={cx(
          "rounded-xl border p-3 text-sm",
          result.valid && !result.revoked
            ? "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
            : "border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300"
        )}>
          <div className="flex flex-wrap items-center gap-2">
            <Pill ok={result.valid && !result.revoked} text={result.valid ? "Valid" : "Invalid"} />
            {result.revoked ? <Pill ok={false} text="Revoked" /> : null}
            {typeof result.reason === "string" && result.reason && (
              <span className="text-sm">reason: {result.reason}</span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-[color:var(--muted)] flex flex-wrap items-center gap-2">
            {subjectId && <>Subject: <code className="font-mono">{subjectId}</code></>}
            {issuer && <>· Issuer: <code className="font-mono">{issuer}</code></>}
          </div>
          <pre className="mt-2 text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-xl p-3 overflow-auto max-h-64">
{JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Messages */}
      <Msg msg={msg} />
    </section>
  );
}
