import { useState, useEffect } from "react";
import { FiSearch, FiFilter, FiDownload } from "react-icons/fi";

const LOG_TYPES = {
  'login': { label: 'Login', color: 'blue' },
  'logout': { label: 'Logout', color: 'gray' },
  'approve': { label: 'Approve Issuer', color: 'emerald' },
  'revoke': { label: 'Revoke Issuer', color: 'rose' },
  'create': { label: 'Create', color: 'blue' },
  'update': { label: 'Update', color: 'amber' },
  'delete': { label: 'Delete', color: 'rose' },
  'error': { label: 'Error', color: 'red' },
};

export default function AdminLogs() {
  const [logs] = useState([
    {
      id: 1,
      timestamp: new Date(Date.now() - 5 * 60000),
      type: 'approve',
      admin: 'mathissdupont',
      description: 'Approved issuer "Heptapus Group"',
      details: { issuer_id: 1, issuer_name: 'Heptapus Group' }
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 15 * 60000),
      type: 'login',
      admin: 'mathissdupont',
      description: 'Admin logged in',
      details: { ip: '192.168.1.100' }
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 1 * 3600000),
      type: 'update',
      admin: 'mathissdupont',
      description: 'Updated system settings',
      details: { changes: ['jwt_expiration'] }
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 2 * 3600000),
      type: 'create',
      admin: 'system',
      description: 'New issuer registered',
      details: { issuer_name: 'Test Organization' }
    },
    {
      id: 5,
      timestamp: new Date(Date.now() - 24 * 3600000),
      type: 'login',
      admin: 'mathissdupont',
      description: 'Admin logged in',
      details: { ip: '192.168.1.100' }
    },
  ]);
  const [filtered, setFiltered] = useState(logs);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    let result = logs;

    if (search) {
      result = result.filter(log =>
        log.description.toLowerCase().includes(search.toLowerCase()) ||
        log.admin.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (typeFilter) {
      result = result.filter(log => log.type === typeFilter);
    }

    setFiltered(result);
  }, [search, typeFilter, logs]);

  const getLogColor = (type) => {
    const colorClass = LOG_TYPES[type]?.color || 'gray';
    const colors = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      gray: 'bg-gray-50 text-gray-700 border-gray-200',
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rose: 'bg-rose-50 text-rose-700 border-rose-200',
      amber: 'bg-amber-50 text-amber-700 border-amber-200',
      red: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[colorClass] || colors.gray;
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600 mt-1">System activity and admin actions</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <FiDownload className="h-4 w-4" />
            Export Logs
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">All Types</option>
                {Object.entries(LOG_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No logs found</p>
            </div>
          ) : (
            filtered.map((log) => (
              <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getLogColor(log.type)}`}>
                        {LOG_TYPES[log.type]?.label || log.type}
                      </span>
                      <span className="text-sm text-gray-600">{log.admin}</span>
                      <span className="text-xs text-gray-500">{formatTime(log.timestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium">{log.description}</p>
                    {Object.keys(log.details).length > 0 && (
                      <div className="mt-3 text-xs text-gray-600 space-y-1">
                        {Object.entries(log.details).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{log.timestamp.toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="mt-6 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {filtered.length} of {logs.length} logs
            </p>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                ← Previous
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
