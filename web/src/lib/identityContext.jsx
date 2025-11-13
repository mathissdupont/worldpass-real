import { createContext, useContext, useState } from "react";

/**
 * identity = { did, sk_b64u, pk_b64u }  // sadece RAM'de tutulur
 * displayName = kullanıcı görünen adı (opsiyonel, ayrı saklanır)
 */
const IdentityCtx = createContext(null);

export function IdentityProvider({children}){
  const [identity, setIdentity] = useState(null);
  const [displayName, setDisplayName] = useState("");

  return (
    <IdentityCtx.Provider value={{identity, setIdentity, displayName, setDisplayName}}>
      {children}
    </IdentityCtx.Provider>
  )
}
export function useIdentity(){ return useContext(IdentityCtx); }
