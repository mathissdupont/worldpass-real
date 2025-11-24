import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiHealth } from "./lib/api";
import NavBar from "./components/NavBar";
import { t } from "./lib/i18n";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import Issue from "./pages/Issue";
import Verify from "./pages/Verify";
import Credentials from "./pages/Credentials";
import Settings from "./pages/Settings";
import AdminIssuers from "./pages/admin/Issuers";
import IssuerRegister from "./pages/issuer/Register";
import IssuerLogin from "./pages/issuer/Login";
import IssuerConsole from "./pages/issuer/Console";
import IssuerDashboard from "./pages/issuer/console/Dashboard";
import Verifier from "./pages/Verifier";
import Present from "./pages/Present";
import WPTEditorPro from "@/pages/tools/WPTEditorPRO.jsx";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

import { getSession } from "./lib/auth";
import { listOrgs } from "./lib/issuerStore.js";

export default function App(){
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    apiHealth().then(setHealth).catch(()=>setHealth({ok:false}))
  },[]);

  // Kullanıcı rollerini org’lardan türet
  const user = useMemo(()=>{
    const email = getSession()?.email;
    if (!email) return null;

    const roles = [];
    const orgs = listOrgs();

    // issuer rolü: org_admin veya issuer_operator olarak listelenmişse
    const isIssuer = orgs.some(o =>
      o?.operators?.some(op => op.email === email && (op.role === "org_admin" || op.role === "issuer_operator"))
    );
    if (isIssuer) roles.push("issuer");

    // admin rolü örneği
    const isAdmin = orgs.some(o =>
      o?.operators?.some(op => op.email === email && op.role === "admin")
    );
    if (isAdmin) roles.push("admin");

    return { email, roles };
  }, []);

  // Simulate initial loading for global transitions
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--brand)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] transition-all duration-300">
      <NavBar health={health} user={user} />
      <div className="max-w-5xl mx-auto p-6 transition-all duration-300" id="main">
        <Routes>
          <Route path="/" element={<Navigate to="/account" replace />} />

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verifier" element={<Verifier />} />
          {/* Kuruluş kaydı public: sayfanın kendisi DID yoksa zaten uyarıyor */}
          <Route path="/issuer/register" element={<IssuerRegister />} />
          <Route path="/issuer/login" element={<IssuerLogin />} />

          {/* Protected (oturum + DID gerekli) */}
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account/>
              </ProtectedRoute>
            }
          />

          {/* Sertifika verme: sadece issuer rolüne açık */}
          <Route
            path="/issue"
            element={
              <RoleRoute user={user} roles="issuer">
                <ProtectedRoute>
                  <Issue/>
                </ProtectedRoute>
              </RoleRoute>
            }
          />

          <Route
            path="/credentials"
            element={
              <ProtectedRoute>
                <Credentials/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/present"
            element={
              <ProtectedRoute>
                <Present/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings/>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/wpt-editor-pro"
            element={
              <ProtectedRoute>
                <WPTEditorPro/>
              </ProtectedRoute>
            }
          />

          {/* Role-protected */}
          <Route path="/issuer/console" element={<IssuerDashboard />} />
          <Route path="/issuer/console-legacy" element={<IssuerConsole />} />
          <Route
            path="/admin/issuers"
            element={
              <RoleRoute user={user} roles="admin">
                <ProtectedRoute>
                  <AdminIssuers/>
                </ProtectedRoute>
              </RoleRoute>
            }
          />

          <Route path="*" element={<div className="p-4">{t("app.not_found")}</div>} />
        </Routes>
      </div>
    </div>
  );
}
