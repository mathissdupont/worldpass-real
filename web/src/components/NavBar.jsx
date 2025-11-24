import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { isAuthed, clearSession } from "../lib/auth";
import { useIdentity } from "../lib/identityContext";
import { t } from "../lib/i18n";

function cx(...xs){ return xs.filter(Boolean).join(" "); }

function hasAccess(item, user, features = {}) {
  const roles = user?.roles || [];
  const roleOk = !item.roles?.length || item.roles.some(r => roles.includes(r));
  const flagOk = !item.flag || !!features[item.flag];
  return roleOk && flagOk;
}

/* Enhanced icon set with better accessibility */
function Icon({ name, className="h-4 w-4", label }){
  const common = { 
    className, 
    viewBox:"0 0 24 24", 
    fill:"none", 
    stroke:"currentColor", 
    strokeWidth:2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: "img",
    "aria-label": label || name
  };
  
  switch(name){
    case "account": return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 20c2.2-3.6 13.8-3.6 16 0"/></svg>;
    case "issue":   return <svg {...common}><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><rect x="4" y="17" width="16" height="4" rx="1"/></svg>;
    case "verify":  return <svg {...common}><path d="M20 6l-11 11-5-5"/></svg>;
    case "list":    return <svg {...common}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
    case "present": return <svg {...common}><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 8h10M7 12h6"/></svg>;
    case "settings":return <svg {...common}><path d="M12 15a3 3 0 1 0 0-6"/><path d="M19 15.5a2 2 0 0 0 .4 2.2l.05.05a1.7 1.7 0 1 1-2.4 2.4l-.05-.05A2 2 0 0 0 15.5 20H15a2 2 0 1 1-4 0h-.5a2 2 0 0 0-1.5.7l-.05.05a1.7 1.7 0 1 1-2.4-2.4l.05-.05A2 2 0 0 0 5 15.5V15a2 2 0 1 1 0-4v-.5a2 2 0 0 0-.7-1.5l-.05-.05a1.7 1.7 0 1 1 2.4-2.4l.05.05A2 2 0 0 0 10 5h.5a2 2 0 1 1 4 0H15a2 2 0 0 0 1.5-.7l.05-.05a1.7 1.7 0 1 1 2.4 2.4l-.05.05A2 2 0 0 0 19 10.5V11a2 2 0 1 1 0 4"/></svg>;
    case "shield":  return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "admin":   return <svg {...common}><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 8h4M7 12h10"/></svg>;
    case "login":   return <svg {...common}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>;
    case "register":return <svg {...common}><path d="M12 12c2.8 0 5-2.2 5-5S14.8 2 12 2 7 4.2 7 7s2.2 5 5 5Z"/><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><path d="M12 12v4"/></svg>;
    case "logout":  return <svg {...common}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/></svg>;
    case "menu":    return <svg {...common}><path d="M3 12h18M3 6h18M3 18h18"/></svg>;
    case "close":   return <svg {...common}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    default: return null;
  }
}

/* Health badge with better accessibility */
function HealthBadge({ health }) {
  const ok = !!health?.ok;
  const statusText = ok ? t('server_up') : t('server_down');
  const displayText = ok ? t('working') : t('down');
  
  return (
    <span
      className={cx(
        "text-[10px] font-mono px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 select-none transition-colors duration-200",
        ok
          ? "border-emerald-400/40 text-emerald-400 bg-emerald-500/10"
          : "border-rose-400/40 text-rose-400 bg-rose-500/10"
      )}
      role="status"
      aria-label={statusText}
      title={statusText}
    >
      <span 
        className={cx(
          "inline-block h-1.5 w-1.5 rounded-full animate-pulse", 
          ok ? "bg-emerald-400" : "bg-rose-400"
        )} 
        aria-hidden="true"
      />
      <span className="hidden sm:inline">{displayText}</span>
    </span>
  );
}

