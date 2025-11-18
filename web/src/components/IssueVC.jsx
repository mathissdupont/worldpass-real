// src/pages/identity/IssueVC.jsx
import { useMemo, useState, useCallback, useEffect } from "react";
import { b64u, ed25519Sign, b64uToBytes } from "../lib/crypto";
import { addVC as addVCToStore } from "../lib/storage";
import { t } from "../lib/i18n";
import MiniQR from "./MiniQR";
import { listOrgs } from "../lib/issuerStore"; // veya "@/lib/issuerStore" kullanıyorsan ona göre

const enc = new TextEncoder();
const b64uJson = (obj) => b64u(enc.encode(JSON.stringify(obj)));

export default function IssueVC({ identity }) {
  const [subjectName, setSubjectName] = useState("");
  const [subjectDid, setSubjectDid]   = useState("");
  const [vcType, setVcType]           = useState("StudentCard");
  const [busy, setBusy]               = useState(false);
  const [msg, setMsg]                 = useState(null); // {type:'ok'|'err'|'info', text}
  const [out, setOut]                 = useState(null);
  const [orgTemplates, setOrgTemplates] = useState([]); 
  // sabit jti (sayfa ilk yükleniş anı)
  const jti = useMemo(() => `vc-${Math.floor(Date.now() / 1000)}`, []);

  const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const issuerReady = Boolean(identity?.did);
  const didOk = useMemo(() => /^did:[a-z0-9]+:/i.test((subjectDid||"").trim()), [subjectDid]);
  const canIssue = issuerReady && subjectName.trim() && didOk;
  useEffect(() => {
    // identity yoksa temizle
    if (!identity?.did) {
      setOrgTemplates([]);
      return;
    }

    try {
      // issuerStore'daki org'ları çek
      const orgs = listOrgs() || [];

      // Bu DID'e sahip ve verified olan org'ları filtrele
      const myOrgs = orgs.filter(
        (o) => o.did === identity.did && o.status === "verified"
      );

      if (!myOrgs.length) {
        setOrgTemplates([]);
        return;
      }

      // Şimdilik ilk org'u al (ileride çoklu destek istersen genişletiriz)
      const org = myOrgs[0];
      const tpls = Object.entries(org.templates || {}).map(([key, v]) => ({
        key,
        name: v?.name || key,
      }));

      setOrgTemplates(tpls);
    } catch (e) {
      console.warn("orgTemplates yüklenemedi:", e);
      setOrgTemplates([]);
    }
  }, [identity?.did]);

  const copy = (txt, ok=t('copied'), fail=t('copy_failed')) =>
    navigator.clipboard.writeText(txt)
      .then(()=> setMsg({type:"ok", text: ok}))
      .catch(()=> setMsg({type:"info", text: fail}));

  const issue = useCallback(async () => {
    setMsg(null);
    if (!issuerReady) return setMsg({ type: "err", text: t('issuer_missing_err') });
    if (!subjectName.trim()) return setMsg({ type: "err", text: t('subject_name_required') });
    if (!didOk) return setMsg({ type: "err", text: t('subject_did_format_err') });

    setBusy(true);
    try {
      const issuance = nowIso();

      const vcBody = {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        "type": ["VerifiableCredential", vcType],
        "issuer": identity.did,
        "issuanceDate": issuance,
        "jti": jti, // not: tipik VC'de id kullanılır; burada mevcut yapıyı bozmayalım
        "credentialSubject": {
          id: subjectDid.trim(),
          name: subjectName.trim()
        }
      };

      // JWS benzeri: header.payload → detached Ed25519 imza
      const header = { alg: "EdDSA", typ: "JWT" };
      const msgForSig = `${b64uJson(header)}.${b64uJson(vcBody)}`;

      const skBytes = b64uToBytes(identity.sk_b64u);
      const sigBytes = ed25519Sign(skBytes, enc.encode(msgForSig));

      const vcSigned = {
        ...vcBody,
        proof: {
          type: "Ed25519Signature2020",
          created: issuance,
          proofPurpose: "assertionMethod",
          verificationMethod: `${identity.did}#key-1`,
          jws: b64u(sigBytes),
          issuer_pk_b64u: identity.pk_b64u
        }
      };

      // indir + store + önizleme
      const blob = new Blob([JSON.stringify(vcSigned, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${jti}.wpvc`;
      a.click();
      URL.revokeObjectURL(a.href);

      addVCToStore(vcSigned);
      setOut(vcSigned);
      setMsg({ type: "ok", text: t('vc_created_downloaded') });
    } catch (e) {
      setMsg({ type: "err", text: t('vc_create_failed') + ": " + (e?.message || String(e)) });
    } finally {
      setBusy(false);
    }
  }, [issuerReady, subjectName, subjectDid, vcType, jti, didOk, identity]);

  const copyJson = () => out && copy(JSON.stringify(out), t('vc_json_copied'), t('copy_failed'));
  const copyIssuerDid = () => identity?.did && copy(identity.did, t('issuer_copied'));

  const onEnterSubmit = (e) => {
    if (e.key === "Enter" && canIssue && !busy) {
      e.preventDefault();
      issue();
    }
  };

  return (
    <section className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)]/90 backdrop-blur p-5 shadow-sm space-y-5">
      {/* Üst başlık + Issuer durumu */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <h2 className="text-base font-semibold">{t('issue_vc_title')}</h2>
          <p className="text-[12px] text-[color:var(--muted)] mt-0.5">{t('issue_vc_desc')}</p>
        </div>

          <div className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs
          ${issuerReady
            ? "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
          <span className="font-medium">{issuerReady ? t('issuer_ready') : t('issuer_missing')}</span>
          {issuerReady && (
            <button onClick={copyIssuerDid} className="ml-1 inline-flex items-center gap-1 hover:underline">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/></svg>
              {t('copy_did')}
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="grid sm:grid-cols-2 gap-4" onKeyDown={onEnterSubmit}>
        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-1">{t('subject_name_label')}</label>
          <input
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder={t('subject_placeholder')}
            className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
          />
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">{t('subject_hint')}</p>
        </div>

        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-1">{t('subject_did_label')}</label>
          <input
            value={subjectDid}
            onChange={(e) => setSubjectDid(e.target.value)}
            placeholder={t('subject_did_placeholder')}
            className={`w-full px-3 py-2 rounded-xl border outline-none focus:ring-2 font-mono text-xs
              ${didOk
                ? "border-[color:var(--border)] bg-[color:var(--panel)] focus:ring-[color:var(--brand-2)]"
                : "border-rose-300 bg-rose-50/50 dark:bg-rose-500/10 focus:ring-rose-400"}`}
            aria-invalid={!didOk && !!subjectDid}
          />
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">{didOk ? t('did_valid') : t('did_format')}</p>
        </div>

        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-1">{t('vc_type_label')}</label>
            <select
              value={vcType}
              onChange={(e) => setVcType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
            >
              {/* Default built-in tipler */}
              <option value="StudentCard">{t("vc.template.student_card")}</option>
              <option value="Membership">{t("vc.template.membership")}</option>
              <option value="KYC">{t("vc.template.kyc")}</option>

              {/* Kuruma özel template'ler varsa ayrı grup */}
              {orgTemplates.length > 0 && (
                <optgroup label="Kurum Taslakları">
                  {orgTemplates.map((tpl) => (
                    <option key={tpl.key} value={tpl.key}>
                      {tpl.name} ({tpl.key})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

          <p className="mt-1 text-[11px] text-[color:var(--muted)]">{t('vc_type_hint')}</p>
        </div>

        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-1">{t('jti_label')}</label>
          <input
            value={jti}
            readOnly
            className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--muted)] font-mono text-xs"
          />
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">{t('jti_hint')}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
          <button
          onClick={issue}
          disabled={!canIssue || busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 1-9 9"/>
              </svg>
              {t('create_download_vc')}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1"/>
              </svg>
              {t('create_download_vc')}
            </>
          )}
        </button>

        {out && (
          <button
            onClick={copyJson}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/>
            </svg>
            {t('copy_json')}
          </button>
        )}
      </div>

      {/* Messages */}
          {msg && (
        <div
          role={msg.type==="err" ? "alert" : "status"}
          className={`text-xs rounded-lg px-3 py-2 border ${
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

      {/* QR Kod ve NFC */}
      {out && (
        <div className="mt-4 space-y-3">
          <div className="text-sm font-medium">{t('share_vc')}</div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <MiniQR value={JSON.stringify(out)} size={150} />
              <span className="text-xs text-[color:var(--muted)]">{t('qr_code')}</span>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if ('NDEFWriter' in window) {
                    const writer = new NDEFWriter();
                    writer.write({ records: [{ recordType: 'mime', data: new Blob([JSON.stringify(out)], { type: 'application/json' }), mediaType: 'application/json' }] })
                      .then(() => setMsg({ type: "ok", text: t('nfc_written') }))
                      .catch(() => setMsg({ type: "err", text: t('nfc_write_failed') }));
                  } else {
                    setMsg({ type: "info", text: t('nfc_not_supported') });
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 12h12M6 8h12M6 16h12"/>
                </svg>
                {t('write_nfc')}
              </button>
              <span className="text-xs text-[color:var(--muted)]">{t('nfc_hint')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {out && (
        <div className="mt-1">
          <div className="text-xs text-[color:var(--muted)] mb-1">{t('preview')}</div>
          <pre className="font-mono text-xs bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-xl p-3 max-h-72 overflow-auto">
{JSON.stringify(out, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
