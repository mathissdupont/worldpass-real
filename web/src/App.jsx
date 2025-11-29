import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiHealth } from "./lib/api";
import NavBar from "./components/NavBar";
import { t } from "./lib/i18n";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Account from "./pages/Account";
import Profile from "./pages/Profile";
import Issue from "./pages/Issue";
import Verify from "./pages/Verify";
import Credentials from "./pages/Credentials";
import Settings from "./pages/Settings";
import AdminIssuers from "./pages/admin/Issuers";
import IssuerRegister from "./pages/issuer/Register";
import IssuerLogin from "./pages/issuer/Login";
import IssuerConsole from "./pages/issuer/Console";

import IssuerCredentials from "./pages/issuer/Credentials";
import IssuerTemplates from "./pages/issuer/console/Templates";
import IssuerSettings from "./pages/issuer/Settings";
import IssuerWebhooks from "./pages/issuer/Webhooks";
import IssuerLayout from "./components/IssuerLayout";
import Verifier from "./pages/Verifier";
import Present from "./pages/Present";
import WPTEditorPro from "@/pages/tools/WPTEditorPRO.jsx";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import WorldPassPayDemo from "./pages/pay/WorldPassPayDemo";
import PaymentResult from "./pages/pay/PaymentResult";
import TransactionsPage from "./pages/pay/TransactionsPage";

import { getSession } from "./lib/auth";
import { listOrgs } from "./lib/issuerStore.js";

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiHealth().then(setHealth).catch(() => setHealth({ ok: false }));
  }, []);

  // Kullanıcı rollerini org’lardan türet
  const user = useMemo(() => {
    const email = getSession()?.email;
    if (!email) return null;

    const roles = [];
    const orgs = listOrgs();

    // issuer rolü: org_admin veya issuer_operator olarak listelenmişse
    const isIssuer = orgs.some(o =>
      o?.operators?.some(
        op =>
          op.email === email &&
          (op.role === "org_admin" || op.role === "issuer_operator"),
      ),
    );
    if (isIssuer) roles.push("issuer");

    // admin rolü örneği
    const isAdmin = orgs.some(o =>
      o?.operators?.some(op => op.email === email && op.role === "admin"),
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
      <Routes>
        {/* Issuer Routes - Full page layout with their own navigation */}
        {/* Dashboard kaldırıldı, tüm işlevler Console.jsx'te */}
        <Route
          path="/issuer/credentials"
          element={
            <IssuerLayout>
              <IssuerCredentials />
            </IssuerLayout>
          }
        />
        <Route
          path="/issuer/templates"
          element={<IssuerTemplates />}
        />
        <Route
          path="/issuer/webhooks"
          element={
            <IssuerLayout>
              <IssuerWebhooks />
            </IssuerLayout>
          }
        />
        <Route
          path="/issuer/settings"
          element={
            <IssuerLayout>
              <IssuerSettings />
            </IssuerLayout>
          }
        />
        <Route
          path="/issuer/console"
          element={
            <IssuerLayout>
              <IssuerConsole />
            </IssuerLayout>
          }
        />

        {/* All other routes with NavBar */}
        <Route
          path="*"
          element={
            <>
              <NavBar health={health} user={user} />
              <div
                className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 transition-all duration-300"
                id="main"
              >
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
                <Account />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Payment Routes */}
          <Route
            path="/pay/demo"
            element={
              <ProtectedRoute>
                <WorldPassPayDemo />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pay/return"
            element={
              <ProtectedRoute>
                <PaymentResult />
              </ProtectedRoute>
            }
          />

          <Route
            path="/account/payments"
            element={
              <ProtectedRoute>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />

          {/* Sertifika verme: sadece issuer rolüne açık */}
          <Route
            path="/issue"
            element={
              <RoleRoute user={user} roles="issuer">
                <ProtectedRoute>
                  <Issue />
                </ProtectedRoute>
              </RoleRoute>
            }
          />

          <Route
            path="/credentials"
            element={
              <ProtectedRoute>
                <Credentials />
              </ProtectedRoute>
            }
          />
          <Route
            path="/present"
            element={
              <ProtectedRoute>
                <Present />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/wpt-editor-pro"
            element={
              <ProtectedRoute>
                <WPTEditorPro />
              </ProtectedRoute>
            }
          />

                  <Route
                    path="/admin/issuers"
                    element={
                      <RoleRoute user={user} roles="admin">
                        <ProtectedRoute>
                          <AdminIssuers />
                        </ProtectedRoute>
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="*"
                    element={<div className="p-4">{t("app.not_found")}</div>}
                  />
                </Routes>
              </div>
            </>
          }
        />
      </Routes>
    </div>
  );
}
