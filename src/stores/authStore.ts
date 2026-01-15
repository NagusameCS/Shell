/**
 * Authentication Store
 *
 * Manages user authentication state with Firebase
 * Persists session for 30 days using localStorage
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ShellUser, UserTier } from "../lib/firebase";

// Session duration: 30 days in milliseconds
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

interface AuthState {
  user: ShellUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpiry: number | null;  // Timestamp when session expires

  // Actions
  setUser: (user: ShellUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  refreshSession: () => void;
  isSessionValid: () => boolean;

  // Computed helpers
  isEducator: () => boolean;
  canUseCloudSync: () => boolean;
  canCreateClassrooms: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      sessionExpiry: null,

      setUser: (user) => {
        const now = Date.now();
        set({
          user,
          isAuthenticated: user !== null,
          isLoading: false,
          sessionExpiry: user ? now + SESSION_DURATION : null,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      logout: () => {
        // Clear local educator upgrade on logout
        localStorage.removeItem('shell_educator_upgrade');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          sessionExpiry: null,
        });
      },

      refreshSession: () => {
        const { user } = get();
        if (user) {
          set({
            sessionExpiry: Date.now() + SESSION_DURATION,
          });
        }
      },

      isSessionValid: () => {
        const { sessionExpiry, isAuthenticated } = get();
        if (!isAuthenticated || !sessionExpiry) return false;
        return Date.now() < sessionExpiry;
      },

      isEducator: () => {
        const { user } = get();
        // Check both Firestore tier and local upgrade
        if (user?.tier === "educator") return true;
        
        // Check for local educator upgrade
        const localUpgrade = localStorage.getItem('shell_educator_upgrade');
        if (localUpgrade) {
          try {
            const upgrade = JSON.parse(localUpgrade);
            if (upgrade.userId === user?.uid) return true;
          } catch {
            // Ignore parse errors
          }
        }
        return false;
      },

      canUseCloudSync: () => {
        const { user, isEducator } = get();
        return isEducator() && user?.settings?.cloudSyncEnabled === true;
      },

      canCreateClassrooms: () => {
        const { isEducator } = get();
        return isEducator();
      },
    }),
    {
      name: "shell-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionExpiry: state.sessionExpiry,
      }),
      // Check session validity on rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Check if session has expired
          if (state.sessionExpiry && Date.now() > state.sessionExpiry) {
            // Session expired, clear auth state
            state.user = null;
            state.isAuthenticated = false;
            state.sessionExpiry = null;
          }
        }
      },
    }
  )
);