export default function NavBar({ health, user, features }) {
  const authed = isAuthed();
  const { setIdentity } = useIdentity();
  const navg = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: "/account",           label: t('my_account'),         icon: "account" },
    { to: "/verify",            label: t('verify_credential'),  icon: "verify" },
    { to: "/credentials",       label: t('my_credentials'),     icon: "list" },
    { to: "/present",           label: t('present_credential'), icon: "present" },
    { to: "/settings",          label: t('settings'),           icon: "settings" },
    { to: "/issuer/register",   label: t('issuer_register'),    icon: "shield",  roles: ["issuer"] },
    { to: "/issuer/console",    label: t('issuer_console'),     icon: "issue",   roles: ["issuer"] },
    { to: "/admin/issuers",     label: t('admin'),              icon: "admin",   roles: ["admin"] },
  ];

  const leftMenu = authed
    ? navItems.filter(i => hasAccess(i, user, features))
    : [
        {to:"/login",    label:t('user_login'),       icon:"login"},
        {to:"/register", label:t('user_register'),    icon:"register"},
        {to:"/issuer/login", label:t('issuer_login') || "Kurum Girişi", icon:"shield"},
        {to:"/verify",   label:t('verify_credential'), icon:"verify"},
      ];

  const logout = ()=>{
    clearSession();
    setIdentity(null);
    setMobileMenuOpen(false);
    navg("/login");
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
<header 
  className="sticky top-0 z-50 bg-[color:var(--panel)]/95 backdrop-blur-md border-b border-[color:var(--border)] text-[color:var(--text)] transition-all duration-300 shadow-sm"
  role="banner"
>
  {/* Skip to main content link for accessibility */}
  <a 
    href="#main" 
    className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 bg-[color:var(--brand)] text-white text-sm px-4 py-2 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] focus:ring-offset-2"
  >
    İçeriğe atla
  </a>

  <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-3.5">
    <div className="flex items-center justify-between gap-4">
      {/* Logo and Desktop Navigation */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-2.5 font-semibold text-lg hover:opacity-90 transition-all duration-200 group"
          aria-label="WorldPass Home"
        >
          <img src="/worldpass_logo.svg" alt="WorldPass Logo" className="h-8 w-8 object-contain" />
          <span className="tracking-tight hidden sm:inline">WorldPass</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary navigation">
          {leftMenu.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx(
                  "relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  "inline-flex items-center gap-2",
                  "focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] focus:ring-offset-2",
                  isActive 
                    ? "bg-[color:var(--panel-2)] text-[color:var(--text)] shadow-sm" 
                    : "text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--panel-2)]/50"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    name={item.icon}
                    className={cx(
                      "h-4 w-4 transition-all duration-200",
                      isActive ? "opacity-100 scale-110" : "opacity-70"
                    )}
                    label={item.label}
                  />
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <span 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[color:var(--brand-2)]" 
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Right Side: Health Badge + Actions */}
      <div className="flex items-center gap-3">
        <HealthBadge health={health} />

        {/* Desktop Logout Button */}
        {authed && (
          <button
            onClick={logout}
            className="hidden lg:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] hover:border-[color:var(--brand-2)] text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] focus:ring-offset-2"
            title={t('logout')}
          >
            <Icon name="logout" className="h-4 w-4" label={t('logout')} />
            <span className="hidden xl:inline">{t('logout')}</span>
          </button>
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] focus:ring-offset-2"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-controls="mobile-menu"
        >
          <Icon 
            name={mobileMenuOpen ? "close" : "menu"} 
            className="h-5 w-5" 
            label={mobileMenuOpen ? "Close" : "Menu"}
          />
        </button>
      </div>
    </div>

    {/* Mobile Menu */}
    {mobileMenuOpen && (
      <nav
        id="mobile-menu"
        className="lg:hidden mt-4 pb-4 border-t border-[color:var(--border)] pt-4 animate-in slide-in-from-top-4 fade-in duration-200"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="space-y-1">
          {leftMenu.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                cx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] focus:ring-inset",
                  isActive
                    ? "bg-[color:var(--panel-2)] text-[color:var(--text)] shadow-sm"
                    : "text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--panel-2)]/50"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    name={item.icon}
                    className={cx(
                      "h-5 w-5 transition-opacity",
                      isActive ? "opacity-100" : "opacity-70"
                    )}
                    label={item.label}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-[color:var(--brand-2)]" aria-hidden="true" />
                  )}
                </>
              )}
            </NavLink>
          ))}
          
          {/* Mobile Logout */}
          {authed && (
            <>
              <div className="my-3 border-t border-[color:var(--border)]" role="separator" />
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-[color:var(--panel-2)]/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-2)] focus:ring-inset"
              >
                <Icon name="logout" className="h-5 w-5 opacity-70" label={t('logout')} />
                <span className="flex-1 text-left">{t('logout')}</span>
              </button>
            </>
          )}
        </div>
      </nav>
    )}
  </div>
</header>
  );
}
