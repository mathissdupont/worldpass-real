import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../../lib/auth';
import { listTransactions } from '../../lib/api';

export default function TransactionsPage() {
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
      <div className="min-h-screen bg-[color:var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--brand)] mx-auto mb-4"></div>
          <p className="text-[color:var(--muted)]">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg)] py-6 sm:py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/account')}
            className="text-[color:var(--brand-2)] hover:opacity-80 text-sm font-medium mb-4 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Account
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[color:var(--text)]">Payment History</h1>
              <p className="text-[color:var(--muted)] mt-1">View all your transactions</p>
            </div>
            
            <button
              onClick={() => navigate('/pay/demo')}
              className="bg-[color:var(--brand)] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:opacity-90 transition-all duration-200 shadow-lg w-full sm:w-auto"
            >
              💳 New Payment
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[color:var(--panel)] rounded-xl shadow-sm p-4 mb-6 border border-[color:var(--border)]">
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

        {/* Transactions Table */}
        {transactions.length === 0 ? (
          <div className="bg-[color:var(--panel)] rounded-xl shadow-sm p-8 sm:p-12 text-center border border-[color:var(--border)]">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-xl font-semibold text-[color:var(--text)] mb-2">No Transactions Yet</h3>
            <p className="text-[color:var(--muted)] mb-6">Start by creating your first payment</p>
            <button
              onClick={() => navigate('/pay/demo')}
              className="bg-[color:var(--brand)] text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-all duration-200 shadow-lg"
            >
              Create Payment
            </button>
          </div>
        ) : (
          <div className="bg-[color:var(--panel)] rounded-xl shadow-sm overflow-hidden border border-[color:var(--border)]">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[color:var(--panel-2)] border-b border-[color:var(--border)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[color:var(--panel-2)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-[color:var(--text)]">#{tx.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[color:var(--text)]">{formatDate(tx.created_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[color:var(--text)]">{tx.description || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-[color:var(--text)]">
                          {formatAmount(tx.amount_minor, tx.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(tx.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[color:var(--border)]">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4">
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
          </div>
        )}

        {/* Summary Stats */}
        {transactions.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[color:var(--panel)] rounded-xl shadow-sm p-4 sm:p-6 border border-[color:var(--border)]">
              <p className="text-sm text-[color:var(--muted)] mb-1">Total Transactions</p>
              <p className="text-2xl font-bold text-[color:var(--text)]">{transactions.length}</p>
            </div>
            <div className="bg-[color:var(--panel)] rounded-xl shadow-sm p-4 sm:p-6 border border-[color:var(--border)]">
              <p className="text-sm text-[color:var(--muted)] mb-1">Successful</p>
              <p className="text-2xl font-bold text-[color:var(--success)]">
                {transactions.filter((tx) => tx.status === 'success').length}
              </p>
            </div>
            <div className="bg-[color:var(--panel)] rounded-xl shadow-sm p-4 sm:p-6 border border-[color:var(--border)]">
              <p className="text-sm text-[color:var(--muted)] mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-[color:var(--text)]">
                $
                {transactions
                  .filter((tx) => tx.status === 'success')
                  .reduce((sum, tx) => sum + tx.amount_minor, 0) / 100}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
