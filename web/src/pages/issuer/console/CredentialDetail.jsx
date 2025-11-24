import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import IssuerLayout from "@/components/issuer/IssuerLayout";
import { getIssuerProfile, getIssuerCredentialDetail } from "@/lib/api";
import { FiCheckCircle, FiXCircle, FiArrowLeft, FiCopy, FiAlertCircle } from "react-icons/fi";

export default function IssuerCredentialDetail() {
  const navigate = useNavigate();
  const { vcId } = useParams();
  const [issuer, setIssuer] = useState(null);
  const [credential, setCredential] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }

    loadData(token);
  }, [navigate, vcId]);

  const loadData = async (token) => {
    try {
      setLoading(true);
      setError(null);

      const [profileResp, credentialResp] = await Promise.all([
        getIssuerProfile(token),
        getIssuerCredentialDetail(token, vcId)
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

  if (loading && !issuer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <IssuerLayout issuer={issuer}>
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
      </IssuerLayout>
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
    <IssuerLayout issuer={issuer}>
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
          <div>
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
          <StatusBadge status={credential.status} />
        </div>

        {/* Main Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Credential Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Type</label>
              <p className="text-sm text-gray-900 mt-1">
                {credential.credential?.credential_type || "N/A"}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Subject DID</label>
              <p className="text-sm text-gray-900 mt-1 font-mono break-all">
                {credential.credential?.subject_did || "N/A"}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Issued At</label>
              <p className="text-sm text-gray-900 mt-1">
                {formatDate(credential.credential?.created_at)}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Updated At</label>
              <p className="text-sm text-gray-900 mt-1">
                {formatDate(credential.credential?.updated_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Credential Data */}
        {credential.credential?.vc_data && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Credential Data</h2>
            <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto">
              {JSON.stringify(JSON.parse(credential.credential.vc_data), null, 2)}
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
              disabled
              className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
              title="Revoke functionality will be implemented in backend"
            >
              Revoke Credential (Coming Soon)
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Credential revocation will be available once the backend implementation is complete
            </p>
          </div>
        )}
      </div>
    </IssuerLayout>
  );
}
