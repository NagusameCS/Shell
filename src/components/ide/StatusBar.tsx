import { memo, useMemo, useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import { useEditorStore } from "@/stores/editorStore";
import {
  GitBranch,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Bell,
  Settings,
  Cloud,
  CloudOff,
  Save,
} from "lucide-react";

export const StatusBar = memo(function StatusBar() {
  // Use selectors for fine-grained subscriptions
  const project = useAppStore((s) => s.project);
  const features = useAppStore((s) => s.features);
  const togglePanel = useAppStore((s) => s.togglePanel);
  const panelOpen = useAppStore((s) => s.panelOpen);
  
  const errors = useEditorStore((s) => s.errors);
  const isRunning = useEditorStore((s) => s.isRunning);
  const openFiles = useEditorStore((s) => s.openFiles);
  const activeFile = useEditorStore((s) => s.activeFile);

  // Memoize derived state
  const activeFileData = useMemo(() => 
    openFiles.find((f) => f.path === activeFile),
    [openFiles, activeFile]
  );
  
  // Memoize counts to prevent recalculation
  const modifiedCount = useMemo(() => 
    openFiles.filter((f) => f.modified).length,
    [openFiles]
  );

  const { errorCount, warningCount } = useMemo(() => ({
    errorCount: errors.filter((e) => e.severity === "error").length,
    warningCount: errors.filter((e) => e.severity === "warning").length,
  }), [errors]);

  const handleErrorsClick = useCallback(() => {
    if (!panelOpen) {
      togglePanel();
    }
  }, [panelOpen, togglePanel]);

  return (
    <div className="flex h-6 items-center justify-between border-t border-panel-border bg-shell-700 px-2 text-xs text-white/80">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Branch */}
        {project && (
          <div className="flex items-center gap-1">
            <GitBranch className="h-3.5 w-3.5" />
            <span>main</span>
          </div>
        )}

        {/* Errors/Warnings - clickable to open problems panel */}
        <button 
          onClick={handleErrorsClick}
          className="flex items-center gap-2 hover:bg-white/10 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
        >
          {errorCount + warningCount === 0 ? (
            <div className="flex items-center gap-1 text-success">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>No issues</span>
            </div>
          ) : (
            <>
              {errorCount > 0 && (
                <div className="flex items-center gap-1 text-error">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{errorCount}</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1 text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{warningCount}</span>
                </div>
              )}
            </>
          )}
        </button>

        {/* Running indicator */}
        {isRunning && (
          <div className="flex items-center gap-1 text-[var(--accent-color)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-color)]" />
            <span>Running</span>
          </div>
        )}
        
        {/* Modified files indicator */}
        {modifiedCount > 0 && !isRunning && (
          <div className="flex items-center gap-1 text-yellow-400" title={`${modifiedCount} unsaved file(s) - Auto-save enabled`}>
            <Save className="h-3.5 w-3.5" />
            <span>{modifiedCount} unsaved</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Language */}
        {activeFileData && (
          <span className="capitalize">{activeFileData.language}</span>
        )}

        {/* Encoding */}
        <span>UTF-8</span>

        {/* Line/Column */}
        <span>Ln 1, Col 1</span>

        {/* Cloud status */}
        {features?.cloud_sync ? (
          <div className="flex items-center gap-1 text-success">
            <Cloud className="h-3.5 w-3.5" />
            <span>Synced</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground">
            <CloudOff className="h-3.5 w-3.5" />
            <span>Local</span>
          </div>
        )}

        {/* Notifications */}
        <button className="hover:text-white" aria-label="Notifications" title="Notifications">
          <Bell className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});
