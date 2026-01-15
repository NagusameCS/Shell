import { useRef, useState, memo, useMemo, useCallback, lazy, Suspense, useEffect } from "react";
import type { OnMount } from "@monaco-editor/react";
import { useEditorStore } from "@/stores/editorStore";
import { useAppStore } from "@/stores/appStore";
import { getMonacoLanguage, cn } from "@/lib/utils";
import { X, Circle, Eye, Code, Columns, Play, Loader2 } from "lucide-react";
import { PreviewPane } from "./PreviewPane";
import type { editor } from "monaco-editor";
import * as monaco from "monaco-editor";

// Lazy load Monaco editor to improve initial load time
const Editor = lazy(() => import("@monaco-editor/react").then(mod => ({ default: mod.default })));

// Loading fallback for Monaco
const EditorLoading = () => (
  <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
    <Loader2 className="h-8 w-8 animate-spin text-[#7DD3FC]" />
  </div>
);

export const EditorArea = memo(function EditorArea() {
  // Use selectors for fine-grained subscriptions
  const openFiles = useEditorStore((s) => s.openFiles);
  const activeFile = useEditorStore((s) => s.activeFile);
  const setActiveFile = useEditorStore((s) => s.setActiveFile);
  const closeFile = useEditorStore((s) => s.closeFile);
  const updateFileContent = useEditorStore((s) => s.updateFileContent);
  const setOutput = useEditorStore((s) => s.setOutput);
  const setRunning = useEditorStore((s) => s.setRunning);
  const appendOutput = useEditorStore((s) => s.appendOutput);
  
  const settings = useAppStore((s) => s.settings);
  const project = useAppStore((s) => s.project);
  const togglePanel = useAppStore((s) => s.togglePanel);
  const theme = useAppStore((s) => s.theme);
  
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [viewMode, setViewMode] = useState<"code" | "preview" | "split">("code");
  const [isRunningFile, setIsRunningFile] = useState(false);
  
  // Update Monaco theme when app theme changes
  useEffect(() => {
    let actualTheme = theme;
    if (theme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    const monacoTheme = actualTheme === 'light' ? 'shell-light' : 'shell-dark';
    monaco.editor.setTheme(monacoTheme);
  }, [theme]);

  // Memoize active file data lookup
  const activeFileData = useMemo(() => 
    openFiles.find((f) => f.path === activeFile),
    [openFiles, activeFile]
  );
  
  // Memoize file type checks
  const isPreviewable = useMemo(() => activeFileData && (
    activeFileData.language === "markdown" ||
    activeFileData.language === "html" ||
    activeFileData.name.endsWith(".md") ||
    activeFileData.name.endsWith(".mdx") ||
    activeFileData.name.endsWith(".html") ||
    activeFileData.name.endsWith(".htm")
  ), [activeFileData]);

  const isRunnable = useMemo(() => activeFileData && (
    activeFileData.language === "python" ||
    activeFileData.language === "javascript" ||
    activeFileData.language === "typescript" ||
    activeFileData.language === "java" ||
    activeFileData.name.endsWith(".py") ||
    activeFileData.name.endsWith(".js") ||
    activeFileData.name.endsWith(".ts") ||
    activeFileData.name.endsWith(".java") ||
    activeFileData.name.endsWith(".rs") ||
    activeFileData.name.endsWith(".go") ||
    activeFileData.name.endsWith(".rb") ||
    activeFileData.name.endsWith(".sh")
  ), [activeFileData]);

  // Memoize run handler
  const handleRunFile = useCallback(async () => {
    if (!activeFileData || !project?.path) return;
    
    setIsRunningFile(true);
    setRunning(true);
    togglePanel();
    setOutput("Running " + activeFileData.name + "...\n\n");
    
    try {
      // Import the API function
      const { runCode } = await import("@/lib/api");
      
      // Determine language from file extension
      const fileName = activeFileData.name;
      let language = "python";
      
      if (fileName.endsWith(".py")) {
        language = "python";
      } else if (fileName.endsWith(".js")) {
        language = "javascript";
      } else if (fileName.endsWith(".ts")) {
        language = "typescript";
      } else if (fileName.endsWith(".java")) {
        language = "java";
      } else if (fileName.endsWith(".rs")) {
        language = "rust";
      } else if (fileName.endsWith(".go")) {
        language = "go";
      } else if (fileName.endsWith(".rb")) {
        language = "ruby";
      } else if (fileName.endsWith(".sh")) {
        // For shell scripts, try running directly
        const { Command } = await import("@tauri-apps/plugin-shell");
        const result = await Command.create("exec-sh", [activeFileData.path]).execute();
        const output = (result.stdout || "") + (result.stderr ? "\n" + result.stderr : "");
        appendOutput(output || "Script completed with no output.");
        return;
      } else {
        setOutput("Unsupported file type for execution");
        return;
      }
      
      // Use the proper API to run code (which handles Docker execution)
      const result = await runCode({
        language,
        code: activeFileData.content,
        project_path: project.path,
        entry_point: activeFileData.name,
      });
      
      const output = (result.stdout || "") + (result.stderr ? "\n" + result.stderr : "");
      appendOutput(output || "Program completed with no output.");
      
      if (result.exit_code !== 0) {
        appendOutput(`\nProcess exited with code ${result.exit_code}`);
      }
    } catch (err) {
      const errorMsg = "\nError: " + (err instanceof Error ? err.message : String(err));
      appendOutput(errorMsg);
      
      // Provide helpful message if Docker is not running
      if (errorMsg.includes("Docker")) {
        appendOutput("\n\nHint: Make sure Docker Desktop is installed and running.");
      }
    } finally {
      setIsRunningFile(false);
      setRunning(false);
    }
  }, [activeFileData, project?.path, setRunning, togglePanel, setOutput, appendOutput]);

  // Memoize editor mount handler
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Define dark theme
    monaco.editor.defineTheme("shell-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6a9955" },
        { token: "keyword", foreground: "569cd6" },
        { token: "string", foreground: "ce9178" },
        { token: "number", foreground: "b5cea8" },
        { token: "function", foreground: "dcdcaa" },
      ],
      colors: {
        "editor.background": "#1e1e1e",
        "editor.foreground": "#d4d4d4",
        "editor.lineHighlightBackground": "#2d2d2d",
        "editor.selectionBackground": "#264f78",
        "editorCursor.foreground": "#aeafad",
        "editorWhitespace.foreground": "#3b3b3b",
      },
    });
    
    // Define light theme
    monaco.editor.defineTheme("shell-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "008000" },
        { token: "keyword", foreground: "0000ff" },
        { token: "string", foreground: "a31515" },
        { token: "number", foreground: "098658" },
        { token: "function", foreground: "795e26" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#333333",
        "editor.lineHighlightBackground": "#f5f5f5",
        "editor.selectionBackground": "#add6ff",
        "editorCursor.foreground": "#333333",
        "editorWhitespace.foreground": "#d4d4d4",
      },
    });
    
    // Set initial theme based on document class
    const isDark = document.documentElement.classList.contains('dark') || !document.documentElement.classList.contains('light');
    monaco.editor.setTheme(isDark ? "shell-dark" : "shell-light");
  }, []);

  // Memoize editor change handler
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFileContent(activeFile, value);
    }
  }, [activeFile, updateFileContent]);

  // Memoize editor options
  const editorOptions = useMemo(() => ({
    fontSize: settings?.font_size || 14,
    fontFamily: settings?.font_family || "JetBrains Mono, monospace",
    tabSize: settings?.tab_size || 4,
    minimap: { enabled: viewMode !== "split" && (settings?.show_minimap ?? true) },
    wordWrap: settings?.word_wrap ? "on" as const : "off" as const,
    lineNumbers: settings?.line_numbers ? "on" as const : "off" as const,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    renderWhitespace: "selection" as const,
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
  }), [settings, viewMode]);

  if (openFiles.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#1e1e1e]">
        <div className="text-center max-w-md">
          <img src="/favicon.svg" alt="Shell" className="mx-auto mb-4 h-20 w-20" />
          <h2 className="mb-2 text-xl font-medium text-white">
            Welcome to Shell
          </h2>
          <p className="text-sm text-[#6b7280] mb-6">
            Select a file from the explorer to start coding
          </p>
          <div className="text-xs text-[#4a4a4a] space-y-1">
            <p><kbd className="bg-[#3c3c3c] px-1.5 py-0.5 rounded">⌘S</kbd> Save file</p>
            <p><kbd className="bg-[#3c3c3c] px-1.5 py-0.5 rounded">⌘`</kbd> Toggle terminal</p>
            <p><kbd className="bg-[#3c3c3c] px-1.5 py-0.5 rounded">⌘W</kbd> Close tab</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex h-9 items-center bg-[#252526] overflow-x-auto">
        <div className="flex flex-1 items-center overflow-x-auto">
          {openFiles.map((file) => (
            <div
              key={file.path}
              onClick={() => setActiveFile(file.path)}
              className={cn(
                "editor-tab group",
                activeFile === file.path && "active"
              )}
            >
              <span className="truncate max-w-[120px]">{file.name}</span>
              {file.modified ? (
                <Circle className="h-2 w-2 fill-current text-white" aria-hidden="true" />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFile(file.path);
                  }}
                  className="opacity-0 group-hover:opacity-100"
                  aria-label={`Close ${file.name}`}
                  title={`Close ${file.name}`}
                >
                  <X className="h-4 w-4 hover:bg-white/10 rounded" />
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Preview toggle buttons for markdown/html */}
        {isPreviewable && (
          <div className="flex items-center gap-0.5 px-2 border-l border-[#3c3c3c]">
            <button
              onClick={() => setViewMode("code")}
              className={cn(
                "p-1.5 rounded hover:bg-[#3c3c3c] transition-colors",
                viewMode === "code" ? "bg-[#3c3c3c] text-white" : "text-[#6b7280]"
              )}
              title="Source code"
              aria-label="View source code"
            >
              <Code className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={cn(
                "p-1.5 rounded hover:bg-[#3c3c3c] transition-colors",
                viewMode === "split" ? "bg-[#3c3c3c] text-white" : "text-[#6b7280]"
              )}
              title="Split view"
              aria-label="Split view"
            >
              <Columns className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={cn(
                "p-1.5 rounded hover:bg-[#3c3c3c] transition-colors",
                viewMode === "preview" ? "bg-[#3c3c3c] text-white" : "text-[#6b7280]"
              )}
              title="Preview"
              aria-label="Preview"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {/* Run button for executable files */}
        {isRunnable && (
          <div className="flex items-center px-2 border-l border-[#3c3c3c]">
            <button
              onClick={handleRunFile}
              disabled={isRunningFile}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded transition-colors",
                isRunningFile 
                  ? "bg-[#3c3c3c] text-[#6b7280] cursor-not-allowed"
                  : "bg-[#34d399]/20 text-[#34d399] hover:bg-[#34d399]/30"
              )}
              title="Run file"
              aria-label="Run file"
            >
              {isRunningFile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="text-xs font-medium">Run</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor / Preview area */}
      <div className="flex-1 flex">
        {activeFileData && (
          <>
            {/* Code editor - show in code or split mode */}
            {(viewMode === "code" || viewMode === "split") && (
              <div className={cn("flex-1 min-w-0", viewMode === "split" && "border-r border-[#3c3c3c]")}>
                <Suspense fallback={<EditorLoading />}>
                  <Editor
                    key={activeFile}
                    height="100%"
                    language={getMonacoLanguage(activeFileData.language)}
                    value={activeFileData.content}
                    onChange={handleEditorChange}
                    onMount={handleEditorMount}
                    options={editorOptions}
                    theme={(() => {
                      let t = theme;
                      if (t === 'system') {
                        t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                      }
                      return t === 'light' ? 'shell-light' : 'shell-dark';
                    })()}
                    loading={<EditorLoading />}
                  />
                </Suspense>
              </div>
            )}
            
            {/* Preview pane - show in preview or split mode */}
            {isPreviewable && (viewMode === "preview" || viewMode === "split") && (
              <div className="flex-1 min-w-0">
                <PreviewPane
                  content={activeFileData.content}
                  language={activeFileData.language}
                  filename={activeFileData.name}
                  key={`preview-${activeFile}-${viewMode}`}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
