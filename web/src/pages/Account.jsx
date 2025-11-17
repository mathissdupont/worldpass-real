// src/pages/Account.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useIdentity } from "../lib/identityContext";
import { loadProfile, saveProfile } from "../lib/storage";
import VisualIDCardVertical from "../components/VisualIDCardVertical";
import { t } from "../lib/i18n";

/* --- Animasyonlu mesaj --- */
function Toast({ msg, onClose }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [msg, onClose]);

  if (!msg) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded-xl shadow-lg border bg-[color:var(--panel)] animate-in slide-in-from-bottom-2 fade-in duration-300 hover:scale-105 transition-transform">
        <div className="flex items-center gap-2 text-sm">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        {msg}
      </div>
    </div>
  );
}

/* --- MiniQR (dinamik import) --- */
function MiniQR({ value, size = 112 }) {
  const ref = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const QR = await import("qrcode");
      if (!alive || !ref.current) return;
      await QR.toCanvas(ref.current, value || "", {
        width: size,
        margin: 1,
        // koyu çizgi + şeffaf zemin -> her temaya uyumlu
        color: { dark: "#111111", light: "#00000000" },
        errorCorrectionLevel: "M",
      });
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [value, size]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--panel-2)] rounded-lg">
          <div className="w-6 h-6 border-2 border-[color:var(--brand-2)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <canvas ref={ref} width={size} height={size} className="mx-auto rounded-lg shadow-sm" aria-label="DID QR" />
    </div>
  );
}

/* --- yardımcılar --- */
function initials(name){
  if (!name) return "WP";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0,2).map(p => p[0]?.toUpperCase()).join("") || "WP";
}

function Pill({ ok, text }) {
  return (
    <span className="wp-pill">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'} opacity-80`} />
      {text}
    </span>
  );
}

