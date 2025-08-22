import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Create Supabase client with enhanced auth configuration
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce',
    // Handle email confirmation redirects
    onAuthStateChange: (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        // User has confirmed their email
        console.log('User email confirmed:', session.user.email);
      }
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'mediflow-web'
    }
  }
});

// Helper function to get authenticated Supabase client
export function getAuthenticatedClient() {
  const session = supabase.auth.getSession();
  if (!session) {
    throw new Error("No active session found. Please log in again.");
  }
  return supabase;
}

// Helper function to check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error("Authentication check failed:", error);
    return false;
  }
}

// Helper function to refresh session
export async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error("Session refresh failed:", error);
      return false;
    }
    return !!data.session;
  } catch (error) {
    console.error("Session refresh failed:", error);
    return false;
  }
}

// Helper function to handle email confirmation
export async function confirmEmail(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.confirmSignUp(token);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Email confirmation error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Helper function to check if user's email is confirmed
export async function isEmailConfirmed(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email_confirmed_at ? true : false;
  } catch (error) {
    console.error('Email confirmation check failed:', error);
    return false;
  }
}
