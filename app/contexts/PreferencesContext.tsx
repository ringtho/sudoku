import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "sudoku-prefs";

export type Preferences = {
  highlightColor: string;
  showPresenceBadges: boolean;
  allowHints: boolean;
  guardrailsEnabled: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  highlightColor: "#6366f1",
  showPresenceBadges: true,
  allowHints: true,
  guardrailsEnabled: false,
};

type PreferencesContextValue = {
  preferences: Preferences;
  updatePreferences: (update: Partial<Preferences>) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function loadPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch (error) {
    console.error("Failed to load preferences", error);
    return DEFAULT_PREFERENCES;
  }
}

function persistPreferences(prefs: Preferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error("Failed to save preferences", error);
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences());

  useEffect(() => {
    persistPreferences(preferences);
  }, [preferences]);

  const value = useMemo(
    () => ({
      preferences,
      updatePreferences: (update: Partial<Preferences>) => {
        setPreferences((prev) => ({ ...prev, ...update }));
      },
    }),
    [preferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
}
