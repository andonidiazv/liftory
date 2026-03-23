import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

/**
 * Wraps ProtectedRoute with an additional admin role check.
 * Non-admin users are silently redirected to /home.
 */
export default function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminGate>{children}</AdminGate>
    </ProtectedRoute>
  );
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();

  if (!isAdmin()) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
