// src/pages/Issue.jsx
import IssueVC from "../components/IssueVC";
import { useIdentity } from "../lib/identityContext";
import { t } from "../lib/i18n";

export default function Issue() {
  const { identity } = useIdentity();
  const did = identity?.did;

  return (
    <div className="space-y-4">
      {/* Kimlik kartı */}
      <div className="p-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)]">
        <div className="text-sm text-[color:var(--muted)]">{t('active_identity_code')}</div>
        <div className="mt-1 font-mono text-xs break-all text-[color:var(--text)]">
          {did || "—"}
        </div>
      </div>

      {/* Kimlik yoksa bilgi */}
      {!did && (
        <div className="p-3 rounded-xl border border-amber-400/30 bg-[color:var(--panel-2)] text-amber-300 text-xs">
          {t('no_identity_prompt')} <strong>{t('account_page')}</strong> {t('no_identity_prompt_tail')}
        </div>
      )}

      {/* Sertifika oluşturma formu */}
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
        <IssueVC identity={identity} />
      </div>
    </div>
  );
}
