import React from 'react';
import { QrCode, Shield } from 'lucide-react';

const IdentityCardMockup = () => {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Card Container with 3D perspective */}
      <div className="relative group" style={{ perspective: '1000px' }}>
        {/* Main Card */}
        <div 
          className="relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950 rounded-2xl p-6 shadow-2xl border border-zinc-800 transition-all duration-500 hover:shadow-indigo-500/20 hover:border-indigo-500/30"
          style={{ transform: 'rotateX(5deg) rotateY(-5deg)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="text-xs text-zinc-500">WorldPass</div>
                <div className="text-sm font-semibold text-white">Digital ID</div>
              </div>
            </div>
            <div className="w-12 h-12 rounded-lg bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
              <QrCode className="w-8 h-8 text-zinc-400" />
            </div>
          </div>

          {/* Photo & Info */}
          <div className="flex gap-4 mb-6">
            {/* Avatar */}
            <div className="w-20 h-24 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-700 flex items-center justify-center border border-zinc-600">
              <div className="text-4xl">👤</div>
            </div>

            {/* Personal Info */}
            <div className="flex-1 space-y-2">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Name</div>
                <div className="text-sm font-semibold text-white">Alex Morgan</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">ID Number</div>
                <div className="text-xs text-zinc-300 font-mono">WP-2024-001</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Valid Until</div>
                <div className="text-xs text-zinc-300">Dec 2027</div>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="flex gap-2 flex-wrap">
            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-300">
              Student ID
            </span>
            <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-300">
              Verified
            </span>
          </div>

          {/* Hologram Effect */}
          <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-xl" />
        </div>

        {/* Floating Badge */}
        <div 
          className="absolute -right-4 -top-4 bg-green-500/20 border border-green-500/40 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg"
          style={{ transform: 'rotateZ(5deg)' }}
        >
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-green-300">Verified</span>
          </div>
        </div>
      </div>

      {/* Glow Effect */}
      <div className="absolute inset-0 bg-indigo-500/10 blur-3xl -z-10 rounded-full" />
    </div>
  );
};

export default IdentityCardMockup;
