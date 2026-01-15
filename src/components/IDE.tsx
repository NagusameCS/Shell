import { useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { useEditorStore } from "@/stores/editorStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { writeFile } from "@/lib/api";
import { ActivityBar } from "./ide/ActivityBar";
import { Sidebar } from "./ide/Sidebar";
import { EditorArea } from "./ide/EditorArea";
import { Panel } from "./ide/Panel";
import { StatusBar } from "./ide/StatusBar";

export const IDE = memo(function IDE() {
  const navigate = useNavigate();
  
  // Use selectors for fine-grained subscriptions
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const panelOpen = useAppStore((s) => s.panelOpen);
  const togglePanel = useAppStore((s) => s.togglePanel);
  
  const openFiles = useEditorStore((s) => s.openFiles);
  const activeFile = useEditorStore((s) => s.activeFile);
  const markFileSaved = useEditorStore((s) => s.markFileSaved);
  
  // Enable auto-save functionality
  const { saveAllFiles } = useAutoSave();

  // Memoize keyboard handler
  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    const isMeta = e.metaKey || e.ctrlKey;

    // Cmd+S - Save current file
    if (isMeta && e.key === "s" && !e.shiftKey) {
      e.preventDefault();
      const currentFile = openFiles.find((f) => f.path === activeFile);
      if (currentFile && currentFile.modified) {
        try {
          await writeFile(currentFile.path, currentFile.content);
          markFileSaved(currentFile.path);
        } catch (err) {
          console.error("Failed to save file:", err);
        }
      }
      return;
    }

    // Cmd+N - New file
    if (isMeta && e.key === "n" && !e.shiftKey) {
      e.preventDefault();
      return;
    }

    // Cmd+Shift+N - New window
    if (isMeta && e.shiftKey && e.key === "N") {
      e.preventDefault();
      import("@tauri-apps/api/webviewWindow").then(({ WebviewWindow }) => {
        const webview = new WebviewWindow("shell-new-" + Date.now(), {
          url: "/",
          title: "Shell",
          width: 1200,
          height: 800,
        });
        webview.once("tauri://error", (err) => {
          console.error("Failed to create new window:", err);
        });
      });
      return;
    }

    // Cmd+` - Toggle terminal panel
    if (isMeta && e.key === "`") {
      e.preventDefault();
      togglePanel();
      return;
    }
  }, [openFiles, activeFile, markFileSaved, togglePanel]);

  // Global keyboard shortcuts
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen flex-col bg-editor-bg text-editor-fg">
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity bar */}
        <ActivityBar />

        {/* Sidebar */}
        {sidebarOpen && <Sidebar />}

        {/* Editor and panels */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Editor area */}
          <EditorArea />

          {/* Bottom panel */}
          {panelOpen && <Panel />}
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
});
