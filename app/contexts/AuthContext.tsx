import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import {
  getFirebase,
  observeAuthState,
  signInWithGooglePopup,
  signOutUser,
} from "../libs/firebase";

type AuthContextValue =
  | {
      status: "loading";
      user: null;
      signInWithGoogle: () => Promise<void>;
      signOut: () => Promise<void>;
    }
  | {
      status: "authenticated";
      user: User;
      signInWithGoogle: () => Promise<void>;
      signOut: () => Promise<void>;
    }
  | {
      status: "unauthenticated";
      user: null;
      signInWithGoogle: () => Promise<void>;
      signOut: () => Promise<void>;
    };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = observeAuthState((nextUser) => {
        setUser(nextUser);
        setStatus(nextUser ? "authenticated" : "unauthenticated");
      });
    } catch (error) {
      console.error("Failed to observe Firebase auth state", error);
      setStatus("unauthenticated");
    }
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const actions = {
      signInWithGoogle: async () => {
        await signInWithGooglePopup();
      },
      signOut: async () => {
        await signOutUser();
      },
    };

    if (status === "loading") {
      return { status, user: null, ...actions };
    }

    if (user) {
      return { status: "authenticated", user, ...actions };
    }

    return { status: "unauthenticated", user: null, ...actions };
  }, [status, user]);

  useEffect(() => {
    // Ensure Firebase is initialized as soon as auth provider mounts.
    try {
      getFirebase();
    } catch (error) {
      console.error(error);
    }
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
