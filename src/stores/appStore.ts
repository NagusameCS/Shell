import { create } from "zustand";
import { getFeatureFlags, getSettings } from "@/lib/api";
import type { FeatureFlags, Settings, ProjectInfo, Lesson } from "@/types/ipc";

interface AppState {
  // Initialization
  initialized: boolean;
  initialize: () => Promise<void>;

  // Feature flags
  features: FeatureFlags | null;
  isEducator: boolean;

  // Settings
  settings: Settings | null;
  updateSettings: (settings: Partial<Settings>) => void;

  // Theme
  theme: "dark" | "light" | "system";
  setTheme: (theme: "dark" | "light" | "system") => void;

  // Current project
  project: ProjectInfo | null;
  setProject: (project: ProjectInfo | null) => void;

  // Current lesson
  lesson: Lesson | null;
  setLesson: (lesson: Lesson | null) => void;

  // UI state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  panelOpen: boolean;
  togglePanel: () => void;

  // Active views
  activeView: "explorer" | "lessons" | "search" | "extensions" | "settings" | "docs" | "stepdebug";
  setActiveView: (view: AppState["activeView"]) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initialization
  initialized: false,
  initialize: async () => {
    try {
      // Load saved settings from localStorage
      const savedSettings = localStorage.getItem("shell-editor-settings");
      let localSettings = null;
      if (savedSettings) {
        try {
          localSettings = JSON.parse(savedSettings);
        } catch {
          // Invalid JSON, ignore
        }
      }

      const [features, settings] = await Promise.all([
        getFeatureFlags(),
        getSettings(),
      ]);

      // Merge saved local settings over defaults
      const mergedSettings = localSettings 
        ? { ...settings, ...localSettings }
        : settings;

      set({
        initialized: true,
        features,
        settings: mergedSettings,
        isEducator: features.educator_mode,
        theme: (localStorage.getItem("shell-theme") as "dark" | "light" | "system") || localSettings?.theme || "dark",
      });
    } catch (error) {
      console.error("Failed to initialize app:", error);
      // Still mark as initialized with defaults
      set({
        initialized: true,
        features: {
          educator_mode: false,
          cloud_sync: false,
          classrooms: false,
          cloud_grading: false,
          analytics: false,
          exam_mode: false,
          plagiarism_detection: false,
          marketplace: true,
        },
        settings: {
          theme: "shell-dark",
          font_size: 14,
          font_family: "JetBrains Mono, monospace",
          tab_size: 4,
          auto_save: true,
          auto_save_delay_ms: 1000,
          show_minimap: true,
          word_wrap: false,
          line_numbers: true,
          bracket_matching: true,
          auto_indent: true,
          format_on_save: false,
          docker_enabled: true,
          execution_timeout: 30,
        },
      });
    }
  },

  // Feature flags
  features: null,
  isEducator: false,

  // Settings
  settings: null,
  updateSettings: (newSettings) => {
    const current = get().settings;
    if (current) {
      set({ settings: { ...current, ...newSettings } });
    }
  },

  // Theme
  theme: "dark",
  setTheme: (theme) => set({ theme }),

  // Current project
  project: null,
  setProject: (project) => set({ project }),

  // Current lesson
  lesson: null,
  setLesson: (lesson) => set({ lesson }),

  // UI state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  panelOpen: true,
  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),

  // Active views
  activeView: "explorer",
  setActiveView: (view) => set({ activeView: view }),
}));
