// src/pages/identity/IssueVC.jsx
import { useMemo, useState, useCallback } from "react";
import { b64u, ed25519Sign, b64uToBytes } from "../lib/crypto";
import { addVC as addVCToStore } from "../lib/storage";

const enc = new TextEncoder();
const b64uJson = (obj) => b64u(enc.encode(JSON.stringify(obj)));

export default function IssueVC({ identity }) {
  const [subjectName, setSubjectName] = useState("");
  const [subjectDid, setSubjectDid]   = useState("");
  const [vcType, setVcType]           = useState("StudentCard");
  const [busy, setBusy]               = useState(false);
  const [msg, setMsg]                 = useState(null); // {type:'ok'|'err'|'info', text}
  const [out, setOut]                 = useState(null);

  // sabit jti (sayfa ilk yükleniş anı)
  const jti = useMemo(() => `vc-${Math.floor(Date.now() / 1000)}`, []);

  const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const issuerReady = Boolean(identity?.did);
  const didOk = useMemo(() => /^did:[a-z0-9]+:/i.test((subjectDid||"").trim()), [subjectDid]);
  const canIssue = issuerReady && subjectName.trim() && didOk;

  const copy = (txt, ok="Kopyalandı.", fail="Kopyalanamadı.") =>
    navigator.clipboard.writeText(txt)
      .then(()=> setMsg({type:"ok", text: ok}))
      .catch(()=> setMsg({type:"info", text: fail}));

  const issue = useCallback(async () => {
    setMsg(null);
    if (!issuerReady) return setMsg({ type: "err", text: "Önce issuer kimliğini yükle/oluştur." });
    if (!subjectName.trim()) return setMsg({ type: "err", text: "Subject name boş olamaz." });
    if (!didOk) return setMsg({ type: "err", text: "Subject DID 'did:method:...' biçiminde olmalı." });

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
      a.download = `${jti}.json`;
      a.click();
      URL.revokeObjectURL(a.href);

      addVCToStore(vcSigned);
      setOut(vcSigned);
      setMsg({ type: "ok", text: "VC oluşturuldu ve indirildi." });
    } catch (e) {
      setMsg({ type: "err", text: "VC oluşturulamadı: " + (e?.message || String(e)) });
    } finally {
      setBusy(false);
    }
  }, [issuerReady, subjectName, subjectDid, vcType, jti, didOk, identity]);

  const copyJson = () => out && copy(JSON.stringify(out), "VC JSON kopyalandı.", "Kopyalanamadı, alttan elle kopyala.");
  const copyIssuerDid = () => identity?.did && copy(identity.did, "Issuer DID kopyalandı.");

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
          <h2 className="text-base font-semibold">Issue VC</h2>
          <p className="text-[12px] text-[color:var(--muted)] mt-0.5">Hızlıca bir Verifiable Credential üret ve imzala.</p>
        </div>

        <div className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs
          ${issuerReady
            ? "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
          <span className="font-medium">{issuerReady ? "Issuer: ready" : "Issuer: missing"}</span>
          {issuerReady && (
            <button onClick={copyIssuerDid} className="ml-1 inline-flex items-center gap-1 hover:underline">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/></svg>
              Copy DID
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="grid sm:grid-cols-2 gap-4" onKeyDown={onEnterSubmit}>
        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-1">Subject name</label>
          <input
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="Örn. Ada Yılmaz"
            className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
          />
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">VC içinde <code>credentialSubject.name</code> olarak yer alır.</p>
        </div>

        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-1">Subject DID</label>
          <input
            value={subjectDid}
            onChange={(e) => setSubjectDid(e.target.value)}
            placeholder="did:key:z…  |  did:pkh:…  |  did:web:…"
            className={`w-full px-3 py-2 rounded-xl border outline-none focus:ring-2 font-mono text-xs
              ${didOk
                ? "border-[color:var(--border)] bg-[color:var(--panel)] focus:ring-[color:var(--brand-2)]"
                : "border-rose-300 bg-rose-50/50 dark:bg-rose-500/10 focus:ring-rose-400"}`}
            aria-invalid={!didOk && !!subjectDid}
          />
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">{didOk ? "Geçerli görünüyor." : "Biçim: did:method:identifier"}</p>
        </div>

        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-1">VC Type</label>
          <select
            value={vcType}
            onChange={(e) => setVcType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
          >
            <option value="StudentCard">StudentCard</option>
            <option value="Membership">Membership</option>
            <option value="KYC">KYC</option>
          </select>
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">VC <code>type</code> alanına eklenir.</p>
        </div>

        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-1">JTI (ID)</label>
          <input
            value={jti}
            readOnly
            className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--muted)] font-mono text-xs"
          />
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">İndirilen dosya adı için de kullanılır.</p>
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
              Create & Download VC
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1"/>
              </svg>
              Create & Download VC
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
            Copy JSON
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

      {/* Preview */}
      {out && (
        <div className="mt-1">
          <div className="text-xs text-[color:var(--muted)] mb-1">Preview</div>
          <pre className="font-mono text-xs bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-xl p-3 max-h-72 overflow-auto">
{JSON.stringify(out, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
