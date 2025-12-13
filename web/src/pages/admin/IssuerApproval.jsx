import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheckCircle, FiXCircle, FiClock, FiMail, FiGlobe, FiKey } from "react-icons/fi";

export default function IssuerApproval() {
  const navigate = useNavigate();
  const [issuers, setIssuers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const loadIssuers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem("wp_admin_token");
      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await fetch("/api/admin/issuers", {
        headers: { "x-token": token }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Unauthorized - Admin access required");
        }
        throw new Error("Failed to load issuers");
      }

      const data = await response.json();
      setIssuers(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
      if (err.message.includes("Unauthorized")) {
        setTimeout(() => navigate("/login"), 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadIssuers();
  }, [loadIssuers]);

  const handleApprove = async (issuerId) => {
    if (!confirm("Are you sure you want to approve this issuer? This will generate API keys and activate their account.")) {
      return;
    }

    try {
      setApproving(issuerId);
      setError(null);

      const token = localStorage.getItem("wp_admin_token");
      const response = await fetch("/api/admin/issuers/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-token": token
        },
        body: JSON.stringify({ issuer_id: issuerId })
      });

      if (!response.ok) {
        throw new Error("Failed to approve issuer");
      }

      const data = await response.json();
      setApiKey(data.api_key);
      setShowApiKeyModal(true);
      
      // Reload issuers list
      await loadIssuers();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setApproving(null);
    }
  };

  const copyApiKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      alert("API key copied to clipboard!");
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: FiClock },
      approved: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: FiCheckCircle },
      revoked: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: FiXCircle }
    };

    const style = styles[status] || styles.pending;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
        <Icon className="h-3.5 w-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Super Admin - Issuer Approval</h1>
          <p className="text-gray-600 mt-2">Review and approve issuer registration requests</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-lg p-4">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-lg">
                <FiClock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {issuers.filter(i => i.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-600">Pending Approval</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <FiCheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {issuers.filter(i => i.status === 'approved').length}
                </p>
                <p className="text-sm text-gray-600">Approved</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <FiGlobe className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{issuers.length}</p>
                <p className="text-sm text-gray-600">Total Issuers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Issuers Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Issuers</h2>
          </div>

          {issuers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No issuers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {issuers.map((issuer) => (
                    <tr key={issuer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{issuer.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiMail className="h-4 w-4" />
                          {issuer.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FiGlobe className="h-4 w-4" />
                          {issuer.domain || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-mono text-gray-600 max-w-xs truncate">
                          {issuer.did || 'Not generated'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(issuer.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(issuer.created_at * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {issuer.status === 'pending' && (
                          <button
                            onClick={() => handleApprove(issuer.id)}
                            disabled={approving === issuer.id}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium"
                          >
                            {approving === issuer.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <FiCheckCircle className="h-4 w-4" />
                                Approve
                              </>
                            )}
                          </button>
                        )}
                        {issuer.status === 'approved' && (
                          <span className="text-emerald-600 font-medium">Active</span>
                        )}
                        {issuer.status === 'revoked' && (
                          <span className="text-rose-600 font-medium">Revoked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && apiKey && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <FiKey className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Issuer Approved Successfully!</h3>
                <p className="text-sm text-gray-600">API key has been generated</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-800 font-medium mb-2">
                ⚠️ Important: Save this API key securely
              </p>
              <p className="text-xs text-amber-700">
                This is the only time you'll see this key. Send it to the issuer via a secure channel.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={apiKey}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={copyApiKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setApiKey(null);
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
