import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TransactionsTab from './TransactionsTab';
import NewPaymentTab from './NewPaymentTab';

export default function Payments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'new'

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
          
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[color:var(--text)]">Payments</h1>
            <p className="text-[color:var(--muted)] mt-1">Manage your transactions and payments</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[color:var(--panel)] rounded-xl shadow-sm border border-[color:var(--border)] mb-6">
          <div className="flex border-b border-[color:var(--border)]">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-semibold text-sm sm:text-base transition-colors ${
                activeTab === 'history'
                  ? 'text-[color:var(--brand)] border-b-2 border-[color:var(--brand)]'
                  : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'
              }`}
            >
              💳 Transaction History
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-semibold text-sm sm:text-base transition-colors ${
                activeTab === 'new'
                  ? 'text-[color:var(--brand)] border-b-2 border-[color:var(--brand)]'
                  : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'
              }`}
            >
              🚀 New Payment
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {activeTab === 'history' && <TransactionsTab />}
            {activeTab === 'new' && <NewPaymentTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