export default function Account(){
  const { identity, displayName, setDisplayName } = useIdentity();
  const [nameInput, setNameInput] = useState(displayName || "");
  const [msg, setMsg] = useState(null);
  const [showDid, setShowDid] = useState(false);
  const hasDid = !!identity?.did;

  useEffect(() => {
    const p = loadProfile();
    if (p?.displayName){
      setDisplayName(p.displayName);
      setNameInput(p.displayName);
    }
  }, [setDisplayName]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 1800);
    return () => clearTimeout(t);
  }, [msg]);

  const avatar = useMemo(() => initials(displayName || nameInput), [displayName, nameInput]);

  const didShort = useMemo(() => {
    if (!identity?.did) return "—";
    if (showDid) return identity.did;
    const d = identity.did;
    if (d.length <= 36) return d;
    return `${d.slice(0,22)}…${d.slice(-10)}`;
  }, [identity?.did, showDid]);

  const handleSaveName = () => {
    const name = nameInput.trim();
    setDisplayName(name);
    saveProfile({ ...(loadProfile() || {}), displayName: name });
    setMsg(t('name_updated'));
  };

  const handleCopyDid = async () => {
    if (!identity?.did) return;
    try { await navigator.clipboard.writeText(identity.did); setMsg("DID kopyalandı"); }
    catch { setMsg("Kopyalanamadı"); }
  };

  const handleDownload = () => {
    if (!identity) return;
    const blob = new Blob([JSON.stringify(identity, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "worldpass_identity.wpkeystore"; a.click();
    URL.revokeObjectURL(url);
    setMsg(t('identity_json_downloaded'));
  };

  return (
    <section className="relative">
      {/* hafif accent ışıması (temaya uyumlu, düşük opaklık) */}
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[color:var(--panel-2)]/30" />

      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--panel)] shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[color:var(--border)] bg-[color:var(--panel)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 rounded-2xl bg-[color:var(--brand)] text-white flex items-center justify-center text-xl font-semibold shadow-sm">
                {avatar}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight truncate text-[color:var(--text)]">
                  {displayName || t('no_display_name')}
                </h2>
                <div className="mt-1 inline-flex items-center gap-2 text-xs">
                  <Pill ok={hasDid} text={hasDid ? t('identity_ready') : t('identity_missing')} />
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setShowDid(v => !v)}
                disabled={!hasDid}
                className="group inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] transition text-[color:var(--text)] disabled:opacity-50"
                title={showDid ? t('hide_identity') : t('show_identity')}
              >
                {/* iconlar aynı */}
                {showDid ? (
                  <svg className="h-4 w-4 opacity-70 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 3l18 18" /><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
                    <path d="M16.24 16.24C14.92 17.02 13.5 17.5 12 17.5 6.5 17.5 3 12 3 12s1.4-2.22 3.76-3.76" />
                    <path d="M9.9 4.24C10.57 4.08 11.28 4 12 4c5.5 0 9 8 9 8s-.62 1.24-1.76 2.48" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 opacity-70 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M1 12s4.5-8 11-8 11 8 11 8-4.5 8-11 8S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
                <span className="text-sm">{showDid ? t('hide_identity') : t('show_identity')}</span>
              </button>

              <button
                onClick={handleCopyDid}
                disabled={!hasDid}
                className="group inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] transition text-[color:var(--text)] disabled:opacity-50"
              >
                <svg className="h-4 w-4 opacity-70 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><rect x="2" y="2" width="13" height="13" rx="2" />
                </svg>
                <span className="text-sm">{t('copy')}</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={!hasDid}
                className="group inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] transition text-[color:var(--text)] disabled:opacity-50"
              >
                <svg className="h-4 w-4 opacity-70 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 3v12" /><path d="M8 11l4 4 4-4" /><rect x="4" y="17" width="16" height="4" rx="1" />
                </svg>
                <span className="text-sm">{t('download_json')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 grid lg:grid-cols-[1fr,22rem] gap-8 items-start">
          {/* Sol: Kart */}
            <div className="min-w-0">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-2)] p-4 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow duration-200">
                {hasDid ? (
                  <>
                    <VisualIDCardVertical did={identity.did} name={displayName} />
                    <p className="text-xs text-gray-500 mt-2">{t('qr_description')}</p>
                  </>
                ) : (
                  <p className="text-sm text-[color:var(--muted)] text-center">
                    {t('no_identity_yet')}
                  </p>
                )}
              </div>
            </div>

          {/* Sağ: Form + DID + mini QR */}
          <div className="space-y-6">
            {/* İsim düzenleme */}
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
              <label className="text-sm text-[color:var(--muted)]">Görünecek İsim</label>
              <div className="mt-2 flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    placeholder="Örn. Ada Yılmaz"
                    className="wp-input"
                  />
                  <svg className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" /><path d="M14.06 4.94l3.75 3.75" />
                  </svg>
                </div>
                <button
                  onClick={handleSaveName}
                  className="px-4 py-2 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 active:opacity-80 transition hover:scale-105"
                >
                  Kaydet
                </button>
              </div>
            </div>

            {/* DID kutusu */}
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-[color:var(--muted)]">DID</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDid(v => !v)}
                    disabled={!hasDid}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs disabled:opacity-50"
                    title={showDid ? "Kimliği gizle" : "Kimliği göster"}
                  >
                    {showDid ? "Gizle" : "Göster"}
                  </button>
                  <button
                    onClick={handleCopyDid}
                    disabled={!hasDid}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs disabled:opacity-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="9" y="9" width="13" height="13" rx="2" /><rect x="2" y="2" width="13" height="13" rx="2" />
                    </svg>
                    Kopyala
                  </button>
                </div>
              </div>

              <div className="font-mono text-xs break-all bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-xl p-3">
                {didShort}
              </div>

              {hasDid && (
                <div className="mt-3 grid grid-cols-[auto,1fr] items-center gap-3">
                  <MiniQR value={identity.did} />
                  <div className="text-xs text-[color:var(--muted)]">
                    <div>{t('mini_qr_hint')}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] transition text-xs"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M12 3v12" /><path d="M8 11l4 4 4-4" /><rect x="4" y="17" width="16" height="4" rx="1" />
                        </svg>
                        {t('download_json')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* mesaj */}
            {msg && (
                <div className="text-xs border rounded-xl px-3 py-2 bg-[color:var(--panel-2)] border-emerald-400/30 text-emerald-300">
                {msg}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast mesaj */}
      <Toast msg={msg} onClose={() => setMsg(null)} />
    </section>
  );
}
