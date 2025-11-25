import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getToken } from '../../lib/auth';
import { listTransactions } from '../../lib/api';

export default function PaymentResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  const txId = searchParams.get('tx_id');
  const status = searchParams.get('status');

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const token = getToken();
        if (!token) {
          navigate('/login');
          return;
        }

        // Fetch all transactions and find the one we need
        const result = await listTransactions();
        const tx = result.transactions.find((t) => t.id === parseInt(txId));
        
        if (tx) {
          setTransaction(tx);
        }
      } catch (err) {
        console.error('Failed to fetch transaction:', err);
      } finally {
        setLoading(false);
      }
    };

    if (txId) {
      fetchTransaction();
    } else {
      setLoading(false);
    }
  }, [txId, navigate]);

  const getStatusConfig = () => {
    if (status === 'success' || transaction?.status === 'success') {
      return {
        icon: '✅',
        title: 'Payment Successful!',
        message: 'Your payment has been processed successfully.',
        bgColor: 'from-green-600 to-emerald-600',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
      };
    } else if (status === 'cancelled') {
      return {
        icon: '❌',
        title: 'Payment Cancelled',
        message: 'You cancelled the payment. No charges were made.',
        bgColor: 'from-gray-600 to-slate-600',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-600',
      };
    } else {
      return {
        icon: '⚠️',
        title: 'Payment Failed',
        message: 'Something went wrong with your payment.',
        bgColor: 'from-red-600 to-rose-600',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
      };
    }
  };

  const config = getStatusConfig();

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--brand)] mx-auto mb-4"></div>
          <p className="text-[color:var(--muted)]">Loading transaction details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.bgColor} flex items-center justify-center px-4 py-8`}>
      <div className="max-w-md w-full">
        {/* Result Card */}
        <div className="bg-[color:var(--panel)] rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Icon */}
          <div className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-6`}>
            <span className="text-4xl">{config.icon}</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-[color:var(--text)] text-center mb-2">
            {config.title}
          </h1>

          {/* Message */}
          <p className="text-[color:var(--muted)] text-center mb-6">
            {config.message}
          </p>

          {/* Transaction Details */}
          {transaction && (
            <div className="bg-[color:var(--panel-2)] rounded-xl p-4 sm:p-6 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[color:var(--muted)]">Transaction ID</span>
                <span className="text-sm font-mono text-[color:var(--text)]">#{transaction.id}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[color:var(--muted)]">Amount</span>
                <span className="text-lg font-bold text-[color:var(--text)]">
                  ${(transaction.amount_minor / 100).toFixed(2)} {transaction.currency.toUpperCase()}
                </span>
              </div>

              {transaction.description && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-[color:var(--muted)]">Description</span>
                  <span className="text-sm text-[color:var(--text)]">{transaction.description}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[color:var(--muted)]">Status</span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    transaction.status === 'success'
                      ? 'bg-[color:var(--success)]/20 text-[color:var(--success)]'
                      : transaction.status === 'pending'
                      ? 'bg-[color:var(--warning)]/20 text-[color:var(--warning)]'
                      : 'bg-[color:var(--danger)]/20 text-[color:var(--danger)]'
                  }`}
                >
                  {transaction.status.toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[color:var(--muted)]">Date</span>
                <span className="text-sm text-[color:var(--text)]">
                  {new Date(transaction.created_at * 1000).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/account/payments')}
              className="w-full bg-[color:var(--brand)] text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all duration-200 shadow-lg"
            >
              View All Transactions
            </button>

            <button
              onClick={() => navigate('/account')}
              className="w-full bg-[color:var(--panel-2)] text-[color:var(--text)] py-3 rounded-xl font-semibold hover:bg-[color:var(--panel-3)] transition-colors"
            >
              Back to Account
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 text-center text-white/80 text-sm">
          <p>This was a demo transaction using mock provider.</p>
        </div>
      </div>
    </div>
  );
}
