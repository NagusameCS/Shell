import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useAppStore } from "@/stores/appStore";
import { writeFile } from "@/lib/api";

/**
 * Hook that handles auto-saving of files when user stops typing.
 * Also handles saving all files on app shutdown.
 */
export function useAutoSave() {
  const { openFiles, markFileSaved, saveSession } = useEditorStore();
  const { settings } = useAppStore();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<Map<string, string>>(new Map());

  // Get auto-save delay from settings (default 1500ms after stop typing)
  const autoSaveDelay = settings?.auto_save_delay_ms || 1500;
  const autoSaveEnabled = settings?.auto_save ?? true;

  // Save a single file
  const saveFile = useCallback(async (path: string, content: string) => {
    try {
      await writeFile(path, content);
      markFileSaved(path);
      console.log(`Auto-saved: ${path.split("/").pop()}`);
      return true;
    } catch (err) {
      console.error("Auto-save failed:", path, err);
      return false;
    }
  }, [markFileSaved]);

  // Save all modified files
  const saveAllFiles = useCallback(async () => {
    const modifiedFiles = openFiles.filter((f) => f.modified && !f.readonly);
    
    if (modifiedFiles.length === 0) return;

    console.log(`Saving ${modifiedFiles.length} modified file(s)...`);
    
    const savePromises = modifiedFiles.map((file) =>
      saveFile(file.path, file.content)
    );
    
    await Promise.all(savePromises);
    
    // Also save the session
    saveSession();
  }, [openFiles, saveFile, saveSession]);

  // Debounced auto-save when content changes
  useEffect(() => {
    if (!autoSaveEnabled) return;

    // Check if any file content has changed
    const modifiedFiles = openFiles.filter((f) => {
      if (!f.modified || f.readonly) return false;
      const lastContent = lastContentRef.current.get(f.path);
      if (lastContent !== f.content) {
        lastContentRef.current.set(f.path, f.content);
        return true;
      }
      return false;
    });

    if (modifiedFiles.length === 0) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      for (const file of modifiedFiles) {
        await saveFile(file.path, file.content);
      }
    }, autoSaveDelay);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [openFiles, autoSaveEnabled, autoSaveDelay, saveFile]);

  // Handle app shutdown - save everything
  useEffect(() => {
    // Browser beforeunload event
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const modifiedFiles = openFiles.filter((f) => f.modified);
      
      if (modifiedFiles.length > 0) {
        // Save synchronously as much as possible
        modifiedFiles.forEach((file) => {
          // Use synchronous localStorage backup for unsaved content
          localStorage.setItem(`shell-backup-${file.path}`, JSON.stringify({
            content: file.content,
            timestamp: Date.now(),
          }));
        });
        
        // Trigger async saves (may not complete)
        saveAllFiles();
        
        // Show warning if there are unsaved changes
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    // Tauri-specific: listen for window close event
    let unlistenClose: (() => void) | undefined;
    
    const setupTauriListener = async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const currentWindow = getCurrentWindow();
        
        unlistenClose = await currentWindow.onCloseRequested(async (event) => {
          const modifiedFiles = openFiles.filter((f) => f.modified);
          
          if (modifiedFiles.length > 0) {
            // Save all files before closing
            await saveAllFiles();
            console.log("All files saved before exit");
          }
          
          // Save session
          saveSession();
        });
      } catch (err) {
        // Not in Tauri environment, that's fine
        console.debug("Not in Tauri environment");
      }
    };

    setupTauriListener();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (unlistenClose) {
        unlistenClose();
      }
    };
  }, [openFiles, saveAllFiles, saveSession]);

  // Handle visibility change (save when tab is hidden/app loses focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App is being hidden, save everything
        saveAllFiles();
        saveSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [saveAllFiles, saveSession]);

  return {
    saveAllFiles,
    saveFile,
  };
}

/**
 * Recover any backed-up unsaved files from a crash
 */
export function recoverBackups(): Array<{ path: string; content: string; timestamp: number }> {
  const backups: Array<{ path: string; content: string; timestamp: number }> = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("shell-backup-")) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "{}");
        const path = key.replace("shell-backup-", "");
        backups.push({
          path,
          content: data.content,
          timestamp: data.timestamp,
        });
      } catch (e) {
        console.error("Failed to parse backup:", key);
      }
    }
  }
  
  return backups;
}

/**
 * Clear backup for a specific file (call after successful save)
 */
export function clearBackup(path: string) {
  localStorage.removeItem(`shell-backup-${path}`);
}

/**
 * Clear all backups
 */
export function clearAllBackups() {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("shell-backup-")) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
