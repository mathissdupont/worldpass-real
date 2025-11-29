// web/src/pages/ReceiveInfo.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import jsQR from "jsqr"; // QR okuma yedeği için şart
import { qrToDataURL } from "../lib/qr"; // Eğer projenizde varsa, yoksa silebilirsiniz

/* ---------------- UI Components (Referans Koddan Alındı) ---------------- */

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function Button({ children, onClick, variant = "secondary", className = "", disabled = false, title, type = "button" }) {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  const variants = {
    primary: "bg-[color:var(--brand)] text-white shadow-md hover:bg-[color:var(--brand)]/90 hover:shadow-lg ring-offset-2 focus:ring-2 ring-[color:var(--brand)]",
    secondary: "bg-[color:var(--panel-2)] border border-[color:var(--border)] text-[color:var(--fg)] hover:bg-[color:var(--panel)] hover:border-[color:var(--brand-2)]",
    outline: "border-2 border-[color:var(--border)] hover:border-[color:var(--brand)] text-[color:var(--muted)] hover:text-[color:var(--brand)] bg-transparent",
    ghost: "bg-transparent text-[color:var(--muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--panel-2)]",
    danger: "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100",
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

function Msg({ msg }) {
  if (!msg) return null;
  return <Alert type={msg.type === "ok" ? "success" : msg.type === "err" ? "error" : "info"} message={msg.text} />;
}

/* ---------------- Main Component ---------------- */

export default function ReceiveInfo() {
  const [jsonText, setJsonText] = useState("");
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState(null);
  
  // UI State
  const [activeStep, setActiveStep] = useState(0); // 0: Scan, 1: Result
  
  // Scanning State
  const [scanning, setScanning] = useState(false);
  const [nfcActive, setNfcActive] = useState(false);

  // Refs for Scanning logic
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // jsQR fallback için gerekli
  const scanIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const detectingRef = useRef(false);
  
  // Refs for NFC logic
  const ndefRef = useRef(null);
  const nfcAbortRef = useRef(null);

  // Temizlik (Cleanup)
  useEffect(() => {
    return () => {
      stopQrScan();
      stopNfcScan();
    };
  }, []);

  // Bilgi geldiğinde otomatik olarak sonuç adımını aç
  useEffect(() => {
    if (info) setActiveStep(1);
  }, [info]);

  // Handle Input Changes
  function handlePaste(e) {
    const val = e.target.value;
    setJsonText(val);
    processData(val);
  }

  // Ortak İşleme Fonksiyonu
  function processData(raw) {
    if (!raw) return;
    try {
      // Eğer bir URL ise ve JSON dönüyorsa fetch edilebilir (Opsiyonel)
      // Şimdilik direkt JSON parse deniyoruz
      const parsed = JSON.parse(raw);
      setInfo(parsed);
      setMsg({ type: "ok", text: "Bilgi başarıyla alındı ve işlendi." });
      stopQrScan();
      stopNfcScan();
    } catch {
      setInfo(null);
      // Hata mesajını sadece kullanıcı bir şey yapıştırdıysa veya taradıysa gösterelim
      if (raw.trim().length > 0) {
        setMsg({ type: "err", text: "Geçersiz format veya hatalı JSON verisi." });
      }
    }
  }

  // ---------------- QR SCAN LOGIC (Fixed & Robust) ----------------
  
  async function startQrScan() {
    setMsg(null);
    setInfo(null);
    
    const hasMedia = typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia;
    if (!hasMedia) {
      setMsg({ type: "err", text: "Tarayıcınız kamera erişimini desteklemiyor." });
      return;
    }

    try {
      stopQrScan(); // Önceki taramayı durdur

      // 1. BarcodeDetector var mı kontrol et (Native performans için)
      if ('BarcodeDetector' in window) {
        try {
            detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
        } catch (e) {
            console.warn("BarcodeDetector mevcut ama başlatılamadı:", e);
            detectorRef.current = null;
        }
      } else {
        detectorRef.current = null;
      }

      // 2. Kamerayı başlat
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Video metadatasının yüklenmesini bekle, sonra oynat
        videoRef.current.onloadedmetadata = async () => {
            try { await videoRef.current.play(); } catch {}
        };
      }

      setScanning(true);

      // 3. Tarama Döngüsü (Hybrid: Native -> Fallback jsQR)
      const detectFrame = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || detectingRef.current) return;
        
        // Canvas oluştur (görünmez)
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        // Videoyu canvas'a çiz
        const w = videoRef.current.videoWidth;
        const h = videoRef.current.videoHeight;
        if (!w || !h) return;
        
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(videoRef.current, 0, 0, w, h);

        detectingRef.current = true;

        try {
            let payload = null;

            // Yöntem A: Native BarcodeDetector
            if (detectorRef.current) {
                try {
                    const codes = await detectorRef.current.detect(canvas);
                    if (codes.length > 0) payload = codes[0].rawValue;
                } catch (e) {
                    console.warn("Native detection failed, trying fallback", e);
                }
            }

            // Yöntem B: jsQR Fallback (Eğer A başarısızsa veya yoksa)
            if (!payload) {
                const imageData = ctx.getImageData(0, 0, w, h);
                const code = jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });
                if (code) payload = code.data;
            }

            // Sonuç bulunduysa
            if (payload) {
                setJsonText(payload); // Text alanına da yaz
                processData(payload);
            }

        } catch (err) {
            console.error(err);
        } finally {
            detectingRef.current = false;
        }
      };

      // 500ms yerine daha sık tara (akıcı olması için), zaten detectingRef kilitliyor
      scanIntervalRef.current = setInterval(detectFrame, 200);

    } catch (e) {
      stopQrScan();
      setMsg({ type: 'err', text: 'Kamera başlatılamadı: ' + (e?.message || String(e)) });
    }
  }

  function stopQrScan() {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectingRef.current = false;
    setScanning(false);
  }

  // ---------------- NFC SCAN LOGIC ----------------

  async function startNfcScan() {
    setMsg(null);
    setInfo(null);
    
    if (!('NDEFReader' in window)) {
      setMsg({ type: 'info', text: 'Bu cihaz NFC okumayı desteklemiyor veya tarayıcı izni yok.' });
      return;
    }

    try {
      stopNfcScan(); // Öncekini temizle
      
      const reader = new window.NDEFReader();
      const controller = new AbortController();
      
      ndefRef.current = reader;
      nfcAbortRef.current = controller;

      await reader.scan({ signal: controller.signal });
      setNfcActive(true);
      setMsg({ type: 'ok', text: 'NFC aktif! Kartı veya telefonu yaklaştırın...' });

      reader.onreading = (ev) => {
        const decoder = new TextDecoder();
        for (const record of ev.message.records) {
            if (record.recordType === "text" || record.recordType === "url") {
                const txt = decoder.decode(record.data);
                setJsonText(txt);
                processData(txt);
                break; // İlk kaydı al yeter
            }
        }
      };

      reader.onreadingerror = () => setMsg({ type: 'err', text: 'NFC etiketi okunamadı.' });

    } catch (e) {
      setMsg({ type: 'err', text: 'NFC Hatası: ' + (e?.message || String(e)) });
      setNfcActive(false);
    }
  }

  function stopNfcScan() {
    try {
        if (nfcAbortRef.current) nfcAbortRef.current.abort();
    } catch {}
    nfcAbortRef.current = null;
    ndefRef.current = null;
    setNfcActive(false);
  }


  /* ---------------- RENDER ---------------- */

  return (
    <section className="max-w-3xl mx-auto pb-20 p-4">
       
       <div className="mb-6 sm:mb-8">
         <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[color:var(--fg)]">Bilgi Al</h2>
         <p className="text-sm text-[color:var(--muted)] mt-2 max-w-lg leading-relaxed">
            Paylaşılan bir kimlik bilgisini QR kod, NFC veya manuel JSON girişi ile tarayıp görüntüleyebilirsiniz.
         </p>
       </div>

       <div className="mb-4 sticky top-4 z-50"><Msg msg={msg} /></div>

       <div className="space-y-4">

          {/* ADIM 1: Veri Girişi / Tarama */}
          <SectionCard 
            stepNumber={1} 
            title="Veri Kaynağı" 
            isActive={activeStep === 0} 
            isCompleted={!!info} 
            onToggle={() => setActiveStep(activeStep === 0 ? -1 : 0)}
          >
             <div className="flex flex-col items-center py-2 space-y-4">
                
                {/* Butonlar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                   <Button 
                     onClick={scanning ? stopQrScan : startQrScan} 
                     variant={scanning ? "danger" : "primary"}
                     className="w-full"
                   >
                     {scanning ? (
                        <>
                           <span className="animate-pulse bg-white/20 w-2 h-2 rounded-full mr-2"/> 
                           Kamerayı Durdur
                        </>
                     ) : (
                        <>
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                           QR Kod Tara
                        </>
                     )}
                   </Button>

                   <Button 
                     onClick={nfcActive ? stopNfcScan : startNfcScan} 
                     variant={nfcActive ? "danger" : "outline"}
                     className="w-full"
                   >
                     {nfcActive ? (
                        <>
                            <span className="animate-pulse bg-rose-500 w-2 h-2 rounded-full mr-2"/>
                            NFC Durdur
                        </>
                     ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            NFC ile Oku
                        </>
                     )}
                   </Button>
                </div>

                {/* Kamera Görüntüsü */}
                <div className={`relative w-full max-w-sm overflow-hidden rounded-xl border-2 border-[color:var(--brand)] shadow-lg transition-all duration-300 ${scanning ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"}`}>
                   <video 
                     ref={videoRef} 
                     className="w-full h-full object-cover" 
                     playsInline 
                     muted 
                   />
                   <div className="absolute inset-0 border-2 border-[color:var(--brand)]/50 pointer-events-none rounded-xl"></div>
                   <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-white bg-black/50 py-1">
                      Kodu çerçeveye ortalayın
                   </div>
                </div>

                {/* Manuel Input */}
                <div className="w-full mt-4">
                   <label className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider mb-2 block">Manuel Veri Girişi</label>
                   <textarea
                     className="w-full p-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--fg)] text-xs font-mono focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent outline-none transition-all resize-y min-h-[100px]"
                     rows={4}
                     placeholder={`{"type": "presentation", ...} formatında JSON yapıştırın`}
                     value={jsonText}
                     onChange={handlePaste}
                   />
                </div>
             </div>
          </SectionCard>

          {/* ADIM 2: Sonuç Görüntüleme */}
          <SectionCard 
            stepNumber={2} 
            title="Alınan Bilgiler" 
            isActive={activeStep === 1} 
            isCompleted={false} 
            onToggle={() => setActiveStep(activeStep === 1 ? -1 : 1)}
          >
             {!info ? (
                <div className="text-center py-8 text-[color:var(--muted)]">
                   Henüz bilgi alınmadı. Lütfen yukarıdaki yöntemlerden biriyle veri girişi yapın.
                </div>
             ) : (
                <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <div className="flex justify-end mb-2">
                       <Button variant="ghost" onClick={() => { setInfo(null); setJsonText(""); setMsg(null); setActiveStep(0); }} className="text-xs h-8 px-2">
                          Temizle ve Yeni Tara
                       </Button>
                    </div>
                    
                    <div className="bg-[color:var(--panel-2)] rounded-xl p-4 border border-[color:var(--border)] overflow-hidden">
                       <pre className="text-xs font-mono text-[color:var(--fg)] overflow-auto max-h-[400px]">
                          {JSON.stringify(info, null, 2)}
                       </pre>
                    </div>

                    {/* Veri Özeti (Opsiyonel - Eğer standart bir yapıysa güzel görünür) */}
                    {typeof info === 'object' && !Array.isArray(info) && (
                       <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(info).filter(([k,v]) => typeof v !== 'object' && v !== null).map(([k, v]) => (
                             <div key={k} className="flex flex-col p-2 bg-[color:var(--panel)] border border-[color:var(--border)] rounded-lg">
                                <span className="text-[10px] text-[color:var(--muted)] uppercase font-bold">{k}</span>
                                <span className="text-sm font-medium text-[color:var(--fg)] truncate" title={String(v)}>{String(v)}</span>
                             </div>
                          ))}
                       </div>
                    )}
                </div>
             )}
          </SectionCard>

       </div>
    </section>
  );
}