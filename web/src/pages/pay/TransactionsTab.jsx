import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../../lib/auth';
import { listTransactions } from '../../lib/api';

export default function TransactionsTab() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = getToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const filterStatus = filter === 'all' ? null : filter;
        const result = await listTransactions(filterStatus);
        setTransactions(result.transactions || []);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
        setError('Failed to load transactions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [filter, navigate]);

  const getStatusBadge = (status) => {
    const configs = {
      success: { classes: 'bg-[color:var(--success)]/20 text-[color:var(--success)]', label: 'Success' },
      pending: { classes: 'bg-[color:var(--warning)]/20 text-[color:var(--warning)]', label: 'Pending' },
      failed: { classes: 'bg-[color:var(--danger)]/20 text-[color:var(--danger)]', label: 'Failed' },
    };
    const config = configs[status] || configs.failed;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${config.classes}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amountMinor, currency) => {
    return `$${(amountMinor / 100).toFixed(2)} ${currency.toUpperCase()}`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--brand)] mx-auto mb-4"></div>
        <p className="text-[color:var(--muted)]">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <span className="text-sm font-medium text-[color:var(--text)]">Filter by status:</span>
          <div className="flex flex-wrap gap-2">
            {['all', 'success', 'pending', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-[color:var(--brand)] text-white'
                    : 'bg-[color:var(--panel-2)] text-[color:var(--text)] hover:bg-[color:var(--panel-3)]'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/30 rounded-xl p-4 mb-6">
          <p className="text-[color:var(--danger)]">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💳</div>
          <h3 className="text-xl font-semibold text-[color:var(--text)] mb-2">No Transactions Yet</h3>
          <p className="text-[color:var(--muted)]">Your transaction history will appear here</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto bg-[color:var(--panel-2)] rounded-lg">
            <table className="w-full">
              <thead className="border-b border-[color:var(--border)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--muted)] uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--muted)] uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--muted)] uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--muted)] uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--muted)] uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[color:var(--panel-3)] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-[color:var(--text)]">#{tx.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[color:var(--text)]">{formatDate(tx.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[color:var(--text)]">{tx.description || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-[color:var(--text)]">
                        {formatAmount(tx.amount_minor, tx.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-[color:var(--panel-2)] rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-mono text-[color:var(--muted)]">#{tx.id}</span>
                    <p className="text-sm font-medium text-[color:var(--text)] mt-1">
                      {tx.description || 'No description'}
                    </p>
                  </div>
                  {getStatusBadge(tx.status)}
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-[color:var(--muted)]">{formatDate(tx.created_at)}</span>
                  <span className="text-lg font-bold text-[color:var(--text)]">
                    {formatAmount(tx.amount_minor, tx.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[color:var(--panel-2)] rounded-lg p-4">
              <p className="text-sm text-[color:var(--muted)] mb-1">Total Transactions</p>
              <p className="text-2xl font-bold text-[color:var(--text)]">{transactions.length}</p>
            </div>
            <div className="bg-[color:var(--panel-2)] rounded-lg p-4">
              <p className="text-sm text-[color:var(--muted)] mb-1">Successful</p>
              <p className="text-2xl font-bold text-[color:var(--success)]">
                {transactions.filter((tx) => tx.status === 'success').length}
              </p>
            </div>
            <div className="bg-[color:var(--panel-2)] rounded-lg p-4">
              <p className="text-sm text-[color:var(--muted)] mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-[color:var(--text)]">
                $
                {transactions
                  .filter((tx) => tx.status === 'success')
                  .reduce((sum, tx) => sum + tx.amount_minor, 0) / 100}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
