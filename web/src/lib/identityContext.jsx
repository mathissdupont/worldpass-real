import { createContext, useContext, useState, useEffect, useRef } from "react";
import { linkUserDid } from "./api";
import { TOKEN_CHANGED_EVENT } from "./auth";

/**
 * identity = { did, sk_b64u, pk_b64u }  // localStorage'da tutulur
 * displayName = kullanıcı görünen adı (opsiyonel, ayrı saklanır)
 */
const IdentityCtx = createContext(null);

export function IdentityProvider({children}){
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

  // localStorage'dan yükle
  useEffect(() => {
    const storedIdentity = localStorage.getItem("worldpass_identity");
    if (storedIdentity) {
      try {
        const parsed = JSON.parse(storedIdentity);
        setIdentity(parsed);
      } catch (e) {
        console.error("Failed to parse stored identity:", e);
      }
    }
    const storedDisplayName = localStorage.getItem("worldpass_displayName");
    if (storedDisplayName) {
      setDisplayName(storedDisplayName);
    }
  }, []);

  useEffect(() => {
    const handler = (event) => {
      setHasAuthToken(Boolean(event?.detail));
      if (!event?.detail) {
        lastSyncedDid.current = null;
      }
    };
    window.addEventListener(TOKEN_CHANGED_EVENT, handler);
    return () => window.removeEventListener(TOKEN_CHANGED_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!identity?.did || !hasAuthToken) return;
    if (lastSyncedDid.current === identity.did) return;

    let aborted = false;
    (async () => {
      try {
        await linkUserDid(identity.did);
        if (!aborted) {
          lastSyncedDid.current = identity.did;
        }
      } catch (err) {
        console.warn("Failed to sync DID", err);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [identity?.did, hasAuthToken]);

  // identity değişince localStorage'a kaydet
  const setIdentityPersistent = (newIdentity) => {
    setIdentity(newIdentity);
    if (newIdentity) {
      localStorage.setItem("worldpass_identity", JSON.stringify(newIdentity));
    } else {
      localStorage.removeItem("worldpass_identity");
      lastSyncedDid.current = null;
    }
  };

  // displayName değişince localStorage'a kaydet
  const setDisplayNamePersistent = (newDisplayName) => {
    setDisplayName(newDisplayName);
    localStorage.setItem("worldpass_displayName", newDisplayName);
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
  )
}
export function useIdentity(){ return useContext(IdentityCtx); }
