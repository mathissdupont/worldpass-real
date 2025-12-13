// src/pages/identity/IssueVC.jsx
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { b64u, ed25519Sign, b64uToBytes } from "../lib/crypto";
import { addVC as addVCToStore } from "../lib/storage";
import { t } from "../lib/i18n";
import MiniQR from "./MiniQR";
import TemplateManager from "./TemplateManager";
import BlockchainSelector from "./BlockchainSelector";

const enc = new TextEncoder();
const b64uJson = (obj) => b64u(enc.encode(JSON.stringify(obj)));

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
  };

  return (
    <button onClick={onClick} disabled={disabled} className={cx(base, variants[variant], className)} title={title}>
      {children}
    </button>
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

function safeParse(str) { try { return JSON.parse(str); } catch { return null; } }

// Generate a unique recipient ID
function generateRecipientId() {
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/* ---------------- Main Component ---------------- */
export default function IssueVC({ identity }) {
  const [subjectName, setSubjectName] = useState("");
  const [subjectDid, setSubjectDid]   = useState("");
  const [vcType, setVcType]           = useState("VerifiableCredential");
  const [customFields, setCustomFields] = useState([]); // [{key: "", value: ""}]
  const [busy, setBusy]               = useState(false);
  const [msg, setMsg]                 = useState(null); 
  const [out, setOut]                 = useState(null);
  const [recipientId, setRecipientId] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [blockchainChain, setBlockchainChain] = useState('polygon');

  // QR scan state
  const [qrScanning, setQrScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectorRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [activeStep, setActiveStep] = useState(0);

  const jti = useMemo(() => `vc-${Math.floor(Date.now() / 1000)}`, []);
  const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const issuerReady = Boolean(identity?.did);
  const didOk = useMemo(() => /^did:[a-z0-9]+:/i.test((subjectDid||"").trim()), [subjectDid]);
  const canIssue = issuerReady && subjectName.trim() && didOk;

  // Auto step logic
  useEffect(() => {
     if(out) setActiveStep(2);
     else if(canIssue) setActiveStep(1); // Ready to issue
     else setActiveStep(0);
  }, [out, canIssue]);

  // --- Handlers ---
  const onLoadSubjectFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    try {
      const txt = await file.text();
      const obj = safeParse(txt);
      if (!obj) throw new Error("Geçerli JSON bulunamadı.");
      
      let didFrom = obj.did || obj.subjectDid || obj.credentialSubject?.id || obj.holder?.id || "";
      let nameFrom = obj.credentialSubject?.name || obj.credentialSubject?.fullName || obj.name || "";
      
      didFrom = (didFrom || "").trim();
      nameFrom = (nameFrom || "").trim();

      if (!didFrom) throw new Error("Dosyada subject DID bulunamadı.");

      setSubjectDid(didFrom);
      if (nameFrom && !subjectName) setSubjectName(nameFrom);
      setMsg({ type: "ok", text: "Kimlik bilgisi yüklendi." });
    } catch (err) {
      setMsg({ type: "err", text: "Hata: " + err.message });
    } finally {
      e.target.value = "";
    }
  };

  const handleScannedSubject = async (raw) => {
    try {
      const obj = safeParse(raw);
      if (!obj) throw new Error("QR geçersiz.");
      
      let didFrom = obj.did || obj.subjectDid || obj.credentialSubject?.id || obj.holder?.id || "";
      let nameFrom = obj.credentialSubject?.name || obj.credentialSubject?.fullName || obj.name || "";
      
      didFrom = (didFrom || "").trim();
      nameFrom = (nameFrom || "").trim();

      if (!didFrom) throw new Error("QR içinde DID yok.");

      setSubjectDid(didFrom);
      if (nameFrom && !subjectName) setSubjectName(nameFrom);
      setMsg({ type: "ok", text: "QR okundu." });
    } catch (e) { setMsg({ type: "err", text: "QR Hatası: " + e.message }); }
  };

  const stopQrScan = async () => {
    try {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch {}
    setQrScanning(false);
  };

  const startQrScan = async () => {
    setMsg(null);
    if (!("BarcodeDetector" in window)) return setMsg({ type: "info", text: "Kamera desteklenmiyor." });
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
           if (codes?.length) { await handleScannedSubject(codes[0].rawValue); stopQrScan(); }
        } catch {}
      }, 500);
      setQrScanning(true);
    } catch (e) { setMsg({ type: "err", text: "Kamera hatası: " + e.message }); await stopQrScan(); }
  };

  useEffect(() => { return () => { stopQrScan(); }; }, []);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const response = await fetch("/api/issuer/templates", {
        headers: { "X-Token": token }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error("Template loading error:", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setVcType(template.vc_type);
    
    // Load fields from template
    const templateFields = template.fields || [];
    setCustomFields(templateFields.map(f => ({ key: f.name, value: "" })));
    
    setShowTemplates(false);
    setMsg({ type: "ok", text: `"${template.name}" şablonu yüklendi. Field'ları doldurun.` });
  };

  const issue = useCallback(async () => {
    setMsg(null);
    if (!issuerReady) return setMsg({ type: "err", text: t("issuer_missing_err") });
    if (!subjectName.trim()) return setMsg({ type: "err", text: t("subject_name_required") });
    if (!didOk) return setMsg({ type: "err", text: t("subject_did_format_err") });

    setBusy(true);
    try {
      const issuance = nowIso();
      const newRecipientId = generateRecipientId();
      
      // credentialSubject'e tüm custom field'ları ekle
      const credentialSubject = { 
        id: subjectDid.trim(), 
        name: subjectName.trim(),
        recipientId: newRecipientId
      };
      
      // Custom field'ları ekle
      customFields.forEach(field => {
        if (field.key.trim() && field.value.trim()) {
          credentialSubject[field.key.trim()] = field.value.trim();
        }
      });
      
      const vcBody = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", vcType],
        issuer: identity.did, issuanceDate: issuance, jti,
        credentialSubject,
      };

      const header = { alg: "EdDSA", typ: "JWT" };
      const msgForSig = `${b64uJson(header)}.${b64uJson(vcBody)}`;
      const skBytes = b64uToBytes(identity.sk_b64u);
      const sigBytes = ed25519Sign(skBytes, enc.encode(msgForSig));

      const vcSigned = {
        ...vcBody,
        proof: {
          type: "Ed25519Signature2020", created: issuance,
          proofPurpose: "assertionMethod", verificationMethod: `${identity.did}#key-1`,
          jws: b64u(sigBytes), issuer_pk_b64u: identity.pk_b64u,
        },
      };

      // 1) Download
      const blob = new Blob([JSON.stringify(vcSigned, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${jti}.wpvc`; a.click();
      URL.revokeObjectURL(a.href);

      // 2) Add to issuer's wallet
      addVCToStore(vcSigned);
      
      // 3) Send to issuer backend for storage
      try {
        const token = localStorage.getItem("issuerToken");
        if (!token) {
          console.warn("No issuer token found, skipping backend storage");
        } else {
          const backendResponse = await fetch("/api/issuer/issue", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Token": token
            },
            body: JSON.stringify({
              vc: vcSigned,
              blockchain_chain: blockchainChain  // Send selected blockchain
            })
          });
          
          if (backendResponse.ok) {
            const backendData = await backendResponse.json();
            console.log("✅ VC stored in issuer backend:", backendData);
          } else {
            console.warn("Failed to store in issuer backend:", await backendResponse.text());
          }
        }
      } catch (backendErr) {
        console.error("Error sending to issuer backend:", backendErr);
      }

      // 4) Send to recipient's wallet via backend
      try {
        const response = await fetch("/api/user/vcs/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Wallet-Did": subjectDid.trim()
          },
          body: JSON.stringify({ vc: vcSigned })
        });
        
        if (response.ok) {
          setMsg({ type: "ok", text: "VC oluşturuldu, indirildi ve alıcının cüzdanına gönderildi!" });
        } else {
          setMsg({ type: "ok", text: "VC oluşturuldu ve indirildi. (Alıcının cüzdanına gönderilemedi)" });
        }
      } catch {
        setMsg({ type: "ok", text: "VC oluşturuldu ve indirildi. (Alıcının cüzdanına gönderilemedi)" });
      }
      
      setRecipientId(newRecipientId);
      setOut(vcSigned);
    } catch (e) { setMsg({ type: "err", text: "Hata: " + e.message }); } finally { setBusy(false); }
  }, [issuerReady, subjectName, subjectDid, vcType, customFields, jti, didOk, identity]);

  const writeNfc = async () => {
      if (!out || !recipientId) return;
      if (!("NDEFWriter" in window)) return setMsg({ type: "info", text: "NFC desteklenmiyor." });
      try {
         const writer = new NDEFWriter();
         // Write both the VC and a URL that can be used to look it up
         const recipientUrl = `${window.location.origin}/api/recipient/${recipientId}`;
         await writer.write({ 
           records: [
             { recordType: "url", data: recipientUrl },
             { recordType: "mime", mediaType: "application/json", data: enc.encode(JSON.stringify(out)) }
           ] 
         });
         setMsg({ type: "ok", text: "VC ve erişim URL'si NFC etiketine yazıldı." });
      } catch { setMsg({ type: "err", text: "NFC yazma başarısız." }); }
  };

  return (
    <section className="max-w-3xl mx-auto pb-20">
       {/* Header */}
       <div className="mb-8 text-center md:text-left md:flex md:items-end md:justify-between">
         <div>
           <h2 className="text-2xl font-bold tracking-tight text-[color:var(--fg)]">{t("issue_vc_title")}</h2>
           <p className="text-sm text-[color:var(--muted)] mt-2 max-w-lg leading-relaxed">{t("issue_vc_desc")}</p>
         </div>
         <div className="mt-4 md:mt-0 flex gap-2">
            {issuerReady ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Issuer Aktif</span>
            ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Issuer Anahtarı Yok</span>
            )}
         </div>
       </div>

       <div className="mb-4 sticky top-4 z-50"><Msg msg={msg} /></div>

       <div className="space-y-4">
          
          {/* --- STEP 1: Subject Details --- */}
          <SectionCard 
             stepNumber={1} 
             title="Kimlik Sahibi Bilgileri" 
             isActive={activeStep === 0} 
             isCompleted={canIssue} 
             onToggle={() => setActiveStep(activeStep === 0 ? -1 : 0)}
          >
             <div className="grid gap-6">
                {/* Scan Tools */}
                <div className="flex flex-wrap gap-3 bg-[color:var(--panel-2)] p-4 rounded-xl border border-[color:var(--border)]">
                   <div className="w-full text-xs font-medium text-[color:var(--muted)] uppercase mb-1">Hızlı Doldur:</div>
                   <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="h-9 text-xs">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Dosyadan Yükle
                   </Button>
                   <input ref={fileInputRef} type="file" accept=".wpvc,.json" className="hidden" onChange={onLoadSubjectFile} />
                   
                   <Button onClick={() => qrScanning ? stopQrScan() : startQrScan()} variant={qrScanning ? "danger" : "outline"} className="h-9 text-xs">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                      {qrScanning ? "Taramayı Durdur" : "QR Tara"}
                   </Button>
                </div>

                {/* Scanner Video Area */}
                <video ref={videoRef} className={`mx-auto rounded-lg border ${qrScanning ? "block w-64" : "hidden"}`} playsInline muted />
                <canvas ref={canvasRef} className="hidden" />

                {/* Manual Inputs */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-[color:var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <h4 className="text-sm font-semibold text-[color:var(--fg)]">Alıcı Bilgileri</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="block text-xs font-medium text-[color:var(--muted)] flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          Ad Soyad *
                        </label>
                        <input 
                           value={subjectName} onChange={(e) => setSubjectName(e.target.value)} 
                           className="w-full px-3 py-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-sm focus:ring-2 focus:ring-[color:var(--brand)]/20 outline-none transition-all"
                           placeholder="Örn: Ahmet Yılmaz"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="block text-xs font-medium text-[color:var(--muted)] flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                          DID (Kimlik Kodu) *
                        </label>
                        <input 
                           value={subjectDid} onChange={(e) => setSubjectDid(e.target.value)} 
                           className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:ring-2 outline-none font-mono text-xs transition-all ${didOk ? "border-[color:var(--border)] bg-[color:var(--panel)] focus:ring-[color:var(--brand)]/20" : "border-rose-400 bg-rose-50 dark:bg-rose-900/20 focus:ring-rose-200"}`}
                           placeholder="did:key:z..."
                        />
                        {!didOk && subjectDid && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="8" x2="12" y2="12"/>
                              <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            Geçersiz DID formatı
                          </p>
                        )}
                        {didOk && subjectDid && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            Geçerli DID formatı
                          </p>
                        )}
                     </div>
                  </div>
                </div>
                
                {/* Templates Section - Make it more prominent */}
                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-[color:var(--fg)] flex items-center gap-2">
                         <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                           <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                           <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                         </svg>
                         Şablonlar
                         <span className="text-xs font-normal text-[color:var(--muted)]">(Hızlı başlat)</span>
                      </label>
                      <Button 
                         onClick={() => setShowTemplates(!showTemplates)} 
                         variant={showTemplates ? "secondary" : "outline"}
                         className="h-7 text-xs"
                      >
                         {showTemplates ? (
                           <>
                             <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                               <polyline points="18 15 12 9 6 15"/>
                             </svg>
                             Gizle
                           </>
                         ) : (
                           <>
                             <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                               <polyline points="6 9 12 15 18 9"/>
                             </svg>
                             Göster
                           </>
                         )}
                      </Button>
                   </div>
                   {showTemplates && (
                      <div className="border border-[color:var(--border)] rounded-xl p-3 bg-gradient-to-br from-[color:var(--panel-2)] to-[color:var(--panel)] animate-in slide-in-from-top">
                         {loadingTemplates ? (
                           <div className="text-center py-4 text-[color:var(--muted)] text-sm">Şablonlar yükleniyor...</div>
                         ) : templates.length === 0 ? (
                           <div className="text-center py-4 text-[color:var(--muted)] text-sm">
                             Henüz şablon oluşturulmamış. 
                             <button className="text-[color:var(--brand)] underline ml-1" onClick={() => {/* TODO: Open template creator */}}>
                               Yeni şablon oluştur
                             </button>
                           </div>
                         ) : (
                           <div className="grid gap-2">
                             {templates.map(template => (
                               <button
                                 key={template.id}
                                 onClick={() => handleTemplateSelect(template)}
                                 className="text-left p-3 rounded-lg border border-[color:var(--border)] hover:border-[color:var(--brand)] hover:bg-[color:var(--panel)] transition-all group"
                               >
                                 <div className="flex items-start justify-between">
                                   <div className="flex-1">
                                     <div className="font-medium text-sm text-[color:var(--fg)] group-hover:text-[color:var(--brand)]">{template.name}</div>
                                     {template.description && (
                                       <div className="text-xs text-[color:var(--muted)] mt-0.5">{template.description}</div>
                                     )}
                                     <div className="flex items-center gap-2 mt-2">
                                       <span className="text-xs px-2 py-0.5 rounded bg-[color:var(--panel-2)] text-[color:var(--muted)]">{template.vc_type}</span>
                                       <span className="text-xs text-[color:var(--muted)]">{template.fields?.length || 0} field</span>
                                     </div>
                                   </div>
                                   <svg className="w-5 h-5 text-[color:var(--muted)] group-hover:text-[color:var(--brand)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                     <polyline points="9 18 15 12 9 6"/>
                                   </svg>
                                 </div>
                               </button>
                             ))}
                           </div>
                         )}
                      </div>
                   )}
                   {!showTemplates && (
                     <p className="text-xs text-[color:var(--muted)] flex items-center gap-1">
                       <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                         <circle cx="12" cy="12" r="10"/>
                         <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                         <line x1="12" y1="17" x2="12.01" y2="17"/>
                       </svg>
                       Önceden tanımlı şablonları kullanarak hızlıca başlayın
                     </p>
                   )}
                </div>
                
                <div className="border-t border-dashed border-[color:var(--border)]"></div>
                
                <div className="space-y-2">
                   <label className="block text-xs font-medium text-[color:var(--muted)] flex items-center gap-1">
                     <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                       <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                       <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                     </svg>
                     Kimlik Kartı Tipi
                   </label>
                   <input 
                      value={vcType} onChange={(e) => setVcType(e.target.value)} 
                      className="w-full px-3 py-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-sm focus:ring-2 focus:ring-[color:var(--brand)]/20 outline-none transition-all"
                      placeholder="Örn: StudentCard, EmployeeCard, MembershipCard"
                   />
                   <p className="text-xs text-[color:var(--muted)]">
                     Varsayılan: VerifiableCredential
                   </p>
                </div>
                
                <div className="border-t border-dashed border-[color:var(--border)]"></div>
                
                {/* Custom Fields */}
                <div className="space-y-3">
                   <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-[color:var(--fg)] flex items-center gap-2">
                         <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                           <rect x="3" y="3" width="18" height="18" rx="2"/>
                           <path d="M3 9h18M9 21V9"/>
                         </svg>
                         Ek Bilgiler
                         <span className="text-xs font-normal text-[color:var(--muted)]">(Opsiyonel)</span>
                      </label>
                      <Button 
                         onClick={() => setCustomFields([...customFields, {key: "", value: ""}])} 
                         variant="outline"
                         className="h-7 text-xs"
                      >
                         <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                           <line x1="12" y1="5" x2="12" y2="19"/>
                           <line x1="5" y1="12" x2="19" y2="12"/>
                         </svg>
                         Alan Ekle
                      </Button>
                   </div>
                   
                   {customFields.length === 0 && (
                     <p className="text-xs text-[color:var(--muted)] text-center py-3 bg-[color:var(--panel-2)] rounded-lg border border-dashed border-[color:var(--border)]">
                       Henüz ek alan yok. "Alan Ekle" butonuna tıklayarak yeni bilgi ekleyin.
                     </p>
                   )}
                   
                   {customFields.map((field, idx) => (
                     <div key={idx} className="flex gap-2 items-start bg-[color:var(--panel-2)] p-3 rounded-lg border border-[color:var(--border)]">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                           <input 
                              value={field.key} 
                              onChange={(e) => {
                                const newFields = [...customFields];
                                newFields[idx].key = e.target.value;
                                setCustomFields(newFields);
                              }}
                              className="px-2 py-1.5 rounded border border-[color:var(--border)] bg-[color:var(--panel)] text-xs focus:ring-1 focus:ring-[color:var(--brand)]/20 outline-none"
                              placeholder="Alan adı (örn: studentId)"
                           />
                           <input 
                              value={field.value} 
                              onChange={(e) => {
                                const newFields = [...customFields];
                                newFields[idx].value = e.target.value;
                                setCustomFields(newFields);
                              }}
                              className="px-2 py-1.5 rounded border border-[color:var(--border)] bg-[color:var(--panel)] text-xs focus:ring-1 focus:ring-[color:var(--brand)]/20 outline-none"
                              placeholder="Değer (örn: 123456)"
                           />
                        </div>
                        <button 
                           onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
                           className="p-1.5 rounded hover:bg-rose-100 text-rose-600 transition-colors"
                           title="Sil"
                        >
                           <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                             <polyline points="3 6 5 6 21 6"/>
                             <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                           </svg>
                        </button>
                     </div>
                   ))}
                </div>
             </div>
          </SectionCard>

          {/* --- STEP 2: Review & Issue --- */}
          <SectionCard 
             stepNumber={2} 
             title="Basım Onayı" 
             isActive={activeStep === 1} 
             isCompleted={!!out} 
             onToggle={() => setActiveStep(activeStep === 1 ? -1 : 1)}
          >
             {canIssue ? (
                <div className="space-y-4">
                   {/* Blockchain Selector */}
                   <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-3">
                         <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                           <rect x="4" y="4" width="6" height="6" rx="1"/>
                           <rect x="14" y="4" width="6" height="6" rx="1"/>
                           <rect x="4" y="14" width="6" height="6" rx="1"/>
                           <rect x="14" y="14" width="6" height="6" rx="1"/>
                         </svg>
                         <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Blockchain Seçimi</h4>
                      </div>
                      <BlockchainSelector 
                        onSelect={(chain) => setBlockchainChain(chain)} 
                        defaultChain={blockchainChain}
                        showTestnets={false}
                      />
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        Bu kimlik kartının hash'i seçilen blockchain'e kaydedilecek
                      </p>
                   </div>
                
                   <div className="bg-[color:var(--panel-2)] rounded-xl p-4 border border-[color:var(--border)]">
                      <div className="flex justify-between items-center mb-3 border-b border-[color:var(--border)] pb-2">
                         <span className="text-xs font-bold uppercase text-[color:var(--muted)]">Önizleme</span>
                         <span className="text-xs font-mono text-[color:var(--muted)]">{jti}</span>
                      </div>
                      <div className="space-y-3">
                         <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="opacity-50 text-xs block mb-1">Tip</span><span className="font-medium">{vcType}</span></div>
                            <div><span className="opacity-50 text-xs block mb-1">Kime</span><span className="font-medium">{subjectName}</span></div>
                         </div>
                         {customFields.length > 0 && (
                           <div className="border-t border-dashed border-[color:var(--border)] pt-3">
                              <span className="opacity-50 text-xs block mb-2">Ek Bilgiler:</span>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                 {customFields.filter(f => f.key.trim() && f.value.trim()).map((field, idx) => (
                                   <div key={idx} className="bg-[color:var(--panel)] px-2 py-1.5 rounded border border-[color:var(--border)]">
                                     <span className="opacity-60">{field.key}:</span> <span className="font-medium">{field.value}</span>
                                   </div>
                                 ))}
                              </div>
                           </div>
                         )}
                      </div>
                   </div>
                   <div className="flex justify-end">
                      <Button onClick={issue} disabled={busy} variant="primary" className="w-full sm:w-auto shadow-xl shadow-[color:var(--brand)]/20">
                         {busy ? "Basılıyor..." : "Kartı Bas ve Gönder"}
                      </Button>
                   </div>
                </div>
             ) : (
                <div className="text-center py-4 text-[color:var(--muted)] text-sm">Önce kimlik bilgilerini eksiksiz doldurun.</div>
             )}
          </SectionCard>

          {/* --- STEP 3: Success Result --- */}
          {out && recipientId && (
             <div className="animate-in slide-in-from-bottom-6 fade-in duration-500">
                <div className="rounded-2xl bg-gradient-to-br from-[color:var(--panel)] to-[color:var(--panel-2)] border border-[color:var(--brand)]/30 shadow-xl overflow-hidden">
                   <div className="bg-[color:var(--brand)]/10 p-4 border-b border-[color:var(--brand)]/10 flex items-center gap-3">
                      <div className="bg-emerald-500 text-white rounded-full p-1.5"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg></div>
                      <div><h3 className="font-bold text-[color:var(--fg)]">Kimlik Basıldı</h3></div>
                   </div>
                   
                   <div className="p-6 space-y-6">
                      {/* Recipient ID Display */}
                      <div className="bg-[color:var(--panel-2)] rounded-lg p-4 border border-[color:var(--border)]">
                         <div className="text-xs font-medium text-[color:var(--muted)] uppercase mb-2">Alıcı Kimliği (Recipient ID)</div>
                         <div className="font-mono text-sm break-all text-[color:var(--fg)] bg-[color:var(--panel)] p-2 rounded">
                            {recipientId}
                         </div>
                         <p className="text-xs text-[color:var(--muted)] mt-2">Bu ID, QR veya NFC ile okunabilir ve alıcıya özeldir.</p>
                      </div>
                      
                      <div className="flex flex-col items-center">
                         <MiniQR value={`${window.location.origin}/api/recipient/${recipientId}`} size={180} />
                         <p className="text-sm mt-4 font-medium">Bu QR kodu tarayarak kimlik bilgisine erisebilirsiniz.</p>
                         <p className="text-xs text-[color:var(--muted)] mt-1">Alıcı URL: /api/recipient/{recipientId}</p>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                         <Button onClick={writeNfc} variant="outline" className="h-10">NFC'ye Yaz (VC + URL)</Button>
                         <Button onClick={() => navigator.clipboard.writeText(JSON.stringify(out))} variant="secondary" className="h-10">VC JSON Kopyala</Button>
                      </div>
                      
                      <details className="bg-white/50 border border-[color:var(--border)] rounded-lg text-left">
                          <summary className="px-4 py-2 text-xs font-medium cursor-pointer select-none opacity-70 hover:opacity-100">Olusturulan VC JSON'u Goster</summary>
                          <pre className="p-4 text-[10px] font-mono overflow-auto max-h-40 bg-[color:var(--code-bg)] rounded-b-lg">
                             {JSON.stringify(out, null, 2)}
                          </pre>
                      </details>
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