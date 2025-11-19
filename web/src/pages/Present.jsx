// web/src/pages/Present.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import QRCode from "qrcode";
import { useIdentity } from "../lib/identityContext";
import { b64u, b64uToBytes } from "../lib/crypto";
import { getVCs, migrateVCsIfNeeded } from "../lib/storage";
import nacl from "tweetnacl";
import { t } from "../lib/i18n";

const enc = new TextEncoder();

/* ---------------- UI Components ---------------- */

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function Button({ children, onClick, variant = "secondary", className = "", disabled = false, title, type="button" }) {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const variants = {
    primary: "bg-[color:var(--brand)] text-white shadow-md hover:bg-[color:var(--brand)]/90 hover:shadow-lg ring-offset-2 focus:ring-2 ring-[color:var(--brand)]",
    secondary: "bg-[color:var(--panel-2)] border border-[color:var(--border)] text-[color:var(--fg)] hover:bg-[color:var(--panel)] hover:border-[color:var(--brand-2)]",
    outline: "border-2 border-[color:var(--border)] hover:border-[color:var(--brand)] text-[color:var(--muted)] hover:text-[color:var(--brand)] bg-transparent",
    ghost: "bg-transparent text-[color:var(--muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--panel-2)]",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cx(base, variants[variant], className)} title={title}>
      {children}
    </button>
  );
}

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

function safeJson(str) { try { return JSON.parse(str); } catch { return null; } }



