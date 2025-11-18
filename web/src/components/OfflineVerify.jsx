// src/pages/verify/OfflineVerify.jsx
import { useMemo, useState, useCallback, useRef } from "react";
import { t } from "../lib/i18n";
import nacl from "tweetnacl";
import { b64uToBytes } from "../lib/crypto";

const enc = new TextEncoder();

/* ---------------- UI Components ---------------- */

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

// Modern Buton
function Button({ children, onClick, variant = "secondary", className = "", disabled = false, title }) {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const variants = {
    primary: "bg-[color:var(--brand)] text-white shadow-md hover:bg-[color:var(--brand)]/90 hover:shadow-lg ring-offset-2 focus:ring-2 ring-[color:var(--brand)]",
    secondary: "bg-[color:var(--panel-2)] border border-[color:var(--border)] text-[color:var(--fg)] hover:bg-[color:var(--panel)] hover:border-[color:var(--brand-2)]",
    outline: "border-2 border-[color:var(--border)] hover:border-[color:var(--brand)] text-[color:var(--muted)] hover:text-[color:var(--brand)] bg-transparent",
    ghost: "bg-transparent text-[color:var(--muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--panel-2)]",
    danger: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100",
  };

  return (
    <button onClick={onClick} disabled={disabled} className={cx(base, variants[variant], className)} title={title}>
      {children}
    </button>
  );
}

// Durum Rozeti
function StatusBadge({ ok, text }) {
  const cls = ok
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
    : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls} transition-colors`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
      {text}
    </span>
  );
}

// Akıllı Bölüm Kartı
function SectionCard({ title, children, stepNumber, isActive, isCompleted, onToggle }) {
  return (
    <div className={`group border rounded-2xl transition-all duration-300 overflow-hidden ${isActive ? "border-[color:var(--brand)]/40 shadow-md bg-[color:var(--panel)] ring-1 ring-[color:var(--brand)]/10" : "border-[color:var(--border)] bg-[color:var(--panel)]/60 opacity-90"}`}>
      <div onClick={onToggle} className="w-full flex items-center justify-between p-4 cursor-pointer select-none">
        <div className="flex items-center gap-4">
           <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${isActive ? "bg-[color:var(--brand)] text-white" : isCompleted ? "bg-emerald-500 text-white" : "bg-[color:var(--panel-2)] text-[color:var(--muted)]"}`}>
              {isCompleted ? <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg> : stepNumber}
           </div>
           <div><h3 className={`font-semibold text-base ${isActive ? "text-[color:var(--fg)]" : "text-[color:var(--muted)]"}`}>{title}</h3></div>
        </div>
        <svg className={`w-5 h-5 text-[color:var(--muted)] transition-transform duration-300 ${isActive ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6" /></svg>
      </div>
      <div className={`transition-all duration-500 ease-in-out ${isActive ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"}`}>
         <div className="p-5 pt-0"><div className="border-t border-dashed border-[color:var(--border)] mb-5"></div>{children}</div>
      </div>
    </div>
  );
}

function Alert({ type, message }) {
  if (!message) return null;
  const styles = type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-blue-50 text-blue-800 border-blue-200";
  return <div className={`rounded-lg px-4 py-3 border text-sm flex items-start gap-3 animate-in fade-in ${styles}`}>{message}</div>;
}

/* ---------------- Helpers ---------------- */

