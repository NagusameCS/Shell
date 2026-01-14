/**
 * Authentication Store
 *
 * Manages user authentication state with Firebase
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ShellUser, UserTier } from "../lib/firebase";

interface AuthState {
  user: ShellUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: ShellUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;

  // Computed helpers
  isTeacher: () => boolean;
  canUseCloudSync: () => boolean;
  canCreateClassrooms: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: user !== null,
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      isTeacher: () => {
        const { user } = get();
        return user?.tier === "teacher";
      },

      canUseCloudSync: () => {
        const { user } = get();
        return user?.tier === "teacher" && user?.settings?.cloudSyncEnabled;
      },

      canCreateClassrooms: () => {
        const { user } = get();
        return user?.tier === "teacher";
      },
    }),
    {
      name: "shell-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
