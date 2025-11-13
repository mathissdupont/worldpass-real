// src/pages/Login.jsx
import { useState, useEffect } from "react";
import { verifyUser, setSession, isAuthed } from "../lib/auth";
import { loadProfile, saveProfile } from "../lib/storage";
import { useNavigate, Link, useLocation } from "react-router-dom";

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
    const t = setTimeout(()=>setToast(null), 2200);
    return ()=>clearTimeout(t);
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
      if(!valid) throw new Error("Enter a valid email and password.");
      const ok = await verifyUser(email, password);
      if(!ok) throw new Error("Invalid email or password.");

      if (remember) {
        saveProfile({ ...loadProfile(), email });
      } else {
        const cur = loadProfile();
        if (cur?.email) saveProfile({ ...cur, email: "" });
      }

      setSession({ email });
      setToast({tone:"ok", text:"Signed in"});
      // DID varsa effect yönlendirir; yoksa aşağıdaki DID paneli görünecek
    }catch(e){
      setErr(e.message || "Login failed.");
      setToast({tone:"err", text:"Login failed"});
    } finally {
      setBusy(false);
    }
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
            <h3 className="text-lg font-semibold text-[color:var(--text)]">Complete your login</h3>
            <span className="text-xs px-2 py-1 rounded-md border border-amber-400/30 bg-[color:var(--panel-2)] text-amber-300">
              Session ok — DID missing
            </span>
          </div>
          <p className="text-[12px] text-[color:var(--muted)] mt-1">
            Oturum açık ama RAM’de DID yok. Keystore’u yükle ya da yeni DID oluştur.
          </p>

          <div className="mt-4 inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--panel)] overflow-hidden">
            {["load","create"].map(t=>(
              <button
                key={t}
                onClick={()=>setDidMode(t)}
                className={[
                  "px-4 py-1.5 text-sm transition",
                  didMode===t
                    ? "bg-[color:var(--brand)] text-white"
                    : "hover:bg-[color:var(--panel-2)] text-[color:var(--text)]"
                ].join(" ")}
              >
                {t==="load" ? "Load keystore" : "Create DID"}
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
      ? "Enter a valid email like name@domain.com"
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

      <div className="bg-[color:var(--panel)] p-6 rounded-3xl border border-[color:var(--border)] shadow-sm max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[color:var(--text)]">Sign In</h2>
          <span className="text-[11px] text-[color:var(--muted)]">Local demo auth</span>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          {/* Email */}
          <label className="block">
            <div className="text-sm text-[color:var(--text)] mb-1">Email</div>
            <div className="relative">
              <input
                type="email"
                autoComplete="email"
                placeholder="email@domain.com"
                className={[
                  "w-full px-3 py-2 rounded-xl outline-none focus:ring-2 text-[color:var(--text)]",
                  "bg-[color:var(--panel)] border",
                  emailHint ? "border-rose-400/40" : "border-[color:var(--border)]",
                  "focus:ring-[color:var(--brand-2)]"
                ].join(" ")}
                value={email}
                onChange={e=>setEmail(e.target.value)}
              />
              <svg className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 4h16v16H4z"/><path d="M22 6L12 13 2 6"/>
              </svg>
            </div>
            {emailHint && <div className="mt-1 text-[11px] text-rose-400">{emailHint}</div>}
          </label>

          {/* Password */}
          <label className="block">
            <div className="text-sm text-[color:var(--text)] mb-1">Password</div>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                className="w-full px-3 py-2 pr-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                onKeyUp={onCaps}
                onKeyDown={onCaps}
              />
              <button
                type="button"
                onClick={()=>setShow(v=>!v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
                aria-label="Toggle password visibility"
              >
                {show ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3l18 18"/><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/><path d="M16.24 16.24C14.92 17.02 13.5 17.5 12 17.5 6.5 17.5 3 12 3 12s1.4-2.22 3.76-3.76"/><path d="M9.9 4.24C10.57 4.08 11.28 4 12 4c5.5 0 9 8 9 8s-.62 1.24-1.76 2.48"/></svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4.5-8 11-8 11 8 11 8-4.5 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {caps && <div className="mt-1 text-[11px] text-amber-300">CapsLock açık olabilir.</div>}
          </label>

          {/* Remember */}
          <label className="flex items-center gap-2 text-sm text-[color:var(--text)] select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e)=>setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-[color:var(--border)] bg-[color:var(--panel)]"
            />
            Remember email on this device
          </label>

          {/* Submit */}
          <button
            disabled={!valid || busy}
            className="w-full mt-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[color:var(--brand)] text-white disabled:opacity-50 hover:opacity-90"
          >
            {busy ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 1-9 9" />
                </svg>
                Continue
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1"/>
                </svg>
                Continue
              </>
            )}
          </button>

          {err && (
            <div className="text-sm text-rose-300 bg-[color:var(--panel-2)] border border-rose-400/30 rounded-xl px-3 py-2">
              {err}
            </div>
          )}
        </form>

        <div className="mt-4 text-sm text-[color:var(--muted)]">
          Hesabın yok mu? <Link to="/register" className="underline">Register</Link>
        </div>
      </div>
    </div>
  );
}
