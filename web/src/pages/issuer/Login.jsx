import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginIssuer } from "../../lib/api";
import { t } from "../../lib/i18n";

function Input({ value, onChange, type = "text", placeholder, error, ...rest }) {
  return (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      className={[
        "w-full px-3 py-2 rounded-xl",
        "bg-white border outline-none focus:ring-2 focus:ring-indigo-500",
        error ? "border-rose-300" : "border-black/10",
      ].join(" ")}
      {...rest}
    />
  );
}

function Label({ children }) {
  return <div className="text-sm text-gray-700 mb-1">{children}</div>;
}

export default function IssuerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const resp = await loginIssuer({ email, password });
      // Store token and issuer info
      localStorage.setItem("issuer_token", resp.token);
      localStorage.setItem("issuer_info", JSON.stringify(resp.issuer));
      
      // Redirect to console
      navigate("/issuer/console");
    } catch (err) {
      setError(err.message || "Giriş başarısız");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white rounded-2xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Kuruluş Girişi</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label>E-posta Adresi</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kurulus.com"
              required
            />
          </div>
          
          <div>
            <Label>Şifre</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-black text-white font-medium hover:opacity-90 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {busy && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="9" opacity=".25" />
                <path d="M21 12a9 9 0 0 1-9 9" />
              </svg>
            )}
            Giriş Yap
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Hesabınız yok mu?{" "}
          <Link to="/issuer/register" className="text-indigo-600 hover:underline font-medium">
            Kayıt Ol
          </Link>
        </div>
      </div>
    </div>
  );
}
