// src/pages/credentials/VCList.jsx
import { useEffect, useMemo, useState } from "react";
import { loadVCs, removeVC } from "../lib/storage";
import { t } from "../lib/i18n";
import QRCode from "qrcode";

function cx(...xs){ return xs.filter(Boolean).join(" "); }

function Badge({ tone="neutral", children }) {
  const map = {
    neutral: "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]",
    ok:   "border-emerald-400/30 bg-[color:var(--panel-2)] text-emerald-300",
    warn: "border-amber-400/30  bg-[color:var(--panel-2)] text-amber-300",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border",
        map[tone]
      )}
    >
      {children}
    </span>
  );
}


export default function VCList({ onRevoke }) {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState("");          // basit arama
  const [qrOf, setQrOf] = useState(null);            // { jti, issuer, dataUrl }
  const [previewJti, setPreviewJti] = useState(null); // JSON toggle
  const [msg, setMsg] = useState(null);              // {type, text}

  useEffect(() => {
  let cancelled = false;

  (async () => {
    const vcs = await loadVCs();   // <-- Artık Promise çözülüyor
    if (!cancelled) {
      setList(safeSort(vcs));      // <-- Artık gerçek array
    }
  })();

  return () => { cancelled = true; };
}, []);


  const filtered = useMemo(() => {
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
      const url = await QRCode.toDataURL(data, { width: 256, errorCorrectionLevel: "M" });
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
    const updated = await removeVC(jti); // <-- backend/local storage sync
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
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('my_credentials')}</h2>
          <p className="text-[12px] text-[color:var(--muted)]">{t('credentials_intro')}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={filter}
            onChange={(e)=>setFilter(e.target.value)}
            placeholder={t('search_placeholder')}
            className="h-9 w-[240px] px-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] text-sm"
          />
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel-2)] p-6 text-center">
          <div className="text-sm text-[color:var(--muted)]">{t('no_credentials_yet')}</div>
        </div>
      )}

      {/* List */}
      <div className="grid gap-3">
        {filtered.map((vc) => {
          const types = Array.isArray(vc?.type) ? vc.type : [vc?.type].filter(Boolean);
          const title = [types?.find(t => t !== "VerifiableCredential") || types?.[0] || "VC"]
            .filter(Boolean).join(", ");
          const subjectLabel = vc?.credentialSubject?.name || vc?.credentialSubject?.id || "";
          const issued = vc?.issuanceDate ? new Date(vc.issuanceDate).toLocaleString() : null;

          return (
            <article key={vc?.jti || Math.random()} className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)] p-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[color:var(--text)]">{title}{subjectLabel ? ` — ${subjectLabel}` : ""}</div>
                  <div className="text-[11px] text-[color:var(--muted)] mt-0.5">
                    {issued ? <>{t('issued')}: <time dateTime={vc?.issuanceDate}>{issued}</time> · </> : null}
                    {t('issuer_label')}: <code className="font-mono">{short(vc?.issuer)}</code>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{t('jti_label')}: <code className="font-mono">{short(vc?.jti)}</code></Badge>
                    {Array.isArray(types) && types.length>0 && <Badge tone="ok">{types.join(", ")}</Badge>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => showQR(vc)}
                    className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"
                  >
                    {t('show_qr')}
                  </button>
                  <button
                    onClick={() => downloadVC(vc)}
                    className="h-9 px-3 rounded-lg border border-[color:var(--border)]/80 bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"
                  >
                    {t('download')}
                  </button>
                  {vc?.jti && onRevoke && (
                    <button
                      onClick={() => onRevoke(vc.jti)}
                     className="h-9 px-3 rounded-lg border border-[color:var(--border)]/80 bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"

                    >
                      {t('revoke')}
                    </button>
                  )}
                  <button
                    onClick={() => hardRemove(vc?.jti)}
                    className="h-9 px-3 rounded-lg border border-[color:var(--border)]/80 bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"

                  >
                    {t('remove')}
                  </button>
                </div>
              </div>

              {/* Secondary row: copy & preview */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {vc?.jti && (
                  <button
                    onClick={()=>copy(vc.jti, t('jti_copied'))}
                    className="text-[11px] underline text-[color:var(--text)]/80 hover:text-[color:var(--text)]"
                  >
                    {t('copy_jti')}
                  </button>
                )}
                {vc?.issuer && (
                  <button
                    onClick={()=>copy(vc.issuer, t('issuer_copied'))}
                    className="text-[11px] underline text-[color:var(--text)]/80 hover:text-[color:var(--text)]"
                  >
                    {t('copy_issuer')}
                  </button>
                )}
                <button
                  onClick={()=>setPreviewJti(p => p === vc?.jti ? null : vc?.jti)}
                  className="text-[11px] underline text-[color:var(--text)]/80 hover:text-[color:var(--text)]"
                >
                  {previewJti === vc?.jti ? t('hide_json') : t('show_json')}
                </button>
              </div>

              {previewJti === vc?.jti && (
                <pre className="mt-2 text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-xl p-3 max-h-64 overflow-auto">
{JSON.stringify(vc, null, 2)}
                </pre>
              )}
            </article>
          );
        })}
      </div>

      {/* Toast-ish message */}
      {msg && (
        <div className={cx(
          "text-xs rounded-lg px-3 py-2 border",
          msg.type==="ok"
            ? "border-emerald-400/30 bg-[color:var(--panel-2)] text-emerald-300"
            : msg.type==="err"
            ? "border-rose-400/30 bg-[color:var(--panel-2)] text-rose-300"
            : "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]"
        )}>
          {msg.text}
        </div>
      )}


      {/* QR Modal */}
      {qrOf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={()=>setQrOf(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">{t('vc_qr_title')}</div>
              <button onClick={()=>setQrOf(null)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-[color:var(--panel-2)]">✕</button>
            </div>
            <div className="flex flex-col items-center gap-2">
             <img src={qrOf.dataUrl} alt="VC QR"
     className="rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] p-2" />

              <div className="text-[11px] text-[color:var(--muted)] break-all w-full">
                {t('jti_label')}: <code className="font-mono">{qrOf.jti || "-"}</code><br/>
                {t('issuer_label')}: <code className="font-mono">{qrOf.issuer || "-"}</code>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={()=>downloadDataUrl(qrOf.dataUrl, `${qrOf.jti || "vc"}.png`)}
                  className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"
                >
                  {t('download_png')}
                </button>
                <button
                  onClick={()=>copy(qrOf.dataUrl, t('qr_data_url_copied'))}
                  className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"
                >
                  {t('copy_data_url')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* -------------- helpers -------------- */
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
    .catch(()=>{/* sessiz */});
}
