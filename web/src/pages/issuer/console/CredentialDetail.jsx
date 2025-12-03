import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getIssuerProfile, getIssuerCredentialDetail, revokeCredential, downloadIssuerCredential, createShareToken } from "@/lib/api";
import MiniQR from "@/components/MiniQR";
import { FiCheckCircle, FiXCircle, FiArrowLeft, FiCopy, FiAlertCircle, FiDownload } from "react-icons/fi";

export default function IssuerCredentialDetail() {
  const navigate = useNavigate();
  const { id: vcId } = useParams();
  const [searchParams] = useSearchParams();
  const [issuer, setIssuer] = useState(null);
  const [credential, setCredential] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [includeProof, setIncludeProof] = useState(true);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedShortLink, setCopiedShortLink] = useState(false);
  const [shareTokenData, setShareTokenData] = useState(null);
  const [creatingShareToken, setCreatingShareToken] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }

    loadData(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, vcId]);

  // Auto-open share modal if ?share=1 query param
  useEffect(() => {
    if (credential && searchParams.get('share') === '1' && !showShare) {
      setShowShare(true);
    }
  }, [credential, searchParams, showShare]);

  const loadData = async (token) => {
    try {
      setLoading(true);
      setError(null);

      const [profileResp, credentialResp] = await Promise.all([
        getIssuerProfile(),
        getIssuerCredentialDetail(vcId)
      ]);

      setIssuer(profileResp.issuer);
      setCredential(credentialResp);
    } catch (err) {
      console.error(err);
      setError(err.message);
      if (err.message.includes("401") || err.message.includes("token")) {
        localStorage.removeItem("issuer_token");
        navigate("/issuer/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(vcId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await downloadIssuerCredential(vcId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vcId}.wpvc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Download failed: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await revokeCredential(vcId);
      setShowRevokeConfirm(false);
      // Reload credential data
      const token = localStorage.getItem("issuer_token");
      await loadData(token);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setRevoking(false);
    }
  };

  const vcForShare = useMemo(() => {
    const vc = credential?.credential ?? null;
    if (!vc) return null;
    if (includeProof) return vc;
    try {
      const clone = JSON.parse(JSON.stringify(vc));
      delete clone.proof;
      return clone;
    } catch {
      return vc;
    }
  }, [credential, includeProof]);

  const shareJson = useMemo(() => {
    try {
      return vcForShare ? JSON.stringify(vcForShare) : "";
    } catch {
      return "";
    }
  }, [vcForShare]);

  const shareLink = useMemo(() => {
    if (!shareJson) return "";
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/receive-info?json=${encodeURIComponent(shareJson)}`;
  }, [shareJson]);

  const handleCopyJson = async () => {
    if (!shareJson) return;
    try {
      await navigator.clipboard.writeText(shareJson);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 1800);
    } catch {}
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {}
  };

  const handleGenerateShareToken = async () => {
    setCreatingShareToken(true);
    try {
      const result = await createShareToken(vcId, includeProof, 24, 10);
      setShareTokenData(result);
    } catch (err) {
      console.error(err);
      setError("Failed to create share token: " + err.message);
    } finally {
      setCreatingShareToken(false);
    }
  };

  const handleCopyShortLink = async () => {
    if (!shareTokenData?.share_url) return;
    try {
      await navigator.clipboard.writeText(shareTokenData.share_url);
      setCopiedShortLink(true);
      setTimeout(() => setCopiedShortLink(false), 1800);
    } catch {}
  };

  if (loading && !issuer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate("/issuer/console/credentials")}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to Credentials
        </button>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="h-5 w-5 text-rose-600 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-rose-900 mb-1">Error Loading Credential</h2>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!credential) {
    return null;
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp > 10000000000 
      ? new Date(timestamp)
      : new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const formatCredentialType = (credentialData) => {
    if (!credentialData?.type) return "N/A";
    if (Array.isArray(credentialData.type)) {
      const specificTypes = credentialData.type.filter(t => t !== 'VerifiableCredential');
      return specificTypes.length > 0 ? specificTypes.join(', ') : 'VerifiableCredential';
    }
    return credentialData.type;
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      valid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      revoked: 'bg-rose-50 text-rose-700 border-rose-200',
      expired: 'bg-amber-50 text-amber-700 border-amber-200'
    };

    const icons = {
      valid: <FiCheckCircle className="h-4 w-4" />,
      revoked: <FiXCircle className="h-4 w-4" />,
      expired: <FiAlertCircle className="h-4 w-4" />
    };

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${styles[status] || styles.valid}`}>
        {icons[status] || icons.valid}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/issuer/console/credentials")}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to Credentials
        </button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Credential Details</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-mono text-sm text-gray-600">{vcId}</span>
              <button
                onClick={handleCopyId}
                className="text-gray-400 hover:text-gray-600"
                title="Copy ID"
              >
                <FiCopy className="h-4 w-4" />
              </button>
              {copied && <span className="text-xs text-green-600">Copied!</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <FiDownload className="h-4 w-4" />
              {downloading ? 'Downloading...' : 'Download'}
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Share / QR
            </button>
            <StatusBadge status={credential.status} />
          </div>
        </div>

        {/* Main Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Credential Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <p className="text-sm text-gray-900 mt-1">
                {formatCredentialType(credential.credential)}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Subject DID</label>
              <p className="text-sm text-gray-900 mt-1 font-mono break-all">
                {credential.credential?.credentialSubject?.id || "N/A"}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Issuer</label>
              <p className="text-sm text-gray-900 mt-1 font-mono break-all">
                {credential.credential?.issuer || "N/A"}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Credential ID (JTI)</label>
              <p className="text-sm text-gray-900 mt-1 font-mono break-all">
                {credential.credential?.jti || vcId}
              </p>
            </div>
          </div>
        </div>

        {/* Credential Data */}
        {credential.credential && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Credential Data</h2>
            <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto">
              {JSON.stringify(credential.credential, null, 2)}
            </pre>
          </div>
        )}

        {/* Audit Log */}
        {credential.audit_log && credential.audit_log.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Log</h2>
            <div className="space-y-3">
              {credential.audit_log.map((log, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {log.action || log.event_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(log.created_at || log.timestamp)}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {credential.status === 'valid' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <button
              onClick={() => setShowRevokeConfirm(true)}
              className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700"
            >
              Revoke Credential
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Revoking a credential will invalidate it permanently
            </p>
          </div>
        )}

        {/* Revoke Confirmation Modal */}
        {showRevokeConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Revoke Credential</h2>
              <p className="text-sm text-gray-600 mb-2">
                Are you sure you want to revoke this credential?
              </p>
              <p className="text-sm font-mono text-gray-700 bg-gray-50 p-2 rounded mb-4 break-all">
                {vcId}
              </p>
              <p className="text-sm text-rose-600 mb-6">
                ⚠️ This action cannot be undone. The credential will be marked as invalid.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRevokeConfirm(false)}
                  disabled={revoking}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium disabled:opacity-50"
                >
                  {revoking ? 'Revoking...' : 'Revoke Credential'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShare && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowShare(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-semibold text-gray-900">Share Credential</h3>
              <button onClick={() => setShowShare(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">×</button>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-6">
              <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-6">
                <div className="mb-4 bg-white p-4 rounded-lg shadow-sm">
                  <MiniQR value={shareJson || ''} size={220} />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={includeProof} 
                      onChange={(e) => setIncludeProof(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="font-medium">Include cryptographic proof</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-gray-700">Credential JSON</label>
                <textarea readOnly value={shareJson} className="w-full h-48 p-3 text-xs font-mono border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={handleCopyJson} 
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    {copiedJson ? '✓ Copied!' : 'Copy JSON'}
                  </button>
                  <a 
                    href={shareLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Open Receive Page
                  </a>
                  <button 
                    onClick={handleCopyLink} 
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    {copiedLink ? '✓ Link Copied!' : 'Copy Link'}
                  </button>
                  {shareLink && (
                    <a
                      href={`mailto:?subject=Your%20WorldPass%20Credential&body=${encodeURIComponent(shareLink)}`}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      📧 Email Link
                    </a>
                  )}
                </div>
                
                {/* Token-based short link */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700">🔐 Secure Short Link</label>
                    {!shareTokenData && (
                      <button
                        onClick={handleGenerateShareToken}
                        disabled={creatingShareToken}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
                      >
                        {creatingShareToken ? 'Creating...' : '+ Generate Link'}
                      </button>
                    )}
                  </div>
                  {shareTokenData ? (
                    <div className="space-y-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <input
                        readOnly
                        value={shareTokenData.share_url}
                        className="w-full p-3 text-xs font-mono border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs text-blue-700 font-medium">⏱️ Valid for 24h · 🔢 Max 10 uses</span>
                        <button
                          onClick={handleCopyShortLink}
                          className="px-3 py-1.5 text-xs border border-blue-300 bg-white rounded-lg hover:bg-blue-50 transition-colors font-medium"
                        >
                          {copiedShortLink ? '✓ Copied!' : 'Copy Link'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      💡 Generate a secure, token-based link that doesn't expose credential data in the URL
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex justify-end sticky bottom-0 bg-white">
              <button onClick={() => setShowShare(false)} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
