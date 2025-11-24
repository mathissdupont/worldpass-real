// src/pages/issuer/Console.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { putTemplate, listOrgs, getOrg, removeTemplate } from "@/lib/issuerStore.js";
import { useIdentity } from "@/lib/identityContext";
import { b64u, ed25519Sign, b64uToBytes } from "@/lib/crypto";
import { getIssuerProfile, rotateIssuerApiKey, issueCredential, revokeCredential } from "@/lib/api";

import { parseWPML, renderWPML } from "@/lib/wpml";
import { t } from "@/lib/i18n";
import { listPresetTexts } from "@/lib/issuerPresets";

import { parseWPT, renderWPT } from "@/lib/wpt";
import { normalizeLite2 } from "@/lib/wpt_lite2";           // WPT-Lite 2.0
import WPTEditorPro from "@/pages/tools/WPTEditorPRO.jsx";  // Monaco editör (modalda)

const enc = new TextEncoder();
const b64uJson = (o)=> b64u(enc.encode(JSON.stringify(o)));

function tryParse(jsonStr){
  try{ return { ok:true, value: JSON.parse(jsonStr) }; }
  catch(e){
    const m = (e.message||"").match(/position\s+(\d+)/i);
    let pos = m ? Number(m[1]) : NaN;
    let line = 1, col = 1;
    if(!isNaN(pos)){
      for(let i=0;i<pos;i++){ if(jsonStr[i]==="\n"){ line++; col=1; } else { col++; } }
    }
    return { ok:false, error:`JSON parse error: ${e.message}${isNaN(pos)?"":`  (line ${line}, col ${col})`}` };
  }
}

/* ---------- UI bits (token-friendly) ---------- */
function Pill({ tone="info", children }) {
  const map = {
    info:  "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]",
    ok:    "border-emerald-400/30 bg-[color:var(--panel-2)] text-emerald-300",
    warn:  "border-amber-400/30  bg-[color:var(--panel-2)] text-amber-300",
    err:   "border-rose-400/30   bg-[color:var(--panel-2)] text-rose-300",
  };
  return <div className={`text-xs rounded-lg px-3 py-2 border ${map[tone]||map.info}`}>{children}</div>;
}

