// src/pages/Register.jsx
import { useEffect, useState } from "react";
import { t } from "../lib/i18n";
import { registerUser, setSession } from "../lib/auth";
import { loadProfile, saveProfile } from "../lib/storage";
import { useIdentity } from "../lib/identityContext";
import { useNavigate } from "react-router-dom";
import IdentityCreate from "../components/IdentityCreate";
import IdentityLoad   from "../components/IdentityLoad";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------------- UI bits (token-friendly) ---------------- */
function Field({ label, children, help, htmlFor }) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <div className="text-sm text-[color:var(--muted)] mb-1">{label}</div>
      {children}
      {help && <div className="mt-1 text-xs text-[color:var(--muted)]">{help}</div>}
    </label>
  );
}

function EyeBtn({ onClick, shown }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? "Şifreyi gizle" : "Şifreyi göster"}
      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
    >
      {shown ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 3l18 18"/><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/>
          <path d="M16.24 16.24C14.92 17.02 13.5 17.5 12 17.5 6.5 17.5 3 12 3 12s1.4-2.22 3.76-3.76"/>
          <path d="M9.9 4.24C10.57 4.08 11.28 4 12 4c5.5 0 9 8 9 8s-.62 1.24-1.76 2.48"/>
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M1 12s4.5-8 11-8 11 8 11 8-4.5 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );
}

function Strength({ level }) {
  const labels = ["Çok zayıf", "Zayıf", "Orta", "İyi", "Güçlü"];
  const bars = 5;

  // level'i 0–4 arasına sıkıştır (sağlama)
  const safeLevel = Math.max(0, Math.min(Number(level) || 0, 4));

  return (
    <div className="mt-1">
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full"
            style={{
              background:
                i <= safeLevel
                  ? "linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, var(--brand-2)))"
                  : "color-mix(in srgb, var(--muted) 20%, transparent)",
            }}
          />
        ))}
      </div>
      <div className="text-[10px] text-[color:var(--muted)] mt-1">
        {labels[safeLevel]}
      </div>
    </div>
  );
}


const score = (s) => {
  let p = 0;
  if (s.length >= 8) p++;
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) p++;
  if (/\d/.test(s)) p++;
  if (/[^A-Za-z0-9]/.test(s)) p++;
  if (s.length >= 12) p++;
  return Math.min(p, 4);
};

