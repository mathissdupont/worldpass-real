// src/pages/Credentials.jsx
import VCList from "../components/VCList";
import { useState } from "react";
import { Card, Button, Badge, Alert, Toast as UIToast } from "../components/ui";
import { t } from "../lib/i18n";

export default function Credentials() {
  const [toast, setToast] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = (s, m) => {
    setStatus(s);
    setToast({ type: s === 'success' ? 'success' : s === 'error' ? 'error' : 'info', text: m });
  };

  async function revoke(jti) {
    if (!jti) return;
    const ok = window.confirm(
      t('confirm_revoke', { jti }) + "\n\n" + t('confirm_revoke_warn')
    );
    if (!ok) return;

    showToast("loading", t('revoking_credential'));
    try {
      const r = await fetch("/api/status/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vc_id: jti, reason: "user_request" }),
      });

      const raw = await r.text().catch(() => "");
      if (!r.ok) throw new Error(raw || "Server returned non-OK");

      showToast("success", t('revoke_success'));
      setRefreshKey(k => k + 1);
    } catch (e) {
      showToast("error", t('revoke_failed') + ": " + (e?.message || t('unknown_error')));
    }
  }

  const getStatusBadgeVariant = () => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'danger';
      case 'loading': return 'warning';
      default: return 'neutral';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'loading': return t('working');
      case 'success': return t('ok');
      case 'error': return t('error');
      default: return t('idle');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[color:var(--text)] mb-2">
              {t('my_credentials')}
            </h1>
            <p className="text-sm text-[color:var(--muted)]">
              {t('credentials_intro')} <strong className="text-[color:var(--text)]">{t('public_info')}</strong> {t('private_key_never_leaves')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={getStatusBadgeVariant()}>
              {getStatusText()}
            </Badge>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRefreshKey(k => k + 1)}
              title={t('refresh_list')}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 3v6h-6" />
              </svg>
              <span className="hidden sm:inline">{t('refresh')}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* VC List */}
      <Card>
        <VCList key={refreshKey} onRevoke={revoke} />
      </Card>

      {/* Info Footer */}
      <Alert variant="info">
        {t('revoked_info_part1')} <strong>{t('revoked')}</strong> {t('revoked_info_part2')}
      </Alert>

      {/* Toast Notification */}
      <UIToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
