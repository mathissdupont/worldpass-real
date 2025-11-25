import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import IssuerLayout from "@/components/issuer/IssuerLayout";
import DataTable from "@/components/issuer/DataTable";
import { getIssuerProfile, listIssuerCredentials } from "@/lib/api";
import { FiCheckCircle, FiXCircle, FiSearch, FiFilter } from "react-icons/fi";

export default function IssuerCredentials() {
  const navigate = useNavigate();
  const [issuer, setIssuer] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    status: "",
    template_type: "",
    search: "",
    date_from: "",
    date_to: ""
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }

    loadIssuerProfile(token);
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("issuer_token");
    if (token && issuer) {
      loadCredentials(token);
    }
  }, [issuer, pagination.page, filters]);

  const loadIssuerProfile = async (token) => {
    try {
      const profileResp = await getIssuerProfile();
      setIssuer(profileResp.issuer);
    } catch (err) {
      console.error(err);
      setError(err.message);
      if (err.message.includes("401") || err.message.includes("token")) {
        localStorage.removeItem("issuer_token");
        navigate("/issuer/login");
      }
    }
  };

  const loadCredentials = async (token) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === "" || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await listIssuerCredentials(token, params);
      setCredentials(response.credentials || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0
      }));
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on filter change
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      template_type: "",
      search: "",
      date_from: "",
      date_to: ""
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (!issuer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const columns = [
    {
      header: 'Credential ID',
      accessor: 'vc_id',
      render: (row) => (
        <span className="font-mono text-xs">{row.vc_id.substring(0, 20)}...</span>
      )
    },
    {
      header: 'Type',
      accessor: 'credential_type',
      render: (row) => (
        <span className="text-sm">{row.credential_type || 'N/A'}</span>
      )
    },
    {
      header: 'Subject',
      accessor: 'subject_did',
      render: (row) => (
        <span className="font-mono text-xs">
          {row.subject_did ? row.subject_did.substring(0, 25) + "..." : "N/A"}
        </span>
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
        const timestamp = row.created_at;
        const date = timestamp > 10000000000 
          ? new Date(timestamp)
          : new Date(timestamp * 1000);
        return (
          <div className="text-sm">
            <div>{date.toLocaleDateString()}</div>
            <div className="text-xs text-gray-500">{date.toLocaleTimeString()}</div>
          </div>
        );
      }
    },
  ];

  return (
    <IssuerLayout issuer={issuer}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Credentials</h1>
            <p className="text-gray-600 mt-1">Manage all issued credentials</p>
          </div>
          <button
            onClick={() => navigate("/issue")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Issue New Credential
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <FiFilter className="h-4 w-4" />
              Filters {showFilters ? '▼' : '▶'}
            </button>
            {(filters.status || filters.template_type || filters.search || filters.date_from || filters.date_to) && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear All
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search by ID or subject..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="valid">Valid</option>
                  <option value="revoked">Revoked</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credential Type
                </label>
                <input
                  type="text"
                  value={filters.template_type}
                  onChange={(e) => handleFilterChange('template_type', e.target.value)}
                  placeholder="e.g., StudentCard"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* Credentials Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Credentials ({pagination.total})
            </h2>
          </div>
          <DataTable
            columns={columns}
            data={credentials}
            loading={loading}
            emptyMessage="No credentials found"
            onRowClick={(row) => navigate(`/issuer/console/credentials/${row.vc_id}`)}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </IssuerLayout>
  );
}
