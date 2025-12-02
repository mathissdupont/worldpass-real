// src/pages/Credentials.jsx
import VCList from "../components/VCList";
import { useState, useRef } from "react";
import { Card, Button, Badge, Alert, Toast as UIToast } from "../components/ui";
import { t } from "../lib/i18n";
import { exportUserCredentials, importUserCredential } from "../lib/api";

export default function Credentials() {
  const [toast, setToast] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef(null);

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

  async function handleBulkDownload() {
    showToast("loading", "Exporting credentials...");
    try {
      const blob = await exportUserCredentials();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credentials-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("success", "Credentials exported successfully!");
    } catch (e) {
      showToast("error", "Export failed: " + (e?.message || "Unknown error"));
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    showToast("loading", "Importing credentials...");
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Check if it's a single credential or a bundle
      let credentials = [];
      if (data.credentials && Array.isArray(data.credentials)) {
        // Bundle format from export - could be wrapped in {credential: ...} or direct
        credentials = data.credentials.map(c => {
          // Validate structure
          if (typeof c !== 'object' || !c) {
            throw new Error("Invalid credential in bundle");
          }
          // If wrapped, unwrap it; otherwise use as-is
          return c.credential && typeof c.credential === 'object' ? c.credential : c;
        });
      } else if (data['@context'] || data.type) {
        // Single credential
        credentials = [data];
      } else {
        throw new Error("Invalid credential format - missing @context or type");
      }

      // Validate each credential has required fields
      for (const vc of credentials) {
        if (!vc.type || !vc.issuer) {
          throw new Error("Credential missing required fields (type or issuer)");
        }
      }

      // Import each credential
      let successCount = 0;
      let errorCount = 0;
      for (const vc of credentials) {
        try {
          await importUserCredential(vc);
          successCount++;
        } catch (e) {
          console.error("Failed to import credential:", e);
          errorCount++;
        }
      }

      if (successCount > 0) {
        showToast("success", `Imported ${successCount} credential(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        setRefreshKey(k => k + 1);
      } else {
        showToast("error", "Failed to import credentials");
      }
    } catch (e) {
      showToast("error", "Import failed: " + (e?.message || "Invalid file format"));
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={getStatusBadgeVariant()}>
              {getStatusText()}
            </Badge>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              title="Import credentials"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="hidden sm:inline">Import</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.wpvc"
              onChange={handleImport}
              style={{ display: 'none' }}
            />

            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkDownload}
              title="Export all credentials"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="hidden sm:inline">Export All</span>
            </Button>
            
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
