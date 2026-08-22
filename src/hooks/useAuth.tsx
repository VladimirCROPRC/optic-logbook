import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "coordinator" | "technician";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  role: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) {
        fetchUserRole(next.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      if (current?.user) {
        fetchUserRole(current.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function fetchUserRole(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching role:", error);
        setRole("technician"); // Default to technician
      } else {
        setRole((data?.role as UserRole) || "technician");
      }
    } catch (err) {
      console.error("Failed to fetch user role:", err);
      setRole("technician");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        role,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