function StepChip({ step, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={[
          "h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold border",
          done
            ? "bg-emerald-500 text-white border-emerald-400/80"
            : active
            ? "bg-[color:var(--brand)] text-white border-[color:var(--brand-2)]"
            : "bg-[color:var(--panel)] text-[color:var(--muted)] border-[color:var(--border)]"
        ].join(" ")}
      >
        {done ? (
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M5 13l4 4L19 7"/>
          </svg>
        ) : (
          step
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] uppercase tracking-wide text-[color:var(--muted)]">
          Adım {step}
        </span>
        <span className="text-xs text-[color:var(--text)]">{label}</span>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function Register(){
  const nav = useNavigate();
  const { identity } = useIdentity(); // {did,...}
  const hasIdentity = !!identity?.did;

  const [step, setStep] = useState(1);

  // DID oluşturulunca otomatik olarak 2. adıma geç
  useEffect(() => {
    if (hasIdentity && step === 1) {
      setStep(2);
    }
  }, [hasIdentity, step]);

  // form state
  const [firstName, setFirst] = useState("");
  const [lastName,  setLast]  = useState("");
  const [email,     setEmail] = useState(loadProfile()?.email || "");
  const [pass,      setPass]  = useState("");
  const [pass2,     setPass2] = useState("");
  const [show1,     setShow1] = useState(false);
  const [show2,     setShow2] = useState(false);
  const [err,       setErr]   = useState("");
  const [okMsg,     setOkMsg] = useState("");

  const strength = score(pass);

  const valid =
    emailRe.test(email) &&
    pass.length >= 8 &&
    pass === pass2 &&
    firstName.trim() &&
    lastName.trim() &&
    hasIdentity;

  const onSubmit = async (e)=>{
    e.preventDefault();
    setErr(""); setOkMsg("");
    try{
      if(!valid) throw new Error("Lütfen tüm alanları eksiksiz doldur.");
      await registerUser({
        email,
        firstName,
        lastName,
        password: pass,
        did: identity.did      // backend için hala gönderiyoruz ama kullanıcıya “kimlik” diyoruz
      });
      setSession({ email });
      const name = `${firstName.trim()} ${lastName.trim()}`.trim();
      saveProfile({ ...(loadProfile()||{}), displayName: name, email });
      setOkMsg("Hesap oluşturuldu. Hesap sayfasına yönlendiriliyorsun…");
      setTimeout(()=> nav("/account"), 400);
    }catch(e){
      setErr(e.message || "Kayıt işlemi başarısız oldu.");
    }
  };

  const nameOk   = !!(firstName.trim() && lastName.trim());
  const passOk   = !!(pass.length >= 8 && pass === pass2);
  const emailOk  = !!emailRe.test(email);

  return (
    <div className="space-y-5">
      {/* Üst başlık + stepper */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[color:var(--text)]">{t('create_user_account')}</h1>
          <p className="text-sm text-[color:var(--muted)] mt-1">{t('new_account_intro_beta')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <StepChip
            step={1}
            label={t('step_identity_keystore')}
            active={step === 1}
            done={hasIdentity}
          />
          <div className="h-px w-4 sm:w-8 bg-[color:var(--border)]" />
          <StepChip
            step={2}
            label={t('step_user_account')}
            active={step === 2}
            done={valid}
          />
        </div>
      </div>

      {/* ADIM 1: Kimlik */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)]/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[color:var(--text)]">{t('step1_title')}</h2>
                <p className="text-xs text-[color:var(--muted)] mt-1">{t('step1_desc')}</p>
              </div>
              <span
                className={[
                  "text-[11px] px-2.5 py-1.5 rounded-full border inline-flex items-center gap-1 shrink-0",
                  hasIdentity
                    ? "border-emerald-400/40 bg-[color:var(--panel-2)] text-emerald-300"
                    : "border-amber-400/40 bg-[color:var(--panel-2)] text-amber-300",
                ].join(" ")}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                {hasIdentity ? "Kimlik hazır" : "Kimlik henüz yok"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]/90 p-4 space-y-3">
                <h3 className="font-semibold text-[color:var(--text)] text-sm">{t('create_new_identity')}</h3>
                <p className="text-xs text-[color:var(--muted)]">{t('create_new_identity_desc')}</p>
                <IdentityCreate />
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]/90 p-4 space-y-3">
                <h3 className="font-semibold text-[color:var(--text)] text-sm">{t('load_existing_keystore')}</h3>
                <p className="text-xs text-[color:var(--muted)]">{t('load_existing_keystore_desc')}</p>
                <IdentityLoad />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-[color:var(--border)]/60 mt-4">
              <p className="text-[11px] text-[color:var(--muted)]">
                Bir kimlik yüklendiğinde otomatik olarak 2. adıma geçersin. Dilersen aşağıdan da devam edebilirsin.
              </p>
              <button
                type="button"
                onClick={()=> setStep(2)}
                disabled={!hasIdentity}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--brand)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {t('goto_step2')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADIM 2: Kullanıcı Hesabı */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6 items-start">
          {/* Sol: form */}
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)]/85 backdrop-blur-sm p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[color:var(--text)]">{t('step2_title')}</h2>
                <p className="text-xs text-[color:var(--muted)]">{t('step2_desc')}</p>
              </div>
              <button
                type="button"
                onClick={()=>setStep(1)}
                className="text-[11px] px-2.5 py-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--muted)] hover:bg-[color:var(--panel-2)] shrink-0"
              >
                ← {t('back_to_identity')}
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-2 space-y-4" noValidate>
              {/* Ad Soyad */}
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]/90 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[color:var(--muted)]">Profil bilgileri</span>
                  <span className="text-[10px] text-[color:var(--muted)]">
                    {nameOk ? "Tamam" : "Ad ve soyad zorunlu"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="İsim" htmlFor="first">
                    <input
                      id="first"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={e=>setFirst(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
                      aria-invalid={!firstName && "true"}
                    />
                  </Field>
                  <Field label="Soyisim" htmlFor="last">
                    <input
                      id="last"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={e=>setLast(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
                      aria-invalid={!lastName && "true"}
                    />
                  </Field>
                </div>
              </div>

              {/* Email */}
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]/90 p-3 space-y-2">
                <Field
                  label={t('email')}
                  htmlFor="email"
                  help={t('email_help')}
                >
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('example_email')}
                    value={email}
                    onChange={e=>setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
                    aria-invalid={email && !emailRe.test(email) ? "true" : "false"}
                  />
                </Field>
                {!emailOk && email && (
                  <div className="text-[11px] text-rose-300">
                    Email biçimi hatalı görünüyor.
                  </div>
                )}
              </div>

              {/* Şifre */}
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]/90 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[color:var(--muted)]">{t('password')}</span>
                  <span className="text-[10px] text-[color:var(--muted)]">
                    {passOk ? t('password_ready') : t('password_requirements')}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={t('password')} help={t('password_help')}>
                    <div className="relative">
                      <input
                        id="pass"
                        type={show1 ? "text" : "password"}
                        autoComplete="new-password"
                        value={pass}
                        onChange={e=>setPass(e.target.value)}
                        className="w-full px-3 py-2 pr-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
                      />
                      <EyeBtn onClick={()=>setShow1(v=>!v)} shown={show1} />
                    </div>
                    <Strength level={strength} />
                  </Field>

                  <Field label={t('password_confirm')}>
                    <div className="relative">
                      <input
                        id="pass2"
                        type={show2 ? "text" : "password"}
                        autoComplete="new-password"
                        value={pass2}
                        onChange={e=>setPass2(e.target.value)}
                        className="w-full px-3 py-2 pr-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
                        aria-invalid={!!pass2 && pass2!==pass ? "true" : "false"}
                      />
                      <EyeBtn onClick={()=>setShow2(v=>!v)} shown={show2} />
                    </div>
                    {pass2 && pass!==pass2 && (
                      <div className="text-xs rounded-lg px-3 py-2 border border-rose-400/30 bg-[color:var(--panel-2)] text-rose-300 mt-1">
                        Şifreler birbiriyle eşleşmiyor.
                      </div>
                    )}
                  </Field>
                </div>
              </div>

              {/* Submit + durum */}
              <div className="space-y-2">
                <button
                  disabled={!valid}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[color:var(--brand)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('create_account')}
                </button>

                {!hasIdentity && (
                  <div className="text-[11px] rounded-xl px-3 py-2 border border-amber-400/30 bg-[color:var(--panel-2)] text-amber-300">
                    Bu adımı tamamlamak için önce 1. adımda kimlik ve anahtar deposu oluşturman gerekiyor.
                  </div>
                )}

                {okMsg && (
                  <div className="text-sm rounded-xl px-3 py-2 border border-emerald-400/30 bg-[color:var(--panel-2)] text-emerald-300">
                    {okMsg}
                  </div>
                )}
                {err && (
                  <div className="text-sm rounded-xl px-3 py-2 border border-rose-400/30 bg-[color:var(--panel-2)] text-rose-300">
                    {err}
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Sağ: Kimlik özeti */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)]/85 backdrop-blur-sm p-5 shadow-sm space-y-3">
              <h3 className="font-semibold text-[color:var(--text)] text-sm">Kimlik Durumu</h3>
              <p className="text-xs text-[color:var(--muted)]">
                Bu hesap, daha önce hazırladığın kimlik ve anahtar deposu ile ilişkilendirilecek.
                Şu anki kimliğin bu tarayıcıya kayıtlı.
              </p>
              <div className="mt-1 text-[11px] rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] px-3 py-2 font-mono break-all text-[color:var(--text)]/80">
                {hasIdentity ? (identity.did || "Kimlik yüklü.") : "Kimlik bulunamadı."}
              </div>
              <button
                type="button"
                onClick={()=>setStep(1)}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs"
              >
                Kimliği değiştir / yeniden yükle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
