import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../../lib/auth';
import { createPaymentIntent } from '../../lib/api';

export default function WorldPassPayDemo() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setError('');

    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Convert to minor units (cents)
    const amount_minor = Math.round(amountNum * 100);

    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      // Get return URL (where user comes back after payment)
      const return_url = `${window.location.origin}/pay/return`;

      // Create payment intent
      const result = await createPaymentIntent(
        amount_minor,
        'USD',
        description || 'WorldPass Payment',
        return_url
      );

      // Redirect to checkout
      window.location.href = result.redirect_url;
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to create payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
            <span className="text-3xl">💳</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">WorldPass Pay</h1>
          <p className="text-white/80">Minimal Payment Integration Demo</p>
        </div>

        {/* Payment Form Card */}
        <div className="bg-[color:var(--panel)] rounded-2xl shadow-2xl p-6 sm:p-8">
          <form onSubmit={handleCreatePayment} className="space-y-6">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--muted)] text-lg">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] rounded-xl focus:ring-2 focus:ring-[color:var(--brand-2)] focus:border-transparent text-lg"
                  placeholder="0.00"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] rounded-xl focus:ring-2 focus:ring-[color:var(--brand-2)] focus:border-transparent"
                placeholder="What is this payment for?"
                maxLength={200}
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-[color:var(--danger)]/10 border border-[color:var(--danger)]/30 rounded-xl">
                <p className="text-sm text-[color:var(--danger)]">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full bg-[color:var(--brand)] text-white py-4 rounded-xl font-semibold text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                '🚀 Proceed to Payment'
              )}
            </button>

            {/* Info Text */}
            <div className="text-center text-sm text-[color:var(--muted)] pt-4">
              <p>This is a demo payment using a mock provider.</p>
              <p className="mt-1">No real transactions will be processed.</p>
            </div>
          </form>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/account')}
            className="text-white/80 hover:text-white text-sm font-medium transition-colors"
          >
            ← Back to Account
          </button>
        </div>
      </div>
    </div>
  );
}
