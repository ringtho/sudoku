import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

type RequireAdminProps = {
  children: ReactNode;
};

export function RequireAdmin({ children }: RequireAdminProps) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading" || (auth.status === "authenticated" && auth.isAdminLoading)) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Checking admin access…</p>
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return (
      <Navigate to="/login" replace state={{ redirectTo: location.pathname + location.search }} />
    );
  }

  if (!auth.isAdmin) {
    return (
      <div className="mx-auto max-w-xl space-y-6 rounded-3xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
        <div>
          <h2 className="text-lg font-semibold">Admins only</h2>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            This page is restricted to project administrators. If you should have access, refresh your
            browser after the admin role is granted.
          </p>
        </div>
        <Link
          to="/lobby"
          className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
        >
          Back to lobby
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
