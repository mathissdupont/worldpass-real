// src/pages/Present.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useIdentity } from "../lib/identityContext";
import { b64u, b64uToBytes } from "../lib/crypto";
import { getVCs, migrateVCsIfNeeded } from "../lib/storage";
import nacl from "tweetnacl";

const enc = new TextEncoder();

/* ---------- helpers ---------- */
function safeJson(str){ try{ return JSON.parse(str);}catch{ return null; } }

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

function CopyBtn({ value, label = "Kopyala" }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(value)}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-[11px]"
    >
      <svg className="h-3.5 w-3.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="9" y="9" width="13" height="13" rx="2"/><rect x="2" y="2" width="13" height="13" rx="2"/>
      </svg>
      {label}
    </button>
  );
}

/* ---------- component ---------- */
export default function Present(){
  const { identity } = useIdentity(); // { did, sk_b64u, pk_b64u }
  migrateVCsIfNeeded();      // <— eski anahtardan taşı
  const [vcs, setVcs] = useState(() => getVCs() || []);

  const [qrJson, setQrJson] = useState("");
  const [vcIdx, setVcIdx] = useState(-1);
  const [out, setOut] = useState("");
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

  // liste güncellenince seçimi düzelt
  useEffect(() => {
    if (vcs.length === 0) { setVcIdx(-1); return; }
    if (vcIdx < 0 || vcIdx >= vcs.length) setVcIdx(0);
  }, [vcs, vcIdx]);

  // QR isteğini parse et + normalize
  const req = useMemo(()=>{
    const j = safeJson(qrJson);
    if(!j || j.type !== "present" || typeof j.challenge !== "string") return null;
    const aud = j.aud ?? null;
    const exp = j.exp == null ? null : Number(j.exp); // string gelirse de sayıya çevir
    if (exp != null && !Number.isFinite(exp)) return null;
    return { type:"present", challenge: j.challenge, aud, exp };
  },[qrJson]);

  // exp (geri sayım)
  const [left, setLeft] = useState(null);
  useEffect(()=>{
    if(!req?.exp) { setLeft(null); return; }
    const tick = ()=>{
      const ms = Math.max(0, req.exp*1000 - Date.now());
      setLeft(Math.ceil(ms/1000));
    };
    tick();
    const t = setInterval(tick, 500);
    return ()=> clearInterval(t);
  },[req?.exp]);

  const expired = useMemo(()=> {
    if(!req?.exp) return false;
    return Date.now() > req.exp*1000;
  }, [req?.exp]);

  const hasId   = !!identity?.sk_b64u && !!identity?.did;
  const vcValid = vcIdx >= 0 && vcIdx < vcs.length;
  const canSign = !!(hasId && req && vcValid && !expired);

  const pasteFromClipboard = async ()=>{
    try{
      const t = await navigator.clipboard.readText();
      setQrJson(t);
      setMsg({type:"ok", text:"Panodan QR içeriği yapıştırıldı."});
    }catch(e){
      setMsg({type:"info", text:"Panodan okunamadı. Taradığın QR metnini elle de yapıştırabilirsin."});
    }
  };

  const buildPayload = ()=>{
    setMsg(null); setOut("");
    if(!hasId)   return setMsg({type:"err", text:"Önce bu cihaz için kimlik anahtarını oluştur ya da içe aktar."});
    if(!req)     return setMsg({type:"err", text:'QR içeriği tanınmadı. Uygulamadaki doğrulayıcıdan gelen metni kullan.'});
    if(expired)  return setMsg({type:"err", text:"Bu istek için süre dolmuş görünüyor."});
    if(!vcValid) return setMsg({type:"err", text:"Göndermek istediğin sertifikayı seç."});

    try{
      // mesaj = challenge|aud|exp (replay azaltma)
      const parts = [req.challenge, req.aud || "", req.exp ? String(req.exp) : ""].join("|");
      const msgBytes = enc.encode(parts);

      // Ed25519 detached signature (sk 64 byte olmalı)
      const sk = b64uToBytes(identity.sk_b64u);
      const sig = nacl.sign.detached(msgBytes, sk);

      const holder = {
        did: identity.did,
        pk_b64u: identity.pk_b64u,
        sig_b64u: b64u(sig),
        alg: "Ed25519"
      };

      const vc = vcs[vcIdx];
      const payload = {
        type: "presentation",
        challenge: req.challenge,
        aud: req.aud || null,
        exp: req.exp || null,
        holder,
        vc
      };

      const pretty = JSON.stringify(payload, null, 2);
      setOut(pretty);

      navigator.clipboard.writeText(JSON.stringify(payload))
        .then(()=> setMsg({type:"ok", text:"Veri panoya kopyalandı. Doğrulayıcıya yapıştırabilirsin."}))
        .catch(()=> setMsg({type:"info", text:"Otomatik kopyalanamadı, alttaki JSON’u elle kopyalayabilirsin."}));
    }catch(e){
      setMsg({type:"err", text:"İmza üretilemedi: " + (e?.message || String(e))});
    }
  };

  const download = ()=>{
    if(!out) return;
    const blob = new Blob([out], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vp_payload.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const currentVC = vcValid ? vcs[vcIdx] : null;

  return (
    <section className="max-w-5xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Sertifika Göster</h2>
        <div className="flex items-center gap-2 text-xs">
          <Pill ok={!!identity} text={identity ? "Kimlik: hazır" : "Kimlik: yok"} />
          <Pill ok={!!vcs.length} text={`Sertifikalar: ${vcs.length}`} />
          <Pill
            ok={!!req && !expired}
            text={
              req
                ? (expired ? "İstek: süresi doldu" : `İstek: hazır${(left!=null)?` (${left}s)`:``}`)
                : "İstek: yok"
            }
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)]/80 backdrop-blur p-5 shadow-sm space-y-4">
        {/* QR JSON */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-[color:var(--muted)]">Doğrulayıcıdan gelen QR içeriği</label>
            <div className="flex gap-2">
              <button onClick={pasteFromClipboard} className="px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs">Panodan Yapıştır</button>
              <button
                onClick={()=>{
                  const sample = {
                    type: "present",
                    challenge: "demo-chal-123",
                    aud: "kampus-kapi",
                    exp: Math.floor(Date.now()/1000)+180
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
            onChange={(e)=>setQrJson(e.target.value)}
            aria-invalid={!req && qrJson ? "true" : "false"}
          />
          {!req && qrJson && (
            <p className="mt-2 text-xs rounded-lg px-3 py-2 border border-rose-400/30 bg-[color:var(--panel-2)] text-rose-300">
              Bu QR içeriği tanınmadı. Genelde doğrulayıcı ekranından kopyaladığın metni buraya yapıştırmalısın.
            </p>
          )}
        </div>

        {/* VC seçimi + aksiyonlar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-[color:var(--muted)]">Gösterilecek sertifika</div>
          <select
            className="px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] text-sm"
            value={vcIdx}
            onChange={(e)=>setVcIdx(Number(e.target.value))}
          >
            {vcs.length===0 && <option disabled>— Kayıtlı sertifika yok —</option>}
            {vcs.map((v,i)=>{
              const labelType = Array.isArray(v?.type) ? v.type.join(", ") : (v?.type || "Sertifika");
              const label = `${labelType} — ${v?.jti || `vc-${i+1}`}`;
              return <option key={i} value={i}>{label}</option>;
            })}
          </select>

          <button
            onClick={buildPayload}
            disabled={!canSign}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 disabled:opacity-50"
            title={!hasId ? "Kimlik yok" : expired ? "İstek süresi doldu" : (!vcValid ? "Sertifika seç" : "")}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1"/>
            </svg>
            İmzala ve Veriyi Kopyala
          </button>

          <button
            onClick={download}
            disabled={!out}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-[color:var(--text)] disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1"/>
            </svg>
            JSON Olarak İndir
          </button>

          {out && <CopyBtn value={out} label="JSON’u Kopyala" />}
        </div>

        {/* Seçili VC kısa önizleme */}
        {currentVC && (
          <details className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-3 text-xs">
            <summary className="cursor-pointer select-none">Seçilen sertifikanın içeriği</summary>
            <pre className="mt-2 max-h-56 overflow-auto bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded p-2">
{JSON.stringify(currentVC, null, 2)}
            </pre>
          </details>
        )}

        {/* Mesajlar */}
        {msg && (
          <div className={[
              "text-xs rounded-lg px-3 py-2 border",
              msg.type==="ok"
                ? "border-emerald-400/30 bg-[color:var(--panel-2)] text-emerald-300"
                : msg.type==="err"
                ? "border-rose-400/30 bg-[color:var(--panel-2)] text-rose-300"
                : "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]"
            ].join(" ")}
          >
            {msg.text}
          </div>
        )}

        {/* Çıktı */}
        {out && (
          <div>
            <div className="text-sm text-[color:var(--text)] mb-1">Gönderilecek veri (JSON)</div>
            <pre className="font-mono text-xs bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-xl p-3 overflow-auto">
{out}
            </pre>
          </div>
        )}

        {/* İpucu */}
        <div className="text-[11px] text-[color:var(--muted)]">
          Güvenlik notu: İmza sadece bu isteğe özel üretilir ve gizli anahtarın cihazını terk etmez.
        </div>
      </div>
    </section>
  );
}
