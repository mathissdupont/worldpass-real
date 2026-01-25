import { useContext } from "react";
import { IdentityCtx } from "./identityContext";

export function useIdentity() {
  return useContext(IdentityCtx);
}
