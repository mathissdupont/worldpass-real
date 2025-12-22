import { Navigate, useLocation } from "react-router-dom";

export default function AdminRoute({ children }) {
  const loc = useLocation();
  const token = (() => {
    try {
      return localStorage.getItem("wp_admin_token");
    } catch {
      return null;
    }
  })();

  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: loc }} />;
  }

  return children;
}
