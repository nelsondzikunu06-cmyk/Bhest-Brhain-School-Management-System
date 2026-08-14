import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "parent" | null;

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadRole(uid: string) {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);

      if (!mounted) return;

      if (error) {
        console.error("Failed to load user role:", error);
        setRole(null);
        setLoading(false);
        return;
      }

      const roles = (data ?? []).map((r) => r.role);

      if (roles.includes("admin")) {
        setRole("admin");
      } else if (roles.includes("parent")) {
        setRole("parent");
      } else {
        setRole(null);
      }

      setLoading(false);
    }

    async function initialize() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Failed to get session:", error);
        setLoading(false);
        return;
      }

      const currentSession = data.session;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await loadRole(currentSession.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (!newSession?.user) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Prevent the old user's role from being displayed
      // while the new user's role is loading.
      setRole(null);
      setLoading(true);

      void loadRole(newSession.user.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user,
    role,
    loading,
  };
}
