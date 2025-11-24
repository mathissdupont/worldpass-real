// src/pages/Settings.jsx
import { useEffect, useState } from "react";
import { useIdentity } from "../lib/identityContext";
import { t, setLocale } from "../lib/i18n";
import { encryptKeystore } from "../lib/crypto";
import { loadProfile, saveProfile, clearVCs as clearVCsStore } from "../lib/storage";
import { getToken } from "../lib/auth";
import { fetchProfile, updateProfile } from "../lib/profileApi";
import { setup2FA, enable2FA, disable2FA } from "../lib/api";
import QRCode from "qrcode";

const API_BASE = "/api";

/* ---------------- UI helpers (token-friendly) ---------------- */

function Section({ title, children, desc, icon }) {
  return (
    <section className="wp-panel p-6 animate-in fade-in slide-in-from-bottom-2 duration-300 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start gap-4 mb-4">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center transition-transform duration-300 hover:scale-110">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[color:var(--text)]">{title}</h3>
          {desc && <p className="text-sm text-[color:var(--muted)] mt-1">{desc}</p>}
        </div>
      </div>
      <div>{children}</div>
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

  // ---- Profile (synced with backend when authenticated) ----
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState(""); // dataURL
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [lang, setLang] = useState("en");
  const [theme, setTheme] = useState("light");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 2FA Setup State
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // ---- Toast ----
  const [toast, setToast] = useState(null); // {type:'ok'|'err'|'info', text:''}
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Load profile on mount (async) - from backend if authenticated, else localStorage
  useEffect(() => {
    const loadData = async () => {
      const token = getToken();
      
      if (token) {
        // Authenticated: fetch from backend
        try {
          const profile = await fetchProfile(token);
          setDisplayName(profile.displayName || "");
          setEmail(profile.email || "");
          setPhone(profile.phone || "");
          setAvatar(profile.avatar || "");
          setOtpEnabled(!!profile.otpEnabled);
          const loadedLang = profile.lang || "en";
          setLang(loadedLang);
          setLocale(loadedLang); // Apply loaded language
          setTheme(profile.theme || "light");
          
          // Optionally cache locally for offline/speed
          await saveProfile(profile).catch(() => {}); // silent fail
        } catch (error) {
          console.error("Failed to load profile from backend:", error);
          // Fallback to localStorage if backend fails
          const p0 = await loadProfile().catch(() => ({}));
          setDisplayName(p0.displayName || "");
          setEmail(p0.email || "");
          setPhone(p0.phone || "");
          setAvatar(p0.avatar || "");
          setOtpEnabled(!!p0.otpEnabled);
          const loadedLang = p0.lang || "en";
          setLang(loadedLang);
          setLocale(loadedLang); // Apply loaded language
          setTheme(p0.theme || "light");
          setToast({ type: "err", text: t('profile_load_failed') });
        }
      } else {
        // Not authenticated: load from localStorage
        const p0 = await loadProfile().catch(() => ({}));
        setDisplayName(p0.displayName || "");
        setEmail(p0.email || "");
        setPhone(p0.phone || "");
        setAvatar(p0.avatar || "");
        setOtpEnabled(!!p0.otpEnabled);
        const loadedLang = p0.lang || "en";
        setLang(loadedLang);
        setLocale(loadedLang); // Apply loaded language
        setTheme(p0.theme || "light");
      }
      
      setProfileLoaded(true);
    };
    loadData();
  }, []);

  // ---- Theme apply (handles "system") and sync to backend ----
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("system", theme === "system");
    if (theme === "light") {
      root.classList.remove("dark", "system");
    }
    
    // Save theme to backend if user is authenticated (only after initial load)
    const saveThemeAsync = async () => {
      const token = getToken();
      if (token && profileLoaded) {
        try {
          // Use debounced update (no immediate flag)
          await updateProfile(token, { theme });
          // Also cache locally
          const currentProfile = await loadProfile().catch(() => ({}));
          await saveProfile({ ...currentProfile, theme }).catch(() => {});
        } catch (e) {
          console.warn("Failed to save theme to backend:", e);
          setToast({ type: "err", text: t('theme_update_failed') });
        }
      } else if (!token && profileLoaded) {
        // Not authenticated: save to localStorage only
        const currentProfile = await loadProfile().catch(() => ({}));
        await saveProfile({ ...currentProfile, theme }).catch(() => {});
      }
    };
    
    if (profileLoaded) {
      saveThemeAsync();
    }
  }, [theme, profileLoaded]);

  // ---- Helpers ----
  const saveProfileLocal = async (patch) => {
    const currentProfile = await loadProfile();
    const next = { ...currentProfile, ...patch };
    await saveProfile(next);
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
      setToast({ type: "ok", text: t('keystore_downloaded') });
    } catch {
      setToast({ type: "err", text: t('keystore_download_failed') });
    }
  };

  const forget = () => {
  if (confirm(t('confirm_forget_identity'))) {
    setIdentity(null);
    setToast({ type: "ok", text: t('identity_forget_ok') });
    }
  };

 const clearVCs = () => {
   if (confirm(t('confirm_clear_vcs'))) {
     clearVCsStore(); // storage.js içindeki gerçek temizleme
     setToast({ type: "ok", text: t('vcs_cleared') });
   }
 };

  const copyDid = async () => {
    try {
      await navigator.clipboard.writeText(identity?.did || "");
      setToast({ type: "ok", text: t('did_copied') });
    } catch {
      setToast({ type: "err", text: t('copy_failed') });
    }
  };

  const downloadIdentityKeystore = () => {
    if (!identity) return;
    const file = new Blob([JSON.stringify(identity, null, 2)], { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = "worldpass_identity.wpkeystore";
    a.click();
    URL.revokeObjectURL(a.href);
    setToast({ type: "ok", text: t('identity_keystore_downloaded') });
  };

  // Avatar upload → dataURL
  const onAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await fToDataUrl(f);
      setAvatar(url);
      
      const token = getToken();
      if (token) {
        // Use immediate update for avatar (user-triggered action)
        await updateProfile(token, { avatar: url }, { immediate: true });
      }
      const currentProfile = await loadProfile().catch(() => ({}));
      await saveProfile({ ...currentProfile, avatar: url }).catch(() => {});
      setToast({ type: "ok", text: t('avatar_updated') });
    } catch (error) {
      console.error("Failed to update avatar:", error);
      setToast({ type: "err", text: t('avatar_load_failed') });
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

  const saveAccount = async () => {
    if (!emailOk) return setToast({ type: "err", text: t('invalid_email') });
    if (!phoneOk) return setToast({ type: "err", text: t('invalid_phone') });
    
    setIsSavingProfile(true);
    
    try {
      const token = getToken();
      
      if (token) {
        // Authenticated: save to backend (immediate for explicit save button)
        const updated = await updateProfile(token, { displayName, email, phone, lang }, { immediate: true });
        // Update local state from response
        setDisplayName(updated.displayName);
        setEmail(updated.email);
        setPhone(updated.phone);
        setLang(updated.lang);
        // Cache locally
        const currentProfile = await loadProfile().catch(() => ({}));
        await saveProfile({ ...currentProfile, ...updated }).catch(() => {});
        setToast({ type: "ok", text: t('profile_saved') });
      } else {
        // Not authenticated: save to localStorage only
        await saveProfileLocal({ displayName, email, phone, lang });
        setToast({ type: "ok", text: t('profile_saved') });
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      setToast({ type: "err", text: t('profile_save_failed') });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const toggleOtp = async () => {
    const token = getToken();
    if (!token) return setToast({ type: "err", text: "Please login first" });

    if (otpEnabled) {
      // Disable
      if (confirm("Disable 2FA?")) {
        try {
          await disable2FA(token);
          setOtpEnabled(false);
          setToast({ type: "info", text: "2FA disabled." });
          await saveProfileLocal({ otpEnabled: false });
        } catch (e) {
          console.error(e);
          setToast({ type: "err", text: "Failed to disable 2FA" });
        }
      }
    } else {
      // Enable - Start Setup
      try {
        const res = await setup2FA(token);
        setSecret(res.secret);
        const url = await QRCode.toDataURL(res.otpauth_url);
        setQrCodeUrl(url);
        setShow2FASetup(true);
      } catch (e) {
        console.error(e);
        setToast({ type: "err", text: "Failed to start 2FA setup" });
      }
    }
  };

  const verifyAndEnable2FA = async () => {
    const token = getToken();
    if (!token) return setToast({ type: "err", text: "Please login first" });

    try {
      await enable2FA(token, secret, otpCode);
      setOtpEnabled(true);
      setShow2FASetup(false);
      setOtpCode('');
      setToast({ type: "ok", text: "2FA Enabled!" });
      await saveProfileLocal({ otpEnabled: true });
    } catch (e) {
      console.error(e);
      setToast({ type: "err", text: "Invalid Code" });
    }
  };

  const handleLanguageChange = async (newLang) => {
    setLang(newLang);
    setLocale(newLang); // Apply language change immediately
    
    try {
      const token = getToken();
      if (token) {
        // Use debounced update (not immediate)
        await updateProfile(token, { lang: newLang });
      }
      await saveProfileLocal({ lang: newLang });
      // Force re-render by updating state to reflect the language change
      setToast({ type: "ok", text: t('profile_saved') });
      // Reload page to ensure all components and static text show the new language
      // This is intentional to handle cases where translations are used outside React lifecycle
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error("Failed to save language:", error);
      setToast({ type: "err", text: t('profile_save_failed') });
    }
  };

  const changePassword = () => {
    alert(
      t('password_change_demo')
    );
  };

  const deleteAccount = async () => {
    if (!confirm(t('confirm_delete_account'))) return;
    
    try {
      const token = getToken();
      if (token) {
        const res = await fetch("/api/user/delete", {
          method: "POST",
          headers: { "X-Token": token }
        });
        if (!res.ok) throw new Error("Failed");
      }
      // Clear local storage
      setIdentity(null);
      localStorage.clear();
      window.location.href = "/";
    } catch (e) {
      console.error(e);
      setToast({ type: "err", text: t('delete_failed') });
    }
  };

  return (
    <div className="space-y-8">
      {/* Account */}
      <Section
        title={t('my_account')}
        desc={t('my_account_desc_cloud')}
        icon={
          <svg className="h-5 w-5 text-[color:var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        }
      >
        <div className="grid lg:grid-cols-[auto,1fr] gap-8 items-start">
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
              {t('upload')}
              <input type="file" accept="image/*" className="hidden" onChange={onAvatar} />
            </label>
            {avatar && (
              <button
                onClick={async () => {
                  setAvatar("");
                  try {
                    const token = getToken();
                    if (token) {
                      // Use immediate update for avatar removal (user-triggered action)
                      await updateProfile(token, { avatar: "" }, { immediate: true });
                    }
                    const currentProfile = await loadProfile().catch(() => ({}));
                    await saveProfile({ ...currentProfile, avatar: "" }).catch(() => {});
                  } catch (error) {
                    console.error("Failed to remove avatar:", error);
                  }
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
                <div className="text-sm text-[color:var(--muted)] mb-1">{t('display_name')}</div>
                <input
                  className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] disabled:opacity-50"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Örn. Ada Yılmaz"
                  disabled={!profileLoaded}
                />
              </div>
              <div>
                <div className="text-sm text-[color:var(--muted)] mb-1">{t('email')}</div>
                <input
                  className={`w-full px-3 py-2 rounded-xl bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] border disabled:opacity-50 ${
                    emailOk ? "border-[color:var(--border)]" : "border-rose-400/50"
                  }`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mail@domain.com"
                  disabled={!profileLoaded}
                />
              </div>
              <div>
                <div className="text-sm text-[color:var(--muted)] mb-1">{t('phone')}</div>
                <input
                  className={`w-full px-3 py-2 rounded-xl bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] border disabled:opacity-50 ${
                    phoneOk ? "border-[color:var(--border)]" : "border-rose-400/50"
                  }`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+90 5xx xxx xx xx"
                  disabled={!profileLoaded}
                />
              </div>
              <div>
                <div className="text-sm text-[color:var(--muted)] mb-1">{t('language')}</div>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)]"
                  value={lang}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  disabled={!profileLoaded}
                >
                  <option value="en">{t('language.english')}</option>
                  <option value="tr">{t('language.turkish')}</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={saveAccount}
                disabled={isSavingProfile || !profileLoaded}
                className="px-4 py-2 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSavingProfile && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                )}
                {isSavingProfile ? t('saving') : t('save_profile')}
              </button>
              <button
                onClick={changePassword}
                className="px-4 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] transition-all duration-300 hover:scale-105"
                title="Demo placeholder"
              >
                {t('change_password_demo')}
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Security */}
      <Section
        title={t('security')}
        desc={t('security_desc_account')}
        icon={
          <svg className="h-5 w-5 text-[color:var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <circle cx="12" cy="16" r="1"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        }
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[color:var(--border)] p-4">
              <div className="text-sm text-[color:var(--muted)] mb-2">{t('active_did')}</div>
            <div className="font-mono text-xs break-all bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg p-2">
              {identity?.did || "—"}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={copyDid}
                disabled={!identity?.did}
                className="px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] disabled:opacity-50"
              >
                {t('copy_did')}
              </button>
              <button
                onClick={downloadIdentityKeystore}
                disabled={!identity}
                className="px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] disabled:opacity-50"
              >
                {t('download_identity_keystore')}
              </button>
              <button
                onClick={exportKs}
                disabled={!identity}
                className="px-3 py-2 rounded-lg bg-[color:var(--brand)] text-white disabled:opacity-50"
              >
                {t('export_keystore')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--border)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[color:var(--text)]">{t('two_factor_auth')}</div>
                <div className="text-xs text-[color:var(--muted)]">{t('two_factor_desc_beta')}</div>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={otpEnabled} onChange={toggleOtp} />
                <div className="w-11 h-6 rounded-full bg-[color:var(--panel-2)] border border-[color:var(--border)] relative transition-all peer-checked:bg-[color:var(--success)]/70">
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-[color:var(--panel)] border border-[color:var(--border)] rounded-full transition-all peer-checked:translate-x-5" />
                </div>
              </label>
            </div>

            {show2FASetup && (
              <div className="mt-4 p-4 bg-[color:var(--panel)] rounded-xl border border-[color:var(--border)] animate-in fade-in zoom-in-95">
                <h4 className="font-semibold mb-2 text-center">Setup 2FA</h4>
                <div className="flex flex-col items-center gap-4">
                  {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR" className="w-48 h-48 rounded-lg bg-white p-2" />}
                  <div className="text-center">
                    <p className="text-sm text-[color:var(--muted)] mb-1">Scan with Google Authenticator or Authy</p>
                    <p className="text-xs font-mono bg-[color:var(--panel-2)] px-2 py-1 rounded select-all">{secret}</p>
                  </div>
                  <div className="flex gap-2 w-full max-w-xs">
                    <input 
                      className="flex-1 px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] text-center tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g,''))}
                    />
                    <button 
                      onClick={verifyAndEnable2FA}
                      disabled={otpCode.length !== 6}
                      className="px-4 py-2 bg-[color:var(--brand)] text-white rounded-lg disabled:opacity-50"
                    >
                      Verify
                    </button>
                  </div>
                  <button onClick={() => setShow2FASetup(false)} className="text-xs text-[color:var(--muted)] underline">Cancel</button>
                </div>
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={clearVCs}
                className="px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)]"
              >
                {t('clear_cached_vcs')}
              </button>
              <button
                onClick={forget}
                className="ml-2 px-3 py-2 rounded-lg border border-rose-400/30 text-rose-300 bg-[color:var(--panel-2)]"
              >
                {t('forget_identity_ram')}
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Preferences */}
      <Section
        title={t('general_settings')}
        icon={
          <svg className="h-5 w-5 text-[color:var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        }
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[color:var(--border)] p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[color:var(--text)]">{t('theme')}</div>
              <div className="text-xs text-[color:var(--muted)]">{t('theme_desc')}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme("light")}
                className={`px-3 py-2 rounded-lg border border-[color:var(--border)] transition-all duration-300 ${
                  theme === "light" ? "bg-[color:var(--brand)] text-white scale-105" : "bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                }`}
                >
                {t('theme_light')}
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`px-3 py-2 rounded-lg border border-[color:var(--border)] transition-all duration-300 ${
                  theme === "dark" ? "bg-[color:var(--brand)] text-white scale-105" : "bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                }`}
                >
                {t('theme_dark')}
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`px-3 py-2 rounded-lg border border-[color:var(--border)] transition-all duration-300 ${
                  theme === "system" ? "bg-[color:var(--brand)] text-white scale-105" : "bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                }`}
                title="System preference"
                >
                {t('theme_system')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--border)] p-4">
            <div className="text-sm font-medium text-[color:var(--text)]">{t('notifications_local')}</div>
            <div className="text-xs text-[color:var(--muted)] mb-3">{t('notifications_local_desc')}</div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" defaultChecked />
                {t('issuer_updates')}
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                {t('verification_results')}
              </label>
            </div>
          </div>
        </div>
      </Section>

      {/* Danger zone */}
      <Section
        title={t('danger_zone')}
        icon={
          <svg className="h-5 w-5 text-[color:var(--brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        }
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-rose-400/30 bg-[color:var(--panel-2)] p-4">
            <div className="text-sm font-medium text-rose-300">{t('clear_session_data')}</div>
            <p className="text-xs text-rose-300/80 mt-1">{t('clear_session_data_desc')}</p>
            <button
              onClick={forget}
              className="mt-3 px-3 py-2 rounded-lg border border-rose-400/30 text-rose-300"
            >
              {t('forget_identity')}
            </button>
          </div>

          <div className="rounded-xl border border-rose-400/30 bg-[color:var(--panel-2)] p-4">
            <div className="text-sm font-medium text-rose-300">{t('delete_account')}</div>
            <p className="text-xs text-rose-300/80 mt-1">{t('delete_account_desc')}</p>
            <button
              onClick={deleteAccount}
              className="mt-3 px-3 py-2 rounded-lg border border-rose-400/30 text-rose-300 hover:bg-rose-400/10 transition-colors"
            >
              {t('delete_account')}
            </button>
          </div>

          <div className="rounded-xl border border-amber-400/30 bg-[color:var(--panel-2)] p-4">
            <div className="text-sm font-medium text-amber-300">{t('clear_credential_cache')}</div>
            <p className="text-xs text-amber-300/80 mt-1">{t('clear_credential_cache_desc')}</p>
            <button
              onClick={clearVCs}
              className="mt-3 px-3 py-2 rounded-lg border border-amber-400/30 text-amber-300"
            >
              {t('clear_my_vcs')}
            </button>
          </div>
        </div>
      </Section>

      <Toast toast={toast} />
    </div>
  );
}
