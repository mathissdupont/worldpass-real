/* eslint-disable react-refresh/only-export-components */


import { createContext, useState, useEffect, useRef } from "react";
import { ensurePrivateKeyFields } from "./identityPatch";
import { linkUserDid } from "./api";
import { TOKEN_CHANGED_EVENT } from "./auth";

/**
 * identity = { did, pk_b64u, seed_b64u, sk_b64u? }  // localStorage
 * displayName = kullanıcı görünen adı
 */
export const IdentityCtx = createContext(null);

function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key, val) { try { localStorage.setItem(key, val); } catch { /* ignore */ } }
function safeRemove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }

// LocalStorage'a yazarken gereksiz/tehlikeli alanları daralt
function sanitizeForStorage(identityPatched) {
  if (!identityPatched) return null;
  const { did, pk_b64u, seed_b64u } = identityPatched;

  const out = { did, pk_b64u };
  if (typeof seed_b64u === "string" && seed_b64u.length > 0) out.seed_b64u = seed_b64u;

  // NOT: sk_b64u'yu localStorage'a özellikle yazmıyoruz.
  return out;
}

export function IdentityProvider({ children }) {
  const [identity, setIdentity] = useState(null);
  const [displayName, setDisplayName] = useState("");

  const [hasAuthToken, setHasAuthToken] = useState(() => {
    try {
      return !!localStorage.getItem("wp_token");
    } catch {
      return false;
    }
  });

  const lastSyncedDid = useRef(null);

  // localStorage'dan yükle + seed migrasyonu/patch
  useEffect(() => {
    const storedIdentity = safeGet("worldpass_identity");
    if (storedIdentity) {
      try {
        let parsed = JSON.parse(storedIdentity);

        // Eski format migrasyonu: sk_b64u (32 byte seed ise) -> seed_b64u
        // Eğer seed_b64u yoksa ve sk_b64u varsa, migrate et (64 byte secretKey -> ilk 32 byte seed)
        if (!parsed.seed_b64u && parsed.sk_b64u && typeof parsed.sk_b64u === "string") {
          try {
            // base64url -> bytes
            const s = parsed.sk_b64u.replace(/-/g, "+").replace(/_/g, "/") + "==";
            const bin = atob(s);
            const skBytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) skBytes[i] = bin.charCodeAt(i);

            if (skBytes.length === 64) {
              const seed = skBytes.slice(0, 32);
              // tekrar base64url yap
              let ss = "";
              for (let i = 0; i < seed.length; i++) ss += String.fromCharCode(seed[i]);
              parsed.seed_b64u = btoa(ss).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
            }
          } catch { /* empty */ }
        }


        // sk_b64u gerekiyorsa seed'den türet (runtime'da)
        setIdentity(ensurePrivateKeyFields(parsed));
      } catch (e) {
        console.error("Failed to parse stored identity:", e);
      }
    }

    const storedDisplayName = safeGet("worldpass_displayName");
    if (storedDisplayName) setDisplayName(storedDisplayName);
  }, []);

  // token değişimini dinle
  useEffect(() => {
    const handler = (event) => {
      setHasAuthToken(Boolean(event?.detail));
      if (!event?.detail) lastSyncedDid.current = null;
    };
    window.addEventListener(TOKEN_CHANGED_EVENT, handler);
    return () => window.removeEventListener(TOKEN_CHANGED_EVENT, handler);
  }, []);

  // DID sync (token varsa bir kere)
  useEffect(() => {
    if (!identity?.did || !hasAuthToken) return;
    if (lastSyncedDid.current === identity.did) return;

    let aborted = false;
    (async () => {
      try {
        await linkUserDid(identity.did);
        if (!aborted) lastSyncedDid.current = identity.did;
      } catch (err) {
        console.warn("Failed to sync DID", err);
      }
    })();

    return () => { aborted = true; };
  }, [identity?.did, hasAuthToken]);

  // identity değişince localStorage'a kaydet
  const setIdentityPersistent = (newIdentity) => {
    const patched = ensurePrivateKeyFields(newIdentity);
    setIdentity(patched);

    if (patched) {
      safeSet("worldpass_identity", JSON.stringify(sanitizeForStorage(patched)));
    } else {
      safeRemove("worldpass_identity");
      lastSyncedDid.current = null;
    }
  };

  // displayName değişince localStorage'a kaydet
  const setDisplayNamePersistent = (newDisplayName) => {
    setDisplayName(newDisplayName);
    safeSet("worldpass_displayName", newDisplayName);
  };

  return (
    <IdentityCtx.Provider value={{
      identity,
      setIdentity: setIdentityPersistent,
      displayName,
      setDisplayName: setDisplayNamePersistent
    }}>
      {children}
    </IdentityCtx.Provider>
  );
}
