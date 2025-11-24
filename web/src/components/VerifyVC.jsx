// web/src/components/VerifyVC.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { newChallenge, verifyVC } from "../lib/api";
import { t } from "../lib/i18n";

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

// Kopyalama Butonu
function CopyBtn({ value, label = t("copy") }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value || ""));
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button onClick={handleCopy} type="button" className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[color:var(--panel-2)] text-xs text-[color:var(--muted)] hover:text-[color:var(--fg)] transition-colors">
      {copied ? <span className="text-emerald-500">Kopyalandı ✓</span> : label}
    </button>
  );
}

// Adım Göstergesi
function StepIndicator({ steps, currentStep }) {
  return (
    <div className="w-full mb-8 px-2">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-[color:var(--panel-2)] rounded-full -z-10" />
        <div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-[color:var(--brand)] rounded-full transition-all duration-500 -z-10" 
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((step, index) => {
          const isActive = index <= currentStep;
          const isCurrent = index === currentStep;
          return (
            <div key={index} className="flex flex-col items-center group bg-[color:var(--panel)] px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 ${isActive ? "bg-[color:var(--brand)] border-[color:var(--brand)] text-white shadow-lg scale-110" : "bg-[color:var(--panel)] border-[color:var(--border)] text-[color:var(--muted)]"}`}>
                {index < currentStep ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg> : <span>{index + 1}</span>}
              </div>
              <span className={`mt-2 text-[10px] uppercase tracking-wider font-semibold transition-colors duration-300 ${isCurrent ? "text-[color:var(--brand)]" : "text-[color:var(--muted)]"}`}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
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

/* ---------------- VerifyVC Component ---------------- */
export default function VerifyVC() {
  // -- State --
  const [vcText, setVcText] = useState("");
  const [vcObj, setVcObj] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef(null);
  
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Scanner
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);
  const [qrScanning, setQrScanning] = useState(false);
  const ndefRef = useRef(null);

  // Request Builder
  const [requestedFields, setRequestedFields] = useState([]);
  const [requiredVcType, setRequiredVcType] = useState(""); 
  const [requiredIssuer, setRequiredIssuer] = useState(""); 
  const [requestLabel, setRequestLabel] = useState(""); 
  const [qrJson, setQrJson] = useState("");
  const [requestQrImage, setRequestQrImage] = useState(null);

  const [activeStep, setActiveStep] = useState(0);

  // -- Helpers --
  function safeParse(str) { try { return JSON.parse(str); } catch { return null; } }
  
  const vcShort = useMemo(() => {
    if (!vcObj) return t("no_vc");
    const id = vcObj.id || vcObj.jti || (Array.isArray(vcObj.type) ? vcObj.type.join(",") : vcObj.type) || "VC";
    return typeof id === "string" ? id : JSON.stringify(id).slice(0, 50);
  }, [vcObj]);

  const subjectId = vcObj?.credentialSubject?.id || vcObj?.holder?.did || "";
  const issuer = vcObj?.issuer || vcObj?.vc_ref?.issuer || "";
  const canVerify = !!vcObj;

  // -- Effects --
  useEffect(() => {
      if(result) setActiveStep(2); 
      else if(vcObj) setActiveStep(2); 
      else if(qrJson) setActiveStep(1); 
      else setActiveStep(0); 
  }, [result, vcObj, qrJson]);

  useEffect(() => {
    return () => { stopQrScan(); stopNfcScan(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearVC() {
    setVcText(""); setVcObj(null); setResult(null); setMsg(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // -- Handlers --
  const handleFile = async (file) => {
    if (!file) return;
    setMsg(null); setResult(null);
    try {
      const txt = await file.text();
      const obj = safeParse(txt);
      if (!obj) throw new Error(t("invalid_json_file"));
      setVcText(txt); setVcObj(obj); setShowPreview(false);
      setMsg({ type: "ok", text: t("vc_loaded") });
    } catch (e) {
      setVcText(""); setVcObj(null);
      setMsg({ type: "err", text: e?.message || t("file_read_error") });
    }
  };
  const onInputFile = (e) => handleFile(e.target.files?.[0] || null);
  const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDrag(false); handleFile(e.dataTransfer?.files?.[0] || null); };

  const handleScanned = async (raw) => {
    if (!raw) return;
    try {
      if (/^https?:\/\//.test(raw)) {
        const r = await fetch(raw);
        const txt = await r.text();
        const obj = safeParse(txt);
        if (obj) { setVcText(txt); setVcObj(obj); setMsg({ type: "ok", text: t("scanned_payload_loaded") }); return; }
      }
      const obj = safeParse(raw);
      if (obj) { setVcText(JSON.stringify(obj, null, 2)); setVcObj(obj); setMsg({ type: "ok", text: t("scanned_payload_loaded") }); return; }
      setMsg({ type: "err", text: t("file_read_error") });
    } catch (e) { setMsg({ type: "err", text: t("file_read_error") }); }
  };

  const stopQrScan = async () => {
    try {
       if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
       if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
       if (videoRef.current) videoRef.current.srcObject = null;
    } catch {}
    setQrScanning(false);
  };
  const startQrScan = async () => {
    setMsg(null);
    if (!("BarcodeDetector" in window)) return setMsg({ type: "info", text: "Tarayıcı desteklemiyor" });
    try {
      detectorRef.current = new BarcodeDetector({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      scanIntervalRef.current = setInterval(async () => {
         try {
           if (!videoRef.current || videoRef.current.readyState < 2) return;
           const canvas = canvasRef.current || document.createElement("canvas");
           canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
           const ctx = canvas.getContext("2d"); ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
           const codes = await detectorRef.current.detect(await createImageBitmap(canvas));
           if (codes?.length) { handleScanned(codes[0].rawValue); stopQrScan(); }
         } catch {}
      }, 500);
      setQrScanning(true);
    } catch (e) { setMsg({ type: "err", text: e.message }); }
  };
  const startNfcScan = async () => { 
      setMsg(null);
      if (!("NDEFReader" in window)) return setMsg({ type: "info", text: t("nfc_not_supported") });
      try {
        const reader = new NDEFReader();
        ndefRef.current = reader;
        await reader.scan();
        reader.onreading = (ev) => {
           try {
              for (const record of ev.message.records) {
                 if (record.recordType === "text") {
                    const textDecoder = new TextDecoder(record.encoding || "utf-8");
                    handleScanned(textDecoder.decode(record.data)); break;
                 }
                 if (record.recordType === "url") {
                    handleScanned(new TextDecoder().decode(record.data)); break;
                 }
              }
           } catch (e) { setMsg({ type: "err", text: t("file_read_error") }); }
        };
        setMsg({ type: "ok", text: t("scanning_qr") });
      } catch (e) { setMsg({ type: "err", text: e?.message || String(e) }); }
  };
  const stopNfcScan = async () => { try { if (ndefRef.current) ndefRef.current.onreading = null; ndefRef.current = null; } catch {} };

  const onGenerateRequest = async () => {
    try {
      setBusy(true); setMsg(null); setQrJson(""); setRequestQrImage(null);
      const host = window.location.hostname || "localhost";
      const ch = await newChallenge(host, 180);
      const vcReq = {};
      if (requiredVcType.trim()) vcReq.type = requiredVcType.split(",").map(s => s.trim()).filter(Boolean);
      if (requiredIssuer.trim()) vcReq.issuer = requiredIssuer.trim();
      const reqObj = {
        type: "present", challenge: ch.nonce, aud: host, exp: Math.floor(new Date(ch.expires_at).getTime()/1000),
        fields: requestedFields.length > 0 ? requestedFields : undefined,
        label: requestLabel || undefined, vc: Object.keys(vcReq).length ? vcReq : undefined
      };
      const data = JSON.stringify(reqObj, null, 2);
      setQrJson(data);
      setRequestQrImage(await QRCode.toDataURL(data, { width: 256, margin: 1 }));
      setMsg({ type: "ok", text: t("verifier.new_challenge_ready") });
    } catch (e) { setMsg({ type: "err", text: e.message }); } finally { setBusy(false); }
  };

  const onVerify = useCallback(async () => {
    try {
      setBusy(true); setMsg(null);
      if (!vcObj) throw new Error(t("first_load_or_paste"));
      const resp = await verifyVC(vcObj);
      setResult(resp);
    } catch (e) { setResult(null); setMsg({ type: "err", text: e.message }); } finally { setBusy(false); }
  }, [vcObj]);

  return (
    <section className="max-w-3xl mx-auto pb-20">
       {/* Header */}
       <div className="mb-6 sm:mb-8">
         <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
           <div>
             <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[color:var(--fg)]">{t("verify_vc_title")}</h2>
             <p className="text-sm text-[color:var(--muted)] mt-2 max-w-lg leading-relaxed">
               Bir istek oluştur, kullanıcının sunduğu kimliği (VC) al ve doğruluğunu kontrol et.
             </p>
           </div>
           <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${qrJson ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                {qrJson ? "İstek Hazır" : "İstek Yok"}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${vcObj ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                {vcObj ? "Veri Yüklendi" : "Veri Bekleniyor"}
              </span>
           </div>
         </div>
       </div>

       <div className="mb-4 sticky top-4 z-50">
          <Msg msg={msg} />
       </div>

       <div className="space-y-4">

          {/* --- STEP 1: Request Builder --- */}
          <SectionCard
             stepNumber={1}
             title="Talep Oluştur (Opsiyonel)"
             isActive={activeStep === 0}
             isCompleted={!!qrJson}
             onToggle={() => setActiveStep(activeStep === 0 ? -1 : 0)}
          >
             <div className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="space-y-3">
                      <label className="block text-xs font-medium text-[color:var(--muted)] uppercase">Amaç (Label)</label>
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-sm focus:ring-2 focus:ring-[color:var(--brand)]/20 outline-none"
                         placeholder="Örn: Kapı Girişi" value={requestLabel} onChange={(e) => setRequestLabel(e.target.value)} />
                      
                      <label className="block text-xs font-medium text-[color:var(--muted)] uppercase">İstenen Veriler</label>
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-sm focus:ring-2 focus:ring-[color:var(--brand)]/20 outline-none"
                         placeholder="Örn: fullName, studentId" value={requestedFields.join(", ")} onChange={(e) => setRequestedFields(e.target.value.split(",").map(s=>s.trim()).filter(Boolean))} />
                   </div>
                   <div className="space-y-3">
                      <label className="block text-xs font-medium text-[color:var(--muted)] uppercase">VC Tipi</label>
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-sm focus:ring-2 focus:ring-[color:var(--brand)]/20 outline-none"
                         placeholder="Örn: StudentCard" value={requiredVcType} onChange={(e) => setRequiredVcType(e.target.value)} />
                      
                      <label className="block text-xs font-medium text-[color:var(--muted)] uppercase">Issuer DID</label>
                      <input type="text" className="w-full px-4 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-sm focus:ring-2 focus:ring-[color:var(--brand)]/20 outline-none"
                         placeholder="Opsiyonel: did:key:..." value={requiredIssuer} onChange={(e) => setRequiredIssuer(e.target.value)} />
                   </div>
                </div>

                <div className="pt-4 border-t border-[color:var(--border)] flex flex-col gap-4">
                   <Button onClick={onGenerateRequest} disabled={busy} variant="primary" className="w-full sm:w-auto">
                      {busy ? "Oluşturuluyor..." : "İstek QR Oluştur"}
                   </Button>
                   
                   {requestQrImage && (
                      <div className="bg-[color:var(--panel-2)] rounded-xl p-3 flex flex-col sm:flex-row gap-3 animate-in fade-in border border-[color:var(--border)]">
                         <div className="bg-white p-1.5 rounded shrink-0 shadow-sm border mx-auto sm:mx-0"><img src={requestQrImage} className="w-20 h-20" alt="QR" /></div>
                         <div className="min-w-0 flex-1 text-center sm:text-left">
                            <p className="text-xs text-[color:var(--muted)] mb-2">Bu QR'ı kullanıcıya (Present ekranına) okut.</p>
                            <div className="flex justify-center sm:justify-start gap-2">
                               <CopyBtn value={qrJson} label="JSON Kopyala" />
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             </div>
          </SectionCard>

          {/* --- STEP 2: Upload / Scan --- */}
          <SectionCard
             stepNumber={2}
             title="Yanıtı Yükle / Tara"
             isActive={activeStep === 1}
             isCompleted={!!vcObj}
             onToggle={() => setActiveStep(activeStep === 1 ? -1 : 1)}
          >
             <div className="space-y-4">
                <div
                   onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                   onDragLeave={() => setDrag(false)}
                   onDrop={onDrop}
                   className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer group
                   ${drag ? "border-[color:var(--brand)] bg-[color:var(--brand)]/5 scale-[1.01]" : "border-[color:var(--border)] hover:border-[color:var(--brand-2)]"}
                   ${vcObj ? "bg-emerald-50/30 border-emerald-200" : ""}
                   `}
                >
                   <input ref={fileRef} type="file" accept=".wpvc,.wpvp,application/json" onChange={onInputFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                   
                   {vcObj ? (
                      <div className="flex flex-col items-center animate-in zoom-in-95">
                         <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                         </div>
                         <h3 className="font-medium text-sm text-emerald-800">{t("vc_loaded")}</h3>
                         <p className="text-xs text-[color:var(--muted)] mt-0.5 max-w-md truncate">{vcShort}</p>
                         <div className="flex gap-2 mt-3 z-20 relative">
                            <Button variant="danger" onClick={(e) => { e.stopPropagation(); clearVC(); }} className="h-7 px-2 text-xs py-0">Kaldır</Button>
                            <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setShowPreview(!showPreview); }} className="h-7 px-2 text-xs py-0">{showPreview ? "Gizle" : "JSON Bak"}</Button>
                         </div>
                      </div>
                   ) : (
                      <div className="flex flex-col items-center">
                         <p className="text-sm font-medium text-[color:var(--fg)]">Dosyayı sürükle veya seç</p>
                         <p className="text-xs text-[color:var(--muted)] mt-1">(.json, .wpvc, .wpvp)</p>
                      </div>
                   )}
                </div>

                {!vcObj && (
                   <div className="flex gap-3 justify-center">
                      <Button onClick={() => qrScanning ? stopQrScan() : startQrScan()} variant={qrScanning ? "primary" : "outline"} className="w-full sm:w-auto">
                         {qrScanning ? "Taramayı Durdur" : "Kamera ile Tara"}
                      </Button>
                      <Button onClick={startNfcScan} variant="outline" className="w-full sm:w-auto">NFC ile Tara</Button>
                   </div>
                )}
                
                <video ref={videoRef} className={`mx-auto rounded-lg border mt-3 ${qrScanning ? "block w-64" : "hidden"}`} playsInline muted />
                <canvas ref={canvasRef} className="hidden" />

                {showPreview && vcText && (
                   <pre className="text-[10px] bg-[color:var(--code-bg)] p-3 rounded-lg border overflow-auto max-h-40">{vcText}</pre>
                )}
             </div>
          </SectionCard>

          {/* --- STEP 3: Verify Result --- */}
          <SectionCard
             stepNumber={3}
             title="Doğrulama Sonucu"
             isActive={activeStep === 2}
             isCompleted={!!result}
             onToggle={() => setActiveStep(activeStep === 2 ? -1 : 2)}
          >
             <div className="flex flex-col items-center text-center">
                {!result ? (
                   <div className="py-4">
                      <p className="text-sm text-[color:var(--muted)] mb-4">Veri yüklendi. İmzalar ve geçerlilik kontrol edilsin mi?</p>
                      <Button onClick={onVerify} disabled={busy || !canVerify} variant="primary" className="shadow-xl shadow-[color:var(--brand)]/20 px-8">
                         {busy ? "Doğrulanıyor..." : "Doğrula"}
                      </Button>
                   </div>
                ) : (
                   <div className="w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
                      <div className={`rounded-2xl border shadow-xl overflow-hidden ${result.valid && !result.revoked ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200" : "bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200"}`}>
                         <div className={`p-6 flex flex-col items-center ${result.valid && !result.revoked ? "text-emerald-900" : "text-rose-900"}`}>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 ${result.valid && !result.revoked ? "bg-emerald-200/50 text-emerald-600" : "bg-rose-200/50 text-rose-600"}`}>
                               {result.valid && !result.revoked ? "✓" : "✕"}
                            </div>
                            <h3 className="text-2xl font-bold tracking-tight">
                               {result.valid && !result.revoked ? "GEÇERLİ" : "GEÇERSİZ"}
                            </h3>
                            {result.revoked && <p className="text-rose-600 font-semibold mt-1">İPTAL EDİLMİŞ (REVOKED)</p>}
                            {result.reason && <p className="text-sm opacity-80 mt-2">{result.reason}</p>}
                            <div className="mt-6 grid grid-cols-1 gap-2 text-xs w-full max-w-md opacity-80">
                               {subjectId && <div className="flex justify-between border-b border-black/5 pb-1"><span>Subject:</span> <span className="font-mono">{subjectId.slice(0,20)}...</span></div>}
                               {issuer && <div className="flex justify-between border-b border-black/5 pb-1"><span>Issuer:</span> <span className="font-mono">{issuer.slice(0,20)}...</span></div>}
                            </div>
                         </div>
                         <details className="bg-white/50 border-t border-black/5 text-left">
                            <summary className="px-4 py-3 text-xs font-medium cursor-pointer hover:bg-white/60 select-none flex justify-between">
                               <span>Teknik Detayları Göster</span>
                               <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                            </summary>
                            <pre className="p-4 text-[10px] font-mono overflow-auto max-h-60 bg-white/80">{JSON.stringify(result, null, 2)}</pre>
                         </details>
                      </div>
                      <div className="mt-6">
                         <Button variant="secondary" onClick={clearVC}>Yeni İşlem</Button>
                      </div>
                   </div>
                )}
             </div>
          </SectionCard>

       </div>
    </section>
  );
}

function Msg({ msg }) {
  if (!msg) return null;
  const styles = msg.type === "ok" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : msg.type === "err" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-blue-50 text-blue-800 border-blue-200";
  return <div className={`rounded-lg px-4 py-3 border text-sm flex items-start gap-3 animate-in fade-in shadow-sm ${styles}`}>{msg.text}</div>;
}