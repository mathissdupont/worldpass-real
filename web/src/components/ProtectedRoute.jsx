import { Navigate, useLocation } from "react-router-dom";
import { isAuthed } from "../lib/auth";
import { useIdentity } from "../lib/identityContext";

export default function ProtectedRoute({ children, requireDid = true }) {
  const loc = useLocation();
  const { identity } = useIdentity();

  if (!isAuthed()) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  if (requireDid && !identity?.did) {
    // DID yoksa login’e “DID yükleme” modu ile ve geri dönülecek adresle git
    const qs = new URLSearchParams({ needDid: "1" }).toString();
    return <Navigate to={`/login?${qs}`} replace state={{ from: loc }} />;
  }
  return children;
}
