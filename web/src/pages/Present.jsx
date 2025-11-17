// src/pages/Present.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import QRCode from "qrcode";
import { t } from "../lib/i18n";
import { useIdentity } from "../lib/identityContext";
import { b64u, b64uToBytes } from "../lib/crypto";
import { getVCs, migrateVCsIfNeeded } from "../lib/storage";
import nacl from "tweetnacl";

const enc = new TextEncoder();

/* ---------- helpers ---------- */
function safeJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function Pill({ ok, text }) {
  const cls = ok
    ? "border-emerald-400/30 bg-[color:var(--panel-2)] text-emerald-300"
    : "border-rose-400/30 bg-[color:var(--panel-2)] text-rose-300";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {text}
    </span>
  );
}

function CopyBtn({ value, label = "Kopyala", title }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value)}
      title={title}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-[11px]"
    >
      <svg className="h-3.5 w-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <rect x="2" y="2" width="13" height="13" rx="2" />
      </svg>
      {label}
    </button>
  );
}

/* ---------- component ---------- */
export default function Present() {
  const { identity } = useIdentity(); // { did, sk_b64u, pk_b64u }
  migrateVCsIfNeeded(); // <— eski anahtardan taşı
  const [vcs, setVcs] = useState(() => getVCs() || []);

  const [qrJson, setQrJson] = useState("");
  const [vcIdx, setVcIdx] = useState(-1);
  const [out, setOut] = useState("");
  const [publishedPath, setPublishedPath] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [msg, setMsg] = useState(null); // {type:'ok'|'err'|'info', text}

  const refreshVCs = useCallback(() => {
    try {
      const list = getVCs() || [];
      setVcs(Array.isArray(list) ? list : []);
    } catch {
      setVcs([]);
    }
  }, []);

  // ilk yükleme + görünürlük değişince yenile
  useEffect(() => {
    refreshVCs();
  }, [refreshVCs]);

  useEffect(() => {
    const onStorage = (e) => {
      // başka sekmede değiştiyse
      if (!e || e.key === "worldpass_vcs") refreshVCs();
      if (!e || e.key === "wp.vcs") refreshVCs(); // yeni key’i dinle
    };
    const onLocal = () => refreshVCs(); // aynı sekme için custom event
    window.addEventListener("storage", onStorage);
    window.addEventListener("vcs:changed", onLocal);
    document.addEventListener("visibilitychange", onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("vcs:changed", onLocal);
      document.removeEventListener("visibilitychange", onLocal);
    };
  }, [refreshVCs]);

  // QR isteğini parse et + normalize
  const req = useMemo(() => {
    const j = safeJson(qrJson);
    if (!j || j.type !== "present" || typeof j.challenge !== "string") return null;

    const aud = j.aud ?? null;
    const exp = j.exp == null ? null : Number(j.exp); // saniye
    if (exp != null && !Number.isFinite(exp)) return null;

    const fields = Array.isArray(j.fields)
      ? j.fields.filter((f) => typeof f === "string")
      : null;

    const vcReq = j.vc && typeof j.vc === "object" ? j.vc : null;
    const label = typeof j.label === "string" ? j.label : null;

    return {
      type: "present",
      challenge: j.challenge,
      aud,
      exp,
      fields,
      vcReq,
      label,
    };
  }, [qrJson]);

  // exp (geri sayım)
  const [left, setLeft] = useState(null);
  useEffect(() => {
    if (!req?.exp) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const ms = Math.max(0, req.exp * 1000 - Date.now());
      setLeft(Math.ceil(ms / 1000));
    };
    tick();
    const tId = setInterval(tick, 500);
    return () => clearInterval(tId);
  }, [req?.exp]);

  const expired = useMemo(() => {
    if (!req?.exp) return false;
    return Date.now() > req.exp * 1000;
  }, [req?.exp]);

  const hasId = !!identity?.sk_b64u && !!identity?.did;

  // Bu isteğe uyan VCleri bul
  const matchingIndices = useMemo(() => {
    if (!req) return [];
    return vcs
      .map((vc, i) => ({ vc, i }))
      .filter(({ vc }) => {
        if (!vc) return false;

        // VC type kontrolü (isteğe bağlı)
        if (req.vcReq?.type) {
          const required = req.vcReq.type;
          const vcTypes = Array.isArray(vc.type)
            ? vc.type
            : vc.type
            ? [vc.type]
            : [];

          if (Array.isArray(required)) {
            // en az bir tanesi match etsin
            if (!required.some((r) => vcTypes.includes(r))) return false;
          } else {
            if (!vcTypes.includes(required)) return false;
          }
        }

        // issuer kontrolü (isteğe bağlı)
        if (req.vcReq?.issuer && vc.issuer !== req.vcReq.issuer) return false;

        // fields kontrolü (istenen alanlar bu VC'de var mı?)
        if (req.fields && req.fields.length > 0) {
          const cs = vc.credentialSubject || {};
          for (const f of req.fields) {
            if (!(f in cs)) return false;
          }
        }

        return true;
      })
      .map((x) => x.i);
  }, [vcs, req]);

  const vcValid = vcIdx >= 0 && vcIdx < vcs.length;
  const vcMatches =
    vcValid &&
    (matchingIndices.length === 0 || matchingIndices.includes(vcIdx));

  const canSign = !!(hasId && req && vcValid && vcMatches && !expired);

  // liste güncellenince seçimi düzelt
  useEffect(() => {
    if (vcs.length === 0) {
      setVcIdx(-1);
      return;
    }

    // Bu isteğe uyan VC varsa, ilkini seç
    if (matchingIndices.length > 0) {
      if (!matchingIndices.includes(vcIdx)) {
        setVcIdx(matchingIndices[0]);
      }
      return;
    }

    // İstek yok ya da hiç uymayan VC varsa, en azından 0'ı seç
    if (vcIdx < 0 || vcIdx >= vcs.length) setVcIdx(0);
  }, [vcs, vcIdx, matchingIndices]);

  // clipboard paste disabled — use scanner or file upload instead

  const buildPayload = () => {
    setMsg(null);
    setOut("");
    if (!hasId)
      return setMsg({
        type: "err",
        text: "Önce bu cihaz için kimlik anahtarını oluştur ya da içe aktar.",
      });
    if (!req)
      return setMsg({
        type: "err",
        text:
          "QR içeriği tanınmadı. Uygulamadaki doğrulayıcıdan gelen metni kullan.",
      });
    if (expired)
      return setMsg({
        type: "err",
        text: "Bu istek için süre dolmuş görünüyor.",
      });
    if (!vcValid)
      return setMsg({
        type: "err",
        text: "Göndermek istediğin sertifikayı seç.",
      });
    if (!vcMatches)
      return setMsg({
        type: "err",
        text:
          "Seçtiğin Kimlik Bilgisi bu isteğin şartlarıyla uyumlu değil. Başka bir VC seç.",
      });

    try {
      // mesaj = challenge|aud|exp (replay azaltma)
      const parts = [
        req.challenge,
        req.aud || "",
        req.exp ? String(req.exp) : "",
      ].join("|");
      const msgBytes = enc.encode(parts);

      // Ed25519 detached signature (sk 64 byte olmalı)
      const sk = b64uToBytes(identity.sk_b64u);
      const sig = nacl.sign.detached(msgBytes, sk);

      const holder = {
        did: identity.did,
        pk_b64u: identity.pk_b64u,
        sig_b64u: b64u(sig),
        alg: "Ed25519",
      };

      const vc = filteredVC || vcs[vcIdx];
      const payload = {
        type: "presentation",
        challenge: req.challenge,
        aud: req.aud || null,
        exp: req.exp || null,
        holder,
        vc,
      };

      const pretty = JSON.stringify(payload, null, 2);
      setOut(pretty);

      navigator.clipboard
        .writeText(JSON.stringify(payload))
        .then(() =>
          setMsg({ type: "ok", text: "Veri panoya kopyalandı." })
        )
        .catch(() =>
          setMsg({
            type: "info",
            text:
              "Otomatik kopyalanamadı, alttaki JSON’u elle kopyalayabilirsin.",
          })
        );
    } catch (e) {
      setMsg({
        type: "err",
        text: "İmza üretilemedi: " + (e?.message || String(e)),
      });
    }
  };

  const download = () => {
    if (!out) return;
    const blob = new Blob([out], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vp_payload.wpvc";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const publishToServer = async () => {
    if (!out)
      return setMsg({
        type: "err",
        text: "Önce gösterim verisi oluşturun.",
      });
    try {
      setMsg(null);
      const r = await fetch("/api/present/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: out,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      const path = d.path;
      setPublishedPath(path);
      const full =
        window.location.origin.replace(/\/$/, "") +
        "/" +
        path.replace(/^\//, "");
      // generate QR image
      try {
        const dataUrl = await QRCode.toDataURL(full, {
          width: 256,
          margin: 0,
        });
        setQrImage(dataUrl);
      } catch (e) {
        setQrImage(null);
      }
      setMsg({ type: "ok", text: "Sunucuya yüklendi. QR oluşturuldu." });
    } catch (e) {
      setMsg({
        type: "err",
        text: "Yükleme başarısız: " + (e?.message || String(e)),
      });
    }
  };

  const writeNfc = async () => {
    if (!publishedPath)
      return setMsg({
        type: "err",
        text: "Önce sunucuya yükleyip QR oluşturun.",
      });
    const full =
      window.location.origin.replace(/\/$/, "") +
      "/" +
      publishedPath.replace(/^\//, "");
    if (!("NDEFWriter" in window) && !("NDEFWriter" in globalThis)) {
      // try older API names
      if (!("NDEFWriter" in window))
        return setMsg({
          type: "info",
          text: "Tarayıcınız NFC yazmayı desteklemiyor.",
        });
    }
    try {
      const writer = new NDEFWriter();
      await writer.write({ records: [{ recordType: "url", data: full }] });
      setMsg({
        type: "ok",
        text:
          "URL başarıyla NFC" + String.fromCharCode(8217) + "ya yazıldı.",
      });
    } catch (e) {
      setMsg({
        type: "err",
        text: "NFC yazılamadı: " + (e?.message || String(e)),
      });
    }
  };

  // Get current VC
  const currentVC = useMemo(() => {
    if (vcIdx < 0 || vcIdx >= vcs.length) return null;
    return vcs[vcIdx];
  }, [vcs, vcIdx]);

  // Filter VC based on requested fields
  const filteredVC = useMemo(() => {
    if (!currentVC || !req?.fields) return currentVC;
    const { credentialSubject, ...rest } = currentVC;
    if (!credentialSubject) return currentVC;
    const filteredSubject = {};
    req.fields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(credentialSubject, field)) {
        filteredSubject[field] = credentialSubject[field];
      }
    });
    return { ...rest, credentialSubject: filteredSubject };
  }, [currentVC, req?.fields]);

  return (
    <section className="max-w-5xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Kimlik Bilgisini Göster</h2>
        <div className="flex items-center gap-2 text-xs">
          <Pill
            ok={!!identity}
            text={identity ? "Kimlik: hazır" : "Kimlik: yok"}
          />
          <Pill ok={!!vcs.length} text={`Kimlik Bilgileri: ${vcs.length}`} />
          <Pill
            ok={!!req && !expired}
            text={
              req
                ? expired
                  ? "İstek: süresi doldu"
                  : `İstek: hazır${left != null ? ` (${left}s)` : ""}`
                : "İstek: yok"
            }
          />
        </div>
      </div>

      {req && (
        <div className="mb-3 text-[11px] text-[color:var(--muted)] space-y-0.5">
          {req.label && (
            <div>
              <span className="font-semibold">Amaç:</span> {req.label}
            </div>
          )}
          {req.vcReq?.type && (
            <div>
              <span className="font-semibold">İstenen VC tipi:</span>{" "}
              <code className="font-mono text-[10px]">
                {Array.isArray(req.vcReq.type)
                  ? req.vcReq.type.join(", ")
                  : String(req.vcReq.type)}
              </code>
            </div>
          )}
          {req.vcReq?.issuer && (
            <div>
              <span className="font-semibold">İstenen issuer:</span>{" "}
              <code className="font-mono text-[10px]">
                {req.vcReq.issuer}
              </code>
            </div>
          )}
          {req.fields && req.fields.length > 0 && (
            <div>
              <span className="font-semibold">İstenen alanlar:</span>{" "}
              {req.fields.join(", ")}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)]/80 backdrop-blur p-5 shadow-sm space-y-4">
        {/* QR JSON */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-[color:var(--muted)]">
              Doğrulayıcıdan gelen QR içeriği
            </label>
            <div className="flex gap-2">
              {/* clipboard paste button removed; use scanner or upload */}
              <button
                onClick={() => {
                  const sample = {
                    type: "present",
                    challenge: "demo-chal-123",
                    aud: "kampus-kapi",
                    exp: Math.floor(Date.now() / 1000) + 180,
                  };
                  setQrJson(JSON.stringify(sample, null, 2));
                }}
                className="px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs"
              >
                Örnek doldur
              </button>
            </div>
          </div>
          <textarea
            rows={8}
            className="w-full font-mono text-xs px-3 py-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]/90 outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] text-[color:var(--text)]"
            placeholder='{"type":"present","challenge":"...","aud":"kampus-kapi","exp":1731000000}'
            value={qrJson}
            onChange={(e) => setQrJson(e.target.value)}
            aria-invalid={!req && qrJson ? "true" : "false"}
          />
          {!req && qrJson && (
            <p className="mt-2 text-xs rounded-lg px-3 py-2 border border-rose-400/30 bg-[color:var(--panel-2)] text-rose-300">
              Bu QR içeriği tanınmadı. Genelde doğrulayıcı ekranından indirilen
              `.wpvc` dosyasını yüklemeli veya QR'ı taramalısınız.
            </p>
          )}
        </div>

        {/* Publish / QR / NFC controls */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={publishToServer}
            disabled={!out}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-[color:var(--text)] disabled:opacity-50 text-base font-medium"
            title="Gösterim verisini sunucuya yükle ve paylaşılabilir QR kod oluştur"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Sunucuya Yükle ve QR Oluştur
          </button>
          <button
            onClick={writeNfc}
            disabled={!publishedPath}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-[color:var(--text)] disabled:opacity-50 text-base font-medium"
            title="Gösterim verisini NFC etiketine yazarak paylaş"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 12h12M6 8h12M6 16h12" />
            </svg>
            NFC'ye Yaz
          </button>
          {qrImage && (
            <div className="flex flex-col items-center gap-2">
              <img
                src={qrImage}
                alt="Presentation QR"
                className="w-32 h-32 border border-[color:var(--border)] rounded-lg shadow-sm"
              />
              <span className="text-xs text-[color:var(--muted)]">
                QR Kod
              </span>
            </div>
          )}
        </div>

        {/* VC seçimi + aksiyonlar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-[color:var(--muted)]">
            Gösterilecek Kimlik Bilgisi
          </div>
          <select
            className="px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] text-sm"
            value={vcIdx}
            onChange={(e) => setVcIdx(Number(e.target.value))}
          >
            {vcs.length === 0 && (
              <option disabled>— Kayıtlı Kimlik Bilgisi yok —</option>
            )}
            {vcs.map((v, i) => {
              const labelType = Array.isArray(v?.type)
                ? v.type.join(", ")
                : v?.type || "Kimlik Bilgisi";
              const label = `${labelType} — ${v?.jti || `vc-${i + 1}`}`;
              const isMatch =
                matchingIndices.length === 0 ||
                matchingIndices.includes(i);
              return (
                <option key={i} value={i} disabled={!isMatch}>
                  {label}
                  {!isMatch ? " (bu istek için uyumsuz)" : ""}
                </option>
              );
            })}
          </select>

          {req && matchingIndices.length === 0 && (
            <div className="text-[11px] text-amber-300">
              Bu isteğe uyan bir Kimlik Bilgisi bulunamadı. İstenen
              tipe/issuer’a ve alanlara sahip bir VC yok.
            </div>
          )}

          <button
            onClick={buildPayload}
            disabled={!canSign}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 disabled:opacity-50 text-base font-medium"
            title="İmzala ve gösterim verisini panoya kopyala"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 3v12" />
              <path d="M8 11l4 4 4-4" />
              <rect x="4" y="17" width="16" height="4" rx="1" />
            </svg>
            İmzala ve Veriyi Kopyala
          </button>

          <button
            onClick={download}
            disabled={!out}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-[color:var(--text)] disabled:opacity-50 text-base font-medium"
            title="Gösterim verisini dosya olarak indir"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 3v12" />
              <path d="M8 11l4 4 4-4" />
              <rect x="4" y="17" width="16" height="4" rx="1" />
            </svg>
            {t("download_presentation_file")}
          </button>

          {out && (
            <CopyBtn
              value={out}
              label="JSON’u Kopyala"
              title="JSON verisini panoya kopyala"
            />
          )}
        </div>

        {/* Seçili VC kısa önizleme */}
        {filteredVC && (
          <details className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-3 text-xs">
            <summary className="cursor-pointer select-none">
              {req?.fields
                ? "İstenen alanlar filtrelenmiş Kimlik Bilgisi içeriği"
                : "Seçilen Kimlik Bilgisinin içeriği"}
            </summary>
            <pre className="mt-2 max-h-56 overflow-auto bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded p-2">
              {JSON.stringify(filteredVC, null, 2)}
            </pre>
          </details>
        )}

        {/* Mesajlar */}
        {msg && (
          <div
            className={[
              "text-xs rounded-lg px-3 py-2 border",
              msg.type === "ok"
                ? "border-emerald-400/30 bg-[color:var(--panel-2)] text-emerald-300"
                : msg.type === "err"
                ? "border-rose-400/30 bg-[color:var(--panel-2)] text-rose-300"
                : "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]",
            ].join(" ")}
          >
            {msg.text}
          </div>
        )}

        {/* Çıktı */}
        {out && (
          <div>
            <div className="text-sm text-[color:var(--text)] mb-1">
              Gönderilecek veri (JSON)
            </div>
            <pre className="font-mono text-xs bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-xl p-3 overflow-auto">
              {out}
            </pre>
          </div>
        )}

        {/* İpucu */}
        <div className="text-[11px] text-[color:var(--muted)]">
          Güvenlik notu: İmza sadece bu isteğe özel üretilir ve gizli
          anahtarın cihazını terk etmez.
        </div>
      </div>
    </section>
  );
}
