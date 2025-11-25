// src/pages/issuer/Settings.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIssuerProfile, updateIssuerProfile, rotateIssuerApiKey } from "@/lib/api";

function Section({ title, description, children }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[color:var(--text)]">{title}</h3>
        {description && <p className="text-sm text-[color:var(--muted)] mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", required = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[color:var(--text)] mb-1">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
      />
    </div>
  );
}

export default function IssuerSettings() {
  const navigate = useNavigate();
  const [issuer, setIssuer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile form
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [supportLink, setSupportLink] = useState("");

  // API Key
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }

    getIssuerProfile()
      .then((resp) => {
        setIssuer(resp.issuer);
        setName(resp.issuer.name);
        setDomain(resp.issuer.domain || "");
        setContactEmail(resp.issuer.contact_email || "");
        setSupportLink(resp.issuer.support_link || "");
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        navigate("/issuer/login");
      });
  }, [navigate]);

  const handleSaveProfile = async () => {
    const token = localStorage.getItem("issuer_token");
    try {
      setSaving(true);
      await updateIssuerProfile(token, {
        name,
        domain,
        contact_email: contactEmail,
        support_link: supportLink,
      });
      alert("Profil güncellendi");
      setSaving(false);
    } catch (err) {
      alert("Hata: " + err.message);
      setSaving(false);
    }
  };

  const handleRotateKey = async () => {
    if (!confirm("API anahtarını yenilemek istediğinize emin misiniz? Eski anahtar geçersiz olacaktır.")) return;

    const token = localStorage.getItem("issuer_token");
    try {
      const resp = await rotateIssuerApiKey();
      setApiKey(resp.api_key);
      setShowApiKey(true);
      alert("Yeni API anahtarı oluşturuldu. Lütfen güvenli bir yere kaydedin.");
    } catch (err) {
      alert("Hata: " + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("issuer_token");
    localStorage.removeItem("issuer_info");
    navigate("/issuer/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[color:var(--brand)] border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[color:var(--text)]">Ayarlar</h1>
        <p className="text-sm text-[color:var(--muted)] mt-1">
          Kuruluş bilgilerinizi ve API ayarlarınızı yönetin
        </p>
      </div>

      {/* Profile Section */}
      <Section
        title="Kuruluş Bilgileri"
        description="Kuruluşunuzun genel bilgileri"
      >
        <div className="space-y-4">
          <Input
            label="Kuruluş Adı"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Üniversitesi"
            required
          />
          <Input
            label="Domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="acme.edu"
          />
          <Input
            label="İletişim E-postası"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="info@acme.edu"
            type="email"
          />
          <Input
            label="Destek Linki"
            value={supportLink}
            onChange={(e) => setSupportLink(e.target.value)}
            placeholder="https://acme.edu/support"
            type="url"
          />
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </Section>

      {/* API Key Section */}
      <Section
        title="API Anahtarı"
        description="API üzerinden kimlik bilgisi oluşturmak için kullanılan anahtar"
      >
        <div className="space-y-4">
          {showApiKey && apiKey ? (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
              <div className="text-sm font-medium text-emerald-800 mb-2">Yeni API Anahtarınız</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm bg-white p-3 rounded border border-emerald-200 text-emerald-900 break-all">
                  {apiKey}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(apiKey)}
                  className="px-3 py-3 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 flex-shrink-0"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
              <p className="text-xs text-emerald-700 mt-2">
                Bu anahtar sadece bir kez gösterilecektir. Lütfen güvenli bir yerde saklayın.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)]">
              <p className="text-sm text-[color:var(--muted)] mb-3">
                API anahtarınız gizli tutulmaktadır. Yeni bir anahtar oluşturduğunuzda eski anahtar geçersiz olacaktır.
              </p>
              <button
                onClick={handleRotateKey}
                className="px-4 py-2 rounded-xl border border-[color:var(--border)] hover:bg-[color:var(--panel)]"
              >
                Yeni API Anahtarı Oluştur
              </button>
            </div>
          )}
        </div>
      </Section>

      {/* Account Info Section */}
      <Section title="Hesap Bilgileri" description="Giriş ve güvenlik ayarlarınız">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)]">
            <div>
              <div className="text-sm font-medium text-[color:var(--text)]">E-posta</div>
              <div className="text-sm text-[color:var(--muted)] mt-0.5">{issuer?.email}</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)]">
            <div>
              <div className="text-sm font-medium text-[color:var(--text)]">DID</div>
              <div className="text-xs text-[color:var(--muted)] mt-0.5 font-mono break-all">
                {issuer?.did || "Henüz atanmamış"}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)]">
            <div>
              <div className="text-sm font-medium text-[color:var(--text)]">Durum</div>
              <div className="text-sm text-[color:var(--muted)] mt-0.5">
                {issuer?.status === "approved" ? "✓ Onaylı" : "⏳ Beklemede"}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Danger Zone */}
      <Section title="Tehlikeli Bölge" description="Dikkatli olmanız gereken işlemler">
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50">
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
          >
            Oturumu Kapat
          </button>
        </div>
      </Section>
    </div>
  );
}
