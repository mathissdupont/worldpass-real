// src/pages/Profile.jsx
import { useState, useEffect } from "react";
import { useIdentity } from "../lib/identityContext";
import { Button, Input, Card } from "../components/ui";
import { getUserProfileData, saveUserProfileData } from "../lib/api";
import { getSession, getToken } from "../lib/auth";

const PROFILE_FIELDS = [
  { id: "email", label: "Email", icon: "📧", type: "email", placeholder: "ornek@email.com" },
  { id: "phone", label: "Telefon", icon: "📱", type: "tel", placeholder: "+90 555 123 4567" },
  { id: "instagram", label: "Instagram", icon: "📷", type: "text", placeholder: "@kullaniciadi" },
  { id: "instagram_password", label: "Instagram Şifresi", icon: "🔐", type: "password", placeholder: "••••••••", secure: true },
  { id: "twitter", label: "Twitter/X", icon: "🐦", type: "text", placeholder: "@kullaniciadi" },
  { id: "twitter_password", label: "Twitter Şifresi", icon: "🔐", type: "password", placeholder: "••••••••", secure: true },
  { id: "linkedin", label: "LinkedIn", icon: "💼", type: "text", placeholder: "linkedin.com/in/..." },
  { id: "github", label: "GitHub", icon: "💻", type: "text", placeholder: "@kullaniciadi" },
  { id: "github_password", label: "GitHub Şifresi", icon: "🔐", type: "password", placeholder: "••••••••", secure: true },
  { id: "website", label: "Website", icon: "🌐", type: "url", placeholder: "https://..." },
  { id: "bio", label: "Bio", icon: "📝", type: "textarea", placeholder: "Kendiniz hakkında kısa bilgi..." },
];

