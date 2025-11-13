import { Link, NavLink, useNavigate } from "react-router-dom";
import { isAuthed, clearSession } from "../lib/auth";
import { useIdentity } from "../lib/identityContext";

function cx(...xs){ return xs.filter(Boolean).join(" "); }

function hasAccess(item, user, features = {}) {
  const roles = user?.roles || [];
  const roleOk = !item.roles?.length || item.roles.some(r => roles.includes(r));
  const flagOk = !item.flag || !!features[item.flag];
  return roleOk && flagOk;
}

/* Minimal ikon seti */
function Icon({ name, className="h-3.5 w-3.5" }){
  const common = { className, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:1.5 };
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
    default: return null;
  }
}

function HealthBadge({ health }) {
  const ok = !!health?.ok;
  return (
    <span
      className={cx(
        "text-[10px] font-mono px-2 py-0.5 rounded-md border inline-flex items-center gap-1 select-none",
        ok
          ? "border-emerald-400/40 text-emerald-400 bg-emerald-500/10"
          : "border-rose-400/40 text-rose-400 bg-rose-500/10"
      )}
      title={ok ? "Sunucu çalışıyor" : "Sunucu kapalı"}
    >
      <span className={cx("inline-block h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-400" : "bg-rose-400")} />
      {ok ? "çalışıyor" : "kapalı"}
    </span>
  );
}

export default function NavBar({ health, user, features }) {
  const authed = isAuthed();
  const { setIdentity } = useIdentity();
  const navg = useNavigate();

  const navItems = [
    { to: "/account",           label: "Hesabım",         icon: "account" },
    { to: "/issue",             label: "Sertifika Ver",   icon: "issue",   roles: ["issuer"] },
    { to: "/verify",            label: "Doğrula",         icon: "verify" },
    { to: "/verifier",          label: "Doğrulayıcı",     icon: "shield" }, // ARTIK HERKESE AÇIK (login olanlar için)
    { to: "/credentials",       label: "Sertifikalarım",  icon: "list" },
    { to: "/present",           label: "Göster",          icon: "present" },
    { to: "/settings",          label: "Ayarlar",         icon: "settings" },
    { to: "/issuer/register",   label: "Yayıncı Kaydı",   icon: "shield",  roles: ["issuer"] },
    { to: "/issuer/console",    label: "Yayıncı Konsolu", icon: "issue",   roles: ["issuer"] },
    { to: "/admin/issuers",     label: "Yönetim",         icon: "admin",   roles: ["admin"] },
  ];

  const leftMenu = authed
    ? navItems.filter(i => hasAccess(i, user, features))
    : [
        {to:"/login",    label:"Giriş",       icon:"login"},
        {to:"/register", label:"Kayıt",       icon:"register"},
        {to:"/verify",   label:"Doğrula",     icon:"verify"},
        {to:"/verifier", label:"Doğrulayıcı", icon:"shield"}, // LOGIN OLMAYANLAR İÇİN DE GÖRÜNÜR
      ];

  const logout = ()=>{
    clearSession();
    setIdentity(null);
    navg("/login");
  };

  return (
<header className="
  sticky top-0 z-40
  bg-[color:var(--panel)]/90 backdrop-blur
  border-b border-[color:var(--edge)]
  text-[color:var(--text)]
">
  <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-black text-white text-xs px-3 py-2 rounded-lg">
    İçeriğe atla
  </a>

  <div className="max-w-5xl mx-auto px-3 md:px-6 py-2.5 flex items-center justify-between">
    {/* Sol: logo + masaüstü nav */}
    <div className="flex items-center gap-3 md:gap-4">
      <Link to="/" className="flex items-center gap-2 font-semibold">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">W</span>
        <span className="tracking-tight">WorldPass</span>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-1.5" aria-label="Birincil">
        {leftMenu.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cx(
                "px-2.5 py-1.5 rounded-md text-[13px] transition relative inline-flex items-center gap-1.5",
                "text-[color:var(--text)]/80 hover:text-[color:var(--text)]",
                "hover:bg-[color:var(--panel-2)]/70",
                isActive && "bg-[color:var(--panel-2)] text-[color:var(--text)]"
              )
            }
          >
            {({ isActive }) => (
              <>
                {item.icon ? (
                  <Icon
                    name={item.icon}
                    className={cx(
                      "h-3.5 w-3.5",
                      isActive ? "opacity-100" : "opacity-60"
                    )}
                  />
                ) : null}
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="absolute left-2 right-2 -top-[6px] h-[2px] rounded-full bg-white/60" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>

    {/* Sağ: health + aksiyonlar */}
    <div className="flex items-center gap-2.5">
      <HealthBadge health={health} />

      {authed && (
        <button
          onClick={logout}
          className="px-2.5 py-1.5 text-[13px] rounded-md border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] inline-flex items-center gap-1.5"
          title="Oturumu kapat"
        >
          <Icon name="logout" />
          Çıkış
        </button>
      )}

      {/* Mobil menü */}
      <details className="md:hidden relative">
        <summary
          className="list-none px-2.5 py-1.5 rounded-md border border-[color:var(--border)] bg-[color:var(--panel)] hover:bg-[color:var(--panel-2)] cursor-pointer text-[13px]"
          aria-haspopup="menu"
          aria-label="Menü"
        >
          Menü
        </summary>
        <div
          className="absolute right-0 mt-2 w-56 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel)] shadow-xl p-1"
          role="menu"
          aria-label="Mobil"
        >
          {leftMenu.map(item => (
            <Link
              key={item.to}
              to={item.to}
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[color:var(--panel-2)] text-sm text-[color:var(--text)]"
            >
              {item.icon ? <Icon name={item.icon} className="h-3.5 w-3.5 opacity-70" /> : null}
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
          {authed && (
            <button
              onClick={logout}
              role="menuitem"
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[color:var(--panel-2)] text-sm text-[color:var(--text)]"
            >
              <Icon name="logout" className="h-3.5 w-3.5 opacity-70" />
              Çıkış
            </button>
          )}
        </div>
      </details>
    </div>
  </div>
</header>
  );
}
