import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import IssuerLayout from "@/components/issuer/IssuerLayout";
import DataTable from "@/components/issuer/DataTable";
import { 
  getIssuerProfile, 
  listIssuerWebhooks,
  createIssuerWebhook,
  updateIssuerWebhook,
  deleteIssuerWebhook,
  rotateIssuerApiKey
} from "@/lib/api";
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiEyeOff, FiX, FiToggleLeft, FiToggleRight, FiKey, FiRefreshCw } from "react-icons/fi";

export default function IssuerAPIWebhooks() {
  const navigate = useNavigate();
  const [issuer, setIssuer] = useState(null);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [webhookFormData, setWebhookFormData] = useState({
    url: "",
    event_type: "credential.issued",
    secret: "",
    is_active: true
  });
  const [webhookFormError, setWebhookFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // API Key state
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [showKeyConfirm, setShowKeyConfirm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }

    loadData(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const loadData = async (token) => {
    try {
      setLoading(true);
      setError(null);

      const [profileResp, webhooksResp] = await Promise.all([
        getIssuerProfile(),
        listIssuerWebhooks()
      ]);

      setIssuer(profileResp.issuer);
      setWebhooks(webhooksResp.webhooks || []);
      
      // Store the API key if available
      if (profileResp.issuer?.api_key) {
        setApiKey(profileResp.issuer.api_key);
      }
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

  const openCreateWebhookModal = () => {
    setEditingWebhook(null);
    setWebhookFormData({
      url: "",
      event_type: "credential.issued",
      secret: "",
      is_active: true
    });
    setWebhookFormError(null);
    setShowWebhookModal(true);
  };

  const openEditWebhookModal = (webhook) => {
    setEditingWebhook(webhook);
    setWebhookFormData({
      url: webhook.url,
      event_type: webhook.event_type,
      secret: webhook.secret || "",
      is_active: webhook.is_active
    });
    setWebhookFormError(null);
    setShowWebhookModal(true);
  };

  const closeWebhookModal = () => {
    setShowWebhookModal(false);
    setEditingWebhook(null);
    setWebhookFormError(null);
  };

  const handleWebhookSubmit = async (e) => {
    e.preventDefault();
    setWebhookFormError(null);
    setSaving(true);

    try {
      const token = localStorage.getItem("issuer_token");
      const payload = {
        url: webhookFormData.url,
        event_type: webhookFormData.event_type,
        secret: webhookFormData.secret || null,
        is_active: webhookFormData.is_active
      };

      if (editingWebhook) {
        await updateIssuerWebhook(token, editingWebhook.id, payload);
      } else {
        await createIssuerWebhook(token, payload);
      }

      closeWebhookModal();
      await loadData(token);
    } catch (err) {
      console.error(err);
      setWebhookFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWebhookActive = async (webhook) => {
    try {
      const token = localStorage.getItem("issuer_token");
      await updateIssuerWebhook(token, webhook.id, {
        is_active: !webhook.is_active
      });
      await loadData(token);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleDeleteWebhook = async (webhook) => {
    setDeleteConfirm(webhook);
  };

  const confirmDeleteWebhook = async () => {
    if (!deleteConfirm) return;
    
    try {
      const token = localStorage.getItem("issuer_token");
      await deleteIssuerWebhook(token, deleteConfirm.id);
      setDeleteConfirm(null);
      await loadData(token);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleCopyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleGenerateApiKey = async () => {
    setGeneratingKey(true);
    setError(null);
    try {
      const response = await rotateIssuerApiKey();
      setApiKey(response.api_key);
      setShowKeyConfirm(false);
      setApiKeyVisible(true); // Show the key immediately after generation
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setGeneratingKey(false);
    }
  };

  if (!issuer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const webhookColumns = [
    {
      header: 'URL',
      accessor: 'url',
      render: (row) => (
        <span className="text-sm text-gray-900 font-mono break-all">{row.url}</span>
      )
    },
    {
      header: 'Event Type',
      accessor: 'event_type',
      render: (row) => (
        <span className="text-sm text-gray-700">{row.event_type}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
          row.is_active 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-gray-100 text-gray-600 border border-gray-200'
        }`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Last Delivery',
      accessor: 'last_delivery',
      render: (row) => {
        if (!row.last_delivery) return <span className="text-sm text-gray-500">Never</span>;
        const timestamp = row.last_delivery;
        const date = timestamp > 10000000000 
          ? new Date(timestamp)
          : new Date(timestamp * 1000);
        return <span className="text-sm text-gray-700">{date.toLocaleString()}</span>;
      }
    },
    {
      header: 'Failures',
      accessor: 'failure_count',
      render: (row) => (
        <span className={`text-sm font-medium ${
          row.failure_count > 0 ? 'text-rose-600' : 'text-gray-600'
        }`}>
          {row.failure_count || 0}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleWebhookActive(row);
            }}
            className="p-1.5 text-gray-600 hover:text-gray-900"
            title={row.is_active ? "Deactivate" : "Activate"}
          >
            {row.is_active ? <FiToggleRight className="h-5 w-5" /> : <FiToggleLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditWebhookModal(row);
            }}
            className="p-1.5 text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteWebhook(row);
            }}
            className="p-1.5 text-rose-600 hover:text-rose-800"
            title="Delete"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <IssuerLayout issuer={issuer}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API & Webhooks</h1>
          <p className="text-gray-600 mt-1">Manage API keys and webhook integrations</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* API Keys Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <FiKey className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Use your API key to authenticate requests to the WorldPass API. Keep it secure and never share it publicly.
          </p>

          {apiKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type={apiKeyVisible ? "text" : "password"}
                    value={apiKey}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono bg-gray-50"
                  />
                  <button
                    onClick={() => setApiKeyVisible(!apiKeyVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {apiKeyVisible ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  onClick={handleCopyApiKey}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => setShowKeyConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  title="Generate new API key (invalidates old key)"
                >
                  <FiRefreshCw className="h-4 w-4" />
                  Rotate
                </button>
              </div>
              {copySuccess && (
                <p className="text-xs text-emerald-600 mt-2">
                  ✓ API key copied to clipboard
                </p>
              )}
              <p className="text-xs text-amber-600">
                ⚠️ Store this key securely. For security reasons, it cannot be retrieved again.
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">
                {issuer?.status === 'approved' 
                  ? "No API key generated yet. Click the button below to generate one."
                  : "Your issuer account must be approved before you can generate an API key."
                }
              </p>
              <button
                onClick={() => setShowKeyConfirm(true)}
                disabled={issuer?.status !== 'approved'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <FiKey className="h-4 w-4" />
                Generate API Key
              </button>
            </div>
          )}
        </div>

        {/* Webhooks Section */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Webhooks</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Receive real-time notifications for events
              </p>
            </div>
            <button
              onClick={openCreateWebhookModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <FiPlus className="h-4 w-4" />
              Add Webhook
            </button>
          </div>
          <DataTable
            columns={webhookColumns}
            data={webhooks}
            loading={loading}
            emptyMessage="No webhooks configured yet. Add your first webhook to receive event notifications."
            onRowClick={(row) => openEditWebhookModal(row)}
          />
        </div>
      </div>

      {/* Webhook Create/Edit Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingWebhook ? 'Edit Webhook' : 'Add Webhook'}
              </h2>
              <button
                onClick={closeWebhookModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleWebhookSubmit} className="p-6 space-y-4">
              {webhookFormError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <p className="text-sm text-rose-700">{webhookFormError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL *
                </label>
                <input
                  type="url"
                  required
                  value={webhookFormData.url}
                  onChange={(e) => setWebhookFormData({ ...webhookFormData, url: e.target.value })}
                  placeholder="https://your-domain.com/webhook"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type *
                </label>
                <select
                  required
                  value={webhookFormData.event_type}
                  onChange={(e) => setWebhookFormData({ ...webhookFormData, event_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="credential.issued">Credential Issued</option>
                  <option value="credential.revoked">Credential Revoked</option>
                  <option value="credential.verified">Credential Verified</option>
                  <option value="*">All Events</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret (Optional)
                </label>
                <input
                  type="text"
                  value={webhookFormData.secret}
                  onChange={(e) => setWebhookFormData({ ...webhookFormData, secret: e.target.value })}
                  placeholder="Your webhook secret for HMAC verification"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used to verify webhook authenticity
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="webhook_active"
                  checked={webhookFormData.is_active}
                  onChange={(e) => setWebhookFormData({ ...webhookFormData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="webhook_active" className="text-sm font-medium text-gray-700">
                  Active (receive events)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeWebhookModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingWebhook ? 'Update Webhook' : 'Add Webhook')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Delete Webhook</h2>
            <p className="text-sm text-gray-600 mb-2">
              Are you sure you want to delete this webhook?
            </p>
            <p className="text-sm font-mono text-gray-700 bg-gray-50 p-2 rounded mb-4 break-all">
              {deleteConfirm.url}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteWebhook}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium"
              >
                Delete Webhook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Generation Confirmation Modal */}
      {showKeyConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {apiKey ? 'Rotate API Key' : 'Generate API Key'}
            </h2>
            {apiKey ? (
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to rotate your API key? The current key will be <strong>permanently invalidated</strong> and cannot be recovered.
              </p>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                This will generate a new API key for your account. Make sure to copy and store it securely as it will only be shown once.
              </p>
            )}
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              ⚠️ All applications using the {apiKey ? 'current' : ''} API key will need to be updated.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowKeyConfirm(false)}
                disabled={generatingKey}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateApiKey}
                disabled={generatingKey}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
              >
                {generatingKey ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="9" opacity=".25" />
                      <path d="M21 12a9 9 0 0 1-9 9" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  apiKey ? 'Rotate Key' : 'Generate Key'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </IssuerLayout>
  );
}
