import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { LogIn, LogOut, Moon, Sun, SlidersHorizontal, X } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar } from "../ui/avatar";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../contexts/AuthContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import clsx from "clsx";
import { useState } from "react";

type AppShellProps = {
  children: ReactNode;
};

const baseNavItems = [
  { to: "/lobby", label: "Lobby", requiresAuth: true },
  { to: "/rooms", label: "My Rooms", requiresAuth: true },
  { to: "/about", label: "About", requiresAuth: false },
];

const highlightOptions = ["#6366f1", "#ec4899", "#22d3ee", "#34d399", "#f97316", "#a855f7"] as const;

export function AppShell({ children }: AppShellProps) {
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const [showPreferences, setShowPreferences] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = auth.status === "authenticated" ? auth.user : null;

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/80">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
          <NavLink
            to="/"
            className="order-1 flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-gray-900 transition hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400"
          >
            <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-md">
              <span className="text-sm font-bold">S</span>
            </span>
            Sudoku Together
          </NavLink>
          <div className="order-2 ml-auto flex shrink-0 items-center gap-3 lg:order-3">
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
            <Button
              variant="ghost"
              size="sm"
              aria-label="Open preferences"
              className="hidden h-9 w-9 rounded-full p-0 sm:inline-flex"
              onClick={() => setShowPreferences(true)}
            >
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            </Button>
            {currentUser && (
              <div className="hidden items-center gap-3 md:flex">
                <Avatar
                  src={currentUser.photoURL}
                  name={currentUser.displayName ?? currentUser.email}
                  size="sm"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {currentUser.displayName ?? currentUser.email}
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
                onClick={() =>
                  navigate("/login", {
                    state: { redirectTo: location.pathname + location.search },
                  })
                }
              >
                Sign in
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="sm:hidden"
              onClick={() => setShowPreferences(true)}
            >
              Preferences
            </Button>
          </div>
          <nav className="order-3 flex w-full flex-wrap items-center gap-2 border-t border-gray-200 pt-2 text-sm md:border-none md:pt-0 md:justify-center lg:order-2 lg:w-auto lg:flex-nowrap lg:gap-6">
            {[...baseNavItems, ...(auth.status === "authenticated" && !auth.isAdminLoading && auth.isAdmin ? [{ to: "/admin", label: "Admin", requiresAuth: true }] : [])]
              .filter((item) => (item.requiresAuth ? auth.status === "authenticated" : true))
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      "inline-flex items-center rounded-full px-3 py-1.5 font-medium transition",
                      isActive
                        ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300"
                        : "text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex"
              onClick={() => setShowPreferences(true)}
            >
              Preferences
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">{children}</div>
      </main>
      <footer className="relative z-40 border-t border-gray-200 bg-white/60 py-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950/60 dark:text-gray-400">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-center sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left lg:px-8">
          <p>Built with love &amp; logic. Invite a friend and solve together.</p>
          <div className="flex flex-col items-center gap-1 text-xs sm:flex-row sm:gap-3 sm:text-sm">
            <span className="font-medium">© {new Date().getFullYear()} Sudoku Together</span>
            <span className="hidden text-gray-300 sm:block dark:text-gray-700">•</span>
            <a
              href="mailto:sringtho@gmail.com"
              className="font-medium text-gray-600 transition hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
            >
              Designed by Smith Ringtho
            </a>
          </div>
        </div>
      </footer>
      {showPreferences ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-10">
          <div className="w-full max-w-lg space-y-6 rounded-3xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/95">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Preferences</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Personalize how Sudoku Together feels.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowPreferences(false)}>
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </header>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Highlight color</h3>
              <div className="flex flex-wrap gap-3">
                {highlightOptions.map((color: string) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updatePreferences({ highlightColor: color })}
                    className={clsx(
                      "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition",
                      preferences.highlightColor === color
                        ? "border-blue-500"
                        : "border-transparent hover:border-blue-300",
                    )}
                    style={{ background: color }}
                    aria-label={`Select highlight color ${color}`}
                  >
                    {preferences.highlightColor === color ? <span className="text-white">✓</span> : null}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <PreferenceToggle
                label="Show presence badges"
                description="Display collaborator initials and cursor focus on the board."
                value={preferences.showPresenceBadges}
                onToggle={(value) => updatePreferences({ showPresenceBadges: value })}
              />
              <PreferenceToggle
                label="Allow hints"
                description="Show the hint button and track remaining uses."
                value={preferences.allowHints}
                onToggle={(value) => updatePreferences({ allowHints: value })}
              />
              <PreferenceToggle
                label="Guardrails"
                description="Block incorrect entries so only valid moves stick."
                value={preferences.guardrailsEnabled}
                onToggle={(value) => updatePreferences({ guardrailsEnabled: value })}
              />
            </section>

            <footer className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowPreferences(false)}>
                Close
              </Button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type PreferenceToggleProps = {
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
};

function PreferenceToggle({ label, description, value, onToggle }: PreferenceToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!value)}
      className={clsx(
        "w-full rounded-2xl border px-4 py-3 text-left transition",
        value
          ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200"
          : "border-gray-200 hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-400",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            value
              ? "bg-blue-500 text-white dark:bg-blue-400 dark:text-slate-900"
              : "bg-gray-200 text-gray-600 dark:bg-slate-800 dark:text-gray-300",
          )}
        >
          {value ? "On" : "Off"}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </button>
  );
}
