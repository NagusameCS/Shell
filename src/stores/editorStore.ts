import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FileInfo } from "@/types/ipc";

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
  readonly?: boolean;
}

// Tab state for persistence (without content to save space)
interface TabState {
  path: string;
  name: string;
  language: string;
}

interface EditorState {
  // Open files
  openFiles: OpenFile[];
  activeFile: string | null;
  
  // Tabs for session restoration
  tabs: TabState[];
  activeTabId: string | null;
  setActiveTab: (id: string) => void;
  
  // Session restoration
  restoreSession: () => void;
  saveSession: () => void;

  // File operations
  openFile: (file: OpenFile) => void;
  closeFile: (path: string) => void;
  closeCurrentTab: () => void;
  setActiveFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileSaved: (path: string) => void;
  saveCurrentFile: () => Promise<void>;

  // Execution
  isRunning: boolean;
  setRunning: (running: boolean) => void;
  output: string;
  setOutput: (output: string) => void;
  appendOutput: (text: string) => void;
  clearOutput: () => void;

  // Errors
  errors: EditorError[];
  addError: (error: EditorError) => void;
  clearErrors: () => void;
}

export interface EditorError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      // Open files
      openFiles: [],
      activeFile: null,
      
      // Tabs
      tabs: [],
      activeTabId: null,
      
      setActiveTab: (id) => {
        set({ activeTabId: id, activeFile: id });
      },

      openFile: (file) => {
        const existing = get().openFiles.find((f) => f.path === file.path);
        if (existing) {
          set({ activeFile: file.path, activeTabId: file.path });
        } else {
          const tab: TabState = {
            path: file.path,
            name: file.name,
            language: file.language,
          };
          set((state) => ({
            openFiles: [...state.openFiles, file],
            activeFile: file.path,
            tabs: [...state.tabs, tab],
            activeTabId: file.path,
          }));
        }
        // Save session after opening
        get().saveSession();
      },

      closeFile: (path) => {
        set((state) => {
          const newFiles = state.openFiles.filter((f) => f.path !== path);
          const newTabs = state.tabs.filter((t) => t.path !== path);
          let newActive = state.activeFile;

          if (state.activeFile === path) {
            const index = state.openFiles.findIndex((f) => f.path === path);
            if (newFiles.length > 0) {
              newActive = newFiles[Math.min(index, newFiles.length - 1)]?.path || null;
            } else {
              newActive = null;
            }
          }

          return { 
            openFiles: newFiles, 
            activeFile: newActive,
            tabs: newTabs,
            activeTabId: newActive,
          };
        });
        // Save session after closing
        get().saveSession();
      },
      
      closeCurrentTab: () => {
        const { activeFile, closeFile } = get();
        if (activeFile) {
          closeFile(activeFile);
        }
      },

      setActiveFile: (path) => {
        set({ activeFile: path, activeTabId: path });
      },

      updateFileContent: (path, content) => {
        set((state) => ({
          openFiles: state.openFiles.map((f) =>
            f.path === path ? { ...f, content, modified: true } : f
          ),
        }));
      },

      markFileSaved: (path) => {
        set((state) => ({
          openFiles: state.openFiles.map((f) =>
            f.path === path ? { ...f, modified: false } : f
          ),
        }));
      },
      
      saveCurrentFile: async () => {
        const { activeFile, openFiles, markFileSaved } = get();
        if (!activeFile) return;
        
        const file = openFiles.find((f) => f.path === activeFile);
        if (!file || !file.modified) return;
        
        try {
          const { writeFile } = await import("@/lib/api");
          await writeFile(file.path, file.content);
          markFileSaved(file.path);
        } catch (err) {
          console.error("Failed to save file:", err);
        }
      },
      
      // Session management
      saveSession: () => {
        const { tabs, activeTabId } = get();
        localStorage.setItem("shell-session", JSON.stringify({
          tabs,
          activeTabId,
          timestamp: Date.now(),
        }));
      },
      
      restoreSession: () => {
        try {
          const session = localStorage.getItem("shell-session");
          if (session) {
            const { tabs, activeTabId } = JSON.parse(session);
            set({ tabs, activeTabId });
          }
        } catch (e) {
          console.error("Failed to restore session:", e);
        }
      },

      // Execution
      isRunning: false,
      setRunning: (running) => set({ isRunning: running }),

      output: "",
      setOutput: (output) => set({ output }),
      appendOutput: (text) => set((state) => ({ output: state.output + text })),
      clearOutput: () => set({ output: "" }),

      // Errors
      errors: [],
      addError: (error) =>
        set((state) => ({ errors: [...state.errors, error] })),
      clearErrors: () => set({ errors: [] }),
    }),
    {
      name: "shell-editor",
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