function toB64u(obj) {
  const bytes = enc.encode(JSON.stringify(obj));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/* ---------------- Main Component ---------------- */
export default function OfflineVerify() {
  const [vcText, setVcText] = useState("");
  const [vcObj, setVcObj] = useState(null);
  const [presentationObj, setPresentationObj] = useState(null);
  const [isPresentation, setIsPresentation] = useState(false);

  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [msg, setMsg] = useState(null);
  const [drag, setDrag] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef(null);

  const jti = vcObj?.jti;
  const vm  = vcObj?.proof?.verificationMethod;
  const pkB64uComputed = useMemo(() => {
    const proof = vcObj?.proof || {};
    let pk = proof.issuer_pk_b64u;
    if (!pk && proof.verificationMethod) {
      const match = proof.verificationMethod.match(/^did:key:z([A-Za-z0-9_-]+)#key-1$/);
      if (match) pk = match[1];
    }
    return pk;
  }, [vcObj]);
  const sigB64u = vcObj?.proof?.jws;

  const vcShort = useMemo(() => {
    if (!vcObj) return "— no VC —";
    return vcObj?.id || vcObj?.jti || (Array.isArray(vcObj?.type) ? vcObj.type.join(",") : vcObj?.type) || "VC";
  }, [vcObj]);

  /* ---- Actions ---- */
  const verify = useCallback((objOptional) => {
    setMsg(null); setRes(null);
    const obj = objOptional || vcObj;
    if (!obj) { setMsg({ type: "err", text: t("first_load_or_paste") }); return; }

    try {
      const proof = obj.proof || {};
      if (proof.type !== "Ed25519Signature2020") throw new Error("Geçersiz proof type: Ed25519Signature2020 bekleniyor.");

      let pkB64u = proof.issuer_pk_b64u;
      if (!pkB64u && proof.verificationMethod) {
        // did:key:z<pk_b64u>#key-1 formatından pk çıkar
        const match = proof.verificationMethod.match(/^did:key:z([A-Za-z0-9_-]+)#key-1$/);
        if (match) {
          pkB64u = match[1];
        } else {
          throw new Error("Geçersiz verificationMethod formatı.");
        }
      }
      if (!proof.jws || !pkB64u) throw new Error("Proof (jws/pk) eksik.");

      const header = { alg: "EdDSA", typ: "JWT" };
      const payload = { ...obj }; delete payload.proof;

      const data = `${toB64u(header)}.${toB64u(payload)}`;
      const sig = b64uToBytes(proof.jws);
      const pk  = b64uToBytes(pkB64u);

      const ok = nacl.sign.detached.verify(enc.encode(data), sig, pk);
      if (!ok) throw new Error("bad_sig");

      setRes({ valid: true, jti: obj.jti });
      setMsg({ type: "ok", text: "İmza matematiksel olarak geçerli." });
    } catch (e) {
      const reason = e?.message === "bad_sig" ? "İmza geçersiz (Signature Invalid)." : (e?.message || "Doğrulama hatası");
      setRes({ valid: false, reason });
      setMsg({ type: "err", text: reason });
    }
  }, [vcObj]);

  const handleFile = async (file) => {
    setRes(null); setMsg(null);
    if (!file) return;
    try {
      const txt = await file.text();
      const obj = JSON.parse(txt);
      const isPres = obj.type === "presentation";
      setVcText(txt);
      if (isPres) {
        setPresentationObj(obj);
        setVcObj(obj.vc); // VC'yi ayır
        setIsPresentation(true);
      } else {
        setVcObj(obj);
        setPresentationObj(null);
        setIsPresentation(false);
      }
      setShowPreview(false);
      setMsg({ type: "ok", text: isPres ? "Presentation yüklendi." : "VC yüklendi." });
      verify(isPres ? obj.vc : obj); // Otomatik doğrula
    } catch {
      setVcText(""); setVcObj(null); setPresentationObj(null); setIsPresentation(false);
      setMsg({ type: "err", text: "Geçersiz JSON dosyası." });
    }
  };
  const onInputFile = (e) => handleFile(e.target.files?.[0] || null);
  const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDrag(false); handleFile(e.dataTransfer?.files?.[0] || null); };
  
  const clearFile = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setVcText(""); setVcObj(null); setPresentationObj(null); setIsPresentation(false); setRes(null); setMsg(null);
  };

  const checkStatus = async () => {
    if (!jti) return setMsg({ type: "info", text: "jti bulunamadı." });
    try {
      setBusy(true); setMsg(null);
      const r = await fetch(`/api/status/${encodeURIComponent(jti)}`);
      const raw = await r.text();
      if (!r.ok) return setMsg({ type: "info", text: raw || "Sunucu yanıt vermedi" });
      setMsg({ type: "ok", text: "Sunucu Durumu: " + raw });
    } catch { setMsg({ type: "info", text: "Bağlantı hatası." }); } finally { setBusy(false); }
  };

  const short = (s, n=10) => (s ? (s.length>2*n ? `${s.slice(0,n)}…${s.slice(-n)}` : s) : "");
  const proofInfo = useMemo(() => {
    if (!vcObj?.proof) return null;
    const p = vcObj.proof;
    return {
      type: p.type || "-", created: p.created || "-",
      verificationMethod: p.verificationMethod || "-",
      pkShort: short(p.issuer_pk_b64u, 12), sigShort: short(p.jws, 12),
      sigLen: p.jws ? (b64uToBytes(p.jws).length) : 0
    };
  }, [vcObj]);

  return (
    <section className="max-w-3xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8 text-center md:text-left md:flex md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--fg)]">{t("offline.title")}</h2>
          <p className="text-sm text-[color:var(--muted)] mt-2 max-w-lg leading-relaxed">{t("offline.desc")}</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
           <StatusBadge ok={!!vcObj && res?.valid !== false} text={vcObj ? (res?.valid === false ? t("offline.invalid") : t("offline.ready")) : t("offline.no_vc")} />
        </div>
      </div>

      <div className="mb-4 sticky top-4 z-50"><Msg msg={msg} /></div>

      <SectionCard 
         stepNumber={1} 
         title="VC Yükle ve Doğrula" 
         isActive={true} 
         isCompleted={res?.valid} 
         onToggle={()=>{}}
      >
         <div className="space-y-4">
            {/* Dropzone */}
            <div
              onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
              onDragLeave={()=>setDrag(false)}
              onDrop={onDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer group
                ${drag ? "border-[color:var(--brand)] bg-[color:var(--brand)]/5 scale-[1.01]" : "border-[color:var(--border)] hover:border-[color:var(--brand-2)]"}
                ${vcObj ? "bg-emerald-50/30 border-emerald-200" : ""}
              `}
            >
               <input ref={fileInputRef} type="file" accept=".wpvc,application/json" onChange={onInputFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
               
               {vcObj ? (
                  <div className="flex flex-col items-center animate-in zoom-in-95">
                     <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                     <h3 className="font-medium text-sm text-emerald-800">{t("offline.json_loaded")}</h3>
                     <p className="text-xs text-[color:var(--muted)] mt-0.5 max-w-md truncate">{vcShort}</p>
                     <div className="flex gap-2 mt-3 z-20 relative">
                        <Button variant="danger" onClick={(e) => { e.stopPropagation(); clearFile(); }} className="h-7 px-3 text-xs py-0">Temizle</Button>
                        <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setShowPreview(!showPreview); }} className="h-7 px-3 text-xs py-0">{showPreview ? "Gizle" : "İncele"}</Button>
                     </div>
                  </div>
               ) : (
                  <div className="flex flex-col items-center">
                     <svg className="w-8 h-8 text-[color:var(--muted)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                     <p className="text-sm font-medium text-[color:var(--fg)]">{t("offline.hint_drag")}</p>
                     <p className="text-xs text-[color:var(--muted)] mt-1">.json, .wpvc</p>
                  </div>
               )}
            </div>
            
            {/* Preview */}
            {showPreview && vcText && (
               <pre className="text-[10px] bg-[color:var(--code-bg)] p-3 rounded-lg border overflow-auto max-h-56">{vcText}</pre>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
               <Button onClick={()=>verify()} disabled={!vcObj || busy} variant="primary">
                  {busy ? t("verifying") : t("offline.verify_signature")}
               </Button>
               <Button onClick={checkStatus} disabled={!jti || busy} variant="secondary">
                  {t("offline.check_status")}
               </Button>
               {jti && <span className="text-xs font-mono px-2 py-1 rounded bg-[color:var(--panel-2)] border ml-auto">jti: {jti.slice(0,15)}...</span>}
            </div>

            {/* Result Card (Gradient Style) */}
            {res && (
               <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                  <div className={`rounded-xl border shadow-lg overflow-hidden mt-4 ${res.valid ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200" : "bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200"}`}>
                     <div className={`p-5 flex flex-col md:flex-row md:items-center gap-4 ${res.valid ? "text-emerald-900" : "text-rose-900"}`}>
                        <div className={`w-12 h-12 rounded-full flex shrink-0 items-center justify-center text-2xl ${res.valid ? "bg-emerald-200/50 text-emerald-600" : "bg-rose-200/50 text-rose-600"}`}>
                           {res.valid ? "✓" : "✕"}
                        </div>
                        <div className="flex-1">
                           <h3 className="font-bold text-lg">{res.valid ? t("offline.signature_valid") : t("offline.signature_invalid")}</h3>
                           {!res.valid && res.reason && <p className="text-sm opacity-80">{res.reason}</p>}
                           {proofInfo && (
                             <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs opacity-70 font-mono">
                               <div>Alg: {proofInfo.type}</div>
                               <div>PK: {proofInfo.pkShort}</div>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            )}
         </div>
      </SectionCard>
    </section>
  );
}

function Msg({ msg }) {
  if (!msg) return null;
  const styles = msg.type === "ok" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : msg.type === "err" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-blue-50 text-blue-800 border-blue-200";
  return <div className={`rounded-lg px-4 py-3 border text-sm flex items-start gap-3 animate-in fade-in shadow-sm ${styles}`}>{msg.text}</div>;
}