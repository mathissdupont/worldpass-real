// src/pages/Account.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useIdentity } from "../lib/identityContext";
import { loadProfile, saveProfile } from "../lib/storage";
import { getUserProfileData, saveUserProfileData } from "../lib/api";
import VisualIDCardVertical from "../components/VisualIDCardVertical";
import { Button, Input, Card, Badge, Toast as UIToast, Spinner } from "../components/ui";
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
  const [activeTab, setActiveTab] = useState("identity"); // "identity" or "profile"
  const [profileData, setProfileData] = useState({});
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const hasDid = !!identity?.did;

  // Profile fields definition
  const profileFields = [
    { id: "email", label: "Email", icon: "📧", type: "email" },
    { id: "phone", label: "Telefon", icon: "📱", type: "tel" },
    { id: "instagram", label: "Instagram", icon: "📷", type: "text" },
    { id: "twitter", label: "Twitter/X", icon: "🐦", type: "text" },
    { id: "linkedin", label: "LinkedIn", icon: "💼", type: "text" },
    { id: "github", label: "GitHub", icon: "💻", type: "text" },
    { id: "website", label: "Website", icon: "🌐", type: "url" },
    { id: "bio", label: "Bio", icon: "📝", type: "textarea" },
  ];

  useEffect(() => {
    const p = loadProfile();
    if (p?.displayName){
      setDisplayName(p.displayName);
      setNameInput(p.displayName);
    }
  }, [setDisplayName]);

  // Load profile data
  useEffect(() => {
    if (activeTab === "profile" && hasDid) {
      setLoadingProfile(true);
      getUserProfileData()
        .then(resp => {
          setProfileData(resp.profile_data || {});
        })
        .catch(err => {
          console.error("Profile load error:", err);
        })
        .finally(() => {
          setLoadingProfile(false);
        });
    }
  }, [activeTab, hasDid]);

  const handleSaveProfileField = async (fieldId, value) => {
    try {
      const updated = { ...profileData, [fieldId]: value };
      await saveUserProfileData({ profile_data: updated });
      setProfileData(updated);
      setEditingField(null);
      setMsg({ type: 'success', text: 'Kaydedildi!' });
    } catch (err) {
      console.error("Save error:", err);
      setMsg({ type: 'error', text: 'Kaydedilemedi' });
    }
  };

  const handleRemoveProfileField = async (fieldId) => {
    try {
      const updated = { ...profileData };
      delete updated[fieldId];
      await saveUserProfileData({ profile_data: updated });
      setProfileData(updated);
      setMsg({ type: 'success', text: 'Silindi' });
    } catch (err) {
      console.error("Remove error:", err);
      setMsg({ type: 'error', text: 'Silinemedi' });
    }
  };

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
      {/* Toast Message */}
      {msg && <UIToast type={msg.type} message={msg.text} onClose={() => setMsg(null)} />}

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
              <span className="hidden sm:inline">{showDid ? "Gizle" : "Göster"}</span>
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
              <span className="hidden sm:inline">Kopyala</span>
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
              <span className="hidden sm:inline">İndir</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-[color:var(--border)]">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("identity")}
            className={`px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "identity"
                ? "border-[color:var(--brand)] text-[color:var(--text)]"
                : "border-transparent text-[color:var(--muted)] hover:text-[color:var(--text)]"
            }`}
          >
            🆔 Kimlik Kartı
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "profile"
                ? "border-[color:var(--brand)] text-[color:var(--text)]"
                : "border-transparent text-[color:var(--muted)] hover:text-[color:var(--text)]"
            }`}
          >
            👤 Profil Bilgileri
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "identity" && (
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
          <Card title="İsim">
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
                Kaydet
              </Button>
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
                  Ödeme sistemi - İşlemlerinizi yönetin
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="primary"
                    onClick={() => navigate('/pay/demo')}
                    className="flex-1 sm:flex-none"
                  >
                    💳 Yeni Ödeme
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/account/payments')}
                    className="flex-1 sm:flex-none"
                  >
                    İşlem Geçmişi
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
                  {showDid ? 'Gizle' : 'Göster'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyDid}
                  disabled={!hasDid}
                >
                  Kopyala
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
                    <p className="mb-2">QR kodu tarayarak kimliğinizi paylaşabilirsiniz</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownload}
                    >
                      JSON İndir
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      )}

      {/* Profile Tab Content */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          {!hasDid ? (
            <Card>
              <div className="text-center py-12">
                <svg className="h-16 w-16 mx-auto text-[color:var(--muted)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" opacity="0.2" />
                  <path d="M12 8v4m0 4h.01" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p className="text-[color:var(--muted)]">
                  Profil bilgilerini kullanmak için önce kimlik oluşturmalısınız
                </p>
              </div>
            </Card>
          ) : loadingProfile ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {profileFields.map(field => {
                const value = profileData[field.id];
                const isEditing = editingField === field.id;

                if (!isEditing && !value) {
                  return (
                    <div 
                      key={field.id}
                      onClick={() => setEditingField(field.id)}
                      className="group p-4 rounded-xl border-2 border-dashed border-[color:var(--border)] hover:border-[color:var(--brand)] hover:bg-[color:var(--panel-2)] cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">{field.icon}</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-[color:var(--text)] opacity-50 group-hover:opacity-100">
                            {field.label} Ekle
                          </div>
                          <div className="text-xs text-[color:var(--muted)]">Tıklayarak ekleyin</div>
                        </div>
                        <svg className="h-5 w-5 text-[color:var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </div>
                  );
                }

                if (isEditing) {
                  const EditField = ({ field, value, onSave, onCancel }) => {
                    const [localValue, setLocalValue] = useState(value || "");
                    
                    return (
                      <div className="p-4 rounded-xl border border-[color:var(--brand)] bg-[color:var(--panel)] shadow-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-2xl">{field.icon}</div>
                          <div className="flex-1 text-sm font-semibold text-[color:var(--text)]">{field.label}</div>
                        </div>
                        {field.type === "textarea" ? (
                          <textarea
                            value={localValue}
                            onChange={(e) => setLocalValue(e.target.value)}
                            placeholder={field.placeholder}
                            rows={3}
                            className="w-full px-3 py-2 mb-3 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg text-[color:var(--text)] placeholder-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent resize-none text-sm"
                            autoFocus
                          />
                        ) : (
                          <Input
                            type={field.type}
                            value={localValue}
                            onChange={(e) => setLocalValue(e.target.value)}
                            placeholder={field.placeholder}
                            className="mb-3"
                            autoFocus
                          />
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onSave(localValue)}
                            className="flex-1"
                          >
                            Kaydet
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onCancel}
                            className="flex-1"
                          >
                            İptal
                          </Button>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <EditField
                      key={field.id}
                      field={field}
                      value={value}
                      onSave={(newValue) => handleSaveProfileField(field.id, newValue)}
                      onCancel={() => setEditingField(null)}
                    />
                  );
                }

                return (
                  <div key={field.id} className="p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{field.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[color:var(--muted)] mb-1">{field.label}</div>
                        <div className="text-sm text-[color:var(--text)] break-all">{value}</div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingField(field.id)}
                          className="p-1.5 rounded-lg hover:bg-[color:var(--panel-2)] text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
                          title="Düzenle"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveProfileField(field.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-[color:var(--muted)] hover:text-rose-600 transition-colors"
                          title="Sil"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      <UIToast toast={msg} onClose={() => setMsg(null)} />
    </div>
  );
}
