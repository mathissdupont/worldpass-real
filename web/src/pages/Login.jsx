// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { verifyUser, setSession, isAuthed } from "../lib/auth";
import { loadProfile, saveProfile } from "../lib/storage";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { t } from "../lib/i18n";

import { useIdentity } from "../lib/identityContext";
import IdentityLoad from "../components/IdentityLoad";
import IdentityCreate from "../components/IdentityCreate";

export default function Login(){
  const nav = useNavigate();
  const loc = useLocation();
  const { identity, setIdentity } = useIdentity();

  const prof = loadProfile() || {};
  const [email, setEmail]       = useState(prof.email || "");
  const [remember, setRemember] = useState(Boolean(prof.email));
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const authed = isAuthed();
  const back   = loc.state?.from?.pathname || "/account";

  const [didMode, setDidMode] = useState("load"); // 'load' | 'create'

  useEffect(() => {
    if (authed && identity?.did) nav(back, { replace: true });
  }, [authed, identity?.did, back, nav]);

  useEffect(()=> setError(""), [email, password]);

  const submit = async (e)=>{
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try{
      const result = await verifyUser(email, password, otpCode);
      if(!result) {
        // verifyUser returns null for invalid credentials (401)
        throw new Error(t('login.error_invalid_credentials'));
      }

      if (remember) {
        saveProfile({ ...loadProfile(), email });
      } else {
        const cur = loadProfile();
        if (cur?.email) saveProfile({ ...cur, email: "" });
      }

      setSession({ email });
      // DID check will happen in the effect or via identity context
      // If DID exists in result, navigate immediately, otherwise show DID panel
    }catch(e){
      // Handle specific error messages from backend
      let errorMessage = e.message || t('login.error_server');
      
      if (e.message && e.message.includes('otp_required')) {
        setShowOtp(true);
        setLoading(false);
        return;
      }
      
      if (e.message && e.message.includes('account_inactive')) {
        errorMessage = t('login.error_account_inactive');
      } else if (e.message && (e.message.includes('invalid_credentials') || e.message.includes('Invalid') || e.message.includes('invalid_otp'))) {
        errorMessage = t('login.error_invalid_credentials');
      } else if (e.message && e.message.includes('Authentication failed')) {
        errorMessage = t('login.error_server');
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onLoadedIdent = (ident)=>{
    setIdentity(ident);
    nav(back, { replace: true });
  };

  /* ------------------ 1) Oturum açık + DID YOK → DID paneli ------------------ */
  if (authed && !identity?.did) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[color:var(--bg)]">
        <div className="max-w-3xl w-full space-y-4">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-8 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[color:var(--text)]">{t('complete_your_login')}</h3>
              <span className="text-xs px-3 py-1.5 rounded-lg border border-amber-400/30 bg-[color:var(--panel-2)] text-amber-300">
                {t('session_ok_did_missing')}
              </span>
            </div>
            <p className="text-sm text-[color:var(--muted)] mb-6">{t('session_message')}</p>

            <div className="inline-flex rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] overflow-hidden mb-6">
              {["load","create"].map(mode=> (
                <button
                  key={mode}
                  onClick={()=>setDidMode(mode)}
                  className={[
                    "px-5 py-2 text-sm font-medium transition",
                    didMode===mode
                      ? "bg-[color:var(--brand)] text-white"
                      : "hover:bg-[color:var(--panel)] text-[color:var(--text)]"
                  ].join(" ")}
                >
                  {mode==="load" ? t('load_keystore') : t('create_did')}
                </button>
              ))}
            </div>

            <div>
              {didMode === "load" ? (
                <>
                  <p className="text-sm text-[color:var(--muted)] mb-4">
                    {t('load_keystore_paragraph')}
                  </p>
                  <IdentityLoad onLoaded={onLoadedIdent}/>
                </>
              ) : (
                <>
                  <p className="text-sm text-[color:var(--muted)] mb-4">
                    {t('create_did_paragraph')}
                  </p>
                  <IdentityCreate/>
                  <p className="mt-3 text-xs text-[color:var(--muted)]">
                    {t('after_create_hint')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------ 2) Oturum kapalı → Login formu ------------------ */
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[color:var(--bg)]">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[color:var(--text)] mb-2">
              {t('login.title')}
            </h1>
            <p className="text-sm text-[color:var(--muted)]">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 rounded-lg border border-rose-400/30 bg-rose-500/10 text-rose-300 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
                {t('login.email_label')}
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder={t('enter_email_placeholder')}
                className="w-full px-4 py-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)] placeholder-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent transition"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
                {t('login.password_label')}
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)] placeholder-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent transition"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* OTP Field */}
            {showOtp && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
                  Two-Factor Code
                </label>
                <input
                  type="text"
                  autoComplete="one-time-code"
                  required={showOtp}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-2.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)] placeholder-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] focus:border-transparent transition text-center tracking-widest font-mono"
                  value={otpCode}
                  onChange={e=>setOtpCode(e.target.value.replace(/\D/g,''))}
                  disabled={loading}
                  autoFocus
                />
              </div>
            )}

            {/* Remember Me */}
            <label className="flex items-center gap-2 text-sm text-[color:var(--text)] cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e)=>setRemember(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 rounded border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand)] focus:ring-offset-0"
              />
              {t('login.remember_me')}
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 rounded-lg bg-[color:var(--brand)] text-white font-medium hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] focus:ring-offset-2 focus:ring-offset-[color:var(--panel)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  {t('login.loading')}
                </span>
              ) : (
                t('login.submit')
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-[color:var(--border)] space-y-3">
            <p className="text-center text-sm text-[color:var(--muted)]">
              {t('login.link_register_text')}{" "}
              <Link 
                to="/register" 
                className="text-[color:var(--brand)] hover:underline font-medium"
              >
                {t('login.link_register')}
              </Link>
            </p>
            <p className="text-center text-sm">
              <Link 
                to="/issuer/register" 
                className="text-[color:var(--muted)] hover:text-[color:var(--text)] transition"
              >
                {t('login.link_org_login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
