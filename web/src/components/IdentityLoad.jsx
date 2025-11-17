// src/pages/identity/IdentityLoad.jsx
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { decryptKeystore } from "../lib/crypto";
import { useIdentity } from "../lib/identityContext";
import { t } from "../lib/i18n";

export default function IdentityLoad({ onLoaded }) {
  const { setIdentity } = useIdentity();

  const [file, setFile] = useState(null);
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {type:'ok'|'err'|'info', text:string}
  const [drag, setDrag] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [rawJson, setRawJson] = useState("");

  const fileInputRef = useRef(null);
  const passInputRef = useRef(null);

  const filename = file?.name || "No file chosen";
  const sizeKB = file ? Math.max(1, Math.round(file.size / 1024)) : 0;

  useEffect(() => {
    // ilk odak şifre alanına
    passInputRef.current?.focus();
  }, []);

  const onCaps = useCallback((e) => {
    try { setCapsOn(!!e.getModifierState && e.getModifierState("CapsLock")); } catch {}
  }, []);

  const resetAll = () => {
    setFile(null);
    setRawJson("");
    setPass("");
    setMsg(null);
    setBusy(false);
  };

  const handleFile = (f) => {
    if (!f) return;
    if (!/\.(wpkeystore)$/i.test(f.name)) {
      setMsg({ type: "err", text: t("identity.load.err_unsupported_file") });
      return;
    }
    // dosya seçince paste modu yok, sadece dosya kullanalım
    setFile(f);
    setMsg(null);
  };

  const onInputFile = (e) => handleFile(e.target.files?.[0] || null);

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
    const f = e.dataTransfer?.files?.[0];
    handleFile(f);
  };

  const parseBlobFromInputs = async () => {
    if (!file) throw new Error(t("identity.load.err_select_file"));
    const text = await file.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(t("identity.load.err_invalid_keystore_json"));
    }
  };

  const loadIt = async () => {
    setMsg(null);
    if (!pass) return setMsg({ type: "err", text: t("identity.load.err_enter_password") });

    setBusy(true);
    try {
      const blob = await parseBlobFromInputs();
      const ident = await decryptKeystore(pass, blob); // {did, sk_b64u, pk_b64u, ...}
      if (!ident?.did) throw new Error(t("identity.load.err_no_did"));

      setIdentity(ident);
      onLoaded?.(ident);
      setMsg({ type: "ok", text: t("identity.load.ok_loaded") });
      setPass("");
    } catch (err) {
      const raw = (err && (err.message || String(err))) || t("unknown_error");
      if (raw.includes("unsupported_kdf"))
        setMsg({ type: "err", text: t("identity.load.err_old_format") });
      else if (raw.includes("OperationError") || raw.toLowerCase().includes("decrypt"))
        setMsg({ type: "err", text: t("identity.load.err_wrong_password") });
      else if (raw.toLowerCase().includes("json"))
        setMsg({ type: "err", text: t("identity.load.err_invalid_keystore_file") });
      else
        setMsg({ type: "err", text: t("identity.load.err_generic", { msg: raw }) });
    } finally {
      setBusy(false);
    }
  };

  const onKeyDownForm = (e) => {
    if (e.key === "Enter" && !busy && pass && !!file) {
      e.preventDefault();
      loadIt();
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMsg(null);
  };

  const panelHint = useMemo(() => {
    return file
      ? `${sizeKB} KB • ${t("identity.load.type_wpkeystore")}`
      : t("identity.load.hint_drag");
  }, [file, sizeKB]);

  return (
    <section
      className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)]/90 backdrop-blur p-5 shadow-sm"
      onKeyDown={onKeyDownForm}
    >
      <header className="mb-4">
        <h3 className="text-base font-semibold">{t("identity.load.title")}</h3>
        <p className="text-[12px] text-[color:var(--muted)] mt-1">{t("identity.load.paragraph")}</p>
      </header>

      {/* File-only input (paste removed) */}

      {/* Drag & Drop zone OR Paste area */}
      (
        <div
          onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
          onDragLeave={()=>setDrag(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          aria-label={t("identity.load.aria_drag")}
          className={[
            "rounded-xl border-2 border-dashed p-4 transition select-none",
            drag ? "border-[color:var(--brand-2)] bg-[color:var(--panel-2)]" : "border-[color:var(--border)] bg-[color:var(--panel-2)]/70"
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{filename}</div>
              <div className="text-xs text-[color:var(--muted)]">{panelHint}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {file && (
                <button onClick={clearFile} className="btn ghost text-sm h-9 px-3">
                  {t("identity.load.clear")}
                </button>
              )}
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] cursor-pointer">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>
                <span className="text-sm">{t("identity.load.choose_file")}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".wpkeystore"
                  onChange={onInputFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )

      {/* Password */}
      <label htmlFor="pwdLoad" className="block text-sm text-[color:var(--muted)] mt-4 mb-1.5">{t("identity.load.password_label")}</label>
      <div className="relative">
        <input
          id="pwdLoad"
          ref={passInputRef}
          type={show ? "text" : "password"}
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyUp={onCaps}
          onKeyDown={onCaps}
          placeholder={t("identity.load.password_placeholder")}
          className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] pr-10"
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShow(v=>!v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] hover:text-[color:var(--text)]"
          aria-label={show ? t("identity.load.hide_password") : t("identity.load.show_password")}
          title={show ? t("identity.load.hide") : t("identity.load.show")}
        >
          {show ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3l18 18"/><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/><path d="M16.24 16.24C14.92 17.02 13.5 17.5 12 17.5 6.5 17.5 3 12 3 12s1.4-2.22 3.76-3.76"/><path d="M9.9 4.24C10.57 4.08 11.28 4 12 4c5.5 0 9 8 9 8s-.62 1.24-1.76 2.48"/></svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4.5-8 11-8 11 8 11 8-4.5 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      </div>
      {capsOn && <p className="mt-1 text-[11px] text-amber-600">{t("identity.load.caps_on")}</p>}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={loadIt}
          disabled={busy || !pass || !file}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 1-9 9"/>
              </svg>
              <span>{t("identity.load.loading")}</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1"/>
              </svg>
              <span>{t("identity.load.load")}</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={resetAll}
          disabled={busy}
          className="h-[42px] px-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] disabled:opacity-50"
        >
          {t("identity.load.reset")}
        </button>
      </div>

      {/* Messages */}
      {msg && (
        <div
          role={msg.type==="err" ? "alert" : "status"}
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
        Desteklenen: <span className="font-mono">.wpkeystore</span>.
      </p>
    </section>
  );
}
