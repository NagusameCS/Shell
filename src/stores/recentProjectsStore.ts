/**
 * Recent Projects Store
 *
 * Manages recently opened projects with localStorage persistence
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentProject {
  path: string;
  name: string;
  lastOpened: number; // timestamp
  language?: string;
}

interface RecentProjectsState {
  recentProjects: RecentProject[];
  addRecentProject: (project: Omit<RecentProject, "lastOpened">) => void;
  removeRecentProject: (path: string) => void;
  clearRecentProjects: () => void;
}

const MAX_RECENT_PROJECTS = 10;

export const useRecentProjectsStore = create<RecentProjectsState>()(
  persist(
    (set) => ({
      recentProjects: [],

      addRecentProject: (project) => {
        set((state) => {
          // Remove existing entry if present
          const filtered = state.recentProjects.filter(
            (p) => p.path !== project.path
          );

          // Add to front with timestamp
          const updated: RecentProject[] = [
            { ...project, lastOpened: Date.now() },
            ...filtered,
          ].slice(0, MAX_RECENT_PROJECTS);

          return { recentProjects: updated };
        });
      },

      removeRecentProject: (path) => {
        set((state) => ({
          recentProjects: state.recentProjects.filter((p) => p.path !== path),
        }));
      },

      clearRecentProjects: () => {
        set({ recentProjects: [] });
      },
    }),
    {
      name: "shell-recent-projects",
    }
  )
);
