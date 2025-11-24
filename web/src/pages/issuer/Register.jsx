// src/pages/issuer/Register.jsx
import { useMemo, useState } from "react";
import { useIdentity } from "../../lib/identityContext";
import { t } from "../../lib/i18n";
import { registerIssuer, verifyIssuerDomain } from "../../lib/api";
import IdentityLoad from "../../components/IdentityLoad";
import IdentityCreate from "../../components/IdentityCreate";
import { Link } from "react-router-dom";

/* ---------- küçük yardımcılar ---------- */
function Pill({ tone = "info", children }) {
  const map = {
    info: "border-gray-200 bg-gray-50 text-gray-700",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    err: "border-rose-200 bg-rose-50 text-rose-800",
  };
  return (
    <div className={`text-xs rounded-lg px-3 py-2 border ${map[tone] || map.info}`}>
      {children}
    </div>
  );
}
const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const domainRx = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,}$/i; // basit ama sağlam

function Label({ children }) {
  return <div className="text-sm text-gray-700 mb-1">{children}</div>;
}

function Input({ value, onChange, type = "text", placeholder, error, ...rest }) {
  return (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      className={[
        "w-full px-3 py-2 rounded-xl",
        "bg-white border outline-none focus:ring-2 focus:ring-indigo-500",
        error ? "border-rose-300" : "border-black/10",
      ].join(" ")}
      {...rest}
    />
  );
}

function CopyBtn({ value, label = t('copy') }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value)}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-black/10 bg-white hover:bg-white/90 text-xs"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <rect x="2" y="2" width="13" height="13" rx="2" />
      </svg>
      {label}
    </button>
  );
}

