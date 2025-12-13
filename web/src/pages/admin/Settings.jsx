import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiAlertCircle } from "react-icons/fi";

export default function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    jwtExpiration: 24,
    challengeTTL: 180,
    maxIssuers: 100,
    maintenanceMode: false,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setSaved(false);

      const token = localStorage.getItem("wp_admin_token");
      if (!token) {
        navigate("/admin/login");
        return;
      }

      // In production, this would call an endpoint to save settings
      // For now, we'll just simulate
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600 mt-1">Configure application behavior and limits</p>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm text-emerald-700">✓ Settings saved successfully</p>
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">JWT & Authentication</h2>
          </div>

          <div className="p-6 space-y-6">
            {/* JWT Expiration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JWT Expiration Hours
              </label>
              <input
                type="number"
                min="1"
                max="720"
                value={settings.jwtExpiration}
                onChange={(e) => handleChange('jwtExpiration', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Time before authentication tokens expire (1-720 hours)</p>
            </div>

            {/* Challenge TTL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Challenge TTL (Seconds)
              </label>
              <input
                type="number"
                min="30"
                max="3600"
                value={settings.challengeTTL}
                onChange={(e) => handleChange('challengeTTL', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Challenge validation timeout in seconds</p>
            </div>
          </div>
        </div>

        {/* Limits Section */}
        <div className="bg-white rounded-xl border border-gray-200 mt-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">System Limits</h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Max Issuers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Issuers
              </label>
              <input
                type="number"
                min="10"
                value={settings.maxIssuers}
                onChange={(e) => handleChange('maxIssuers', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum number of allowed issuers</p>
            </div>
          </div>
        </div>

        {/* Maintenance Mode Section */}
        <div className="bg-white rounded-xl border border-gray-200 mt-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Maintenance</h2>
          </div>

          <div className="p-6">
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="maintenance"
                checked={settings.maintenanceMode}
                onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <label htmlFor="maintenance" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Enable Maintenance Mode
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  When enabled, the application will display a maintenance message and block all user requests
                </p>
              </div>
            </div>

            {settings.maintenanceMode && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <FiAlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Maintenance mode is enabled. Users will not be able to access the application.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <FiSave className="h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
