// src/pages/credentials/VCList.jsx
import { useEffect, useMemo, useState } from "react";
import { loadVCs, removeVC } from "../lib/storage";
import { t } from "../lib/i18n";
import { qrToDataURL } from "../lib/qr";

// --- Utility: Classname birleştirici ---
function cx(...xs){ return xs.filter(Boolean).join(" "); }

// --- Component: Badge (Etiket) ---
function Badge({ tone="neutral", children }) {
  const map = {
    neutral: "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)] opacity-70",
    ok:   "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    warn: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  };
  return (
    <span className={cx(
      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap",
      map[tone]
    )}>
      {children}
    </span>
  );
}

// --- Component: Filtre Butonu (Chip) ---
function FilterChip({ active, children, onClick }){
  return (
    <button onClick={onClick} className={cx(
      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
      active 
       ? "bg-[color:var(--text)] text-[color:var(--bg)] border-transparent" 
       : "bg-transparent border-[color:var(--border)] text-[color:var(--muted)] hover:bg-[color:var(--panel-2)]"
    )}>
      {children}
    </button>
  );
}

// --- Component: Aksiyon Butonu (Responsive: Mobilde sadece ikon) ---
function ActionButton({ icon, label, onClick, highlight, tone }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "h-9 sm:h-10 flex-1 sm:flex-none flex items-center justify-center sm:px-4 rounded-lg border transition-all active:scale-95",
        highlight 
          ? "border-[color:var(--brand)]/30 bg-[color:var(--brand)]/10 text-[color:var(--brand)] shadow-[0_0_10px_-3px_var(--brand)]"
          : tone === "danger"
            ? "border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10"
            : "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--panel)]"
      )}
      title={label}
    >
      <span className="text-sm sm:mr-2">
        {icon === "qr" && "◱"}
        {icon === "download" && "⇩"}
        {icon === "revoke" && "⚠"}
        {icon === "trash" && "✕"}
      </span>
      {/* Mobilde hidden, sm (tablet/pc) ve üzeri inline */}
      <span className="hidden sm:inline text-xs font-medium">{label}</span>
    </button>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function VCList({ onRevoke }) {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [qrOf, setQrOf] = useState(null);
  const [previewJti, setPreviewJti] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Verileri Yükle
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const vcs = await loadVCs();
        if (!cancelled) {
          setList(safeSort(vcs));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || t('unable_to_fetch_credentials'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 2. Filtreleme Mantığı (Arama Kutusu)
  const textFiltered = useMemo(() => {
    if (!filter.trim()) return list;
    const q = filter.trim().toLowerCase();
    return list.filter(v => {
      const types = Array.isArray(v?.type) ? v.type.join(",") : (v?.type || "");
      const subj = v?.credentialSubject?.name || v?.credentialSubject?.id || "";
      return (
        (v?.jti || "").toLowerCase().includes(q) ||
        (v?.issuer || "").toLowerCase().includes(q) ||
        types.toLowerCase().includes(q) ||
        subj.toLowerCase().includes(q)
      );
    });
  }, [list, filter]);

  // 3. Tip Filtreleme Mantığı (Chip'ler)
  const filtered = useMemo(() => {
    if (activeType === "all") return textFiltered;
    return textFiltered.filter(vc => getPrimaryType(vc) === activeType);
  }, [textFiltered, activeType]);

  // 4. İstatistikler
  const stats = useMemo(() => ({
    total: list.length,
    filtered: filtered.length,
  }), [list, filtered]);

  // 5. Tip Grupları (Facet)
  const typeFacets = useMemo(() => {
    const counts = new Map();
    list.forEach(vc => {
      const primary = getPrimaryType(vc);
      if (!primary) return;
      counts.set(primary, (counts.get(primary) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
  }, [list]);

  // --- Yardımcı Fonksiyonlar ---
  function safeSort(arr){
    const list = Array.isArray(arr) ? arr : [];
    return [...list].sort((a,b) => {
      const da = Date.parse(a?.issuanceDate || "") || 0;
      const db = Date.parse(b?.issuanceDate || "") || 0;
      return db - da;
    });
  }

  async function showQR(vc){
    try{
      const data = JSON.stringify({ type: "vc", jti: vc?.jti, issuer: vc?.issuer });
      const url = await qrToDataURL(data, { width: 256, errorCorrectionLevel: "M" });
      setQrOf({ jti: vc?.jti, issuer: vc?.issuer, dataUrl: url });
    }catch(e){
      setMsg({ type: "err", text: "QR üretilemedi." });
    }
  }

  function downloadVC(vc){
    const blob = new Blob([JSON.stringify(vc, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${vc?.jti || "credential"}.wpvc`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function hardRemove(jti){
    if (!jti) return;
    if (!confirm("Bu kimliği silmek istediğine emin misin?")) return;
    try {
      const updated = await removeVC(jti);
      setList(safeSort(updated));
      if (previewJti === jti) setPreviewJti(null);
      setMsg({ type: "ok", text: "Silindi." });
    } catch (e) {
      setMsg({ type: "err", text: "Hata oluştu." });
    }
  }

  const copy = (txt) =>
    navigator.clipboard.writeText(txt).then(
      ()=> setMsg({type:"ok", text: "Kopyalandı"}),
      ()=> setMsg({type:"err", text: "Hata"})
    );

  // --- JSX RENDER ---
  return (
    <section className="flex flex-col gap-6 pb-24 sm:pb-0"> 
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between px-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[color:var(--text)]">{t('my_credentials')}</h2>
            <p className="text-xs text-[color:var(--muted)] hidden sm:block mt-1">{t('credentials_intro')}</p>
          </div>
          
          {/* Stats - Minimal */}
          <div className="flex gap-4 text-right">
             <div className="hidden sm:block">
                <div className="text-[10px] text-[color:var(--muted)] uppercase font-bold tracking-wider">Total</div>
                <div className="font-mono text-lg">{stats.total}</div>
             </div>
             <div>
                <div className="text-[10px] text-[color:var(--muted)] uppercase font-bold tracking-wider text-right sm:text-left">{t('filtered')}</div>
                <div className="font-mono text-lg text-[color:var(--brand)]">{stats.filtered}</div>
             </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <input
            value={filter}
            onChange={(e)=>setFilter(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full h-11 pl-4 pr-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] focus:ring-2 focus:ring-[color:var(--brand)]/50 focus:border-[color:var(--brand)] outline-none transition-all text-sm placeholder:text-[color:var(--muted)] shadow-sm"
          />
          <span className="absolute right-3 top-3 text-[color:var(--muted)] opacity-50 group-focus-within:opacity-100 transition-opacity">🔍</span>
        </div>

        {/* Filter Chips - Horizontal Scroll */}
        {typeFacets.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
             <FilterChip active={activeType === "all"} onClick={() => setActiveType("all")}>
                All Types
             </FilterChip>
             {typeFacets.map(({ type, count }) => (
                <FilterChip key={type} active={activeType === type} onClick={() => setActiveType(type)}>
                  {type} <span className="ml-1 opacity-50 text-[10px]">{count}</span>
                </FilterChip>
             ))}
          </div>
        )}
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/5 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <div className="flex flex-col gap-3 animate-pulse">
           {[1,2,3].map(i => (
             <div key={i} className="h-24 rounded-2xl bg-[color:var(--panel-2)] border border-[color:var(--border)] opacity-50"/>
           ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && filtered.length === 0 && (
         <div className="py-16 text-center border border-dashed border-[color:var(--border)] rounded-2xl opacity-60 flex flex-col items-center gap-3">
            <div className="text-3xl">📇</div>
            <div className="text-sm">{t('no_credentials_yet')}</div>
         </div>
      )}

      {/* MAIN LIST */}
      <div className="flex flex-col gap-3">
        {filtered.map((vc) => {
          const types = Array.isArray(vc?.type) ? vc.type : [vc?.type].filter(Boolean);
          const title = [types?.find(t => t !== "VerifiableCredential") || types?.[0] || "VC"].filter(Boolean).join(", ");
          const subjectLabel = vc?.credentialSubject?.name || vc?.credentialSubject?.id || "";
          const issuedShort = vc?.issuanceDate ? vc.issuanceDate.split('T')[0] : null;

          return (
            <article 
              key={vc?.jti || Math.random()} 
              className="relative flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] shadow-sm hover:border-[color:var(--brand-2)]/40 transition-colors group"
            >
              {/* Left Side: Icon & Info */}
              <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                {/* Avatar / Icon */}
                <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[color:var(--panel-2)] to-[color:var(--panel)] border border-[color:var(--border)] flex items-center justify-center text-lg font-bold text-[color:var(--brand)] shadow-inner">
                  {initials(subjectLabel || title)}
                </div>

                {/* Text Content */}
                <div className="flex flex-col min-w-0 pt-0.5 w-full">
                   <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold truncate leading-tight text-[color:var(--text)]">{title}</h3>
                   </div>
                   
                   {/* Mobile: Sadece Subject Label (isim) göster */}
                   {subjectLabel && (
                     <p className="text-xs text-[color:var(--muted)] mt-0.5 truncate pr-2">{subjectLabel}</p>
                   )}

                   {/* Desktop: Ekstra metadata (Mobilde gizli) */}
                   <div className="hidden sm:flex items-center gap-3 mt-2 text-[10px] text-[color:var(--muted)] uppercase tracking-wider font-medium">
                      {issuedShort && <span>{issuedShort}</span>}
                      {vc?.issuer && <span className="opacity-50">|</span>}
                      {vc?.issuer && <span className="truncate max-w-[150px]">{short(vc.issuer)}</span>}
                   </div>

                   {/* Badges - Mobilde sadece Type, Desktopta JTI da var */}
                   <div className="flex flex-wrap gap-2 mt-2 sm:mt-2">
                      {types.length > 0 && <Badge tone="ok">{types.find(t=>t!=="VerifiableCredential") || "VC"}</Badge>}
                      <div className="hidden sm:block"><Badge tone="neutral">JTI: {short(vc?.jti, 4)}</Badge></div>
                   </div>
                </div>
              </div>

              {/* Right/Bottom Side: Actions Bar */}
              {/* Mobilde alt kısımda full genişlik, Masaüstünde sağda */}
              <div className="flex items-center gap-2 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[color:var(--border)]/50 sm:border-none">
                 
                 {/* Show JSON (Toggle) */}
                 <button 
                   onClick={()=>setPreviewJti(p => p === vc?.jti ? null : vc?.jti)}
                   className={cx(
                     "h-9 w-9 flex items-center justify-center rounded-lg border transition-colors shrink-0",
                     previewJti === vc?.jti ? "bg-[color:var(--brand)] text-white border-transparent" : "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--muted)] hover:text-[color:var(--text)]"
                   )}
                   title="Raw JSON"
                 >
                   <span className="text-[10px] font-mono">{`{}`}</span>
                 </button>

                 <div className="w-px h-6 bg-[color:var(--border)] mx-1 hidden sm:block"></div>

                 <ActionButton icon="qr" label={t('show_qr')} onClick={() => showQR(vc)} highlight />
                 <ActionButton icon="download" label={t('download')} onClick={() => downloadVC(vc)} />
                 {onRevoke && <ActionButton icon="revoke" label={t('revoke')} onClick={() => onRevoke(vc.jti)} />}
                 <ActionButton icon="trash" label={t('remove')} onClick={() => hardRemove(vc?.jti)} tone="danger" />
              </div>

              {/* JSON Expand Area */}
              {previewJti === vc?.jti && (
                <div className="absolute top-full left-0 right-0 z-10 mt-2 p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] shadow-xl animate-in fade-in slide-in-from-top-2">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase font-bold text-[color:var(--muted)]">Raw Data</span>
                      <button onClick={()=>copy(JSON.stringify(vc))} className="text-[10px] text-[color:var(--brand)] hover:underline font-bold">COPY JSON</button>
                   </div>
                   <pre className="text-[10px] font-mono max-h-60 overflow-auto whitespace-pre-wrap text-[color:var(--text)] opacity-80 break-all bg-[color:var(--panel)] p-2 rounded border border-[color:var(--border)]/50">
                      {JSON.stringify(vc, null, 2)}
                   </pre>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* --- TOAST NOTIFICATION --- */}
      {msg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-[color:var(--panel)] border border-[color:var(--border)] text-[color:var(--text)] shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 flex items-center gap-3 min-w-[200px] justify-center backdrop-blur-md">
          <span className={cx("text-lg", msg.type === 'ok' ? "text-emerald-400" : "text-rose-400")}>
            {msg.type === 'ok' ? '✓' : '⚠'}
          </span>
          <span className="text-xs font-medium">{msg.text}</span>
        </div>
      )}

      {/* --- QR MODAL --- */}
      {qrOf && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={()=>setQrOf(null)}>
           <div className="bg-[color:var(--panel)] border border-[color:var(--border)] p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full animate-in zoom-in-95" onClick={e=>e.stopPropagation()}>
              <div className="flex w-full justify-between items-center">
                 <h3 className="text-lg font-bold text-[color:var(--text)]">{t('vc_qr_title')}</h3>
                 <button onClick={()=>setQrOf(null)} className="text-[color:var(--muted)] hover:text-[color:var(--text)]">✕</button>
              </div>
              
              <div className="bg-white p-3 rounded-2xl shadow-inner border border-white/10">
                 <img src={qrOf.dataUrl} className="w-56 h-56 object-contain" alt="Credential QR" />
              </div>
              
              <div className="text-center space-y-1">
                 <p className="text-sm font-medium text-[color:var(--text)] opacity-90">{t('scan_to_verify')}</p>
                 <p className="text-xs text-[color:var(--muted)] font-mono">{short(qrOf.jti, 8)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                 <button onClick={()=>copy(qrOf.dataUrl)} className="h-10 rounded-xl bg-[color:var(--panel-2)] border border-[color:var(--border)] text-xs font-medium hover:bg-[color:var(--border)] transition-colors">Copy URL</button>
                 <button onClick={()=>setQrOf(null)} className="h-10 rounded-xl bg-[color:var(--brand)] text-white text-xs font-medium hover:opacity-90 transition-opacity">Done</button>
              </div>
           </div>
        </div>
      )}

    </section>
  );
}

// --- Utils ---
function short(s, n=10){ if (!s) return ""; const t = String(s); return t.length > 2*n ? `${t.slice(0,n)}...` : t; }
function getPrimaryType(vc){ const types = Array.isArray(vc?.type) ? vc.type : [vc?.type].filter(Boolean); return types.find(t => t !== "VerifiableCredential") || types[0] || null; }
function initials(text){ if (!text) return "VC"; const parts = text.split(/\s+/).filter(Boolean); return ((parts[0]?.[0]||"") + (parts[parts.length-1]?.[0]||"")).toUpperCase(); }