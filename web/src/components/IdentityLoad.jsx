// src/pages/identity/IdentityLoad.jsx
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { decryptKeystore } from "../lib/crypto";
import { useIdentity } from "../lib/identityContext";

export default function IdentityLoad({ onLoaded }) {
  const { setIdentity } = useIdentity();

  const [file, setFile] = useState(null);
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {type:'ok'|'err'|'info', text:string}
  const [drag, setDrag] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [pasteMode, setPasteMode] = useState(false); // JSON yapıştırma modu
  const [rawJson, setRawJson] = useState("");

  const fileInputRef = useRef(null);
  const passInputRef = useRef(null);

  const filename = file?.name || (pasteMode ? "Pasted JSON" : "No file chosen");
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
    if (!/\.(wpkeystore|json)$/i.test(f.name)) {
      setMsg({ type: "err", text: "Unsupported file type. Use .wpkeystore or .json" });
      return;
    }
    setPasteMode(false); // dosya seçince paste mode kapansın
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
    if (pasteMode) {
      if (!rawJson.trim()) throw new Error("Empty JSON.");
      try {
        return JSON.parse(rawJson);
      } catch {
        throw new Error("Invalid keystore JSON.");
      }
    } else {
      if (!file) throw new Error("Select a keystore file.");
      const text = await file.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Invalid keystore JSON.");
      }
    }
  };

  const loadIt = async () => {
    setMsg(null);
    if (!pass) return setMsg({ type: "err", text: "Enter your password." });

    setBusy(true);
    try {
      const blob = await parseBlobFromInputs();
      const ident = await decryptKeystore(pass, blob); // {did, sk_b64u, pk_b64u, ...}
      if (!ident?.did) throw new Error("Decryption succeeded but DID is missing.");

      setIdentity(ident);
      onLoaded?.(ident);
      setMsg({ type: "ok", text: "Identity loaded." });
      setPass("");
    } catch (err) {
      const raw = (err && (err.message || String(err))) || "Unknown error";
      if (raw.includes("unsupported_kdf"))
        setMsg({ type: "err", text: "Old keystore format. Create a new one." });
      else if (raw.includes("OperationError") || raw.toLowerCase().includes("decrypt"))
        setMsg({ type: "err", text: "Wrong password or corrupted file." });
      else if (raw.toLowerCase().includes("json"))
        setMsg({ type: "err", text: "Invalid keystore JSON file." });
      else
        setMsg({ type: "err", text: "Error: " + raw });
    } finally {
      setBusy(false);
    }
  };

  const onKeyDownForm = (e) => {
    if (e.key === "Enter" && !busy && pass && (pasteMode ? !!rawJson.trim() : !!file)) {
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
    if (pasteMode) return "Paste keystore JSON below.";
    return file ? `${sizeKB} KB • ${/\.(json)$/i.test(file.name) ? "JSON" : "WPKeystore"}` : "Drag & drop or choose a file";
  }, [pasteMode, file, sizeKB]);

  return (
    <section
      className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)]/90 backdrop-blur p-5 shadow-sm"
      onKeyDown={onKeyDownForm}
    >
      <header className="mb-4">
        <h3 className="text-base font-semibold">Load Identity</h3>
        <p className="text-[12px] text-[color:var(--muted)] mt-1">
          Keystore dosyanı seç ve şifreni girerek kimliğini yükle. İstersen JSON’u direkt yapıştırabilirsin.
        </p>
      </header>

      {/* Toggle: File / Paste */}
      <div className="mb-3 inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--panel)] overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => { setPasteMode(false); setMsg(null); }}
          className={`px-3 py-1.5 ${!pasteMode ? "bg-[color:var(--brand)] text-white" : "hover:bg-[color:var(--panel-2)]"}`}
        >
          File
        </button>
        <button
          type="button"
          onClick={() => { setPasteMode(true); setMsg(null); }}
          className={`px-3 py-1.5 ${pasteMode ? "bg-[color:var(--brand)] text-white" : "hover:bg-[color:var(--panel-2)]"}`}
        >
          Paste JSON
        </button>
      </div>

      {/* Drag & Drop zone OR Paste area */}
      {!pasteMode ? (
        <div
          onDragOver={(e)=>{e.preventDefault(); setDrag(true);}}
          onDragLeave={()=>setDrag(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          aria-label="Drag and drop or choose a keystore file"
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
                  Clear
                </button>
              )}
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] cursor-pointer">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>
                <span className="text-sm">Choose file</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".wpkeystore,application/json"
                  onChange={onInputFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] p-3">
          <textarea
            rows={8}
            value={rawJson}
            onChange={(e)=>setRawJson(e.target.value)}
            placeholder='Paste keystore JSON here…'
            className="w-full bg-transparent outline-none resize-y font-mono text-xs"
            spellCheck={false}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-[color:var(--muted)]">Only valid JSON is accepted.</span>
            {rawJson && (
              <button onClick={()=>setRawJson("")} className="btn ghost text-xs h-8 px-3">Clear</button>
            )}
          </div>
        </div>
      )}

      {/* Password */}
      <label htmlFor="pwdLoad" className="block text-sm text-[color:var(--muted)] mt-4 mb-1.5">Password</label>
      <div className="relative">
        <input
          id="pwdLoad"
          ref={passInputRef}
          type={show ? "text" : "password"}
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyUp={onCaps}
          onKeyDown={onCaps}
          placeholder="Password"
          className="w-full px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] pr-10"
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShow(v=>!v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] hover:text-[color:var(--text)]"
          aria-label={show ? "Hide password" : "Show password"}
          title={show ? "Hide" : "Show"}
        >
          {show ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3l18 18"/><path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/><path d="M16.24 16.24C14.92 17.02 13.5 17.5 12 17.5 6.5 17.5 3 12 3 12s1.4-2.22 3.76-3.76"/><path d="M9.9 4.24C10.57 4.08 11.28 4 12 4c5.5 0 9 8 9 8s-.62 1.24-1.76 2.48"/></svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4.5-8 11-8 11 8 11 8-4.5 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      </div>
      {capsOn && <p className="mt-1 text-[11px] text-amber-600">CapsLock açık görünüyor.</p>}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={loadIt}
          disabled={busy || !pass || (pasteMode ? !rawJson.trim() : !file)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 1-9 9"/>
              </svg>
              <span>Loading…</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1"/>
              </svg>
              <span>Load</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={resetAll}
          disabled={busy}
          className="h-[42px] px-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] disabled:opacity-50"
        >
          Reset
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
        Desteklenen: <span className="font-mono">.wpkeystore</span> veya <span className="font-mono">.json</span>. JSON yapıştırırken tam ve geçerli bir keystore beklenir.
      </p>
    </section>
  );
}
