import { Navigate } from "react-router-dom";
import { isAuthed } from "../lib/auth";

/**
 * RoleRoute: oturum + belirli role(ler) gerekir.
 * props:
 *  - roles: string | string[]
 *  - user: { email, roles: string[] } | null
 */
export default function RoleRoute({ user, roles, children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  const need = Array.isArray(roles) ? roles : [roles];
  const has = !!user?.roles?.some(r => need.includes(r));
  if (!has) return <Navigate to="/" replace />;
  return children;
}
