import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextType {
  user: User | null;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: "doctor" | "front-desk",
    departmentId?: string,
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error("Failed to get initial session:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event, session?.user?.id);
        
        if (mounted) {
          setUser(session?.user ?? null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: "doctor" | "front-desk",
    departmentId?: string,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
        emailRedirectTo: undefined,
      },
    });
    if (error) throw error;
    
    // Insert into profiles table if user was created
    if (data && data.user) {
      const profileData: any = {
        id: data.user.id,
        full_name: name,
        role: role,
      };

      // If doctor and department is selected, add departmentID
      if (role === "doctor" && departmentId) {
        profileData.departmentID = departmentId;
      }

      const { error: profileError } = await supabase.from("profiles").insert([profileData]);
      if (profileError) throw profileError;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshSession = async () => {
    try {
      console.log("Attempting to refresh session...");
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("Session refresh error:", error);
        throw error;
      }
      
      if (data.session) {
        console.log("Session refreshed successfully");
        setUser(data.session.user);
        return;
      }
      
      console.log("No session data after refresh");
      // If refresh fails, don't immediately sign out - let the user continue
      // Only sign out if there's a clear authentication error
      if (error?.message?.includes('invalid_refresh_token')) {
        await signOut();
      }
    } catch (error) {
      console.error("Failed to refresh session:", error);
      // Don't automatically sign out on refresh failure
      // Let the user continue with their current session
    }
  };

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, signOut, refreshSession, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