/* ---------------- Main Component ---------------- */
export default function Present() {
  const { identity } = useIdentity();

  const [vcs, setVcs] = useState([]);
  const [vcIdx, setVcIdx] = useState(-1);
  const [selectedFields, setSelectedFields] = useState([]);
  
  const [out, setOut] = useState("");
  const [msg, setMsg] = useState(null);
  const [publishedPath, setPublishedPath] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [request, setRequest] = useState(null);

  const reqVideoRef = useRef(null);
  const reqCanvasRef = useRef(null);
  const reqScanIntervalRef = useRef(null);
  const reqDetectorRef = useRef(null);
  const reqStreamRef = useRef(null);
  const reqNdefRef = useRef(null);
  const [reqQrScanning, setReqQrScanning] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const refreshVCs = useCallback(async () => {
    try {
      const list = await getVCs();                       // Promise çözüldü
      setVcs(Array.isArray(list) ? list : []);           // array değilse boş yap
    } catch {
      setVcs([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await migrateVCsIfNeeded();
      await refreshVCs();              // migration biter bitmez VCleri yenile
    })();
  }, [refreshVCs]);
  useEffect(() => {
     if(out) setActiveStep(3); 
     else if(selectedFields.length > 0 && vcIdx !== -1) setActiveStep(3); 
     else if(vcIdx !== -1) setActiveStep(2); 
     else if(request) setActiveStep(1); 
  }, [out, selectedFields.length, vcIdx, request]);

  useEffect(() => {
    const onStorage = (e) => { if (!e || e.key === "worldpass_vcs" || e.key === "wp.vcs") refreshVCs(); };
    const onLocal = () => refreshVCs();
    window.addEventListener("storage", onStorage); window.addEventListener("vcs:changed", onLocal);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("vcs:changed", onLocal); };
  }, [refreshVCs]);

  useEffect(() => { return () => { stopRequestQrScan(); stopRequestNfcScan(); }; }, []);

  const currentVC = useMemo(() => (vcIdx < 0 || vcIdx >= vcs.length) ? null : vcs[vcIdx], [vcs, vcIdx]);
  const availableFields = useMemo(() => {
    if (!currentVC || !currentVC.credentialSubject) return [];
    return Object.keys(currentVC.credentialSubject);
  }, [currentVC]);

  useEffect(() => { if (vcs.length === 0) { setVcIdx(-1); return; } }, [vcs]);
  useEffect(() => { setSelectedFields([]); setOut(""); setPublishedPath(null); setQrImage(null); }, [vcIdx]);
  useEffect(() => {
    if (!request || !currentVC) return;
    if (!Array.isArray(request.fields) || request.fields.length === 0) return;
    if (selectedFields.length > 0) return; 
    const src = currentVC.credentialSubject || {};
    const auto = request.fields.filter((f) => Object.prototype.hasOwnProperty.call(src, f));
    if (auto.length) setSelectedFields(auto);
  }, [request, currentVC, selectedFields.length]);

  const filteredSubject = useMemo(() => {
    if (!currentVC || !currentVC.credentialSubject || !selectedFields.length) return null;
    const result = {}; selectedFields.forEach((f) => { result[f] = currentVC.credentialSubject[f]; });
    return result;
  }, [currentVC, selectedFields]);

  const hasId = !!identity?.sk_b64u && !!identity?.did;
  const canBuild = !!(hasId && currentVC && filteredSubject);

  const presentationPayload = useMemo(() => {
    if (!canBuild) return null;
    const vcId = currentVC.jti || currentVC.id || null;
    const createdAt = Math.floor(Date.now() / 1000);
    const challenge = request?.challenge || null;
    const msgObj = { vc_id: vcId, claims: filteredSubject, created_at: createdAt, holder_did: identity.did, challenge, aud: request?.aud, exp: request?.exp };
    return {
      type: "presentation", created_at: createdAt, challenge, aud: request?.aud, exp: request?.exp,
      holder: { did: identity.did, pk_b64u: identity.pk_b64u, alg: "Ed25519" },
      vc: currentVC, vc_ref: { id: vcId, type: currentVC.type || null, issuer: currentVC.issuer || null },
      claims: filteredSubject, request: request ? { label: request.label, fields: request.fields, vc: request.vc } : undefined,
      _sig_msg: msgObj,
    };
  }, [canBuild, currentVC, filteredSubject, identity, request]);

  const handleRequestObject = (obj) => {
    if (!obj || obj.type !== "present" || !obj.challenge) { setMsg({ type: "err", text: t("invalid_request_format") }); return; }
    setRequest(obj); setMsg({ type: "ok", text: `"${obj.label || t("unnamed")}" isteği alındı.` }); stopRequestQrScan();
  };

  const handleRequestScanned = async (raw) => {
    if (!raw) return;
    try {
      if (/^https?:\/\//.test(raw)) {
        const r = await fetch(raw); const obj = safeJson(await r.text());
        if (obj) { handleRequestObject(obj); return; }
      }
      const obj = safeJson(raw); if (obj) { handleRequestObject(obj); return; }
      setMsg({ type: "err", text: t("request_not_resolved") });
    } catch (e) { setMsg({ type: "err", text: t("read_error") + e.message }); }
  };

  const stopRequestQrScan = async () => {
     try { if (reqScanIntervalRef.current) clearInterval(reqScanIntervalRef.current); if (reqStreamRef.current) reqStreamRef.current.getTracks().forEach(t => t.stop()); if (reqVideoRef.current) reqVideoRef.current.srcObject = null; } catch {}
     setReqQrScanning(false);
  };
  const startRequestQrScan = async () => {
    setMsg(null);
    if (!("BarcodeDetector" in window)) return setMsg({ type: "info", text: t("camera_not_supported") });
    try {
      reqDetectorRef.current = new BarcodeDetector({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      reqStreamRef.current = stream;
      if (reqVideoRef.current) { reqVideoRef.current.srcObject = stream; await reqVideoRef.current.play(); }
      reqScanIntervalRef.current = setInterval(async () => {
        try {
           if (!reqVideoRef.current || reqVideoRef.current.readyState < 2) return;
           const canvas = reqCanvasRef.current || document.createElement("canvas");
           canvas.width = reqVideoRef.current.videoWidth; canvas.height = reqVideoRef.current.videoHeight;
           const ctx = canvas.getContext("2d"); ctx.drawImage(reqVideoRef.current, 0, 0, canvas.width, canvas.height);
           const codes = await reqDetectorRef.current.detect(await createImageBitmap(canvas));
           if (codes?.length) handleRequestScanned(codes[0].rawValue);
        } catch {}
      }, 500);
      setReqQrScanning(true);
    } catch (e) { setMsg({ type: "err", text: e.message }); }
  };

  const startRequestNfcScan = async () => {
     setMsg(null);
     if (!("NDEFReader" in window)) return setMsg({type: "info", text: t("nfc_not_supported")});
     try {
        const reader = new NDEFReader(); reqNdefRef.current = reader; await reader.scan();
        reader.onreading = (ev) => {
           const decoder = new TextDecoder();
           for(const record of ev.message.records) {
              if(record.recordType === "text" || record.recordType === "url") { handleRequestScanned(decoder.decode(record.data)); break; }
           }
        };
        setMsg({type: "ok", text: t("nfc_listening")});
     } catch(e) { setMsg({type:"err", text: e.message}); }
  };
  const stopRequestNfcScan = async () => { try { reqNdefRef.current = null; } catch{} };

  const buildPayload = () => {
    setMsg(null); setOut(""); setPublishedPath(null); setQrImage(null);
    if (!presentationPayload) return setMsg({ type: "err", text: t("error_missing_data") });
    try {
      const msgBytes = enc.encode(JSON.stringify(presentationPayload._sig_msg));
      const sk = b64uToBytes(identity.sk_b64u);
      const sig = nacl.sign.detached(msgBytes, sk);
      const payloadToSend = { ...presentationPayload, holder: { ...presentationPayload.holder, sig_b64u: b64u(sig) } };
      delete payloadToSend._sig_msg;
      setOut(JSON.stringify(payloadToSend, null, 2));
      setMsg({ type: "ok", text: t("presentation_signed_created") });
    } catch (e) { setMsg({ type: "err", text: t("signature_error") + e.message }); }
  };

  const download = () => {
    if (!out) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([out], { type: "application/json" }));
    a.download = "presentation.wpvp"; a.click();
  };

  const publishToServer = async () => {
    if (!out) return;
    try {
      setMsg(null);
      const r = await fetch("/api/present/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: out });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      setPublishedPath(d.path);
      const full = window.location.origin.replace(/\/$/, "") + "/" + String(d.path).replace(/^\//, "");
      setQrImage(await QRCode.toDataURL(full, { width: 256, margin: 1 }));
      setMsg({ type: "ok", text: t("uploaded_to_server") });
    } catch (e) { setMsg({ type: "err", text: t("upload_error") + e.message }); }
  };

  const writeNfc = async (writeType = "url") => {
     if (!publishedPath) return;
     const full = window.location.origin.replace(/\/$/, "") + "/" + String(publishedPath).replace(/^\//, "");
     try {
        setMsg({ type: "info", text: t("nfc_writing") });
        const writer = new NDEFWriter();
        const records = [];

        if (writeType === "url" || writeType === "both") {
           records.push({ recordType: "url", data: full });
        }
        if (writeType === "json" || writeType === "both") {
           records.push({ recordType: "text", data: JSON.stringify(out) });
        }

        await writer.write({ records });
        setMsg({ type: "ok", text: t("nfc_write_success") });
     } catch (e) {
        setMsg({ type: "err", text: t("nfc_write_error") + ": " + e.message });
     }
  };

  const toggleField = (f) => {
    setOut(""); setPublishedPath(null); setQrImage(null); setMsg(null);
    setSelectedFields((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  };

  return (
    <section className="max-w-3xl mx-auto pb-20">
       <div className="mb-8 text-center md:text-left md:flex md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--fg)]">{t("present_title")}</h2>
          <p className="text-sm text-[color:var(--muted)] mt-2 max-w-lg leading-relaxed">
            {t("present_description")}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
           {identity ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">{t("identity_active")}</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{t("identity_missing")}</span>}
        </div>
      </div>

      <div className="mb-4 sticky top-4 z-50"><Msg msg={msg} /></div>

      <div className="space-y-4">
        
        {/* --- STEP 1: Scan Request --- */}
        <SectionCard stepNumber={1} title={t("scan_request_optional")} isActive={activeStep === 0} isCompleted={!!request} onToggle={() => setActiveStep(activeStep === 0 ? -1 : 0)}>
           {!request ? (
             <div className="flex flex-col items-center py-4">
               <div className="flex flex-wrap justify-center gap-3 w-full">
                 <Button onClick={() => reqQrScanning ? stopRequestQrScan() : startRequestQrScan()} variant={reqQrScanning ? "primary" : "outline"} className="w-full sm:w-auto min-w-[140px]">
                    {reqQrScanning ? t("stop_scanning") : t("scan_with_camera")}
                 </Button>
                 <Button onClick={startRequestNfcScan} variant="outline" className="w-full sm:w-auto min-w-[140px]">{t("scan_with_nfc")}</Button>
               </div>
               <video ref={reqVideoRef} className={`mt-4 rounded-xl border border-[color:var(--border)] ${reqQrScanning ? "block w-64" : "hidden"}`} playsInline muted />
               <canvas ref={reqCanvasRef} className="hidden" />
             </div>
           ) : (
             <div className="bg-[color:var(--panel-2)] rounded-xl p-4 border border-[color:var(--border)] flex items-start justify-between">
                <div>
                   <h4 className="font-bold text-sm text-[color:var(--fg)]">{t("request_received")}</h4>
                   <p className="text-sm text-[color:var(--brand)] font-medium mt-1">{request.label || t("unnamed_request")}</p>
                </div>
                <Button variant="ghost" onClick={() => { setRequest(null); setSelectedFields([]); }} className="h-8 w-8 p-0 rounded-full">✕</Button>
             </div>
           )}
        </SectionCard>

        {/* --- STEP 2: Select VC --- */}
        <SectionCard stepNumber={2} title={t("select_identity")} isActive={activeStep === 1} isCompleted={vcIdx !== -1} onToggle={() => setActiveStep(activeStep === 1 ? -1 : 1)}>
           {vcs.length === 0 ? (
             <div className="text-center py-8 text-[color:var(--muted)]">{t("no_credentials_found")}</div>
           ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {vcs.map((v, i) => {
                 const isSelected = vcIdx === i;
                 const typeLabel = Array.isArray(v?.type) ? v.type[v.type.length - 1] : (v?.type || "Credential");
                 const issuerLabel = typeof v.issuer === 'string' ? v.issuer : (v.issuer?.name || v.issuer?.id || "Unknown Issuer");
                 return (
                   <div key={i} onClick={() => { setVcIdx(i); setTimeout(() => setActiveStep(2), 300); }} className={`cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 relative ${isSelected ? "border-[color:var(--brand)] bg-[color:var(--brand)]/5 ring-1 ring-[color:var(--brand)]" : "border-[color:var(--border)] bg-[color:var(--panel-2)] hover:border-[color:var(--brand-2)]"}`}>
                     <div className="flex items-center justify-between mb-2">
                       <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${isSelected ? "bg-[color:var(--brand)] text-white" : "bg-[color:var(--border)] text-[color:var(--muted)]"}`}>{typeLabel}</span>
                       {isSelected && <svg className="w-5 h-5 text-[color:var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>}
                     </div>
                     <div className="text-xs text-[color:var(--muted)] truncate"><span className="opacity-70">{t("issuer_label")}</span> {issuerLabel}</div>
                   </div>
                 )
               })}
             </div>
           )}
        </SectionCard>

        {/* --- STEP 3: Select Fields --- */}
        <SectionCard stepNumber={3} title={t("shareable_info")} isActive={activeStep === 2} isCompleted={selectedFields.length > 0 && activeStep > 2} onToggle={() => setActiveStep(activeStep === 2 ? -1 : 2)}>
          {!currentVC ? (<p className="text-sm text-[color:var(--muted)] text-center py-2">{t("select_identity_first")}</p>) : (
            <div className="space-y-4">
               <div className="flex flex-wrap gap-2">
                  {availableFields.map(f => (
                    <button key={f} onClick={() => toggleField(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 flex items-center gap-2 ${selectedFields.includes(f) ? "bg-[color:var(--fg)] text-[color:var(--bg)] border-[color:var(--fg)] shadow-sm" : "bg-transparent text-[color:var(--muted)] border-[color:var(--border)] hover:border-[color:var(--muted)]"}`}>
                         {selectedFields.includes(f) ? <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg> : <div className="w-3.5 h-3.5 rounded-full border border-current opacity-40" />}
                         {f}
                    </button>
                  ))}
               </div>
               {filteredSubject && <div className="bg-[color:var(--panel-2)] rounded-xl p-3 border border-[color:var(--border)]"><pre className="text-[10px] font-mono text-[color:var(--muted)] overflow-auto max-h-32">{JSON.stringify(filteredSubject, null, 2)}</pre></div>}
               <div className="pt-4 flex justify-end">
                  <Button onClick={buildPayload} disabled={!canBuild} variant="primary" className="w-full sm:w-auto shadow-xl shadow-[color:var(--brand)]/20">{t("sign_and_create")}</Button>
               </div>
            </div>
          )}
        </SectionCard>

        {/* --- STEP 4: Result --- */}
        {out && (
           <div className="animate-in slide-in-from-bottom-6 fade-in duration-500">
              <div className="rounded-2xl bg-gradient-to-br from-[color:var(--panel)] to-[color:var(--panel-2)] border border-[color:var(--brand)]/30 shadow-xl overflow-hidden">
                 <div className="bg-[color:var(--brand)]/10 p-4 border-b border-[color:var(--brand)]/10 flex items-center gap-3">
                    <div className="bg-emerald-500 text-white rounded-full p-1.5"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg></div>
                    <div><h3 className="font-bold text-[color:var(--fg)]">{t("presentation_ready")}</h3></div>
                 </div>
                 <div className="p-6 space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                       <Button onClick={download} variant="secondary" className="h-auto py-4 flex-col gap-2"><span>{t("download_file")}</span></Button>
                       <Button onClick={publishToServer} disabled={!!qrImage} variant="primary" className="h-auto py-4 flex-col gap-2"><span>{t("generate_qr")}</span></Button>
                    </div>
                    {qrImage && (
                       <div className="bg-white rounded-xl p-6 border shadow-inner flex flex-col items-center animate-in zoom-in-95">
                          <img src={qrImage} alt="QR" className="w-48 h-48" />
                          <div className="mt-4 flex gap-3">
                             <Button onClick={writeNfc} variant="outline" className="text-xs h-8 px-3 text-slate-600">{t("write_to_nfc")}</Button>
                             <Button onClick={() => { navigator.clipboard.writeText(out); setMsg({type:'ok', text:t("json_copied")}); }} variant="ghost" className="text-xs h-8 px-3 text-slate-500">JSON Kopyala</Button>
                          </div>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        )}

      </div>
    </section>
  );
}

function Msg({ msg }) {
  if (!msg) return null;
  return <Alert type={msg.type === "ok" ? "success" : msg.type === "err" ? "error" : "info"} message={msg.text} />;
}