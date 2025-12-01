// src/pages/credentials/VCList.jsx
import { useEffect, useMemo, useState } from "react";
import { loadVCs, removeVC } from "../lib/storage";
import { t } from "../lib/i18n";
import { qrToDataURL } from "../lib/qr";

function cx(...xs){ return xs.filter(Boolean).join(" "); }

// Badge bileşeni (Ufak dokunuş: mobilde satır kaymasını önlemek için whitespace-nowrap)
function Badge({ tone="neutral", children }) {
  const map = {
    neutral: "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]",
    ok:   "border-emerald-400/30 bg-[color:var(--panel-2)] text-emerald-300",
    warn: "border-amber-400/30  bg-[color:var(--panel-2)] text-amber-300",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 text-[10px] sm:text-xs px-2 py-1 rounded-md border whitespace-nowrap",
        map[tone]
      )}
    >
      {children}
    </span>
  );
}

export default function VCList({ onRevoke }) {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [qrOf, setQrOf] = useState(null);
  const [previewJti, setPreviewJti] = useState(null);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const filtered = useMemo(() => {
    if (activeType === "all") return textFiltered;
    return textFiltered.filter(vc => getPrimaryType(vc) === activeType);
  }, [textFiltered, activeType]);

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

  const stats = useMemo(() => ({
    total: list.length,
    filtered: filtered.length,
    issuers: new Set(list.map(v => v?.issuer).filter(Boolean)).size,
  }), [list, filtered]);

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
      setMsg({ type: "err", text: "QR üretilemedi: " + (e?.message || e) });
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
    if (!confirm("Bu credential’ı listeden kaldırmak istediğine emin misin?")) return;
    try {
      const updated = await removeVC(jti);
      setList(safeSort(updated));
      if (previewJti === jti) setPreviewJti(null);
      setMsg({ type: "ok", text: "Credential kaldırıldı." });
    } catch (e) {
      console.warn("hardRemove failed", e);
      setMsg({ type: "err", text: "Credential kaldırılamadı." });
    }
  }

  const copy = (txt, ok="Kopyalandı.", fail="Kopyalanamadı.") =>
    navigator.clipboard.writeText(txt).then(
      ()=> setMsg({type:"ok", text: ok}),
      ()=> setMsg({type:"info", text: fail})
    );

  return (
    <section className="space-y-4 pb-20 sm:pb-0"> 
      {/* Header Area */}
      <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-[12px] uppercase tracking-[0.2em] text-[color:var(--muted)] font-bold">{t('wallet_overview')}</p>
            <h2 className="text-xl sm:text-2xl font-bold mt-1">{t('my_credentials')}</h2>
            <p className="text-[13px] text-[color:var(--muted)] mt-1 hidden sm:block">{t('credentials_intro')}</p>
          </div>
          <div className="w-full md:w-auto">
            <input
              value={filter}
              onChange={(e)=>setFilter(e.target.value)}
              placeholder={t('search_placeholder')}
              className="h-10 w-full md:w-[240px] px-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] text-sm transition-all"
            />
          </div>
        </div>

        {/* IMPROVEMENT 1: Mobile Horizontal Scroll for Stats 
           Mobilde alt alta 3 kart yerine, yana kaydırılabilir (snap-scroll) bir alan yaptık.
        */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible no-scrollbar">
          <div className="snap-start min-w-[85%] sm:min-w-0">
             <StatCard label={t('total_credentials')} value={stats.total} helper={t('including_archived')} />
          </div>
          <div className="snap-start min-w-[85%] sm:min-w-0">
             <StatCard label={t('filtered')} value={stats.filtered} helper={filter ? t('matching_filters') : t('showing_all')} />
          </div>
          <div className="snap-start min-w-[85%] sm:min-w-0">
             <StatCard label={t('unique_issuers')} value={stats.issuers} helper={t('issuer_plural')} />
          </div>
        </div>

        {typeFacets.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <FilterChip
              active={activeType === "all"}
              onClick={() => setActiveType("all")}
            >
              {t('all_types')} <span className="opacity-60 text-[0.9em] ml-1">{list.length}</span>
            </FilterChip>
            {typeFacets.map(({ type, count }) => (
              <FilterChip
                key={type}
                active={activeType === type}
                onClick={() => setActiveType(type)}
              >
                {type} <span className="opacity-60 text-[0.9em] ml-1">{count}</span>
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-[var(--radius)] border border-rose-400/40 bg-rose-500/5 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="animate-pulse rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] p-4 h-32" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-[var(--radius)] border border-dashed border-[color:var(--border)] bg-[color:var(--panel-2)] p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
          <div className="text-4xl mb-2 opacity-20">📇</div>
          <div className="text-sm text-[color:var(--muted)]">{t('no_credentials_yet')}</div>
          {filter && (
            <button
              onClick={() => { setFilter(""); setActiveType("all"); }}
              className="mt-3 px-4 py-2 rounded-lg bg-[color:var(--panel)] border border-[color:var(--border)] text-xs font-medium hover:bg-[color:var(--panel-2)] transition-colors"
            >
              {t('clear_filters')}
            </button>
          )}
        </div>
      )}

      {/* Main List */}
      <div className="grid gap-3">
        {filtered.map((vc) => {
          const types = Array.isArray(vc?.type) ? vc.type : [vc?.type].filter(Boolean);
          const title = [types?.find(t => t !== "VerifiableCredential") || types?.[0] || "VC"]
            .filter(Boolean).join(", ");
          const subjectLabel = vc?.credentialSubject?.name || vc?.credentialSubject?.id || "";
          const issued = vc?.issuanceDate ? new Date(vc.issuanceDate).toLocaleString() : null;

          return (
            <article key={vc?.jti || Math.random()} className="group relative rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-sm transition-all hover:border-[color:var(--brand-2)]/50">
              <div className="flex flex-col gap-4">
                
                {/* Top Section: Icon + Text */}
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center text-base font-bold text-[color:var(--brand)] shadow-sm">
                    {initials(subjectLabel || title)}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-semibold text-[color:var(--text)] leading-tight">
                        {title}
                      </h3>
                      {subjectLabel && (
                        <span className="hidden sm:inline text-[color:var(--muted)] text-sm">• {subjectLabel}</span>
                      )}
                    </div>
                     {/* Mobile only subject label to save horizontal space on title */}
                    {subjectLabel && <div className="sm:hidden text-xs text-[color:var(--text)] mb-1 opacity-90">{subjectLabel}</div>}

                    <div className="flex flex-wrap gap-2 mb-2">
                       {Array.isArray(types) && types.length > 0 && (
                          <Badge tone="ok">{types[0] === "VerifiableCredential" && types[1] ? types[1] : types[0]}</Badge>
                        )}
                         <Badge tone="neutral">JTI: {short(vc?.jti, 4)}</Badge>
                    </div>

                    <div className="text-[11px] text-[color:var(--muted)] flex flex-wrap gap-x-3 gap-y-1">
                       {issued && <span>{t('issued')}: <time className="text-[color:var(--text)] opacity-80">{issued.split(',')[0]}</time></span>}
                       <span className="opacity-50 hidden sm:inline">|</span>
                       <span>{t('issuer_label')}: <code className="font-mono text-[color:var(--text)] opacity-80">{short(vc?.issuer)}</code></span>
                    </div>
                  </div>
                </div>

                {/* Middle: Quick Actions (Copy / JSON) 
                    IMPROVEMENT 3: Text Linkler yerine ufak touch-target butonlar
                */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[color:var(--border)]/50">
                   {vc?.jti && (
                     <SmallAction onClick={()=>copy(vc.jti, t('jti_copied'))} label={t('copy_jti')} icon="📋" />
                   )}
                   {vc?.issuer && (
                     <SmallAction onClick={()=>copy(vc.issuer, t('issuer_copied'))} label={t('copy_issuer')} icon="🏛️" />
                   )}
                   <SmallAction 
                      onClick={()=>setPreviewJti(p => p === vc?.jti ? null : vc?.jti)} 
                      label={previewJti === vc?.jti ? t('hide_json') : t('show_json')} 
                      icon="{}" 
                      active={previewJti === vc?.jti}
                   />
                </div>

                {/* Bottom: Main Actions 
                    IMPROVEMENT 2: Mobile için Grid Layout
                    Mobilde butonlar 2 sütunlu grid, masaüstünde flex row.
                */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-2 mt-1">
                  <ActionButton icon="qr" label={t('show_qr')} onClick={() => showQR(vc)} highlight />
                  <ActionButton icon="download" label={t('download')} onClick={() => downloadVC(vc)} />
                  {vc?.jti && onRevoke && (
                    <ActionButton icon="revoke" label={t('revoke')} onClick={() => onRevoke(vc.jti)} />
                  )}
                  <ActionButton icon="trash" label={t('remove')} onClick={() => hardRemove(vc?.jti)} tone="danger" />
                </div>
              </div>

              {/* JSON Preview Panel */}
              {previewJti === vc?.jti && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                   <div className="flex items-center justify-between text-[10px] text-[color:var(--muted)] mb-1 uppercase tracking-wider pl-1">
                      <span>Raw Data</span>
                      <button onClick={()=>copy(JSON.stringify(vc), "JSON kopyalandı")} className="hover:text-[color:var(--brand)]">COPY ALL</button>
                   </div>
                   <pre className="text-[10px] sm:text-xs font-mono bg-[color:var(--panel-2)] text-[color:var(--text)] border border-[color:var(--border)] rounded-xl p-4 max-h-80 overflow-auto shadow-inner">
                    {JSON.stringify(vc, null, 2)}
                  </pre>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Toast Messages - Fixed bottom on mobile for better visibility */}
      {msg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
           <div className={cx(
             "text-sm font-medium text-center rounded-xl px-4 py-3 border shadow-lg backdrop-blur-md",
             msg.type==="ok"
               ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-200"
               : msg.type==="err"
               ? "border-rose-500/30 bg-rose-950/80 text-rose-200"
               : "border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)]"
           )}>
             {msg.text}
           </div>
        </div>
      )}

      {/* QR Modal - Improved Mobile Sizing */}
      {qrOf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={()=>setQrOf(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-2xl relative overflow-hidden" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t('vc_qr_title')}</h3>
              <button onClick={()=>setQrOf(null)} className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-[color:var(--panel-2)] hover:bg-[color:var(--border)] transition-colors">✕</button>
            </div>
            
            <div className="flex flex-col items-center gap-4">
             <div className="bg-white p-3 rounded-xl shadow-inner">
                <img src={qrOf.dataUrl} alt="VC QR" className="w-48 h-48 sm:w-56 sm:h-56 object-contain" />
             </div>

              <div className="text-xs text-center text-[color:var(--muted)] bg-[color:var(--panel-2)] p-3 rounded-lg w-full break-all border border-[color:var(--border)]">
                 <div className="mb-1"><span className="font-semibold">{t('jti_label')}:</span> {short(qrOf.jti)}</div>
                 <div><span className="font-semibold">{t('issuer_label')}:</span> {short(qrOf.issuer)}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <ActionButton icon="download" label={t('png')} onClick={()=>downloadDataUrl(qrOf.dataUrl, `${qrOf.jti || "vc"}.png`)} />
                <ActionButton icon="qr" label={t('copy_url')} onClick={()=>copy(qrOf.dataUrl, t('qr_data_url_copied'))} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* -------------- Sub Components & Helpers -------------- */

// Küçük yardımcı butonlar (Copy JTI vb.)
function SmallAction({ onClick, label, icon, active }) {
  return (
    <button 
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-colors border",
        active 
          ? "bg-[color:var(--brand)] text-white border-[color:var(--brand)]" 
          : "bg-[color:var(--panel-2)] border-transparent text-[color:var(--muted)] hover:text-[color:var(--text)] hover:border-[color:var(--border)]"
      )}
    >
      <span className="opacity-70">{icon}</span> {label}
    </button>
  )
}

function StatCard({ label, value, helper }){
  return (
    <div className="h-full rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel-2)] p-3 flex flex-col justify-between shadow-sm min-w-[140px]">
      <p className="text-[10px] uppercase tracking-wide text-[color:var(--muted)] font-semibold">{label}</p>
      <div className="text-2xl font-bold text-[color:var(--text)] my-1">{value}</div>
      <p className="text-[10px] text-[color:var(--muted)] truncate">{helper}</p>
    </div>
  );
}

function FilterChip({ active, children, onClick }){
  return (
    <button
      onClick={onClick}
      className={cx(
        "px-3 py-1.5 rounded-full border text-xs whitespace-nowrap transition-all",
        active
          ? "border-[color:var(--brand)] bg-[color:var(--brand)]/10 text-[color:var(--brand)] font-medium shadow-sm"
          : "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)] hover:bg-[color:var(--panel)]"
      )}
    >
      {children}
    </button>
  );
}

// Ana Aksiyon butonları (QR, İndir vs.)
function ActionButton({ icon, label, onClick, highlight, tone }){
  return (
    <button
      onClick={onClick}
      className={cx(
        "h-10 px-3 flex items-center justify-center sm:justify-start gap-2 rounded-lg border text-xs sm:text-sm font-medium transition-all active:scale-95",
        highlight 
          ? "border-[color:var(--brand)]/30 bg-[color:var(--brand)]/5 text-[color:var(--brand)] hover:bg-[color:var(--brand)]/10"
          : tone === "danger"
            ? "border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
            : "border-[color:var(--border)] bg-[color:var(--panel-2)] hover:bg-[color:var(--panel)] text-[color:var(--text)]"
      )}
    >
      <span className={cx("text-base", tone === "danger" ? "text-rose-400" : "text-[color:var(--muted)]")}>
        {icon === "qr" && "◱"}
        {icon === "download" && "⇩"}
        {icon === "revoke" && "⚠"}
        {icon === "trash" && "✕"}
      </span>
      <span>{label}</span>
    </button>
  );
}

/* Helpers */
function short(s, n=10){
  if (!s) return "-";
  const t = String(s);
  return t.length > 2*n ? `${t.slice(0,n)}…${t.slice(-n)}` : t;
}

function downloadDataUrl(dataUrl, filename){
  fetch(dataUrl)
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename || "qr.png";
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(()=>{});
}

function getPrimaryType(vc){
  const types = Array.isArray(vc?.type) ? vc.type : [vc?.type].filter(Boolean);
  return types.find(t => t !== "VerifiableCredential") || types[0] || null;
}

function initials(text){
  if (!text) return "VC";
  const parts = text.split(/\s+/).filter(Boolean);
  if (!parts.length) return text.slice(0,2).toUpperCase();
  const first = parts[0][0] || "";
  const last = parts[parts.length - 1][0] || "";
  return (first + last).toUpperCase();
}