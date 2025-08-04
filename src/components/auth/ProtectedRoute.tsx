import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: Array<"doctor" | "front-desk">;
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = (user.user_metadata as { role?: string } | undefined)?.role;
  if (roles && !roles.includes(userRole as any)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
