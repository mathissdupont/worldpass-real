import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FiBarChart3, FiDownload, FiRefreshCw } from "react-icons/fi";

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalIssuers: 0,
    totalCredentials: 0,
    totalUsers: 0,
    approvedIssuers: 0,
    pendingIssuers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
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
        throw new Error("Failed to load statistics");
      }

      const issuers = await response.json();

      setStats({
        totalIssuers: issuers.length,
        totalCredentials: issuers.reduce((sum, i) => sum + (i.credentials_issued || 0), 0),
        totalUsers: issuers.reduce((sum, i) => sum + (i.users_count || 0), 0),
        approvedIssuers: issuers.filter(i => i.status === 'approved').length,
        pendingIssuers: issuers.filter(i => i.status === 'pending').length,
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Statistics</h1>
            <p className="text-gray-600 mt-1">System-wide metrics and insights</p>
          </div>
          <button
            onClick={loadStats}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiRefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-lg p-4">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-600 font-medium">Total Issuers</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalIssuers}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-600 font-medium">Approved</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.approvedIssuers}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-600 font-medium">Pending</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">{stats.pendingIssuers}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-600 font-medium">Total Credentials</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalCredentials}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-600 font-medium">Total Users</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{stats.totalUsers}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">System Overview</h2>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
              <FiDownload className="h-4 w-4" />
              Export Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Issuer Status Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Approved</span>
                    <span className="text-sm font-medium text-gray-900">
                      {stats.totalIssuers > 0 ? Math.round((stats.approvedIssuers / stats.totalIssuers) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${stats.totalIssuers > 0 ? (stats.approvedIssuers / stats.totalIssuers) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="text-sm font-medium text-gray-900">
                      {stats.totalIssuers > 0 ? Math.round((stats.pendingIssuers / stats.totalIssuers) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${stats.totalIssuers > 0 ? (stats.pendingIssuers / stats.totalIssuers) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Key Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Avg. Credentials per Issuer</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.totalIssuers > 0 ? (stats.totalCredentials / stats.totalIssuers).toFixed(1) : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Approval Rate</span>
                  <span className="text-sm font-medium text-emerald-600">
                    {stats.totalIssuers > 0 ? Math.round((stats.approvedIssuers / stats.totalIssuers) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Avg. Users per Issuer</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.totalIssuers > 0 ? (stats.totalUsers / stats.totalIssuers).toFixed(1) : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
