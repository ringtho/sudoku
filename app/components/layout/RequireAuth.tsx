import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Checking your account...</p>
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return (
      <Navigate to="/login" replace state={{ redirectTo: location.pathname + location.search }} />
    );
  }

  return <>{children}</>;
}
