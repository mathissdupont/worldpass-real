import { createContext, useContext, useState, useEffect } from "react";

/**
 * identity = { did, sk_b64u, pk_b64u }  // localStorage'da tutulur
 * displayName = kullanıcı görünen adı (opsiyonel, ayrı saklanır)
 */
const IdentityCtx = createContext(null);

export function IdentityProvider({children}){
  const [identity, setIdentity] = useState(null);
  const [displayName, setDisplayName] = useState("");

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

  // identity değişince localStorage'a kaydet
  const setIdentityPersistent = (newIdentity) => {
    setIdentity(newIdentity);
    if (newIdentity) {
      localStorage.setItem("worldpass_identity", JSON.stringify(newIdentity));
    } else {
      localStorage.removeItem("worldpass_identity");
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
