// src/pages/verify/OfflineVerify.jsx
import { useMemo, useState, useCallback, useRef } from "react";
import nacl from "tweetnacl";
import { b64uToBytes } from "../lib/crypto";

const enc = new TextEncoder();

/* ---- Base64url (header/payload) — issuer tarafıyla birebir uyumlu olmalı ---- */
function toB64u(obj) {
  const bytes = enc.encode(JSON.stringify(obj));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/* ---- Küçük rozet ---- */
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

export default function OfflineVerify() {
  const [vcText, setVcText] = useState("");
  const [vcObj, setVcObj] = useState(null);

  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);   // { valid: boolean, jti?: string, reason?:string }
  const [msg, setMsg] = useState(null);   // { type:'ok'|'err'|'info', text }
  const [drag, setDrag] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [rawJson, setRawJson] = useState("");

  const fileInputRef = useRef(null);

  const jti = vcObj?.jti;
  const vm  = vcObj?.proof?.verificationMethod;
  const pkB64u = vcObj?.proof?.issuer_pk_b64u;
  const sigB64u = vcObj?.proof?.jws;

  const vcShort = useMemo(() => {
    if (!vcObj) return "— no VC —";
    return vcObj?.id || vcObj?.jti || (Array.isArray(vcObj?.type) ? vcObj.type.join(",") : vcObj?.type) || "VC";
  }, [vcObj]);

  /* ---- Dosya & Yapıştırma Girişi ---- */
  const handleFile = async (file) => {
    setRes(null); setMsg(null);
    if (!file) return;
    try {
      const txt = await file.text();
      const obj = JSON.parse(txt);
      setVcText(txt);
      setVcObj(obj);
      setPasteMode(false);
      setShowPreview(false);
      setMsg({ type: "ok", text: "VC yüklendi." });
      // dosya yüklenince otomatik doğrulama (istersen kapat)
      verify(obj);
    } catch {
      setVcText(""); setVcObj(null);
      setMsg({ type: "err", text: "Geçersiz JSON dosyası." });
    }
  };
  const onInputFile = (e) => handleFile(e.target.files?.[0] || null);

  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDrag(false);
    const f = e.dataTransfer?.files?.[0];
    handleFile(f || null);
  };

  const clearFile = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setVcText(""); setVcObj(null); setRes(null); setMsg(null);
  };

  const parseFromInputs = () => {
    if (pasteMode) {
      if (!rawJson.trim()) throw new Error("Boş JSON.");
      try {
        const obj = JSON.parse(rawJson);
        setVcText(rawJson);
        setVcObj(obj);
        return obj;
      } catch {
        throw new Error("Geçersiz JSON formatı.");
      }
    } else {
      if (!vcObj) throw new Error("Önce VC yükle veya JSON yapıştır.");
      return vcObj;
    }
  };

  /* ---- İmza Doğrulama ---- */
  const verify = useCallback((objOptional) => {
    setMsg(null);
    setRes(null);
    const obj = objOptional || parseFromInputs();

    try {
      const proof = obj.proof || {};
      if (!proof.jws || !proof.issuer_pk_b64u) {
        throw new Error("VC 'proof.jws' veya 'proof.issuer_pk_b64u' eksik.");
      }

      const header = { alg: "EdDSA", typ: "JWT" };
      const payload = { ...obj }; delete payload.proof;

      const data = `${toB64u(header)}.${toB64u(payload)}`;
      const sig = b64uToBytes(proof.jws);
      const pk  = b64uToBytes(proof.issuer_pk_b64u);

      const ok = nacl.sign.detached.verify(enc.encode(data), sig, pk);
      if (!ok) throw new Error("bad_sig");

      setRes({ valid: true, jti: obj.jti });
      setMsg({ type: "ok", text: "Signature valid." });
    } catch (e) {
      const reason =
        e?.message === "bad_sig" ? "Signature invalid." :
        (e?.message?.includes("JSON") ? "JSON parse error." : (e?.message || "Malformed VC"));
      setRes({ valid: false, reason });
      setMsg({ type: "err", text: reason });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasteMode, rawJson, vcObj]);

  /* ---- Online Status (opsiyonel) ---- */
  const checkStatus = async () => {
    if (!jti) return setMsg({ type: "info", text: "Bu VC için jti yok." });
    try {
      setBusy(true); setMsg(null);
      const r = await fetch(`/api/status/${encodeURIComponent(jti)}`);
      const raw = await r.text();
      if (!r.ok) return setMsg({ type: "info", text: raw || "status endpoint not available" });
      setMsg({ type: "ok", text: "status: " + raw });
    } catch {
      setMsg({ type: "info", text: "Status check failed." });
    } finally { setBusy(false); }
  };

  /* ---- Yardımcılar ---- */
  const short = (s, n=10) => (s ? (s.length>2*n ? `${s.slice(0,n)}…${s.slice(-n)}` : s) : "");
  const proofInfo = useMemo(() => {
    if (!vcObj?.proof) return null;
    const p = vcObj.proof;
    return {
      type: p.type || "-",
      created: p.created || "-",
      verificationMethod: p.verificationMethod || "-",
      pkShort: short(p.issuer_pk_b64u, 12),
      sigShort: short(p.jws, 12),
      sigLen: p.jws ? (b64uToBytes(p.jws).length) : 0
    };
  }, [vcObj]);

  const canVerify = pasteMode ? !!rawJson.trim() : !!vcObj;

  /* ---- UI ---- */
  return (
    <section className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)]/90 backdrop-blur p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Offline Verify (signature only)</h2>
          <p className="text-[12px] text-[color:var(--muted)] mt-0.5">
            İmza doğruluğunu yerelde kontrol eder. Şema/kimlik çözümleme yapmaz.
          </p>
        </div>
        <Pill ok={!!vcObj && res?.valid !== false} text={vcObj ? (res?.valid === false ? "Invalid" : "Ready") : "VC yok"} />
      </div>

      {/* Mode toggle */}
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

      {/* Input area */}
      {!pasteMode ? (
        <div
          onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
          onDragLeave={()=>setDrag(false)}
          onDrop={onDrop}
          className={[
            "rounded-xl border-2 border-dashed p-4 transition select-none",
            drag ? "border-[color:var(--brand-2)] bg-[color:var(--panel-2)]" : "border-[color:var(--border)] bg-[color:var(--panel-2)]/70"
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{vcShort}</div>
              <div className="text-xs text-[color:var(--muted)]">
                {vcObj ? "JSON yüklendi" : "Sürükle & bırak veya dosya seç"}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {vcObj && (
                <button onClick={clearFile} className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm">
                  Clear
                </button>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-black/10 bg-white hover:bg-white/90 cursor-pointer shrink-0">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>
                <span className="text-sm">Dosya seç</span>
                <input type="file" accept=".json,application/json" onChange={onInputFile} className="hidden" />
              </label>

            </div>
          </div>
        </div>
      ) : (
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
              <button onClick={()=>setRawJson("")} className="h-8 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs">
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={()=>verify()}
          disabled={!canVerify || busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 1-9 9"/></svg>
              Verify Signature
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5"/></svg>
              Verify Signature
            </>
          )}
        </button>

        <button
          onClick={checkStatus}
          disabled={!jti || busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          Check Status (online)
        </button>

        {jti && (
          <span className="text-xs font-mono px-2 py-1 rounded-md border border-[color:var(--border)] bg-[color:var(--panel-2)]">
            jti: {jti}
          </span>
        )}
      </div>

      {/* Result card */}
      {res && (
        <div className={`rounded-xl border p-3 text-sm ${
          res.valid
            ? "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
            : "border-rose-300/60 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300"
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="font-medium">{res.valid ? "Signature valid" : "Signature invalid"}</div>
            {vm && <code className="text-[11px] opacity-80">{vm}</code>}
          </div>
          {proofInfo && (
            <ul className="mt-2 text-xs grid sm:grid-cols-2 gap-x-6 gap-y-1">
              <li><span className="opacity-60">proof.type: </span><code>{proofInfo.type}</code></li>
              <li><span className="opacity-60">created: </span><code>{proofInfo.created}</code></li>
              <li><span className="opacity-60">pk: </span><code>{proofInfo.pkShort}</code></li>
              <li><span className="opacity-60">sig: </span><code>{proofInfo.sigShort}</code> <span className="opacity-60">({proofInfo.sigLen} bytes)</span></li>
            </ul>
          )}
          {!res.valid && res.reason && (
            <div className="mt-2 text-xs opacity-90">{res.reason}</div>
          )}
        </div>
      )}

      {/* messages */}
      {msg && (
        <div className={`text-xs rounded-lg px-3 py-2 border mt-1 ${
          msg.type==="ok"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
            : msg.type==="err"
            ? "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30"
            : "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]"
        }`}>
          {msg.text}
        </div>
      )}

      {/* preview */}
      {vcObj && (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setShowPreview(v => !v)}
            className="text-xs underline text-[color:var(--text)]/80 hover:text-[color:var(--text)]"
          >
            {showPreview ? "Önizlemeyi gizle" : "Önizlemeyi göster"}
          </button>
          {showPreview && (
            <pre className="mt-2 text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-xl p-3 max-h-56 overflow-auto whitespace-pre-wrap">
{vcText}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
