// src/pages/identity/IdentityCreate.jsx
import { useState, useMemo, useCallback } from "react";
import { ed25519Generate, encryptKeystore, didFromPk, b64u } from "../lib/crypto";

/* ——— Password Strength bar ——— */
function SegStrength({ p }) { // 0..4
  const labels = ["Very weak", "Weak", "OK", "Good", "Strong"];
  const colors = [
    "bg-rose-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-emerald-500",
    "bg-emerald-600",
  ];
  const color = colors[p] || colors[0];

  return (
    <div className="mt-2" aria-live="polite">
      <div className="grid grid-cols-5 gap-1" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={p} aria-label="Password strength">
        {[0,1,2,3,4].map(i=>(
          <div
            key={i}
            className={`h-1.5 rounded-full transition-colors ${i<=p? color : "bg-[color:var(--border)] dark:bg-white/10"}`}
          />
        ))}
      </div>
      <div className="mt-1 text-[10px] text-[color:var(--muted)]">{labels[p]}</div>
    </div>
  );
}

/* ——— Simple password scoring ——— */
const scorePwd = (s) => {
  let p = 0;
  if (s.length >= 8) p++;
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) p++;
  if (/\d/.test(s)) p++;
  if (/[^A-Za-z0-9]/.test(s)) p++;
  if (s.length >= 12) p++;
  return Math.min(p, 4);
};

