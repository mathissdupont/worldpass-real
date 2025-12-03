import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "@/components/issuer/DataTable";
import { getIssuerProfile, listIssuerCredentials, exportIssuerCredentials, downloadIssuerCredential, createShareToken } from "@/lib/api";
import { FiCheckCircle, FiXCircle, FiSearch, FiFilter, FiDownload, FiShare2, FiLink } from "react-icons/fi";
import { isFeatureEnabled } from "@/lib/featureFlags";

export default function IssuerCredentials() {
  const navigate = useNavigate();
  const [issuer, setIssuer] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null); // Track row action
  const [onChainStatuses, setOnChainStatuses] = useState({}); // vc_id -> {onChain, revoked}
  
  // Feature flags
  const showBlockchainBadges = isFeatureEnabled('BLOCKCHAIN_STATUS_BADGES');
  
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
      
      // Fetch on-chain status for displayed credentials (if feature enabled)
      if (showBlockchainBadges && response.credentials && response.credentials.length > 0) {
        loadOnChainStatuses(response.credentials);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOnChainStatuses = async (credentials) => {
    // Fetch blockchain proof status for each credential
    const statuses = {};
    await Promise.all(
      credentials.map(async (cred) => {
        try {
          const response = await fetch(`/api/blockchain/vc/${cred.vc_id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.ok && data.record) {
              statuses[cred.vc_id] = {
                onChain: true,
                revoked: data.record.revoked_at !== null
              };
            } else {
              statuses[cred.vc_id] = { onChain: false, revoked: false };
            }
          } else {
            statuses[cred.vc_id] = { onChain: false, revoked: false };
          }
        } catch {
          statuses[cred.vc_id] = { onChain: false, revoked: false };
        }
      })
    );
    setOnChainStatuses(statuses);
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

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const blob = await exportIssuerCredentials();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `issuer-credentials-${issuer.id}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleQuickDownload = async (vcId, e) => {
    e.stopPropagation(); // Prevent row click
    setActionInProgress(`download-${vcId}`);
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
      setActionInProgress(null);
    }
  };

  const handleQuickShare = async (vcId, e) => {
    e.stopPropagation(); // Prevent row click
    setActionInProgress(`share-${vcId}`);
    try {
      // Create a short-lived share token
      const result = await createShareToken(vcId, true, 24, 10);
      if (result.ok && result.share_url) {
        // Copy share URL to clipboard
        await navigator.clipboard.writeText(result.share_url);
        setError(null);
        // Show success message temporarily
        const originalError = error;
        setError("✅ Share link copied! Valid for 24 hours, max 10 uses.");
        setTimeout(() => setError(originalError), 3000);
      }
    } catch (err) {
      console.error(err);
      setError("Share failed: " + err.message);
    } finally {
      setActionInProgress(null);
    }
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
      render: (row) => {
        const onChainInfo = showBlockchainBadges ? onChainStatuses[row.vc_id] : null;
        
        return (
          <div className="flex flex-col gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
              row.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              row.status === 'revoked' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
              'bg-gray-50 text-gray-700 border border-gray-200'
            }`}>
              {row.status === 'valid' && <FiCheckCircle className="h-3.5 w-3.5" />}
              {row.status === 'revoked' && <FiXCircle className="h-3.5 w-3.5" />}
              <span className="capitalize">{row.status}</span>
            </span>
            
            {showBlockchainBadges && onChainInfo && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                onChainInfo.onChain ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`} title={onChainInfo.onChain ? 'Registered on blockchain' : 'Not on blockchain'}>
                <FiLink className="h-2.5 w-2.5" />
                {onChainInfo.onChain ? 'On-Chain' : 'Off-Chain'}
              </span>
            )}
          </div>
        );
      }
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
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => {
        const downloadId = `download-${row.vc_id}`;
        const shareId = `share-${row.vc_id}`;
        const isDownloading = actionInProgress === downloadId;
        const isSharing = actionInProgress === shareId;
        
        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handleQuickDownload(row.vc_id, e)}
              disabled={isDownloading}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 active:scale-95"
              title="Download credential"
            >
              {isDownloading ? (
                <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiDownload className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={(e) => handleQuickShare(row.vc_id, e)}
              disabled={isSharing}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 active:scale-95"
              title="Copy share link (24h, 10 uses)"
            >
              {isSharing ? (
                <div className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FiShare2 className="h-4 w-4" />
              )}
            </button>
          </div>
        );
      }
    },
  ];

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Credentials</h1>
            <p className="text-gray-600 mt-1">Manage all issued credentials</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportAll}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
            >
              <FiDownload className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export All'}
            </button>
            <button
              onClick={() => navigate("/issuer/console/issue")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Issue New Credential
            </button>
          </div>
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
              {(filters.status || filters.template_type || filters.search || filters.date_from || filters.date_to) && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Active</span>
              )}
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

        {/* Error/Success Display */}
        {error && (
          <div className={`${
            error.startsWith('✅') || error.startsWith('✓') 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-rose-50 border-rose-200 text-rose-700'
          } border rounded-lg p-4 transition-all`}>
            <p className="text-sm font-medium">{error}</p>
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
  );
}
