// src/pages/Login.jsx - DID-based authentication
import { useState, useEffect } from "react";
import { authenticateWithDID, setSession, isAuthed } from "../lib/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { t } from "../lib/i18n";
import { useIdentity } from "../lib/identityContext";
import IdentityLoad from "../components/IdentityLoad";
import IdentityCreate from "../components/IdentityCreate";
import { Shield, Key, ArrowRight } from "lucide-react";
import { ed25519Sign, b64uToBytes } from "../lib/crypto";

export default function LoginDID() {
  const nav = useNavigate();
  const loc = useLocation();
  const { identity, setIdentity } = useIdentity();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [didMode, setDidMode] = useState("load"); // 'load' | 'create'

  const authed = isAuthed();
  const back = loc.state?.from?.pathname || "/account";

  useEffect(() => {
    if (authed && identity?.did) {
      nav(back, { replace: true });
    }
  }, [authed, identity?.did, back, nav]);

  const handleAuthenticate = async () => {
    if (!identity?.did) {
      setError("Please load or create your digital identity first");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await authenticateWithDID({
        did: identity.did,
        signChallenge: async (challenge) => {
          // Sign challenge with identity's private key
          if (!identity.sk_b64u) {
            throw new Error("Private key not available");
          }
          
          // Decode private key from base64url
          const skBytes = b64uToBytes(identity.sk_b64u);
          
          // Sign the challenge message
          const messageBytes = new TextEncoder().encode(challenge);
          const signature = ed25519Sign(skBytes, messageBytes);
          
          // Convert signature to base64url
          const base64url = btoa(String.fromCharCode(...signature))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
          
          return base64url;
        },
        displayName: displayName || identity.displayName || identity.did.slice(0, 20) + "..."
      });

      setSession({
        did: identity.did,
        displayName: displayName || identity.displayName,
        token: result.token
      });

      nav(back, { replace: true });
    } catch (e) {
      console.error("Authentication failed:", e);
      setError(e.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onLoadedIdent = (ident) => {
    setIdentity(ident);
    setDisplayName(ident.displayName || "");
  };

  /* ------------------ DID not loaded → Identity panel ------------------ */
  if (!identity?.did) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[color:var(--bg)]">
        <div className="max-w-3xl w-full space-y-4">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-8 shadow-xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[color:var(--brand)]/10 border border-[color:var(--brand)]/20 mb-4">
                <Shield className="w-8 h-8 text-[color:var(--brand)]" />
              </div>
              <h2 className="text-2xl font-bold text-[color:var(--text)] mb-2">
                {t('sign_in')}
              </h2>
              <p className="text-sm text-[color:var(--muted)]">
                Load or create your digital identity to continue
              </p>
            </div>

            {/* Mode Tabs */}
            <div className="inline-flex rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] overflow-hidden mb-6 w-full">
              {["load", "create"].map(mode => (
                <button
                  key={mode}
                  onClick={() => setDidMode(mode)}
                  className={[
                    "flex-1 px-5 py-3 text-sm font-medium transition",
                    didMode === mode
                      ? "bg-[color:var(--brand)] text-white"
                      : "hover:bg-[color:var(--panel)] text-[color:var(--text)]"
                  ].join(" ")}
                >
                  {mode === "load" ? t('load_keystore') : t('create_did')}
                </button>
              ))}
            </div>

            {/* Content */}
            <div>
              {didMode === "load" ? (
                <>
                  <p className="text-sm text-[color:var(--muted)] mb-4">
                    {t('load_keystore_paragraph')}
                  </p>
                  <IdentityLoad onLoaded={onLoadedIdent} />
                </>
              ) : (
                <>
                  <p className="text-sm text-[color:var(--muted)] mb-4">
                    {t('create_did_paragraph')}
                  </p>
                  <IdentityCreate onCreated={onLoadedIdent} />
                  <p className="mt-3 text-xs text-[color:var(--muted)]">
                    {t('after_create_hint')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------ DID loaded → Authentication ------------------ */
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[color:var(--bg)]">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 mb-4">
              <Key className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-[color:var(--text)] mb-2">
              Identity Loaded
            </h2>
            <p className="text-sm text-[color:var(--muted)] mb-4">
              Sign in with your digital identity
            </p>
            
            {/* DID Display */}
            <div className="p-3 rounded-lg bg-[color:var(--panel-2)] border border-[color:var(--border)]">
              <div className="text-xs text-[color:var(--muted)] mb-1">Your DID</div>
              <div className="text-xs font-mono text-[color:var(--text)] break-all">
                {identity.did}
              </div>
            </div>
          </div>

          {/* Display Name (optional) */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[color:var(--text)] mb-2">
                Display Name (optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--text)] placeholder-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={handleAuthenticate}
            disabled={loading}
            className="w-full px-6 py-3 rounded-lg bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)] text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In with DID</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-[color:var(--muted)]">
              Your private key never leaves your device. Authentication is done via cryptographic signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