function ProfileFieldCard({ field, value, onChange, onSave, onRemove, isEditing, setIsEditing }) {
  const [localValue, setLocalValue] = useState(value || "");
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = () => {
    onSave(field.id, localValue);
    setIsEditing(null);
  };

  const handleCancel = () => {
    setLocalValue(value || "");
    setIsEditing(null);
  };

  if (!isEditing && !value) {
    return (
      <div 
        onClick={() => setIsEditing(field.id)}
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

  if (isEditing === field.id) {
    return (
      <div className="p-4 rounded-xl border border-[color:var(--brand)] bg-[color:var(--panel)] shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-2xl">{field.icon}</div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-[color:var(--text)]">{field.label}</div>
          </div>
        </div>
        {field.type === "textarea" ? (
          <textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg text-[color:var(--text)] placeholder-[color:var(--muted)] focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent resize-none text-sm"
          />
        ) : field.type === "password" ? (
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder={field.placeholder}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
              title={showPassword ? "Gizle" : "Göster"}
            >
              {showPassword ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
        ) : (
          <Input
            type={field.type}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={field.placeholder}
          />
        )}
        <div className="flex gap-2 mt-3">
          <Button variant="primary" onClick={handleSave} className="flex-1">
            Kaydet
          </Button>
          <Button variant="secondary" onClick={handleCancel} className="flex-1">
            İptal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:border-[color:var(--brand)] transition-all">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{field.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-[color:var(--muted)] mb-1">{field.label}</div>
          <div className="text-sm text-[color:var(--text)] break-all font-mono">
            {field.type === "password" ? "••••••••" : value}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {field.type === "password" && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(value);
                  console.log("Şifre panoya kopyalandı");
                } catch (err) {
                  console.error("Kopyalama hatası:", err);
                }
              }}
              className="p-2 rounded-lg hover:bg-[color:var(--panel-2)] text-[color:var(--text)]"
              title="Kopyala"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
            </button>
          )}
          <button
            onClick={() => {
              setLocalValue(value);
              setIsEditing(field.id);
            }}
            className="p-2 rounded-lg hover:bg-[color:var(--panel-2)] text-[color:var(--text)]"
            title="Düzenle"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={() => onRemove(field.id)}
            className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-600"
            title="Sil"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { identity, displayName } = useIdentity();
  const [profileData, setProfileData] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load profile data from backend
    const loadProfile = async () => {
      try {
        const response = await getUserProfileData();
        if (response.ok && response.profile_data) {
          setProfileData(response.profile_data);
        }
      } catch (e) {
        console.error("Profile data load error:", e);
      } finally {
        setLoading(false);
      }
    };
    
    if (identity?.did) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [identity]);

  const saveToBackend = async (data) => {
    try {
      const response = await saveUserProfileData(data);
      if (response.ok) {
        setProfileData(response.profile_data || data);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Save error:", e);
      throw e;
    }
  };

  const handleSaveField = async (fieldId, value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      await handleRemoveField(fieldId);
      return;
    }
    
    try {
      const updated = { ...profileData, [fieldId]: trimmed };
      await saveToBackend(updated);
      setMessage({ type: "success", text: "Kaydedildi!" });
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      setMessage({ type: "error", text: "Kaydetme başarısız" });
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleRemoveField = async (fieldId) => {
    try {
      const updated = { ...profileData };
      delete updated[fieldId];
      await saveToBackend(updated);
      setEditingField(null);
      setMessage({ type: "info", text: "Silindi" });
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      setMessage({ type: "error", text: "Silme başarısız" });
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const filledCount = Object.keys(profileData).filter(k => profileData[k]).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--bg)] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[color:var(--brand)] border-r-transparent mb-4"></div>
          <p className="text-[color:var(--muted)]">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!identity?.did) {
    return (
      <div className="min-h-screen bg-[color:var(--bg)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="py-8">
            <svg className="h-16 w-16 mx-auto text-[color:var(--muted)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" opacity="0.2"/>
              <path d="M12 8v4m0 4h.01" strokeWidth="2"/>
            </svg>
            <h2 className="text-xl font-bold text-[color:var(--text)] mb-2">Kimlik Bulunamadı</h2>
            <p className="text-sm text-[color:var(--muted)]">
              Önce bir WorldPass kimliği oluşturmalısınız
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
              {displayName?.slice(0, 2)?.toUpperCase() || "WP"}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[color:var(--text)]">Profil Bilgileri</h1>
              <p className="text-sm text-[color:var(--muted)]">
                {displayName || "İsimsiz Kullanıcı"}
              </p>
            </div>
          </div>
          
          {/* Progress */}
          <div className="mt-6 p-4 rounded-xl bg-[color:var(--panel)] border border-[color:var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[color:var(--text)]">
                Profil Tamamlanma
              </span>
              <span className="text-sm font-bold text-[color:var(--brand)]">
                {filledCount}/{PROFILE_FIELDS.length}
              </span>
            </div>
            <div className="h-2 bg-[color:var(--panel-2)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                style={{ width: `${(filledCount / PROFILE_FIELDS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === "success" 
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : message.type === "error"
              ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
              : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
          }`}>
            <div className="flex items-center gap-2">
              <span>{message.type === "success" ? "✓" : message.type === "error" ? "✕" : "ℹ"}</span>
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Info Card */}
        <Card className="mb-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4m0-4h.01"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[color:var(--text)] mb-1">WorldPass Profil Sistemi</h3>
              <p className="text-sm text-[color:var(--muted)] leading-relaxed">
                Sosyal medya hesaplarınız, iletişim bilgileriniz ve diğer verilerinizi WorldPass kimliğinize bağlayın. 
                Bu bilgiler şifreli olarak sunucuda saklanır ve sadece siz erişebilirsiniz.
              </p>
            </div>
          </div>
        </Card>

        {/* Profile Fields Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {PROFILE_FIELDS.map((field) => (
            <ProfileFieldCard
              key={field.id}
              field={field}
              value={profileData[field.id]}
              isEditing={editingField}
              setIsEditing={setEditingField}
              onSave={handleSaveField}
              onRemove={handleRemoveField}
            />
          ))}
        </div>

        {/* Export Section */}
        <Card className="mt-8">
          <h3 className="font-semibold text-[color:var(--text)] mb-4">Veri Dışa Aktarma</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="secondary"
              onClick={() => {
                const data = {
                  did: identity.did,
                  displayName: displayName,
                  profile: profileData,
                  exportDate: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `worldpass-profile-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                setMessage({ type: "success", text: "Profil dışa aktarıldı!" });
                setTimeout(() => setMessage(null), 2000);
              }}
              className="flex-1"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              JSON İndir
            </Button>
            <Button 
              variant="secondary"
              onClick={() => {
                const text = Object.entries(profileData)
                  .map(([key, value]) => {
                    const field = PROFILE_FIELDS.find(f => f.id === key);
                    return `${field?.label || key}: ${value}`;
                  })
                  .join('\n');
                navigator.clipboard.writeText(text);
                setMessage({ type: "success", text: "Panoya kopyalandı!" });
                setTimeout(() => setMessage(null), 2000);
              }}
              className="flex-1"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              Kopyala
            </Button>
          </div>
        </Card>

        {/* Security Note */}
        <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Güvenlik Notu</div>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Tüm verileriniz DID bazlı olarak güvenli sunucularda saklanır. Hassas şifreler veya kredi kartı bilgileri eklemeyin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