/* ---------- SAYFA ---------- */
export default function IssuerRegister() {
  const { identity, setIdentity } = useIdentity(); // kuruluş DID'i
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [org, setOrg] = useState(null); // { issuer_id, verification_code, status }

  const [msg, setMsg] = useState(null); // {tone:'ok'|'err'|'info'|'warn', text:string}
  const [busyCreate, setBusyCreate] = useState(false);
  const [busyVerify, setBusyVerify] = useState(false);

  const hasDid = !!identity?.did;

  const normDomain = useMemo(() => (domain || "").trim().toLowerCase(), [domain]);
  const validDomain = domainRx.test(normDomain);
  const validEmail = emailRx.test((email || "").trim());
  const validName = (name || "").trim().length >= 2;
  const validPass = password.length >= 8;

  const canCreate = !!(validName && validDomain && validEmail && validPass && hasDid);

  const onCreate = async () => {
    setMsg(null);
    if (!canCreate) {
      setMsg({ tone: "err", text: "Eksik veya hatalı bilgi var. Alanları kontrol et." });
      return;
    }
    try {
      setBusyCreate(true);
      const resp = await registerIssuer({
        name: name.trim(),
        email: email.trim(),
        password: password,
        domain: normDomain,
        did: identity.did,
      });
      
      setOrg({
        id: resp.issuer_id,
        verification_code: resp.verification_code,
        status: resp.status,
        domain: normDomain
      });
      
      setMsg({
        tone: "ok",
        text: "Kuruluş oluşturuldu. Aşağıdaki doğrulama yöntemlerinden birini kullanarak domaini doğrula.",
      });
    } catch (e) {
      setMsg({ tone: "err", text: "Kuruluş oluşturulamadı: " + (e?.message || String(e)) });
    } finally {
      setBusyCreate(false);
    }
  };

  const onVerify = async (method) => {
    if (!org) return;
    setMsg(null);
    setBusyVerify(true);
    try {
      const resp = await verifyIssuerDomain(org.id, method);
      if (resp.verified) {
        setMsg({ tone: "ok", text: "Domain doğrulandı 🎉 Giriş yapabilirsiniz." });
        setOrg({ ...org, status: "verified" });
      } else {
        setMsg({ tone: "warn", text: "Doğrulama başarısız: " + resp.message });
      }
    } catch (e) {
      setMsg({ tone: "err", text: "Doğrulama hatası: " + (e?.message || String(e)) });
    } finally {
      setBusyVerify(false);
    }
  };

  const didShort =
    identity?.did && identity.did.length > 44 ? identity.did.slice(0, 44) + "…" : identity?.did;

  const dnsSnippet = org
    ? `_worldpass-challenge.${org.domain}   TXT   "${org.verification_code}"`
    : "";
  const httpSnippet = org
    ? `https://${org.domain}/.well-known/worldpass.txt\n\n(Dosya içeriği: ${org.verification_code})`
    : "";

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* LEFT: Register form */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("issuer.register.title")}</h2>

          <div
            className={[
              "text-xs px-2 py-1 rounded border",
              hasDid
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700",
            ].join(" ")}
            title={hasDid ? identity.did : t("issuer.register.no_did_hint")}
          >
            {hasDid ? t("issuer.register.did_ready") : t("issuer.register.no_did")}
          </div>
        </div>

        {hasDid && (
          <div className="mt-2 text-[11px] text-gray-600 flex items-center gap-2">
            <span className="font-mono break-all">{didShort}</span>
            {identity?.did && <CopyBtn value={identity.did} label={t('copy_did')} />}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">
          {t('issuer.register.org_did_note')}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <Label>{t("issuer.register.org_name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("issuer.register.example_org")}
              error={name && !validName}
            />
            {name && !validName && (
              <div className="text-[11px] text-rose-600 mt-1">En az 2 karakter olmalı.</div>
            )}
          </div>

          <div>
            <Label>{t("issuer.register.domain")}</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder={t("issuer.register.example_domain")}
              error={domain && !validDomain}
            />
            {domain && !validDomain && (
              <div className="text-[11px] text-rose-600 mt-1">
                Geçerli bir domain gir (örn. <span className="font-mono">uni.edu.tr</span>).
              </div>
            )}
          </div>

          <div>
            <Label>{t("issuer.register.admin_email")}</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={t("issuer.register.example_admin_email")}
              error={email && !validEmail}
            />
            {email && !validEmail && (
              <div className="text-[11px] text-rose-600 mt-1">Geçerli bir e-posta gir.</div>
            )}
          </div>

          <div>
            <Label>Şifre</Label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="En az 8 karakter"
              error={password && !validPass}
            />
            {password && !validPass && (
              <div className="text-[11px] text-rose-600 mt-1">En az 8 karakter olmalı.</div>
            )}
          </div>

          <button
            disabled={!canCreate || busyCreate}
            onClick={onCreate}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50"
            title={!hasDid ? "Önce sağdan DID yükle/oluştur" : ""}
          >
            {busyCreate ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" opacity=".25" />
                  <path d="M21 12a9 9 0 0 1-9 9" />
                </svg>
                {t("issuer.register.creating")}
              </>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 3v12" />
                  <path d="M8 11l4 4 4-4" />
                  <rect x="4" y="17" width="16" height="4" rx="1" />
                </svg>
                {t("issuer.register.create_org")}
              </>
            )}
          </button>
          
          <div className="text-center text-sm text-gray-600 mt-2">
            Zaten hesabın var mı? <Link to="/issuer/login" className="text-indigo-600 hover:underline">Giriş Yap</Link>
          </div>
        </div>

        {msg && (
          <div className="mt-3">
            <Pill tone={msg.tone || "info"}>{msg.text}</Pill>
          </div>
        )}
      </div>

      {/* RIGHT: Domain verify + DID loader */}
      <div className="space-y-4">
        {!hasDid && (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="font-semibold">{t('issuer.register.load_create_did')}</h3>
            <p className="text-xs text-gray-500 mb-3">
              {t('issuer.register.keystore_note')}
            </p>
            <IdentityLoad onLoaded={(ident) => setIdentity(ident)} />
            <div className="my-3 h-px bg-gray-200" />
            <IdentityCreate />
          </div>
        )}

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="font-semibold">{t('issuer.register.domain_verification')}</h3>

          {!org ? (
            <p className="text-sm text-gray-600 mt-2">Önce kuruluş oluştur.</p>
          ) : (
            <>
              <div className="mt-2 text-sm">
                <div>
                  {t('issuer.register.status_label')}{" "}
                  <span
                    className={
                      org.status === "verified" ? "text-emerald-700 font-medium" : "text-amber-700"
                    }
                  >
                    {org.status}
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">DNS TXT ({t('issuer.register.in_production')}):</div>
                    <div className="rounded-lg border bg-gray-50 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <pre className="whitespace-pre-wrap break-all">{dnsSnippet}</pre>
                        <CopyBtn value={dnsSnippet} />
                      </div>
                    </div>
                    <button
                        onClick={() => onVerify("dns")}
                        disabled={busyVerify}
                        className="mt-2 w-full px-3 py-1.5 rounded-lg border border-black/10 hover:bg-gray-50 text-xs font-medium"
                    >
                        DNS Kaydını Kontrol Et
                    </button>
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 mb-1">
                      HTTP well-known ({t('issuer.register.in_production')}):
                    </div>
                    <div className="rounded-lg border bg-gray-50 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <pre className="whitespace-pre-wrap break-all">{httpSnippet}</pre>
                        <CopyBtn value={httpSnippet} />
                      </div>
                    </div>
                    <button
                        onClick={() => onVerify("http")}
                        disabled={busyVerify}
                        className="mt-2 w-full px-3 py-1.5 rounded-lg border border-black/10 hover:bg-gray-50 text-xs font-medium"
                    >
                        HTTP Dosyasını Kontrol Et
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
