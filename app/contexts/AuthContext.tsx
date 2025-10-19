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
import { ensureUserProfile } from "../libs/profiles";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  isAdmin: boolean;
  isAdminLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsAdminLoading(true);

    const unsubscribe = observeAuthState((nextUser) => {
      if (!isMounted) return;
      setUser(nextUser);
      if (nextUser) {
        setStatus("authenticated");
        setIsAdminLoading(true);
        ensureUserProfile(nextUser).catch((error) => {
          console.error("Failed to store user profile", error);
        });
        nextUser
          .getIdTokenResult()
          .then((token) => {
            if (!isMounted) return;
            setIsAdmin(Boolean(token.claims?.admin));
          })
          .catch((error) => {
            console.error("Failed to read admin claim", error);
            if (isMounted) {
              setIsAdmin(false);
            }
          })
          .finally(() => {
            if (isMounted) {
              setIsAdminLoading(false);
            }
          });
      } else {
        setStatus("unauthenticated");
        setIsAdmin(false);
        setIsAdminLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      getFirebase();
    } catch (error) {
      console.error(error);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAdmin,
      isAdminLoading,
      signInWithGoogle: async () => {
        await signInWithGooglePopup();
      },
      signOut: async () => {
        await signOutUser();
      },
    }),
    [status, user, isAdmin, isAdminLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
