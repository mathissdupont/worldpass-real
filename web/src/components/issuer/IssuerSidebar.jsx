import { Link, useLocation } from "react-router-dom";
import { 
  FiHome, 
  FiFileText, 
  FiLayers, 
  FiCode, 
  FiSettings 
} from "react-icons/fi";

export default function IssuerSidebar({ issuer }) {
  const location = useLocation();
  
  const navigation = [
    { name: 'Dashboard', href: '/issuer/console', icon: FiHome },
    { name: 'Credentials', href: '/issuer/credentials', icon: FiFileText },
    { name: 'Templates', href: '/issuer/templates', icon: FiLayers },
    { name: 'Webhooks', href: '/issuer/webhooks', icon: FiCode },
    { name: 'Settings', href: '/issuer/settings', icon: FiSettings },
  ];

  const isActive = (href) => {
    if (href === '/issuer/console') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 pt-16">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 truncate">{issuer.name}</h2>
        <p className="text-xs text-gray-500 mt-1">{issuer.email}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            issuer.status === 'approved' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : issuer.status === 'verified'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {issuer.status === 'approved' ? '✓ Approved' : issuer.status === 'verified' ? '✓ Verified' : '⏱ Pending'}
          </span>
          {issuer.meta?.domain_verified && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
              🌐 Domain OK
            </span>
          )}
        </div>
      </div>

      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${active 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                }
              `}
            >
              <item.icon className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
