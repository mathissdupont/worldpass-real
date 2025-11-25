// src/pages/issuer/Credentials.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { listIssuerCredentials, revokeCredential } from "@/lib/api";

function Badge({ children, variant = "default" }) {
  const variants = {
    valid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    revoked: "bg-rose-50 text-rose-700 border-rose-200",
    expired: "bg-amber-50 text-amber-700 border-amber-200",
    default: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant] || variants.default}`}>
      {children}
    </span>
  );
}

function CredentialRow({ credential, onRevoke }) {
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <tr className="border-b border-[color:var(--border)] hover:bg-[color:var(--panel-2)] transition-colors">
      <td className="px-4 py-3">
        <div className="font-mono text-sm text-[color:var(--text)]">
          {credential.vc_id.length > 20
            ? `${credential.vc_id.substring(0, 20)}...`
            : credential.vc_id}
        </div>
        <div className="text-xs text-[color:var(--muted)] mt-0.5">{credential.credential_type}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-[color:var(--text)] truncate max-w-[200px]">
          {credential.subject_did}
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={credential.status}>{credential.status}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-[color:var(--muted)]">
        {formatDate(credential.created_at)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            to={`/issuer/credentials/${credential.vc_id}`}
            className="text-sm text-[color:var(--brand)] hover:underline"
          >
            Detay
          </Link>
          {credential.status === "valid" && (
            <button
              onClick={() => onRevoke(credential.vc_id)}
              className="text-sm text-rose-600 hover:underline"
            >
              İptal Et
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function IssuerCredentials() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, valid, revoked
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  const loadCredentials = async () => {
    const token = localStorage.getItem("issuer_token");
    if (!token) {
      navigate("/issuer/login");
      return;
    }

    try {
      setLoading(true);
      const params = {
        page,
        per_page: perPage,
        status: filter === "all" ? undefined : filter,
        search: search || undefined,
      };

      const response = await listIssuerCredentials(token, params);
      setCredentials(response.credentials);
      setTotal(response.total);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadCredentials();
  };

  const handleRevoke = async (vcId) => {
    if (!confirm("Bu kimlik bilgisini iptal etmek istediğinize emin misiniz?")) return;

    const token = localStorage.getItem("issuer_token");
    try {
      await revokeCredential(null, vcId, token);
      alert("Kimlik bilgisi iptal edildi.");
      loadCredentials();
    } catch (err) {
      alert("Hata: " + err.message);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[color:var(--text)]">
            Kimlik Bilgileri
          </h1>
          <p className="text-sm text-[color:var(--muted)] mt-1">
            Oluşturduğunuz tüm dijital kimlik bilgilerini yönetin
          </p>
        </div>
        <Link
          to="/issuer/console"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90 transition-opacity font-medium"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Yeni Oluştur
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kimlik kodu veya konu DID'si ile ara..."
                className="flex-1 px-4 py-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--brand-2)]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[color:var(--brand)] text-white hover:opacity-90"
              >
                Ara
              </button>
            </form>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === "all"
                  ? "bg-[color:var(--brand)] text-white"
                  : "border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--panel-2)]"
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setFilter("valid")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === "valid"
                  ? "bg-emerald-600 text-white"
                  : "border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--panel-2)]"
              }`}
            >
              Geçerli
            </button>
            <button
              onClick={() => setFilter("revoked")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === "revoked"
                  ? "bg-rose-600 text-white"
                  : "border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[color:var(--panel-2)]"
              }`}
            >
              İptal Edilmiş
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--brand)] border-r-transparent"></div>
          </div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-12 text-[color:var(--muted)]">
            <svg className="h-12 w-12 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeWidth="2"/>
            </svg>
            Henüz kimlik bilgisi oluşturmadınız
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[color:var(--panel-2)] border-b border-[color:var(--border)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--muted)] uppercase tracking-wider">
                      Kimlik Kodu
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--muted)] uppercase tracking-wider">
                      Konu DID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--muted)] uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--muted)] uppercase tracking-wider">
                      Oluşturulma
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[color:var(--muted)] uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((cred) => (
                    <CredentialRow
                      key={cred.id}
                      credential={cred}
                      onRevoke={handleRevoke}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[color:var(--border)] flex items-center justify-between">
                <div className="text-sm text-[color:var(--muted)]">
                  Toplam {total} kayıt, Sayfa {page} / {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-[color:var(--border)] text-sm disabled:opacity-50 hover:bg-[color:var(--panel-2)]"
                  >
                    Önceki
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-[color:var(--border)] text-sm disabled:opacity-50 hover:bg-[color:var(--panel-2)]"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
