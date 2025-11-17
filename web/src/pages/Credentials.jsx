// src/pages/Credentials.jsx
import VCList from "../components/VCList";
import { useState } from "react";
import { t } from "../lib/i18n";

function chip(tone, msg) {
  // göz yormayan chip: zemini her zaman panel-2, tonlar sadece kenar+metin
  const base = "text-xs px-2 py-1 rounded-md border bg-[color:var(--panel-2)]";
  const map = {
    idle:    "border-[color:var(--border)] text-[color:var(--muted)]",
    loading: "border-amber-400/30  text-amber-300",
    success: "border-emerald-400/30 text-emerald-300",
    error:   "border-rose-400/30    text-rose-300",
  };
  return <span className={[base, map[tone] || map.idle].join(" ")}>{msg}</span>;
}

export default function Credentials() {
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [refreshKey, setRefreshKey] = useState(0);

  const toast = (s, m) => {
    setStatus(s);
    setMsg(m);
    if (s !== "loading") {
      const t = setTimeout(() => setMsg(""), 2200);
      return () => clearTimeout(t);
    }
    return () => {};
  };

  async function revoke(jti) {
    if (!jti) return;
    const ok = window.confirm(
      t('confirm_revoke', { jti }) + "\n\n" + t('confirm_revoke_warn')
    );
    if (!ok) return;

    toast("loading", t('revoking_credential'));
    try {
      const r = await fetch("/api/status/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vc_id: jti, reason: "user_request" }),
      });

      const raw = await r.text().catch(() => "");
      if (!r.ok) throw new Error(raw || "Server returned non-OK");

      toast("success", t('revoke_success'));
      setRefreshKey(k => k + 1);
    } catch (e) {
      toast("error", t('revoke_failed') + ": " + (e?.message || t('unknown_error')));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('my_credentials')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('credentials_intro')} <strong>{t('public_info')}</strong> {t('private_key_never_leaves')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {chip(
              status,
              status === "loading" ? t('working') :
              status === "success" ? t('ok') :
              status === "error"   ? t('error') : t('idle')
            )}

            <button
              onClick={() => setRefreshKey(k => k + 1)}
              title={t('refresh_list')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 3v6h-6" />
              </svg>
              {t('refresh')}
            </button>
          </div>
        </div>
      </div>

      {/* VC list section */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-sm">
        <VCList key={refreshKey} onRevoke={revoke} />
      </div>

      {/* Status / Message */}
      {msg && (
        <div
          className={[
            "px-4 py-3 rounded-xl text-sm border transition-all",
            status === "loading"
              ? "border-amber-400/30  bg-[color:var(--panel-2)] text-amber-300"
              : status === "success"
              ? "border-emerald-400/30 bg-[color:var(--panel-2)] text-emerald-300"
              : status === "error"
              ? "border-rose-400/30    bg-[color:var(--panel-2)] text-rose-300"
              : "border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)]"
          ].join(" ")}
        >
          <div className="flex items-center gap-2">
            {status === "loading" && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="9" opacity=".25" />
                <path d="M21 12a9 9 0 0 1-9 9" />
              </svg>
            )}
            {status === "success" && <span>✅</span>}
            {status === "error" && <span>❌</span>}
            <span>{msg}</span>
          </div>
        </div>
      )}

      {/* Tip / info footer (sol tarafta ince accent şerit) */}
      <div className="relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-2)] p-4 text-xs text-[color:var(--muted)] shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-[color:var(--brand-2)]/60" />
        <p className="pl-3">
          {t('revoked_info_part1')} <strong>{t('revoked')}</strong> {t('revoked_info_part2')}
        </p>
      </div>
    </div>
  );
}
