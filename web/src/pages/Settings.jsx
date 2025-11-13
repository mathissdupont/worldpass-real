// src/pages/Settings.jsx
import { useEffect, useMemo, useState } from "react";
import { useIdentity } from "../lib/identityContext";
import { encryptKeystore } from "../lib/crypto";
import { loadProfile, saveProfile, clearVCs as clearVCsStore } from "../lib/storage";

/* ---------------- UI helpers (token-friendly) ---------------- */

function Section({ title, children, desc }) {
  return (
    <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)]/80 backdrop-blur-sm shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--text)]">{title}</h3>
          {desc && <p className="text-sm text-[color:var(--muted)] mt-1">{desc}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const cls =
    toast.type === "ok"
      ? "border-emerald-400/30 text-emerald-300"
      : toast.type === "err"
      ? "border-rose-400/30 text-rose-300"
      : "border-[color:var(--border)] text-[color:var(--text)]";
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded-xl shadow-lg border bg-[color:var(--panel-2)] ${cls} text-sm`}
      role="status"
      aria-live="polite"
    >
      {toast.text}
    </div>
  );
}

/* ---------------- Component ---------------- */

export default function Settings() {
  const { identity, setIdentity } = useIdentity();

  // ---- Profile (local only) ----
  const p0 = useMemo(() => loadProfile() || {}, []);
  const [displayName, setDisplayName] = useState(p0.displayName || "");
  const [email, setEmail] = useState(p0.email || "");
  const [phone, setPhone] = useState(p0.phone || "");
  const [avatar, setAvatar] = useState(p0.avatar || ""); // dataURL
  const [otpEnabled, setOtpEnabled] = useState(!!p0.otpEnabled);
  const [lang, setLang] = useState(p0.lang || "en");

  // ---- Theme (light | dark | system) ----
  const initialTheme =
    typeof window !== "undefined" ? localStorage.getItem("wp_theme") || "light" : "light";
  const [theme, setTheme] = useState(initialTheme);

  // ---- Toast ----
  const [toast, setToast] = useState(null); // {type:'ok'|'err'|'info', text:''}
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Theme apply (handles "system") ----
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("system", theme === "system");
    if (theme === "light") {
      root.classList.remove("dark", "system");
    }
    localStorage.setItem("wp_theme", theme);
  }, [theme]);

  // ---- Helpers ----
  const saveProfileLocal = (patch) => {
    const next = { ...(loadProfile() || {}), ...patch };
    saveProfile(next);
  };

  const initials = (n) => {
    if (!n) return "WP";
    const parts = n.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "WP";
  };

  const emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneOk = !phone || /^\+?\d[\d\s()-]{6,}$/.test(phone);

  // ---- Actions ----
  const exportKs = async () => {
    if (!identity) return setToast({ type: "err", text: "Aktif kimlik yok." });
    const pw = prompt("Anahtar Deposu için yeni şifre (indirilecek dosya için):");
    if (!pw) return;
    try {
      const blob = await encryptKeystore(pw, identity); // {did, sk_b64u, pk_b64u}
      const file = new Blob([JSON.stringify(blob, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = identity.did.replace(/:/g, "_") + ".wpkeystore";
      a.click();
      URL.revokeObjectURL(a.href);
      setToast({ type: "ok", text: "Anahtar deposu indirildi." });
    } catch {
      setToast({ type: "err", text: "İndirme işlemi başarısız oldu." });
    }
  };

  const forget = () => {
   if (confirm("Bu oturumdaki kimliği unut (RAM’dan kaldır)?")) {
      setIdentity(null);
      setToast({ type: "ok", text: "Kimlik oturumdan kaldırıldı." });
    }
  };

 const clearVCs = () => {
   if (confirm("Clear cached VCs from this browser?")) {
     clearVCsStore(); // storage.js içindeki gerçek temizleme
     setToast({ type: "ok", text: "Local VC cache cleared." });
   }
 };

  const copyDid = async () => {
    try {
      await navigator.clipboard.writeText(identity?.did || "");
      setToast({ type: "ok", text: "DID copied." });
    } catch {
      setToast({ type: "err", text: "Copy failed." });
    }
  };

  const downloadIdentityJson = () => {
    if (!identity) return;
    const file = new Blob([JSON.stringify(identity, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = "worldpass_identity.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setToast({ type: "ok", text: "Identity JSON downloaded." });
  };

  // Avatar upload → dataURL
  const onAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await fToDataUrl(f);
      setAvatar(url);
      saveProfileLocal({ avatar: url });
      setToast({ type: "ok", text: "Avatar updated." });
    } catch {
      setToast({ type: "err", text: "Avatar load failed." });
    }
  };

  function fToDataUrl(f) {
    return new Promise((res, rej) => {
      const rd = new FileReader();
      rd.onload = () => res(String(rd.result));
      rd.onerror = rej;
      rd.readAsDataURL(f);
    });
  }

  const saveAccount = () => {
    if (!emailOk) return setToast({ type: "err", text: "Invalid email format." });
    if (!phoneOk) return setToast({ type: "err", text: "Invalid phone number." });
    saveProfileLocal({ displayName, email, phone, lang });
    setToast({ type: "ok", text: "Profile saved." });
  };

  const toggleOtp = () => {
    const v = !otpEnabled;
    setOtpEnabled(v);
    saveProfileLocal({ otpEnabled: v });
    setToast({ type: "info", text: v ? "2FA (demo) enabled." : "2FA disabled." });
  };

  const changePassword = () => {
    alert(
      "Password change is a demo placeholder here.\n\n" +
        "Gerçek uygulamada: eski şifre doğrulanır → yeni şifre backend’de güvenli biçimde güncellenir."
    );
  };

  return (
    <div className="space-y-6">
      {/* Account */}
      <Section title="Hesabım" desc="Bu bilgiler yalnızca bu tarayıcıda saklanır.">
        <div className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden ring-1 ring-[color:var(--border)] bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-2xl font-semibold">
              {avatar ? (
                <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span aria-hidden="true">{initials(displayName)}</span>
              )}
            </div>
            <label className="text-sm inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] cursor-pointer">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Upload
              <input type="file" accept="image/*" className="hidden" onChange={onAvatar} />
            </label>
            {avatar && (
              <button
                onClick={() => {
                  setAvatar("");
                  saveProfileLocal({ avatar: "" });
                }}
                className="text-xs underline text-[color:var(--muted)]"
              >
                Remove
              </button>
            )}
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-[color:var(--muted)] mb-1">Display name</div>
                <input
                  className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Örn. Ada Yılmaz"
                />
              </div>
              <div>
                <div className="text-sm text-[color:var(--muted)] mb-1">Email</div>
                <input
                  className={`w-full px-3 py-2 rounded-xl bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] border ${
                    emailOk ? "border-[color:var(--border)]" : "border-rose-400/50"
                  }`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mail@domain.com"
                />
              </div>
              <div>
                <div className="text-sm text-[color:var(--muted)] mb-1">Phone</div>
                <input
                  className={`w-full px-3 py-2 rounded-xl bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] border ${
                    phoneOk ? "border-[color:var(--border)]" : "border-rose-400/50"
                  }`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+90 5xx xxx xx xx"
                />
              </div>
              <div>
                <div className="text-sm text-[color:var(--muted)] mb-1">Language</div>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)]"
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={saveAccount}
                className="px-4 py-2 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90"
              >
                Save profile
              </button>
              <button
                onClick={changePassword}
                className="px-4 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                title="Demo placeholder"
              >
                Change password (demo)
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Security */}
      <Section title="Güvenlik" desc="Keystore yalnızca cihazında şifrelenmiş olarak saklanır.">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[color:var(--border)] p-4">
            <div className="text-sm text-[color:var(--muted)] mb-2">Active DID</div>
            <div className="font-mono text-xs break-all bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg p-2">
              {identity?.did || "—"}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={copyDid}
                disabled={!identity?.did}
                className="px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] disabled:opacity-50"
              >
                Copy DID
              </button>
              <button
                onClick={downloadIdentityJson}
                disabled={!identity}
                className="px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] disabled:opacity-50"
              >
                Download identity JSON
              </button>
              <button
                onClick={exportKs}
                disabled={!identity}
                className="px-3 py-2 rounded-lg bg-[color:var(--brand)] text-white disabled:opacity-50"
              >
                Export keystore
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--border)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[color:var(--text)]">Two-Factor Auth (demo)</div>
                <div className="text-xs text-[color:var(--muted)]">Kod üretici ile ikinci adım doğrulama.</div>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={otpEnabled} onChange={toggleOtp} />
                <div className="w-11 h-6 rounded-full bg-[color:var(--panel-2)] border border-[color:var(--border)] relative transition-all peer-checked:bg-[color:var(--success)]/70">
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-[color:var(--panel)] border border-[color:var(--border)] rounded-full transition-all peer-checked:translate-x-5" />
                </div>
              </label>
            </div>

            <div className="mt-4">
              <button
                onClick={clearVCs}
                className="px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)]"
              >
                Clear cached VCs
              </button>
              <button
                onClick={forget}
                className="ml-2 px-3 py-2 rounded-lg border border-rose-400/30 text-rose-300 bg-[color:var(--panel-2)]"
              >
                Forget identity from RAM
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Preferences */}
      <Section title="Genel Ayarlar">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[color:var(--border)] p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[color:var(--text)]">Theme</div>
              <div className="text-xs text-[color:var(--muted)]">Açık / Koyu ya da Sistem teması.</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme("light")}
                className={`px-3 py-2 rounded-lg border border-[color:var(--border)] ${
                  theme === "light" ? "bg-[color:var(--brand)] text-white" : "bg-[color:var(--panel)]"
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`px-3 py-2 rounded-lg border border-[color:var(--border)] ${
                  theme === "dark" ? "bg-[color:var(--brand)] text-white" : "bg-[color:var(--panel)]"
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`px-3 py-2 rounded-lg border border-[color:var(--border)] ${
                  theme === "system" ? "bg-[color:var(--brand)] text-white" : "bg-[color:var(--panel)]"
                }`}
                title="System preference"
              >
                System
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--border)] p-4">
            <div className="text-sm font-medium text-[color:var(--text)]">Notifications (local)</div>
            <div className="text-xs text-[color:var(--muted)] mb-3">Tarayıcı içi bildirimler (demo).</div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" defaultChecked />
                Issuer updates
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                Verification results
              </label>
            </div>
          </div>
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-rose-400/30 bg-[color:var(--panel-2)] p-4">
            <div className="text-sm font-medium text-rose-300">Remove identity from RAM</div>
            <p className="text-xs text-rose-300/80 mt-1">
              Keystore’u silmez; yalnızca bu oturumdaki private key’i unutur.
            </p>
            <button
              onClick={forget}
              className="mt-3 px-3 py-2 rounded-lg border border-rose-400/30 text-rose-300"
            >
              Forget Identity
            </button>
          </div>

          <div className="rounded-xl border border-amber-400/30 bg-[color:var(--panel-2)] p-4">
            <div className="text-sm font-medium text-amber-300">Clear local VC cache</div>
            <p className="text-xs text-amber-300/80 mt-1">Bu tarayıcıdaki VC önbelleğini temizler.</p>
            <button
              onClick={clearVCs}
              className="mt-3 px-3 py-2 rounded-lg border border-amber-400/30 text-amber-300"
            >
              Clear My VCs
            </button>
          </div>
        </div>
      </Section>

      <Toast toast={toast} />
    </div>
  );
}