function Badge({ children, tone="default" }){
  const map = {
    default: "border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)]",
    dark:    "border-[color:var(--border)] bg-black text-white",
    info:    "border-sky-400/30 bg-[color:var(--panel-2)] text-sky-300",
  };
  return <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs ${map[tone]||map.default}`}>{children}</span>;
}

function Label({ text, required }) {
  return (
    <label className="text-sm text-[color:var(--text)] mb-1 block">
      {text}{required && <span className="text-rose-500"> *</span>}
    </label>
  );
}

function Select({ value, onChange, options=[], error, placeholder=t("issuer.console.select_placeholder") }) {
  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={onChange}
        className={[
          "w-full appearance-none px-3 py-2 rounded-xl",
          "bg-[color:var(--panel)] text-[color:var(--text)] border outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]",
          error ? "border-rose-300" : "border-[color:var(--border)]"
        ].join(" ")}
        aria-invalid={!!error}
      >
        <option value="">{placeholder}</option>
        {options.map(v=> <option key={v} value={v}>{v}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6"/></svg>
    </div>
  );
}

function Input({ type="text", value, onChange, placeholder, error }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className={[
        "w-full px-3 py-2 rounded-xl",
        "bg-[color:var(--panel)] text-[color:var(--text)] border outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]",
        error ? "border-rose-300" : "border-[color:var(--border)]"
      ].join(" ")}
      aria-invalid={!!error}
    />
  );
}

function TextArea({ rows=4, value, onChange, error, disabled, onKeyDown }) {
  return (
    <textarea
      rows={rows}
      value={value ?? ""}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
      className={[
        "w-full px-3 py-2 rounded-xl font-mono text-xs",
        "bg-[color:var(--panel)] text-[color:var(--text)] border outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]",
        disabled ? "opacity-60 cursor-not-allowed" : "",
        error ? "border-rose-300" : "border-[color:var(--border)]"
      ].join(" ")}
      aria-invalid={!!error}
    />
  );
}

function Field({ f, value, onChange, error }) {
  if (f.type === "textarea") {
    return (
      <div className="col-span-2">
        <Label text={f.label} required={f.required}/>
        <TextArea rows={5} value={value} onChange={e=>onChange(e.target.value)} error={error}/>
      </div>
    );
  }
  if (f.type === "select") {
    return (
      <div>
        <Label text={f.label} required={f.required}/>
        <Select value={value} onChange={e=>onChange(e.target.value)} options={Array.isArray(f.values)?f.values:[]} error={error}/>
      </div>
    );
  }
  const mapType = (t)=> (t==="number"||t==="date") ? t : "text";
  return (
    <div>
      <Label text={f.label} required={f.required}/>
      <Input type={mapType(f.type)} value={value} onChange={e=>onChange(e.target.value)} placeholder={f.id} error={error}/>
    </div>
  );
}

/* ---------- Main ---------- */
export default function IssuerConsole(){
  const navigate = useNavigate();
  const { identity } = useIdentity();
  
  // Auth & Profile
  const [issuer, setIssuer] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }
    
    getIssuerProfile(token)
      .then(resp => {
        setIssuer(resp.issuer);
        setLoadingProfile(false);
      })
      .catch(err => {
        console.error(err);
        localStorage.removeItem("issuer_token");
        navigate("/issuer/login");
      });
  }, [navigate]);

  const handleRotateKey = async () => {
    if (!confirm("API anahtarını değiştirmek istediğinize emin misiniz? Eski anahtar geçersiz olacak.")) return;
    try {
      const token = localStorage.getItem("issuer_token");
      const resp = await rotateIssuerApiKey(token);
      setApiKey(resp.api_key);
      alert("Yeni API Anahtarı oluşturuldu. Lütfen güvenli bir yere kaydedin, tekrar gösterilmeyecek.");
    } catch (err) {
      alert("Hata: " + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("issuer_token");
    localStorage.removeItem("issuer_info");
    navigate("/issuer/login");
  };

  // org (Legacy local storage support - might need to migrate to backend)
  // For now, we use the fetched issuer as the "org"
  const org = issuer ? {
    id: issuer.id,
    name: issuer.name,
    did: issuer.did,
    domain: issuer.domain,
    templates: {} // TODO: Fetch templates from backend
  } : null;

  // modlar
  const [mode, setMode] = useState("wpml"); // "wpml" | "wpt" | "manual"
  const [wptParsed, setWptParsed] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  // template meta
  const [tplKey,setTplKey] = useState("studentCard");
  const [tplName,setTplName] = useState("StudentCard");

  // sadece advanced’te
  const [tplBody,setTplBody] = useState(JSON.stringify({
    "@context":["https://www.w3.org/2018/credentials/v1"],
    "type":["VerifiableCredential","StudentCard"],
    "issuer":"{{org.did}}",
    "credentialSubject": { "id":"{{subjectDid}}","name":"{{name}}" }
  },null,2));
  const [tplErr,setTplErr] = useState("");

  // presetler
  const PRESETS = useMemo(()=>listPresetTexts() || [],[]);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(-1);
  const [presetFields, setPresetFields] = useState([]); // [{id,type,label,required,values?}]
  const [fieldValues, setFieldValues] = useState({});   // id->value

  // preview & output
  const [preview,setPreview] = useState("");
  const [out,setOut] = useState("");
  const [flash, setFlash] = useState(null); // {tone,text}

  // helpers
  const copyToClipboard = (txt) => navigator.clipboard.writeText(txt).catch(()=>{});

  const requiredMissing = useMemo(()=>{
    if (mode === "manual") return [];
    return (presetFields||[]).filter(f => f.required && !String(fieldValues[f.id]||"").trim());
  }, [presetFields, fieldValues, mode]);

  const canIssue = useMemo(()=>{
    if (!org || !identity?.sk_b64u) return false;
    if (mode !== "manual") return requiredMissing.length === 0;
    return true;
  },[org, identity?.sk_b64u, mode, requiredMissing.length]);

  const updateField = (id, val)=> setFieldValues(s=>({ ...s, [id]: val }));

  const loadPreset = (idx)=>{
    setSelectedPresetIdx(idx);
    setWptParsed(null);
    setMode(idx >= 0 ? "wpml" : "manual");

    setPresetFields([]);
    setFieldValues({});
    if (idx < 0) return;

    try{
      const txt = PRESETS[idx];
      if (!txt) throw new Error("Preset bulunamadı.");
      const parsed = parseWPML(txt);
      setTplKey(parsed.meta.key || "template");
      setTplName(parsed.meta.name || "Template");
      setPresetFields(parsed.fields || []);
      const fv = {};
      (parsed.fields||[]).forEach(f => { fv[f.id] = ""; });
      setFieldValues(fv);
      setTplErr("");
      setPreview("");
      setFlash({tone:"ok", text:`Hazır taslak yüklendi: ${parsed.meta.name || `#${idx+1}`}`});
      setTimeout(()=>setFlash(null), 1500);
    }catch(e){
      setTplErr(e.message || "Preset parse failed.");
    }
  };

  async function onUploadWPT(e){
    const f = e.target.files?.[0];
    if(!f) return;
    try{
      const raw = await f.text();
      const txt = normalizeLite2(raw); // kısa DSL’yi @-formatına çevir
      const parsed = parseWPT(txt);

      setMode("wpt");
      setWptParsed(parsed);

      setTplKey(parsed.meta.key || "template");
      setTplName(parsed.meta.name || "Template");

      const fields = parsed.fields || [];
      setPresetFields(fields);
      const fv = {};
      fields.forEach(x => fv[x.id] = parsed.defaults?.[x.id] ?? "");
      if (fv.subjectDid === undefined) fv.subjectDid = "";
      setFieldValues(fv);

      setSelectedPresetIdx(-1);
      setTplErr(""); setPreview("");
      setFlash({tone:"ok", text:`WPT taslağı yüklendi: ${parsed.meta.name || "Template"}`});
      setTimeout(()=>setFlash(null), 1500);
    }catch(err){
      setTplErr(err.message || "WPT parse failed");
    } finally {
      e.target.value = "";
    }
  }

  const buildBodyFromMode = ()=>{
    if (mode === "wpt" && wptParsed) {
      return renderWPT(wptParsed, { org, ...fieldValues });
    }
    if (mode === "wpml" && selectedPresetIdx >= 0) {
      const txt = PRESETS[selectedPresetIdx];
      const parsed = parseWPML(txt);
      return renderWPML(parsed, { org, ...fieldValues });
    }
    const p = tryParse(tplBody);        // manual (advanced)
    if (!p.ok) throw new Error(p.error);
    return p.value;
  };

  const doPreview = ()=>{
    try{
      setTplErr(""); setPreview("");
      if (!org) throw new Error("Önce bir kurum seç.");

      let body = buildBodyFromMode();
      const issuance = new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
      const jti = `vc-${Math.floor(Date.now()/1000)}-${Math.random().toString(36).slice(2,7)}`;

      body = { ...body, issuer: org.did, issuanceDate: issuance, jti };

      setPreview(JSON.stringify(body,null,2));
    }catch(e){
      setTplErr(e.message || String(e));
    }
  };

  const issue = ()=>{
    try{
      setTplErr(""); setOut("");
      if(!org) throw new Error("Kurum seçili değil.");
      if(!identity?.sk_b64u) throw new Error("Kurumsal imza anahtarı bulunamadı.");

      const src = buildBodyFromMode();
      const issuance = new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
      const jti = `vc-${Math.floor(Date.now()/1000)}-${Math.random().toString(36).slice(2,7)}`;
      const vcBody = { ...src, issuer: org.did, issuanceDate: issuance, jti };

      const header = { alg:"EdDSA", typ:"JWT" };
      const msg = `${b64uJson(header)}.${b64uJson(vcBody)}`;
      const skBytes = b64uToBytes(identity.sk_b64u);
      const sigBytes = ed25519Sign(skBytes, enc.encode(msg));
      const signed = {
        ...vcBody,
        proof:{
          type:"Ed25519Signature2020",
          created: issuance,
          proofPurpose:"assertionMethod",
          verificationMethod:`${org.did}#key-1`,
          jws: b64u(sigBytes),
          issuer_pk_b64u: identity.pk_b64u
        }
      };
      const pretty = JSON.stringify(signed,null,2);
      setOut(pretty);

      const blob = new Blob([pretty], {type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${jti}.wpvc`;
      a.click();
      URL.revokeObjectURL(a.href);

      setFlash({tone:"ok", text:"Sertifika oluşturuldu ve indirildi."});
      setTimeout(()=>setFlash(null), 1500);
    }catch(e){
      setTplErr(e.message || String(e));
    }
  };

  const handleSendToUser = async () => {
    try {
      setTplErr(""); setOut("");
      if(!org) throw new Error("Kurum seçili değil.");
      if(!identity?.sk_b64u) throw new Error("Kurumsal imza anahtarı bulunamadı.");

      const src = buildBodyFromMode();
      const issuance = new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
      const jti = `vc-${Math.floor(Date.now()/1000)}-${Math.random().toString(36).slice(2,7)}`;
      const vcBody = { ...src, issuer: org.did, issuanceDate: issuance, jti };

      const header = { alg:"EdDSA", typ:"JWT" };
      const msg = `${b64uJson(header)}.${b64uJson(vcBody)}`;
      const skBytes = b64uToBytes(identity.sk_b64u);
      const sigBytes = ed25519Sign(skBytes, enc.encode(msg));
      const signed = {
        ...vcBody,
        proof:{
          type:"Ed25519Signature2020",
          created: issuance,
          proofPurpose:"assertionMethod",
          verificationMethod:`${org.did}#key-1`,
          jws: b64u(sigBytes),
          issuer_pk_b64u: identity.pk_b64u
        }
      };
      
      const token = localStorage.getItem("issuer_token");
      const response = await issueCredential(null, signed, token);
      
      setOut(JSON.stringify(signed, null, 2));
      
      // Show success with recipient info
      const successMessage = response.recipient_id 
        ? `Sertifika başarıyla kaydedildi! Kullanıcının DID'si eşleşirse otomatik olarak cüzdanına eklenecek. Paylaşım kodu: ${response.recipient_id}`
        : "Sertifika kullanıcıya gönderildi ve kaydedildi.";
      setFlash({tone:"ok", text: successMessage});
      setTimeout(()=>setFlash(null), 5000);
    } catch(e) {
      setTplErr(e.message || String(e));
    }
  };

  const saveTpl = ()=>{
    // TODO: Implement backend save
    alert("Backend template saving not implemented yet for issuers.");
  };

  const delTpl = ()=>{
    // TODO: Implement backend delete
    alert("Backend template deletion not implemented yet for issuers.");
  };

  // textarea kısayolları: Ctrl+S kaydet / Ctrl+Enter preview
  const onTplKeyDown = useCallback((e)=>{
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s"){
      e.preventDefault(); if (mode==="manual") saveTpl(); else doPreview();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter"){
      e.preventDefault(); doPreview();
    }
  }, [mode, tplBody, org, tplKey, tplName]);

  // modal ESC ile kapansın
  useEffect(()=>{
    if(!editorOpen) return;
    const onEsc = (e)=>{ if(e.key==="Escape") setEditorOpen(false); };
    window.addEventListener("keydown", onEsc);
    return ()=> window.removeEventListener("keydown", onEsc);
  },[editorOpen]);

  if (loadingProfile) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER / PROFILE */}
      <div className="bg-white rounded-2xl border p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{issuer.name}</h1>
          <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
            <span>{issuer.domain}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span>{issuer.email}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span className={issuer.status === "approved" ? "text-emerald-600" : "text-amber-600"}>
              {issuer.status === "approved" ? "Onaylı" : "Beklemede"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRotateKey}
            className="px-4 py-2 rounded-xl border hover:bg-gray-50 text-sm font-medium"
          >
            API Anahtarı Oluştur
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700"
          >
            Çıkış Yap
          </button>
        </div>
      </div>

      {apiKey && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h3 className="text-emerald-800 font-medium mb-2">Yeni API Anahtarınız</h3>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white p-3 rounded border border-emerald-200 font-mono text-sm break-all">
              {apiKey}
            </code>
            <button
              onClick={() => copyToClipboard(apiKey)}
              className="px-3 py-3 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            >
              Kopyala
            </button>
          </div>
          <p className="text-xs text-emerald-700 mt-2">
            Bu anahtarı güvenli bir yerde saklayın. Sayfayı yenilediğinizde kaybolacaktır.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-sm relative">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">{t('org_console.title')}</h2>
            {flash && <Pill tone={flash.tone}>{flash.text}</Pill>}
          </div>

          {/* TEMPLATE SOURCE */}
          <div className="mt-6">
            <div className="flex items-center justify_between">
              <h3 className="font-semibold text-[color:var(--text)]">{t('org_console.template_format_label')}</h3>
              <Badge tone="info">{mode==="wpt" ? "WPT" : mode==="wpml" ? "WPML" : "JSON"}</Badge>
            </div>
            <p className="text-xs text-[color:var(--muted)] mt-1">{t('org_console.template_format_desc')}</p>

            {/* meta */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div><Label text={t('org_console.template_key')}/><Input value={tplKey} onChange={e=>setTplKey(e.target.value)} /></div>
              <div><Label text={t('org_console.template_name')}/><Input value={tplName} onChange={e=>setTplName(e.target.value)} /></div>
            </div>

            {/* toolbar */}
            <div className="mt-3 grid sm:grid-cols-3 gap-2">
              <button onClick={()=>setEditorOpen(true)} className="px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]">{t('org_console.design_in_editor')}</button>

              <label className="px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] cursor-pointer text-center">
                {t('org_console.load_wpt')}
                <input type="file" accept=".wpt,text/plain" onChange={onUploadWPT} className="hidden" />
              </label>

              <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]">
                <span className="text-sm text-[color:var(--text)]">{t('org_console.advanced_json')}</span>
                <button
                  onClick={()=>setShowAdvanced(v=>!v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${showAdvanced?"bg-[color:var(--brand)]":"bg-[color:var(--border)]"}`}
                  aria-label="Advanced JSON toggle"
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${showAdvanced?"translate-x-5":"translate-x-1"}`} />
                </button>
              </div>
            </div>

            {/* advanced JSON editor */}
            {showAdvanced && (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2">
                  <Label text={selectedPresetIdx>=0 ? "Hazır taslak gövdesi (salt-okunur)" : "Taslak içeriği (JSON)"} />
                  <div className="flex items-center gap-2">
                    {preview && (
                      <>
                        <button
                          onClick={()=>copyToClipboard(preview)}
                          className="text-xs px-2 py-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                        >
                          Önizlemeyi Kopyala
                        </button>
                        <button
                          onClick={()=>{
                            const blob = new Blob([preview], {type:"application/json"});
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = `preview-${tplKey||"vc"}.wpvc`;
                            a.click();
                            URL.revokeObjectURL(a.href);
                          }}
                          className="text-xs px-2 py-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                        >
                          Önizlemeyi İndir
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <TextArea
                  rows={12}
                  value={tplBody}
                  onChange={e=>setTplBody(e.target.value)}
                  error={!!tplErr}
                  disabled={mode !== "manual"}
                  onKeyDown={onTplKeyDown}
                />
                {tplErr && <div className="mt-2"><Pill tone="err">{tplErr}</Pill></div>}

                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedPresetIdx<0
                    ? (<>
                        <button onClick={saveTpl} className="px-3 py-2 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90">Taslağı Kaydet (Ctrl+S)</button>
                        <button onClick={doPreview} className="px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]">Önizleme (Ctrl+Enter)</button>
                      </>)
                    : (<button onClick={doPreview} className="px-3 py-2 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90">Önizleme</button>)
                  }
                </div>

                {preview && (
                  <div className="mt-3">
                    <div className="text-sm text-[color:var(--text)] mb-1">Önizleme (salt-okunur)</div>
                    <pre className="text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded p-2 max-h-64 overflow-auto">{preview}</pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PRESET & WPT SEÇİMİ */}
          <div className="mt-6">
            <Label text="Hazır Taslak (WPML)"/>
            <div className="relative">
              <select
                value={selectedPresetIdx}
                onChange={e=>loadPreset(Number(e.target.value))}
                className="w-full appearance-none px-3 py-2 rounded-xl bg-[color:var(--panel)] text-[color:var(--text)] border border-[color:var(--border)] focus:ring-2 focus:ring-[color:var(--brand-2)] outline-none">
                <option value={-1}>— Elle JSON yaz —</option>
                {PRESETS.map((_,i)=> <option key={i} value={i}>Hazır Taslak #{i+1}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <p className="text-xs text-[color:var(--muted)] mt-1">Hazır taslak veya WPT yüklersen sağda doldurulabilir form otomatik oluşur.</p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-0 shadow-sm flex flex-col">
          {/* sticky header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[color:var(--border)] bg-[color:var(--panel)]/95 backdrop-blur">
            <div>
              <h3 className="font-semibold text-[color:var(--text)]">Sertifika Oluştur</h3>
              <div className="text-xs text-[color:var(--muted)] mt-0.5">
                Kaynak: {mode==="wpt" && wptParsed ? `WPT – ${wptParsed.meta.name}` :
                         mode==="wpml" && selectedPresetIdx>=0 ? `Hazır Taslak #${selectedPresetIdx+1}` :
                         "Elle yazılmış JSON"}
              </div>
            </div>
            <button
              disabled={!canIssue}
              onClick={issue}
              className="px-3 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-50 hover:opacity-90"
              title={canIssue ? "Oluştur & indir" : "Eksik alanlar veya imza anahtarı yok"}
            >
              Oluştur & İndir
            </button>
            <button
              disabled={!canIssue}
              onClick={handleSendToUser}
              className="ml-2 px-3 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50 hover:opacity-90"
              title={canIssue ? "Kullanıcıya Gönder" : "Eksik alanlar veya imza anahtarı yok"}
            >
              Kullanıcıya Gönder
            </button>
          </div>

          <div className="p-6">
            {mode !== "manual" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {presetFields.map(f=>{
                    const missing = f.required && !String(fieldValues[f.id]||"").trim();
                    return (
                      <Field
                        key={f.id}
                        f={f}
                        value={fieldValues[f.id]}
                        onChange={(v)=>updateField(f.id, v)}
                        error={missing}
                      />
                    );
                  })}
                </div>
                {requiredMissing.length>0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Pill tone="warn">Eksik alan(lar): {requiredMissing.map(f=>f.id).join(", ")}</Pill>
                    <span className="text-xs text-[color:var(--muted)]">Tüm * işaretli alanlar zorunlu.</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-[color:var(--muted)]">
                Elle JSON modunda form alanları otomatik oluşmaz. Hazır taslak seç veya .wpt yükle.
              </div>
            )}

            {out && (
              <>
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-[color:var(--text)]">Son oluşturulan sertifika</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={()=>navigator.clipboard.writeText(out)}
                      className="text-xs px-2 py-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                    >
                      JSON’u Kopyala
                    </button>
                    <button
                      onClick={()=>{
                        const blob = new Blob([out], {type:"application/json"});
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `${(safeJ(out)?.jti) || "credential"}.wpvc`;
                        a.click();
                        URL.revokeObjectURL(a.href);
                      }}
                      className="text-xs px-2 py-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                    >
                      JSON’u İndir
                    </button>
                  </div>
                </div>
                <pre className="mt-2 text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded p-2 max-h-64 overflow-auto">{out}</pre>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={()=>{
                      const j = safeJ(out)?.jti;
                      if (j) {
                        const token = localStorage.getItem("issuer_token");
                        revokeCredential(null, j, token)
                          .then(() => {
                            setFlash({tone:"ok", text:"Sertifika iptal edildi."});
                            setTimeout(()=>setFlash(null), 1500);
                          })
                          .catch(e => alert(e.message));
                      }
                      else alert("Bu sertifikaya ait kod (jti) bulunamadı.");
                    }}
                    className="px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                  >
                    Son sertifikayı iptal et
                  </button>
                  <button
                    onClick={()=>{
                      const j = prompt("İptal etmek istediğin sertifikanın kodu (jti)?");
                      if(j) {
                        const token = localStorage.getItem("issuer_token");
                        revokeCredential(null, j, token)
                          .then(() => {
                            setFlash({tone:"ok", text:"Sertifika iptal edildi."});
                            setTimeout(()=>setFlash(null), 1500);
                          })
                          .catch(e => alert(e.message));
                      }
                    }}
                    className="px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
                  >
                    Koda göre iptal et…
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* WPT Editor Modal */}
        {editorOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex">
            <div className="bg-[color:var(--panel)] border border-[color:var(--border)] w-[95vw] h-[90vh] m-auto rounded-2xl overflow-hidden relative shadow-2xl">
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-2 border-b border-[color:var(--border)] bg-[color:var(--panel)]/95 backdrop-blur">
                <div className="text-sm font-medium text-[color:var(--text)]">WPT Editörü</div>
                <button onClick={()=>setEditorOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]">
                  Kapat (Esc)
                </button>
              </div>
              <div className="h-full pt-10">
                <WPTEditorPro />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------ local helpers ------ */
function safeJ(s){ try{ return JSON.parse(s); }catch{ return null; } }
