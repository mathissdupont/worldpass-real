import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "@/components/issuer/StatCard";
import DataTable from "@/components/issuer/DataTable";
import { getIssuerProfile, getIssuerStats, listIssuerCredentials } from "@/lib/api";
import { FiFileText, FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";

export default function IssuerDashboard() {
  const navigate = useNavigate();
  const [issuer, setIssuer] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentCredentials, setRecentCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      // Load profile, stats, and recent credentials in parallel
      const [profileResp, statsResp, credentialsResp] = await Promise.all([
        getIssuerProfile(),
        getIssuerStats(),
        listIssuerCredentials({ page: 1, per_page: 5 })
      ]);

      setIssuer(profileResp.issuer);
      setStats(statsResp);
      setRecentCredentials(credentialsResp.credentials);
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

  if (loading && !issuer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !issuer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-rose-200 p-6 max-w-md">
          <h2 className="text-lg font-semibold text-rose-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-sm text-rose-700">{error}</p>
          <button
            onClick={() => navigate("/issuer/login")}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const columns = [
    {
      header: 'Credential ID',
      accessor: 'vc_id',
      render: (row) => (
        <span className="font-mono text-xs">{row.vc_id.substring(0, 16)}...</span>
      )
    },
    {
      header: 'Type',
      accessor: 'credential_type',
    },
    {
      header: 'Subject',
      accessor: 'subject_did',
      render: (row) => (
        <span className="font-mono text-xs">{row.subject_did ? row.subject_did.substring(0, 20) + "..." : "N/A"}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
          row.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
          row.status === 'revoked' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
          'bg-gray-50 text-gray-700 border border-gray-200'
        }`}>
          {row.status === 'valid' && <FiCheckCircle className="h-3 w-3" />}
          {row.status === 'revoked' && <FiXCircle className="h-3 w-3" />}
          {row.status}
        </span>
      )
    },
    {
      header: 'Issued',
      accessor: 'created_at',
      render: (row) => {
        // Handle both Unix timestamps (seconds) and milliseconds
        const timestamp = row.created_at;
        const date = timestamp > 10000000000 
          ? new Date(timestamp) // Already in milliseconds
          : new Date(timestamp * 1000); // Convert from seconds
        return date.toLocaleDateString();
      }
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[color:var(--text)]">Dashboard</h1>
        <p className="text-[color:var(--muted)] mt-1">Overview of your issuer activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Issued"
          value={stats?.total_issued || 0}
          subtitle="All time"
          icon={<FiFileText className="h-6 w-6 text-gray-600" />}
          loading={!stats}
        />
        <StatCard
          title="Active"
          value={stats?.active_count || 0}
          subtitle="Currently valid"
          icon={<FiCheckCircle className="h-6 w-6 text-emerald-600" />}
          loading={!stats}
        />
        <StatCard
          title="Revoked"
          value={stats?.revoked_count || 0}
          subtitle="Invalidated"
          icon={<FiXCircle className="h-6 w-6 text-rose-600" />}
          loading={!stats}
        />
        <StatCard
          title="Expired"
          value={stats?.expired_count || 0}
          subtitle="Past expiration"
          icon={<FiClock className="h-6 w-6 text-amber-600" />}
          loading={!stats}
        />
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Credentials</h2>
          <button
            onClick={() => navigate("/issuer/console/credentials")}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View All →
          </button>
        </div>
        <DataTable
          columns={columns}
          data={recentCredentials}
          loading={loading}
          emptyMessage="No credentials issued yet"
          onRowClick={(row) => navigate(`/issuer/console/credentials/${row.vc_id}`)}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/issue")}
            className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-left transition-colors"
          >
            <h4 className="font-medium text-blue-900">Issue Credential</h4>
            <p className="text-sm text-blue-700 mt-1">Create and issue a new credential</p>
          </button>
          <button
            onClick={() => navigate("/issuer/console/templates")}
            className="p-4 rounded-lg border-2 border-gray-200 hover:bg-gray-50 text-left transition-colors"
          >
            <h4 className="font-medium text-gray-900">Manage Templates</h4>
            <p className="text-sm text-gray-600 mt-1">Create and edit credential templates</p>
          </button>
          <button
            onClick={() => navigate("/issuer/console/api")}
            className="p-4 rounded-lg border-2 border-gray-200 hover:bg-gray-50 text-left transition-colors"
          >
            <h4 className="font-medium text-gray-900">API Keys</h4>
            <p className="text-sm text-gray-600 mt-1">Manage API keys and webhooks</p>
          </button>
        </div>
      </div>
    </div>
  );
}

