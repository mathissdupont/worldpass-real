// web/src/components/VerifyVC.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { newChallenge, verifyVC } from "../lib/api";
import { t } from "../lib/i18n";

/* ---------------- Small UI bits ---------------- */
function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function StatusBadge({ ok, text }) {
  const cls = ok
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
    : "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />
      {text}
    </span>
  );
}

function CopyBtn({ value, label = t("copy") }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(value || ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-xs"
    >
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <rect x="2" y="2" width="13" height="13" rx="2" />
      </svg>
      {copied ? t("copied") : label}
    </button>
  );
}

function Alert({ type, message }) {
  if (!message) return null;
  const cls =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
      : type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30"
      : "border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30";
  return <div className={`rounded-lg px-4 py-3 border ${cls} text-sm`}>{message}</div>;
}

function Pill({ ok, text }) {
  return (
    <span className="wp-pill">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"} opacity-80`} />
      {text}
    </span>
  );
}

function Msg({ msg }) {
  if (!msg) return null;
  return (
    <Alert
      type={msg.type === "ok" ? "success" : msg.type === "err" ? "error" : "info"}
      message={msg.text}
    />
  );
}

/* ---------------- VerifyVC ---------------- */
export default function VerifyVC() {
  // VC input state
  const [vcText, setVcText] = useState("");
  const [vcObj, setVcObj] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef(null);

  // challenge & results
  const [challenge, setChallenge] = useState(null); // { nonce|challenge, expires_at }
  const [left, setLeft] = useState(null);
  const [result, setResult] = useState(null);

  // ui
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type:'ok'|'err'|'info', text }

  // QR / NFC helpers
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);
  const [qrScanning, setQrScanning] = useState(false);
  const ndefRef = useRef(null);

  // Selective disclosure fields
  const [requestedFields, setRequestedFields] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);

  // Request QR JSON + future use
  const [qrJson, setQrJson] = useState("");
  const [publishedPath, setPublishedPath] = useState(null);
  const [qrImage, setQrImage] = useState(null);

  // VC requirement definition (what the verifier/org wants)
  const [requiredVcType, setRequiredVcType] = useState(""); // e.g. "StudentCard, CampusID"
  const [requiredIssuer, setRequiredIssuer] = useState(""); // e.g. "did:wp:issuer:uni-xyz"
  const [requestLabel, setRequestLabel] = useState(""); // e.g. "Kampüs kapı girişi"

  /* ---------- helpers ---------- */
  const vcShort = useMemo(() => {
    if (!vcObj) return t("no_vc");
    const id =
      vcObj.id ||
      vcObj.jti ||
      (Array.isArray(vcObj.type) ? vcObj.type.join(",") : vcObj.type) ||
      "VC";
    return typeof id === "string" ? id : JSON.stringify(id).slice(0, 50);
  }, [vcObj]);

  const subjectId = vcObj?.credentialSubject?.id || "";
  const issuer = vcObj?.issuer || "";
  const nonceVal = challenge?.nonce || challenge?.challenge || "";

  const canVerify = !!vcObj && !!challenge;

  function safeParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  function clearVC() {
    setVcText("");
    setVcObj(null);
    setResult(null);
    setMsg(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function clearChallenge() {
    setChallenge(null);
    setLeft(null);
    setResult(null);
  }

  /* ---------- file / drop ---------- */
  const handleFile = async (file) => {
    if (!file) return;
    setMsg(null);
    setResult(null);
    try {
      const txt = await file.text();
      const obj = safeParse(txt);
      if (!obj) throw new Error(t("invalid_json_file"));
      setVcText(txt);
      setVcObj(obj);
      setShowPreview(false);
      setMsg({ type: "ok", text: t("vc_loaded") });
    } catch (e) {
      setVcText("");
      setVcObj(null);
      setMsg({ type: "err", text: e?.message || t("file_read_error") });
    }
  };
  const onInputFile = (e) => handleFile(e.target.files?.[0] || null);
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
    handleFile(e.dataTransfer?.files?.[0] || null);
  };

  /* ---------- QR Scanner (BarcodeDetector) ---------- */
  const handleScanned = async (raw) => {
    if (!raw) return;
    // raw may be a URL pointing to a .wpvc file or a JSON payload
    try {
      if (/^https?:\/\//.test(raw)) {
        const r = await fetch(raw);
        const txt = await r.text();
        const obj = safeParse(txt);
        if (obj) {
          setVcText(txt);
          setVcObj(obj);
          setMsg({ type: "ok", text: t("scanned_payload_loaded") });
          return;
        }
      }
      // try parse as JSON directly
      const obj = safeParse(raw);
      if (obj) {
        setVcText(JSON.stringify(obj, null, 2));
        setVcObj(obj);
        setMsg({ type: "ok", text: t("scanned_payload_loaded") });
        return;
      }
      setMsg({ type: "err", text: t("file_read_error") });
    } catch (e) {
      setMsg({ type: "err", text: t("file_read_error") });
    }
  };

  const stopQrScan = async () => {
    try {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    } catch {}
    setQrScanning(false);
  };

  const startQrScan = async () => {
    setMsg(null);
    if (!("BarcodeDetector" in window))
      return setMsg({ type: "info", text: t("scanner_not_supported") });
    try {
      detectorRef.current = new BarcodeDetector({ formats: ["qr_code"] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanIntervalRef.current = setInterval(async () => {
        try {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          const w = videoRef.current.videoWidth,
            h = videoRef.current.videoHeight;
          if (!w || !h) return;
          const canvas = canvasRef.current || document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(videoRef.current, 0, 0, w, h);
          const bitmap = await createImageBitmap(canvas);
          const codes = await detectorRef.current.detect(bitmap);
          if (codes && codes.length) {
            handleScanned(codes[0].rawValue);
            stopQrScan();
          }
        } catch (e) {
          // ignore per-frame errors
        }
      }, 500);
      setQrScanning(true);
    } catch (e) {
      setMsg({ type: "err", text: e?.message || String(e) });
    }
  };

  /* ---------- NFC (NDEFReader) ---------- */
  const startNfcScan = async () => {
    setMsg(null);
    if (!("NDEFReader" in window))
      return setMsg({ type: "info", text: t("nfc_not_supported") });
    try {
      const reader = new NDEFReader();
      ndefRef.current = reader;
      await reader.scan();
      reader.onreading = (ev) => {
        try {
          for (const record of ev.message.records) {
            if (record.recordType === "text") {
              const textDecoder = new TextDecoder(record.encoding || "utf-8");
              const txt = textDecoder.decode(record.data);
              handleScanned(txt);
              break;
            }
            if (record.recordType === "url") {
              const url = new TextDecoder().decode(record.data);
              handleScanned(url);
              break;
            }
          }
        } catch (e) {
          setMsg({ type: "err", text: t("file_read_error") });
        }
      };
      reader.onreadingerror = () =>
        setMsg({ type: "err", text: t("file_read_error") });
      setMsg({ type: "ok", text: t("scanning_qr") });
    } catch (e) {
      setMsg({ type: "err", text: e?.message || String(e) });
    }
  };

  const stopNfcScan = async () => {
    try {
      if (ndefRef.current && ndefRef.current.onreading)
        ndefRef.current.onreading = null;
      ndefRef.current = null;
    } catch {}
  };

  /* ---------- challenge countdown ---------- */
  useEffect(() => {
    if (!challenge?.expires_at) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const ms =
        new Date(challenge.expires_at).getTime() - Date.now();
      const safe = Math.max(0, ms);
      setLeft(Math.ceil(safe / 1000));
    };
    tick();
    const tId = setInterval(tick, 500);
    return () => clearInterval(tId);
  }, [challenge]);

  /* ---------- actions ---------- */
  const onChallenge = async () => {
    try {
      setBusy(true);
      setMsg(null);
      setResult(null);
      const host = window.location.hostname || "localhost";
      // newChallenge(host, ttlSeconds)
      const ch = await newChallenge(host, 180);
      setChallenge(ch);
      setMsg({ type: "ok", text: t("challenge_received") });
    } catch (err) {
      setMsg({
        type: "err",
        text: t("challenge_failed") + ": " + (err?.message || String(err)),
      });
    } finally {
      setBusy(false);
    }
  };

  const onGenerateRequest = async () => {
    try {
      setBusy(true);
      setMsg(null);

      const host = window.location.hostname || "localhost";
      const ch = await newChallenge(host, 180);

      // VC requirement (org'un istediği credential özellikleri)
      const vcReq = {};
      if (requiredVcType.trim()) {
        const types = requiredVcType
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (types.length === 1) vcReq.type = types[0];
        else if (types.length > 1) vcReq.type = types;
      }
      if (requiredIssuer.trim()) {
        vcReq.issuer = requiredIssuer.trim();
      }

      // expires_at -> UNIX time (saniye)
      const expSec = Math.floor(
        new Date(ch.expires_at).getTime() / 1000
      );

      const requestObj = {
        type: "present",
        challenge: ch.nonce, // veya ch.challenge sende hangisi geliyorsa
        aud: host,
        exp: expSec,
        fields: requestedFields.length > 0 ? requestedFields : undefined,
        label: requestLabel || undefined,
        vc: Object.keys(vcReq).length ? vcReq : undefined,
      };

      const data = JSON.stringify(requestObj, null, 2);
      setQrJson(data);
      setPublishedPath(null);
      setQrImage(null);
      setMsg({ type: "ok", text: t("verifier.new_challenge_ready") });
    } catch (err) {
      setMsg({
        type: "err",
        text:
          t("verifier.new_challenge_failed") +
          ": " +
          (err?.message || String(err)),
      });
    } finally {
      setBusy(false);
    }
  };

  const materializeVC = () => {
    if (!vcObj) throw new Error(t("first_load_or_paste"));
    return vcObj;
  };

  const onVerify = useCallback(async () => {
    try {
      setBusy(true);
      setMsg(null);
      const obj = materializeVC();
      if (!challenge) throw new Error("Challenge yok. Önce challenge al.");

      const resp = await verifyVC(
        obj,
        nonceVal,
        obj?.credentialSubject?.id ?? null
      );
      setResult(resp);
      if (resp?.valid && !resp?.revoked)
        setMsg({ type: "ok", text: t("vc_validated") });
      else setMsg({ type: "info", text: t("vc_verification_result") });
    } catch (err) {
      setResult(null);
      setMsg({
        type: "err",
        text:
          t("verification_error") +
          ": " +
          (err?.message || String(err)),
      });
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vcObj, challenge]);

  /* ---------- UI ---------- */
  const challengeActive = Boolean(
    challenge && left !== null && left > 0
  );

  return (
    <section className="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--panel)]/90 backdrop-blur p-5 shadow-sm space-y-5">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{t("verify_vc_title")}</h2>
          <p className="text-[12px] text-[color:var(--muted)] mt-0.5">
            {t("verify_vc_desc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge ok={!!vcObj} text={vcObj ? t("vc_loaded") : t("no_vc")} />
          <StatusBadge
            ok={challengeActive}
            text={
              challengeActive
                ? t("challenge_active", { left })
                : t("no_challenge")
            }
          />
        </div>
      </div>

      {/* VC Requirement (which credential the org wants) */}
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-1">
            {t("verifier.request_label") || "İstek açıklaması"}
          </label>
          <input
            type="text"
            placeholder="Örn: Kampüs kapı girişi"
            value={requestLabel}
            onChange={(e) => setRequestLabel(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] text-sm"
          />
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">
            Kullanıcıya gösterilecek kısa açıklama (amaç / context).
          </p>
        </div>

        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-1">
            {t("verifier.required_vc_type") || "İstenen VC tipi/leri"}
          </label>
          <input
            type="text"
            placeholder="Örn: StudentCard, CampusID"
            value={requiredVcType}
            onChange={(e) => setRequiredVcType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] text-sm"
          />
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">
            VC.type ile eşleşecek değer(ler). Virgülle ayırabilirsin.
          </p>
        </div>

        <div>
          <label className="block text-sm text-[color:var(--muted)] mb-1">
            {t("verifier.required_issuer") || "İstenen Issuer (isteğe bağlı)"}
          </label>
          <input
            type="text"
            placeholder="Örn: did:wp:issuer:uni-xyz"
            value={requiredIssuer}
            onChange={(e) => setRequiredIssuer(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] text-sm"
          />
          <p className="mt-1 text-[11px] text-[color:var(--muted)]">
            Belirli bir issuer’dan gelen VC zorunluysa doldur.
          </p>
        </div>
      </div>

      {/* Selective Disclosure */}
      <div>
        <label className="block text-sm text-[color:var(--muted)] mb-2">
          {t("verifier.selective_disclosure")}
        </label>
        <div className="space-y-2">
          <input
            type="text"
            placeholder={t("verifier.enter_field_name")}
            value={requestedFields.join(", ")}
            onChange={(e) =>
              setRequestedFields(
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            className="w-full px-3 py-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] text-sm"
          />
          <div className="text-xs text-[color:var(--muted)]">
            {t("verifier.field_help")}
          </div>
        </div>
      </div>

      {/* 1) VC input */}
      <div>
        <label className="block text-sm text-[color:var(--muted)] mb-2">
          {t("step1_vc_upload")}
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={cx(
            "rounded-xl border-2 border-dashed p-4 transition",
            drag
              ? "border-[color:var(--brand-2)] bg-[color:var(--panel-2)]"
              : "border-[color:var(--border)] bg-[color:var(--panel-2)]/70"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{vcShort}</div>
              <div className="text-xs text-[color:var(--muted)]">
                {vcObj ? t("json_uploaded") : t("drag_drop_or_choose")}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {vcObj && (
                <button
                  onClick={clearVC}
                  className="h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"
                >
                  {t("clear")}
                </button>
              )}
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] cursor-pointer">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="text-sm">{t("choose_file")}</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".wpvc,application/json"
                  onChange={onInputFile}
                  className="hidden"
                />
              </label>

              {/* Fast scan controls: QR + NFC */}
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => (qrScanning ? stopQrScan() : startQrScan())}
                  className="inline-flex items-center gap-3 h-12 px-6 py-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-base font-medium"
                  title="Kamera ile QR kod tara"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="5" height="5" rx="1" />
                    <rect x="16" y="3" width="5" height="5" rx="1" />
                    <rect x="3" y="16" width="5" height="5" rx="1" />
                    <rect x="16" y="16" width="5" height="5" rx="1" />
                    <path d="M21 12h-1M4 12h1M12 21v-1M12 4v1" />
                  </svg>
                  {qrScanning ? t("stop_scanning") : t("scan_qr")}
                </button>
                <button
                  type="button"
                  onClick={() => startNfcScan()}
                  className="inline-flex items-center gap-3 h-12 px-6 py-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-base font-medium"
                  title="NFC etiketi tara"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M6 12h12M6 8h12M6 16h12" />
                  </svg>
                  {t("nfc_scan")}
                </button>
              </div>
            </div>
          </div>
          {/* Hidden video/canvas used for QR scanning */}
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {vcObj && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-[11px] text-[color:var(--muted)]">
              {subjectId && (
                <>
                  {t("subject_label")}:{" "}
                  <code className="font-mono">{subjectId}</code>{" "}
                  <CopyBtn value={subjectId} label={t("copy_subject")} />
                </>
              )}
              {issuer && (
                <>
                  {t("issuer_label")}:{" "}
                  <code className="font-mono">{issuer}</code>{" "}
                  <CopyBtn value={issuer} label={t("copy_issuer")} />
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="mt-2 text-xs underline"
            >
              {showPreview ? t("hide_preview") : t("show_preview")}
            </button>
            {showPreview && (
              <pre className="mt-2 text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-xl p-3 max-h-56 overflow-auto whitespace-pre-wrap">
                {vcText}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* 2) Challenge */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-[color:var(--muted)]">
          {t("step2_challenge")}
        </div>
        <button
          onClick={onChallenge}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] disabled:opacity-50"
        >
          {busy ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="9" opacity=".25" />
                <path d="M21 12a9 9 0 0 1-9 9" />
              </svg>
              {t("new_challenge")}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 3v12" />
                <path d="M8 11l4 4 4-4" />
                <rect x="4" y="17" width="16" height="4" rx="1" />
              </svg>
              {t("new_challenge")}
            </>
          )}
        </button>

        {challenge && (
          <div className="ml-0 w-full sm:w-auto sm:ml-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] px-3 py-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="opacity-70">{t("nonce_label")}:</span>
              <span className="truncate">{nonceVal}</span>
              <CopyBtn value={nonceVal} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="opacity-70">
                {t("expires_at_label")}:
              </span>
              <span>{challenge.expires_at}</span>
              {left !== null && <span className="opacity-70">({left}s)</span>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={clearChallenge}
                className="h-7 px-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)]"
              >
                {t("reset")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Request */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-[color:var(--muted)]">
          {t("verifier.generate_request")}
        </div>
        <button
          onClick={onGenerateRequest}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] disabled:opacity-50"
        >
          {busy ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="9" opacity=".25" />
                <path d="M21 12a9 9 0 0 1-9 9" />
              </svg>
              {t("verifier.generating")}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 3v12" />
                <path d="M8 11l4 4 4-4" />
                <rect x="4" y="17" width="16" height="4" rx="1" />
              </svg>
              {t("verifier.generate_request")}
            </>
          )}
        </button>
      </div>

      {/* QR Display */}
      {qrJson && (
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel-2)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">
              {t("verifier.request_qr")}
            </h3>
            <CopyBtn value={qrJson} label={t("copy")} />
          </div>
          <div className="text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-lg p-3 overflow-auto max-h-32">
            {qrJson}
          </div>
        </div>
      )}

      {/* 3) Verify */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-[color:var(--muted)]">
          {t("step3_verify")}
        </div>
        <button
          onClick={onVerify}
          disabled={busy || !canVerify}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="12" cy="12" r="9" opacity=".25" />
                <path d="M21 12a9 9 0 0 1-9 9" />
              </svg>
              {t("verify")}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {t("verify")}
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div
          className={cx(
            "rounded-xl border p-3 text-sm",
            result.valid && !result.revoked
              ? "border-emerald-300/60 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-amber-300/60 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Pill
              ok={result.valid && !result.revoked}
              text={result.valid ? t("valid") : t("invalid")}
            />
            {result.revoked ? <Pill ok={false} text={t("revoked")} /> : null}
            {typeof result.reason === "string" && result.reason && (
              <span className="text-sm">
                {t("reason_label")}: {result.reason}
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-[color:var(--muted)] flex flex-wrap items-center gap-2">
            {subjectId && (
              <>
                Subject: <code className="font-mono">{subjectId}</code>
              </>
            )}
            {issuer && (
              <>
                · Issuer: <code className="font-mono">{issuer}</code>
              </>
            )}
          </div>
          <pre className="mt-2 text-xs font-mono bg-[color:var(--code-bg)] text-[color:var(--code-fg)] border border-[color:var(--code-border)] rounded-xl p-3 overflow-auto max-h-64">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Messages */}
      <Msg msg={msg} />
    </section>
  );
}
