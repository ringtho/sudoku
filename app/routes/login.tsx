import type { Route } from "./+types/login";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { LogIn } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign in – Sudoku Together" },
    { name: "robots", content: "noindex" },
  ];
}

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { redirectTo?: string } | null;
  const redirectTo = state?.redirectTo ?? "/lobby";

  useEffect(() => {
    if (auth.status === "authenticated") {
      navigate(redirectTo, { replace: true });
    }
  }, [auth.status, navigate, redirectTo]);

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-xl dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Sign in with Google to save progress and solve Sudoku with friends.
      </p>
      <div className="mt-8">
        <Button
          size="lg"
          className="w-full justify-center"
          icon={<LogIn className="h-5 w-5" aria-hidden="true" />}
          onClick={() => {
            auth.signInWithGoogle().catch((error) => {
              console.error("Google sign-in failed", error);
            });
          }}
          disabled={auth.status === "loading"}
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
