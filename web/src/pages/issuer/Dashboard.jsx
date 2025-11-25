// src/pages/issuer/Dashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getIssuerProfile, getIssuerStats } from "@/lib/api";

function StatCard({ title, value, subtitle, icon, trend, trendLabel, color = "blue" }) {
  const colorMap = {
    blue: "from-blue-500 to-cyan-500",
    green: "from-emerald-500 to-teal-500",
    amber: "from-amber-500 to-orange-500",
    purple: "from-purple-500 to-fuchsia-500",
    rose: "from-rose-500 to-pink-500",
  };

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm text-[color:var(--muted)] mb-1">{title}</div>
          <div className="text-3xl font-bold text-[color:var(--text)] mb-1">{value}</div>
          {subtitle && <div className="text-xs text-[color:var(--muted)]">{subtitle}</div>}
          {trend !== undefined && (
            <div className={`text-xs mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full ${
              trend >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}>
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% {trendLabel}
            </div>
          )}
        </div>
        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ title, description, icon, onClick, color = "blue" }) {
  const colorMap = {
    blue: "border-blue-400/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
    green: "border-emerald-400/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
    purple: "border-purple-400/30 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20",
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-4 p-4 rounded-xl border ${colorMap[color]} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left w-full`}
    >
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[color:var(--text)] mb-1">{title}</div>
        <div className="text-xs text-[color:var(--muted)]">{description}</div>
      </div>
      <svg className="h-5 w-5 text-[color:var(--muted)] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

function RecentActivity({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-[color:var(--muted)]">
        <svg className="h-12 w-12 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
          <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
          <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
          <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
        </svg>
        Henüz aktivite yok
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, idx) => (
        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[color:var(--panel-2)] transition-colors">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            activity.type === "issued" ? "bg-green-100 text-green-600" :
            activity.type === "revoked" ? "bg-rose-100 text-rose-600" :
            "bg-blue-100 text-blue-600"
          }`}>
            {activity.type === "issued" ? "✓" : activity.type === "revoked" ? "✕" : "i"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-[color:var(--text)] font-medium">{activity.title}</div>
            <div className="text-xs text-[color:var(--muted)] mt-0.5">{activity.description}</div>
            <div className="text-xs text-[color:var(--muted)] mt-1">{activity.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IssuerDashboard() {
  const navigate = useNavigate();
  const [issuer, setIssuer] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }

    Promise.all([
      getIssuerProfile(token),
      getIssuerStats(token)
    ])
      .then(([profileResp, statsResp]) => {
        setIssuer(profileResp.issuer);
        setStats(statsResp);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        localStorage.removeItem("issuer_token");
        navigate("/issuer/login");
      });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[color:var(--brand)] border-r-transparent"></div>
          <div className="mt-4 text-[color:var(--muted)]">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[color:var(--text)]">
            Hoş geldin, {issuer?.name || "Kuruluş"} 👋
          </h1>
          <p className="text-sm text-[color:var(--muted)] mt-1">
            Dijital kimlik bilgisi yönetim paneliniz
          </p>
        </div>
        <Link
          to="/issuer/console"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 transition-opacity font-medium shadow-lg"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Yeni Kimlik Bilgisi Oluştur
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Oluşturulan"
          value={stats?.total_issued || 0}
          subtitle="Tüm zamanlar"
          icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>}
          color="blue"
        />
        <StatCard
          title="Aktif Kimlik Bilgileri"
          value={stats?.active_count || 0}
          subtitle="Geçerli ve kullanımda"
          icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>}
          color="green"
        />
        <StatCard
          title="İptal Edilenler"
          value={stats?.revoked_count || 0}
          subtitle="Geçersiz kılınanlar"
          icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>}
          color="rose"
        />
        <StatCard
          title="Süresi Dolanlar"
          value={stats?.expired_count || 0}
          subtitle="Otomatik geçersizler"
          icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>}
          color="amber"
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[color:var(--text)] mb-4">Hızlı İşlemler</h3>
            <div className="space-y-3">
              <QuickAction
                title="Kimlik Bilgisi Oluştur"
                description="Yeni bir dijital kimlik belgesi oluştur"
                icon="📝"
                onClick={() => navigate("/issuer/console")}
                color="blue"
              />
              <QuickAction
                title="Şablonları Yönet"
                description="Kimlik şablonlarını düzenle"
                icon="📋"
                onClick={() => navigate("/issuer/templates")}
                color="purple"
              />
              <QuickAction
                title="Kimlik Geçmişi"
                description="Tüm oluşturulan kimlik bilgilerini gör"
                icon="📊"
                onClick={() => navigate("/issuer/credentials")}
                color="green"
              />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[color:var(--text)]">Son Aktiviteler</h3>
              <Link to="/issuer/credentials" className="text-sm text-[color:var(--brand)] hover:underline">
                Tümünü Gör →
              </Link>
            </div>
            <RecentActivity
              activities={[
                // TODO: Fetch from backend
                // {
                //   type: "issued",
                //   title: "Öğrenci Kartı Oluşturuldu",
                //   description: "Ahmet Yılmaz için öğrenci kartı düzenlendi",
                //   time: "5 dakika önce"
                // }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl shadow-lg">
              💡
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[color:var(--text)] mb-2">API Entegrasyonu</h3>
              <p className="text-sm text-[color:var(--muted)] mb-3">
                WorldPass API'yi kullanarak kimlik bilgisi oluşturma sürecinizi otomatikleştirin.
              </p>
              <Link to="/issuer/settings" className="text-sm text-[color:var(--brand)] hover:underline font-medium">
                API Ayarlarını Görüntüle →
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-2xl shadow-lg">
              🔒
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[color:var(--text)] mb-2">Güvenlik & Doğrulama</h3>
              <p className="text-sm text-[color:var(--muted)] mb-3">
                Tüm kimlik bilgileri kriptografik olarak imzalanır ve blockchain'de doğrulanabilir.
              </p>
              <a href="#" className="text-sm text-[color:var(--brand)] hover:underline font-medium">
                Güvenlik Hakkında →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
