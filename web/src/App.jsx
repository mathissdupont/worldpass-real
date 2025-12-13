import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiHealth } from "./lib/api";
import NavBar from "./components/NavBar";
import { t } from "./lib/i18n";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Account from "./pages/Account";
import Profile from "./pages/Profile";
// Legacy Issue page removed; using CredentialIssuerForm under issuer console
import CredentialIssuerForm from "./components/CredentialIssuerForm";
import Verify from "./pages/Verify";
import Credentials from "./pages/Credentials";
import Settings from "./pages/Settings";
import ReceiveInfo from "./pages/ReceiveInfo";
import AdminIssuers from "./pages/admin/Issuers";
import IssuerApproval from "./pages/admin/IssuerApproval";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminLogin from "./pages/admin/Login";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminSettings from "./pages/admin/Settings";
import AdminLogs from "./pages/admin/Logs";
import IssuerRegister from "./pages/issuer/Register";
import IssuerLogin from "./pages/issuer/Login";
// New Issuer Console (consolidated)
import IssuerDashboard from "./pages/issuer/console/Dashboard";
import IssuerCredentials from "./pages/issuer/console/Credentials";
import IssuerCredentialDetail from "./pages/issuer/console/CredentialDetail";
import IssuerTemplates from "./pages/issuer/console/Templates";
import IssuerSettings from "./pages/issuer/console/Settings";
import IssuerWebhooks from "./pages/issuer/console/APIWebhooks";
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
import { pageview } from "./lib/evt";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

export default function App() {
  const location = useLocation();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiHealth().then(setHealth).catch(() => setHealth({ ok: false }));
  }, []);

  // Send pageview on route changes (analytics gated by env)
  useEffect(() => {
    pageview(location.pathname + location.search, document.title);
  }, [location.pathname, location.search]);

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
        {/* Landing Page */}
        <Route path="/" element={<Landing />} />
        
        {/* Issuer Console - consolidated routes */}
        <Route
          path="/issuer/console"
          element={
            <IssuerLayout>
              <IssuerDashboard />
            </IssuerLayout>
          }
        />
        <Route
          path="/issuer/console/credentials"
          element={
            <IssuerLayout>
              <IssuerCredentials />
            </IssuerLayout>
          }
        />
        <Route
          path="/issuer/console/credentials/:id"
          element={
            <IssuerLayout>
              <IssuerCredentialDetail />
            </IssuerLayout>
          }
        />
        <Route
          path="/issuer/console/templates"
          element={
            <IssuerLayout>
              <IssuerTemplates />
            </IssuerLayout>
          }
        />
        <Route
          path="/issuer/console/webhooks"
          element={
            <IssuerLayout>
              <IssuerWebhooks />
            </IssuerLayout>
          }
        />
        <Route
          path="/issuer/console/settings"
          element={
            <IssuerLayout>
              <IssuerSettings />
            </IssuerLayout>
          }
        />
        <Route
          path="/issuer/console/issue"
          element={
            <IssuerLayout>
              <CredentialIssuerForm />
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
                  {/* Backward-compat redirects for legacy issuer paths */}
                  <Route path="/issuer/dashboard" element={<Navigate to="/issuer/console" replace />} />
                  <Route path="/issuer/credentials" element={<Navigate to="/issuer/console/credentials" replace />} />
                  <Route path="/issuer/templates" element={<Navigate to="/issuer/console/templates" replace />} />
                  <Route path="/issuer/webhooks" element={<Navigate to="/issuer/console/webhooks" replace />} />
                  <Route path="/issuer/settings" element={<Navigate to="/issuer/console/settings" replace />} />

                  {/* Public */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/verify" element={<Verify />} />
                  <Route path="/verifier" element={<Verifier />} />
                  <Route path="/admin/login" element={<AdminLogin />} />

                  {/* Admin Routes - Protected */}
                  <Route
                    path="/admin"
                    element={
                      <RoleRoute user={user} roles="admin">
                        <ProtectedRoute>
                          <AdminDashboard />
                        </ProtectedRoute>
                      </RoleRoute>
                    }
                  />
                  
                  <Route
                    path="/admin/dashboard"
                    element={
                      <RoleRoute user={user} roles="admin">
                        <ProtectedRoute>
                          <AdminDashboard />
                        </ProtectedRoute>
                      </RoleRoute>
                    }
                  />
                  
                  <Route
                    path="/admin/issuers"
                    element={
                      <RoleRoute user={user} roles="admin">
                        <ProtectedRoute>
                          <IssuerApproval />
                        </ProtectedRoute>
                      </RoleRoute>
                    }
                  />
                  
                  <Route
                    path="/admin/analytics"
                    element={
                      <RoleRoute user={user} roles="admin">
                        <ProtectedRoute>
                          <AdminAnalytics />
                        </ProtectedRoute>
                      </RoleRoute>
                    }
                  />
                  
                  <Route
                    path="/admin/settings"
                    element={
                      <RoleRoute user={user} roles="admin">
                        <ProtectedRoute>
                          <AdminSettings />
                        </ProtectedRoute>
                      </RoleRoute>
                    }
                  />
                  
                  <Route
                    path="/admin/logs"
                    element={
                      <RoleRoute user={user} roles="admin">
                        <ProtectedRoute>
                          <AdminLogs />
                        </ProtectedRoute>
                      </RoleRoute>
                    }
                  />

                  {/* Kuruluş kaydı public: sayfanın kendisi DID yoksa zaten uyarıyor */}
                  <Route path="/issuer/register" element={<IssuerRegister />} />
                  <Route path="/issuer/login" element={<IssuerLogin />} />

          {/* Protected (oturum + DID gerekli) */}
          <Route
            path="/account/*"
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
                  <CredentialIssuerForm />
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
            path="/share-info"
            element={
              <ProtectedRoute>
                <ReceiveInfo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receive-info"
            element={
              <ProtectedRoute>
                <ReceiveInfo />
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
                    path="/admin/issuer-approval"
                    element={
                      <RoleRoute user={user} roles="admin">
                        <ProtectedRoute>
                          <IssuerApproval />
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
