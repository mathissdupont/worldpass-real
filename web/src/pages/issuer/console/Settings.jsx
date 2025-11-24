import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import IssuerLayout from "@/components/issuer/IssuerLayout";
import { getIssuerProfile, updateIssuerProfile } from "@/lib/api";
import { FiSave, FiCheckCircle } from "react-icons/fi";

export default function IssuerSettings() {
  const navigate = useNavigate();
  const [issuer, setIssuer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    contact_email: "",
    support_link: "",
    timezone: "UTC",
    locale: "en"
  });

  useEffect(() => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }

    loadData(token);
  }, [navigate]);

  const loadData = async (token) => {
    try {
      setLoading(true);
      setError(null);

      const profileResp = await getIssuerProfile(token);
      const issuerData = profileResp.issuer;
      
      setIssuer(issuerData);
      setFormData({
        name: issuerData.name || "",
        domain: issuerData.domain || "",
        contact_email: issuerData.contact_email || "",
        support_link: issuerData.support_link || "",
        timezone: issuerData.timezone || "UTC",
        locale: issuerData.locale || "en"
      });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const token = localStorage.getItem("issuer_token");
      await updateIssuerProfile(token, formData);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Reload data to get updated values
      await loadData(token);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading && !issuer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Istanbul",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Dubai",
    "Australia/Sydney"
  ];

  const locales = [
    { value: "en", label: "English" },
    { value: "tr", label: "Türkçe" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" },
    { value: "ja", label: "日本語" },
    { value: "zh", label: "中文" }
  ];

  return (
    <IssuerLayout issuer={issuer}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your issuer profile and preferences</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
            <FiCheckCircle className="h-5 w-5 text-emerald-600" />
            <p className="text-sm text-emerald-700 font-medium">Settings saved successfully!</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* Account Information (Read-only) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Email Address
              </label>
              <p className="text-sm text-gray-900">{issuer?.email}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Decentralized Identity (DID)
              </label>
              <p className="text-sm text-gray-900 font-mono break-all">
                {issuer?.did || "Not set"}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Status
              </label>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                issuer?.status === 'active' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : issuer?.status === 'pending'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                {issuer?.status || 'Unknown'}
              </span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Account Created
              </label>
              <p className="text-sm text-gray-900">
                {issuer?.created_at 
                  ? new Date((issuer.created_at > 10000000000 ? issuer.created_at : issuer.created_at * 1000)).toLocaleString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Settings Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Your organization name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                This name will appear on credentials you issue
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain
              </label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) => handleInputChange('domain', e.target.value)}
                placeholder="example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your organization's domain name
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                placeholder="contact@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Public contact email for credential holders
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Support Link
              </label>
              <input
                type="url"
                value={formData.support_link}
                onChange={(e) => handleInputChange('support_link', e.target.value)}
                placeholder="https://example.com/support"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Link to your support or help page
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={formData.locale}
                  onChange={(e) => handleInputChange('locale', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {locales.map(locale => (
                    <option key={locale.value} value={locale.value}>{locale.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
            >
              <FiSave className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => loadData(localStorage.getItem("issuer_token"))}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Security Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Security</h2>
          <div className="space-y-3">
            <button
              onClick={() => alert('Password change functionality will be implemented')}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Change Password
            </button>
            <p className="text-xs text-gray-500">
              Update your password regularly to keep your account secure
            </p>
          </div>
        </div>
      </div>
    </IssuerLayout>
  );
}
