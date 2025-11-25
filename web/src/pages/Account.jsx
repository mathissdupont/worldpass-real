// src/pages/Account.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIdentity } from "../lib/identityContext";
import { loadProfile, saveProfile } from "../lib/storage";
import VisualIDCardVertical from "../components/VisualIDCardVertical";
import { Button, Input, Card, Badge, Toast as UIToast } from "../components/ui";
import { Spinner } from "../components/ui/Loading";
import { t } from "../lib/i18n";

/* --- MiniQR (dynamic import) --- */
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
          <Spinner size="md" />
        </div>
      )}
      <canvas 
        ref={ref} 
        width={size} 
        height={size} 
        className="mx-auto rounded-lg shadow-sm" 
        aria-label="DID QR Code"
      />
    </div>
  );
}

/* --- Helpers --- */
function initials(name){
  if (!name) return "WP";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0,2).map(p => p[0]?.toUpperCase()).join("") || "WP";
}

export default function Account(){
  const { identity, displayName, setDisplayName } = useIdentity();
  const navigate = useNavigate();
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
    setMsg({ type: 'success', text: t('name_updated') });
  };

  const handleCopyDid = async () => {
    if (!identity?.did) return;
    try { 
      await navigator.clipboard.writeText(identity.did); 
      setMsg({ type: 'success', text: "DID kopyalandı" }); 
    } catch { 
      setMsg({ type: 'error', text: "Kopyalanamadı" }); 
    }
  };

  const handleDownload = () => {
    if (!identity) return;
    const blob = new Blob([JSON.stringify(identity, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "worldpass_identity.wpkeystore"; a.click();
    URL.revokeObjectURL(url);
    setMsg({ type: 'success', text: t('identity_json_downloaded') });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <div 
              className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg"
              aria-label={`Avatar for ${displayName || 'user'}`}
            >
              {avatar}
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold text-[color:var(--text)] mb-2">
              {displayName || t('no_display_name')}
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Badge variant={hasDid ? 'success' : 'warning'}>
                {hasDid ? t('identity_ready') : t('identity_missing')}
              </Badge>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 justify-center md:justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowDid(v => !v)}
              disabled={!hasDid}
              title={showDid ? t('hide_identity') : t('show_identity')}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showDid ? (
                  <>
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4.5-8 11-8 11 8 11 8-4.5 8-11 8S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
              <span className="hidden sm:inline">{showDid ? t('hide_identity') : t('show_identity')}</span>
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyDid}
              disabled={!hasDid}
              title="Copy DID"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <rect x="2" y="2" width="13" height="13" rx="2" />
              </svg>
              <span className="hidden sm:inline">{t('copy')}</span>
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownload}
              disabled={!hasDid}
              title="Download identity"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12" />
                <path d="M8 11l4 4 4-4" />
                <rect x="4" y="17" width="16" height="4" rx="1" />
              </svg>
              <span className="hidden sm:inline">{t('download_json')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Visual ID Card */}
        <Card title={t('identity_card')}>
          <div className="flex flex-col items-center px-2 sm:px-4">
            {hasDid ? (
              <>
                <div className="w-full max-w-[min(100%,380px)]">
                  <VisualIDCardVertical did={identity.did} name={displayName} />
                </div>
                <p className="text-xs text-[color:var(--muted)] mt-4 text-center max-w-sm">
                  {t('qr_description')}
                </p>
              </>
            ) : (
              <div className="py-12 text-center">
                <svg className="h-16 w-16 mx-auto text-[color:var(--muted)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" opacity="0.2" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
                <p className="text-sm text-[color:var(--muted)]">
                  {t('no_identity_yet')}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Settings and DID Info */}
        <div className="space-y-6">
          {/* Name Editor */}
          <Card title={t('display_name')}>
            <div className="flex gap-2">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Örn. Ada Yılmaz"
                className="flex-1"
              />
              <Button
                variant="primary"
                onClick={handleSaveName}
              >
                {t('save')}
              </Button>
            </div>
          </Card>

          {/* Profile Link Card */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[color:var(--text)] mb-1">Profil Bilgileri</h3>
                <p className="text-sm text-[color:var(--muted)] mb-3">
                  Sosyal medya hesaplarınızı ve iletişim bilgilerinizi kimliğinize ekleyin
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/profile')}
                  className="w-full sm:w-auto"
                >
                  Profili Düzenle
                </Button>
              </div>
            </div>
          </Card>

          {/* WorldPass Pay Card */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[color:var(--text)] mb-1">WorldPass Pay</h3>
                <p className="text-sm text-[color:var(--muted)] mb-3">
                  Minimal payment integration demo - Create and manage transactions
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="primary"
                    onClick={() => navigate('/pay/demo')}
                    className="flex-1 sm:flex-none"
                  >
                    💳 New Payment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/account/payments')}
                    className="flex-1 sm:flex-none"
                  >
                    View Transactions
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* DID Display */}
          <Card 
            title="DID"
            action={
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDid(v => !v)}
                  disabled={!hasDid}
                >
                  {showDid ? 'Hide' : 'Show'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyDid}
                  disabled={!hasDid}
                >
                  Copy
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="font-mono text-xs break-all bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-xl p-3">
                {didShort}
              </div>

              {hasDid && (
                <div className="flex items-center gap-4">
                  <MiniQR value={identity.did} />
                  <div className="flex-1 text-xs text-[color:var(--muted)]">
                    <p className="mb-2">{t('mini_qr_hint')}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownload}
                    >
                      {t('download_json')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Toast Notification */}
      <UIToast toast={msg} onClose={() => setMsg(null)} />
    </div>
  );
}
