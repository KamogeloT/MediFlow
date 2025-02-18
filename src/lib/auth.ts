import { create } from "zustand";

type User = {
  id: string;
  email: string;
  name: string;
  role: "doctor" | "front-desk";
  avatar?: string;
};

type AuthStore = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: "doctor" | "front-desk",
  ) => Promise<void>;
  logout: () => void;
};

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // For demo, accept any email/password
    const user = {
      id: "1",
      email,
      name: email.split("@")[0],
      role: "doctor" as const,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
    };

    set({ user, isAuthenticated: true });
  },

  signup: async (
    email: string,
    password: string,
    name: string,
    role: "doctor" | "front-desk",
  ) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const user = {
      id: "1",
      email,
      name,
      role,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
    };

    set({ user, isAuthenticated: true });
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },
}));
