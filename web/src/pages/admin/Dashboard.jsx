import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiUsers, FiCheckCircle, FiClock, FiBarChart3 } from "react-icons/fi";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [issuers, setIssuers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIssuers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("wp_admin_token");
        if (!token) {
          navigate("/admin/login");
          return;
        }

        const response = await fetch("/api/admin/issuers", {
          headers: { "x-token": token }
        });

        if (!response.ok) {
          throw new Error("Failed to load issuers");
        }

        const data = await response.json();
        setIssuers(data);
        setStats({
          total: data.length,
          approved: data.filter(i => i.status === 'approved').length,
          pending: data.filter(i => i.status === 'pending').length,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadIssuers();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("wp_admin_token");
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FiLogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Issuers</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <FiUsers className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Approved</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.approved}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <FiCheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pending Approval</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{stats.pending}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <FiClock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => navigate("/admin/issuer-approval")}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <FiCheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Approve Issuers</h3>
                <p className="text-sm text-gray-600">Review and approve pending registrations</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/admin/issuers")}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 rounded-lg">
                <FiBarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Manage Issuers</h3>
                <p className="text-sm text-gray-600">View all issuers and their details</p>
              </div>
            </div>
          </button>
        </div>

        {/* Recent Issuers */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Issuers</h2>
          </div>

          {issuers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No issuers yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {issuers.slice(0, 5).map((issuer) => (
                <div key={issuer.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{issuer.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{issuer.email}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      issuer.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : issuer.status === 'pending'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-50 text-gray-700'
                    }`}>
                      {issuer.status.charAt(0).toUpperCase() + issuer.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
