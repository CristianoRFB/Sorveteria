import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth, assertFirebaseConfigured } from "@/lib/firebase";
import { AuthContext } from "@/context/authContextValue";

function friendlyAuthError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "";
  if (code.includes("invalid-credential") || code.includes("user-not-found")) {
    return "E-mail ou senha incorretos.";
  }
  if (code.includes("too-many-requests")) return "Muitas tentativas. Aguarde e tente novamente.";
  if (code.includes("network-request-failed")) return "Sem conexão com o serviço de autenticação.";
  return error instanceof Error ? error.message : "Não foi possível autenticar.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let version = 0;
    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      const currentVersion = ++version;
      setLoading(true);
      setUser(nextUser);
      setIsPlatformOwner(false);
      setError(null);
      if (!nextUser) {
        setLoading(false);
        return;
      }
      try {
        const token = await nextUser.getIdTokenResult();
        if (currentVersion === version) setIsPlatformOwner(token.claims.platform_owner === true);
      } catch (authError) {
        if (currentVersion === version) setError(friendlyAuthError(authError));
      } finally {
        if (currentVersion === version) setLoading(false);
      }
    }, (authError) => {
      setError(friendlyAuthError(authError));
      setLoading(false);
    });
    return () => { version += 1; unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      assertFirebaseConfigured();
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (authError) {
      const message = friendlyAuthError(authError);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo(() => ({ user, isPlatformOwner, loading, error, signIn, signOut }),
    [user, isPlatformOwner, loading, error, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
