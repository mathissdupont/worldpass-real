import { useState } from "react";
import { useNavigate } from "react-router-dom";
import IssuerSidebar from "./IssuerSidebar";
import { FiLogOut } from "react-icons/fi";

export default function IssuerLayout({ children, issuer }) {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("issuer_token");
      localStorage.removeItem("issuer_info");
      navigate("/issuer/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50 h-16">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-4 ml-64">
            <h1 className="text-xl font-bold text-gray-900">WorldPass</h1>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded border border-blue-200">
              Issuer Console
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
            >
              <FiLogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <IssuerSidebar issuer={issuer} />

      {/* Main content */}
      <div className="ml-64 pt-16">
        <main className="p-8">
          {children}
        </main>
      </div>

      {/* Logout confirmation modal */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowLogout(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full m-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Logout</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to log out of the issuer console?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogout(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
