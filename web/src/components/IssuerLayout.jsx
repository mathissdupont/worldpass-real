// src/components/IssuerLayout.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getIssuerProfile } from "@/lib/api";

function NavItem({ to, icon, label, badge }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-[color:var(--brand)] text-white shadow-md"
          : "text-[color:var(--text)] hover:bg-[color:var(--panel-2)]"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          isActive ? "bg-white/20 text-white" : "bg-[color:var(--panel-2)] text-[color:var(--muted)]"
        }`}>
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function IssuerLayout({ children }) {
  const navigate = useNavigate();
  const [issuer, setIssuer] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }

    getIssuerProfile()
      .then((resp) => {
        setIssuer(resp.issuer);
      })
      .catch((err) => {
        console.error(err);
        localStorage.removeItem("issuer_token");
        navigate("/issuer/login");
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("issuer_token");
    localStorage.removeItem("issuer_info");
    navigate("/issuer/login");
  };

  if (!issuer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[color:var(--brand)] border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-[color:var(--panel)] border-b border-[color:var(--border)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/worldpass_logo.svg" alt="WorldPass" className="h-8 w-8 dark:invert" />
            <div>
              <div className="font-semibold text-[color:var(--text)]">{issuer.name}</div>
              <div className="text-xs text-[color:var(--muted)]">Issuer Console</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-[color:var(--panel-2)]"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 12h18M3 6h18M3 18h18" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[color:var(--panel)] border-r border-[color:var(--border)] flex flex-col transition-transform duration-300 z-40 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}>
          {/* Logo & Org Name */}
          <div className="hidden lg:flex items-center gap-3 px-6 py-6 border-b border-[color:var(--border)]">
            <img src="/worldpass_logo.svg" alt="WorldPass" className="h-10 w-10 dark:invert" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[color:var(--text)] truncate">{issuer.name}</div>
              <div className="text-xs text-[color:var(--muted)]">Issuer Console</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavItem to="/issuer/dashboard" icon="📊" label="Dashboard" />
            <NavItem to="/issuer/console" icon="✨" label="Kimlik Oluştur" />
            <NavItem to="/issuer/credentials" icon="📋" label="Kimlik Geçmişi" />
            <NavItem to="/issuer/templates" icon="📄" label="Şablonlar" />
            <NavItem to="/issuer/webhooks" icon="⚡" label="Webhooks" />
            <NavItem to="/issuer/settings" icon="⚙️" label="Ayarlar" />
          </nav>

          {/* User Footer */}
          <div className="p-4 border-t border-[color:var(--border)]">
            <div className="p-3 rounded-xl bg-[color:var(--panel-2)] mb-2">
              <div className="text-xs text-[color:var(--muted)] mb-0.5">Giriş Yapıldı</div>
              <div className="text-sm font-medium text-[color:var(--text)] truncate">{issuer.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[color:var(--border)] hover:bg-[color:var(--panel-2)] text-sm text-[color:var(--text)]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Çıkış Yap
            </button>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
