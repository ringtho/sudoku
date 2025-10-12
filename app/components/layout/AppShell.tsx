import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { LogIn, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../contexts/AuthContext";
import clsx from "clsx";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { to: "/lobby", label: "Lobby", requiresAuth: true },
  { to: "/rooms", label: "My Rooms", requiresAuth: true },
  { to: "/about", label: "About", requiresAuth: false },
];

export function AppShell({ children }: AppShellProps) {
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-md">
              <span className="text-sm font-bold">S</span>
            </span>
            Sudoku Together
          </NavLink>
          <nav className="hidden items-center gap-6 md:flex">
            {navItems
              .filter((item) => (item.requiresAuth ? auth.status === "authenticated" : true))
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      "text-sm font-medium transition hover:text-blue-600 dark:hover:text-blue-400",
                      isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-300",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Toggle theme"
              className="h-9 w-9 rounded-full p-0"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
            {auth.status === "authenticated" && (
              <div className="hidden items-center gap-3 md:flex">
                <Avatar
                  src={auth.user.photoURL}
                  name={auth.user.displayName ?? auth.user.email}
                  size="sm"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {auth.user.displayName ?? auth.user.email}
                </span>
              </div>
            )}
            {auth.status === "authenticated" ? (
              <Button
                variant="outline"
                size="sm"
                icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
                onClick={() => auth.signOut()}
              >
                Sign out
              </Button>
            ) : auth.status === "loading" ? (
              <Button variant="outline" size="sm" disabled>
                Preparing...
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={<LogIn className="h-4 w-4" aria-hidden="true" />}
                onClick={() => auth.signInWithGoogle()}
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
      </main>
      <footer className="border-t border-gray-200 bg-white/60 py-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950/60 dark:text-gray-400">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Built with love &amp; logic. Invite a friend and solve together.</p>
          <p className="font-medium">© {new Date().getFullYear()} Sudoku Together</p>
        </div>
      </footer>
    </div>
  );
}
