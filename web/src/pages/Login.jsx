// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { verifyUser, setSession, isAuthed } from "../lib/auth";
import { loadProfile, saveProfile } from "../lib/storage";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { t } from "../lib/i18n";

import { useIdentity } from "../lib/identityContext";
import IdentityLoad from "../components/IdentityLoad";
import IdentityCreate from "../components/IdentityCreate";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login(){
  const nav = useNavigate();
  const loc = useLocation();
  const { identity, setIdentity } = useIdentity();

  const prof = loadProfile() || {};
  const [email, setEmail]       = useState(prof.email || "");
  const [remember, setRemember] = useState(Boolean(prof.email));
  const [password, setPassword] = useState("");
  const [caps, setCaps]         = useState(false);
  const [show, setShow]         = useState(false);
  const [busy, setBusy]         = useState(false);

  const [err, setErr]     = useState("");
  const [toast, setToast] = useState(null); // {tone:'ok'|'err'|'info', text}

  const authed = isAuthed();
  const back   = loc.state?.from?.pathname || "/account";
  const valid  = emailRe.test(email) && password.length >= 1;

  const [didMode, setDidMode] = useState("load"); // 'load' | 'create'

  useEffect(() => {
    if (authed && identity?.did) nav(back, { replace: true });
  }, [authed, identity?.did, back, nav]);

  useEffect(()=> setErr(""), [email, password]);

  useEffect(()=>{
    if (!toast) return;
    const timer = setTimeout(()=>setToast(null), 2200);
    return ()=>clearTimeout(timer);
  }, [toast]);

  const onCaps = (e) => {
    if (typeof e.getModifierState === "function") {
      setCaps(e.getModifierState("CapsLock"));
    }
  };

  const submit = async (e)=>{
    e.preventDefault();
    setErr("");
    setBusy(true);
    try{
      if(!valid) throw new Error(t('enter_valid_email_password'));
      const ok = await verifyUser(email, password);
      if(!ok) throw new Error(t('invalid_email_password'));

      if (remember) {
        saveProfile({ ...loadProfile(), email });
      } else {
        const cur = loadProfile();
        if (cur?.email) saveProfile({ ...cur, email: "" });
      }

      setSession({ email });
      setToast({tone:"ok", text:t('signed_in')});
      // DID varsa effect yönlendirir; yoksa aşağıdaki DID paneli görünecek
    }catch(e){
      setErr(e.message || t('login_failed'));
      setToast({tone:"err", text:t('login_failed')});
    } finally {
      setBusy(false);
    }
  };

  const worldpassLogin = ()=>{
    const apiBase = '/api';
    const clientId = 'demo-client'; // Kaydolduktan sonra gerçek client_id ile değiştirin
    const redirect = window.location.origin + '/auth/worldpass/callback';
    const state = Math.random().toString(36).slice(2);
    const url = `${apiBase}/oauth/authorize_page?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirect)}&state=${encodeURIComponent(state)}`;
    window.open(url, 'worldpass_auth', 'width=600,height=720');
  };

  const onLoadedIdent = (ident)=>{
    setIdentity(ident);
    nav(back, { replace: true });
  };

  /* ------------------ 1) Oturum açık + DID YOK → DID paneli ------------------ */
  if (authed && !identity?.did) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {toast && (
          <div
            className={[
              "text-xs rounded-xl px-3 py-2 border",
              toast.tone==="ok"
                ? "border-emerald-400/30 bg-[color:var(--panel-2)] text-emerald-300"
                : toast.tone==="err"
                ? "border-rose-400/30 bg-[color:var(--panel-2)] text-rose-300"
                : "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]"
            ].join(" ")}
          >
            {toast.text}
          </div>
        )}

        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[color:var(--text)]">{t('complete_your_login')}</h3>
            <span className="text-xs px-2 py-1 rounded-md border border-amber-400/30 bg-[color:var(--panel-2)] text-amber-300">
              {t('session_ok_did_missing')}
            </span>
          </div>
          <p className="text-[12px] text-[color:var(--muted)] mt-1">{t('session_message')}</p>

          <div className="mt-4 inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--panel)] overflow-hidden">
            {["load","create"].map(mode=> (
              <button
                key={mode}
                onClick={()=>setDidMode(mode)}
                className={[
                  "px-4 py-1.5 text-sm transition",
                  didMode===mode
                    ? "bg-[color:var(--brand)] text-white"
                    : "hover:bg-[color:var(--panel-2)] text-[color:var(--text)]"
                ].join(" ")}
              >
                {mode==="load" ? t('load_keystore') : t('create_did')}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {didMode === "load" ? (
              <>
                <p className="text-xs text-[color:var(--muted)] mb-3">
                  Var olan keystore dosyanı yükle.
                </p>
                <IdentityLoad onLoaded={onLoadedIdent}/>
              </>
            ) : (
              <>
                <p className="text-xs text-[color:var(--muted)] mb-3">
                  Yeni bir DID ve şifreli keystore oluşturup indir.
                </p>
                <IdentityCreate/>
                <p className="mt-2 text-[11px] text-[color:var(--muted)]">
                  Oluşturduktan sonra Settings → Load ile geri yükleyebilirsin.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------ 2) Oturum kapalı → Login formu ------------------ */
  const emailHint =
    email.length>0 && !emailRe.test(email)
      ? t('enter_valid_email_password')
      : "";

  return (
    <div className="max-w-4xl mx-auto">
      {toast && (
        <div
          className={[
            "mb-3 text-xs rounded-xl px-3 py-2 border",
            toast.tone==="ok"
              ? "border-emerald-400/30 bg-[color:var(--panel-2)] text-emerald-300"
              : toast.tone==="err"
              ? "border-rose-400/30 bg-[color:var(--panel-2)] text-rose-300"
              : "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]"
          ].join(" ")}
        >
          {toast.text}
        </div>
      )}

      <div className="wp-panel p-8 rounded-3xl shadow-lg max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[color:var(--text)]">{t('sign_in')}</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={worldpassLogin}
              className="px-3 py-1 text-sm rounded-md bg-[color:var(--brand)] text-white hover:brightness-105"
            >
              {t('worldpass_login')}
            </button>
            <span className="text-xs px-2 py-1 rounded-full bg-[color:var(--panel-2)] border border-[color:var(--border)] text-[color:var(--muted)]">{t('local_demo_auth')}</span>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[color:var(--text)]">{t('email')}</label>
            <div className="relative">
              <input
                type="email"
                autoComplete="email"
                placeholder={t('enter_email_placeholder')}
                className={`wp-input pr-10 transition-all duration-200 ${
                  emailHint ? 'border-rose-400/50 focus:border-rose-400 focus:ring-rose-400/20' : ''
                }`}
                value={email}
                onChange={e=>setEmail(e.target.value)}
              />
              <svg className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 4h16v16H4z"/><path d="M22 6L12 13 2 6"/>
              </svg>
            </div>
            {emailHint && (
              <div className="text-xs text-rose-400 animate-in slide-in-from-top-1 duration-200 shake">
                {t('enter_valid_email_password')}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[color:var(--text)]">{t('password')}</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                className="wp-input pr-12 transition-all duration-200"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                onKeyUp={onCaps}
                onKeyDown={onCaps}
              />
              <button
                type="button"
                onClick={()=>setShow(v=>!v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[color:var(--panel-2)] transition-all duration-200 hover:scale-110 active:scale-95"
                aria-label="Toggle password visibility"
              >
                {show ? (
                  <svg className="h-4 w-4 text-[color:var(--muted)] transition-transform duration-200 rotate-0 hover:rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 3l18 18"/><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/>
                    <path d="M16.24 16.24C14.92 17.02 13.5 17.5 12 17.5 6.5 17.5 3 12 3 12s1.4-2.22 3.76-3.76"/>
                    <path d="M9.9 4.24C10.57 4.08 11.28 4 12 4c5.5 0 9 8 9 8s-.62 1.24-1.76 2.48"/>
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-[color:var(--muted)] transition-transform duration-200 rotate-0 hover:-rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M1 12s4.5-8 11-8 11 8 11 8-4.5 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {caps && (
              <div className="text-xs text-amber-400 animate-in slide-in-from-top-1 duration-200">
                CapsLock açık olabilir.
              </div>
            )}
          </div>

          {/* Remember */}
          <label className="flex items-center gap-3 text-sm text-[color:var(--text)] select-none cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e)=>setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--brand)] focus:ring-[color:var(--brand-2)] focus:ring-2"
            />
            {t('remember_email')}
          </label>

          {/* Submit */}
          <button
            disabled={!valid || busy}
            className="w-full wp-btn-solid py-3 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100 disabled:opacity-60"
          >
            {busy ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 1-9 9" />
                </svg>
                {t('signing_in')}
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1"/>
                </svg>
                {t('sign_in')}
              </>
            )}
          </button>

          {err && (
            <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-xl px-4 py-3 animate-in slide-in-from-top-2 duration-300">
              {err}
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[color:var(--muted)]">
            Hesabın yok mu?{" "}
            <Link to="/register" className="text-[color:var(--brand-2)] hover:text-[color:var(--brand-3)] font-medium transition-colors underline">
              {t('register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