export default function IdentityCreate() {
  const [did, setDid]   = useState("");
  const [p1, setP1]     = useState("");
  const [p2, setP2]     = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [busy, setBusy]   = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  // düz obje ya da null
  const [msg, setMsg] = useState(null); // { type:'ok'|'err'|'info', text:string } | null

  const s = useMemo(()=>scorePwd(p1), [p1]);
  const valid = p1.length>=8 && p1===p2 && s>=2;

  const onCaps = useCallback((e) => {
    // bazı tarayıcılarda undefined olabilir
    try { setCapsOn(!!e.getModifierState && e.getModifierState("CapsLock")); } catch {}
  }, []);

  const onCreate = async () => {
    setMsg(null);
    if (p1.length < 8)  return setMsg({type:"err", text:"Password must be at least 8 characters."});
    if (p1 !== p2)      return setMsg({type:"err", text:"Passwords do not match."});
    setBusy(true);
    try {
      const { sk, pk } = ed25519Generate();
      const _did = didFromPk(pk);
      const ksPayload = { did: _did, sk_b64u: b64u(sk), pk_b64u: b64u(pk) };
      const blob = await encryptKeystore(p1, ksPayload);

      const fname = _did.replace(/:/g, "_") + ".wpkeystore";
      const file = new Blob([JSON.stringify(blob, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = fname;
      a.click();
      URL.revokeObjectURL(a.href);

      setDid(_did);
      setMsg({type:"ok", text:"Keystore indirildi. Güvenli bir yerde sakla."});
    } catch (e) {
      setMsg({type:"err", text: "Error: " + (e?.message || String(e))});
    } finally {
      setBusy(false);
    }
  };

  const copyDid = async () => {
    if (!did) return;
    try { await navigator.clipboard.writeText(did); setMsg({type:"ok", text:"DID kopyalandı."}); }
    catch { setMsg({type:"err", text:"Kopyalanamadı."}); }
  };

  const keystoreName = useMemo(()=> did ? did.replace(/:/g, "_") + ".wpkeystore" : "did_worldpass_….wpkeystore", [did]);

  return (
    <section className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)]/90 backdrop-blur p-5 shadow-sm">
      <header className="mb-4">
        <h3 className="text-base font-semibold">Create Identity</h3>
        <p className="text-[12px] text-[color:var(--muted)] mt-1">
          Yeni bir DID üret ve şifre ile korunan keystore’u cihazına indir.
        </p>
      </header>

      {/* Password */}
      <div className="mb-3">
        <label htmlFor="pwd1" className="block text-sm text-[color:var(--muted)] mb-1.5">Password</label>
        <div className="relative">
          <input
            id="pwd1"
            type={show1 ? "text" : "password"}
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            onKeyUp={onCaps}
            onKeyDown={onCaps}
            placeholder="Min 8 chars, mixed case, digit, symbol"
            aria-invalid={p1.length>0 && s<2}
            aria-describedby="pwd1-help"
            className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] pr-10"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShow1(v=>!v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] hover:text-[color:var(--text)]"
            aria-label={show1 ? "Hide password" : "Show password"}
            title={show1 ? "Hide" : "Show"}
          >
            {show1 ? (
              // eye-off
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3l18 18"/><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/><path d="M16.24 16.24C14.92 17.02 13.5 17.5 12 17.5 6.5 17.5 3 12 3 12s1.4-2.22 3.76-3.76"/><path d="M9.9 4.24C10.57 4.08 11.28 4 12 4c5.5 0 9 8 9 8s-.62 1.24-1.76 2.48"/></svg>
            ) : (
              // eye
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4.5-8 11-8 11 8 11 8-4.5 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        <SegStrength p={s} />
        <p id="pwd1-help" className="mt-1 text-[11px] text-[color:var(--muted)]">
          En az 8 karakter. Büyük/küçük harf, rakam ve sembol eklemek güvenliği artırır.
          {capsOn && <span className="ml-2 text-amber-600">CapsLock açık görünüyor.</span>}
        </p>
      </div>

      {/* Repeat */}
      <div className="mb-1">
        <label htmlFor="pwd2" className="block text-sm text-[color:var(--muted)] mb-1.5">Repeat password</label>
        <div className="relative">
          <input
            id="pwd2"
            type={show2 ? "text" : "password"}
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            onKeyUp={onCaps}
            onKeyDown={onCaps}
            placeholder="Repeat password"
            aria-invalid={!!p2 && p1!==p2}
            className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] pr-10"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShow2(v=>!v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] hover:text-[color:var(--text)]"
            aria-label={show2 ? "Hide password" : "Show password"}
            title={show2 ? "Hide" : "Show"}
          >
            {show2 ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3l18 18"/><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/><path d="M16.24 16.24C14.92 17.02 13.5 17.5 12 17.5 6.5 17.5 3 12 3 12s1.4-2.22 3.76-3.76"/><path d="M9.9 4.24C10.57 4.08 11.28 4 12 4c5.5 0 9 8 9 8s-.62 1.24-1.76 2.48"/></svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4.5-8 11-8 11 8 11 8-4.5 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        {p2 && p1 !== p2 && (
          <p className="mt-1 text-[11px] text-rose-600">Şifreler eşleşmiyor.</p>
        )}
      </div>

      {/* Checklist */}
      <ul className="mt-3 text-[12px] text-[color:var(--muted)] grid sm:grid-cols-2 gap-x-4">
        <li className={`flex items-center gap-2 ${p1.length>=8 ? "text-emerald-600" : ""}`}>
          <span className="inline-block h-1.5 w-1.5 rounded-full border border-[color:var(--border)] bg-current opacity-60"></span>
          Min 8 karakter
        </li>
        <li className={`flex items-center gap-2 ${/[A-Z]/.test(p1)&&/[a-z]/.test(p1) ? "text-emerald-600" : ""}`}>
          <span className="inline-block h-1.5 w-1.5 rounded-full border border-[color:var(--border)] bg-current opacity-60"></span>
          Büyük + küçük harf
        </li>
        <li className={`flex items-center gap-2 ${/\d/.test(p1) ? "text-emerald-600" : ""}`}>
          <span className="inline-block h-1.5 w-1.5 rounded-full border border-[color:var(--border)] bg-current opacity-60"></span>
          Rakam
        </li>
        <li className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(p1) ? "text-emerald-600" : ""}`}>
          <span className="inline-block h-1.5 w-1.5 rounded-full border border-[color:var(--border)] bg-current opacity-60"></span>
          Sembol
        </li>
      </ul>

      {/* CTA */}
      <button
        onClick={onCreate}
        disabled={!valid || busy}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 1-9 9"/></svg>
            <span>Generating…</span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1"/></svg>
            <span>Generate & Download Keystore</span>
          </>
        )}
      </button>

      {/* DID banner */}
      {did && (
        <div className="mt-4 rounded-xl border border-emerald-300/60 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 p-3">
          <div className="text-xs font-medium mb-1">DID oluşturuldu</div>
          <div className="font-mono text-[11px] break-all">{did}</div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={copyDid}
              className="text-xs px-2 py-1.5 rounded-lg border border-emerald-300 bg-white/80 hover:bg-white"
            >
              Kopyala
            </button>
            <span className="text-[10px] text-[color:var(--muted)]">Keystore: <span className="font-mono">{keystoreName}</span></span>
          </div>
        </div>
      )}

      {/* Messages */}
      {msg && (
        <div
          role={msg.type==="err"?"alert":"status"}
          className={`mt-3 text-xs rounded-lg px-3 py-2 border ${
            msg.type==="ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
              : msg.type==="err"
              ? "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30"
              : "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]"
          }`}
        >
          {msg.text}
        </div>
      )}

      <p className="mt-3 text-[11px] text-[color:var(--muted)]">
        İndirdiğin dosya adı genelde <span className="font-mono">{keystoreName}</span> şeklinde olur. Dosyayı **güvenli** bir yerde sakla; şifreni unutursan geri açılamaz.
      </p>
    </section>
  );
}
