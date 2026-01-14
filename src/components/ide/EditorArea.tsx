import { useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useEditorStore } from "@/stores/editorStore";
import { useAppStore } from "@/stores/appStore";
import { getMonacoLanguage, cn } from "@/lib/utils";
import { X, Circle, Eye, Code, Columns, Play, Loader2 } from "lucide-react";
import { PreviewPane } from "./PreviewPane";
import { Command } from "@tauri-apps/plugin-shell";
import type { editor } from "monaco-editor";

export function EditorArea() {
  const { 
    openFiles, 
    activeFile, 
    setActiveFile, 
    closeFile, 
    updateFileContent,
    setOutput, 
    setRunning, 
    appendOutput 
  } = useEditorStore();
  const { settings, project, togglePanel } = useAppStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [viewMode, setViewMode] = useState<"code" | "preview" | "split">("code");
  const [isRunningFile, setIsRunningFile] = useState(false);

  const activeFileData = openFiles.find((f) => f.path === activeFile);
  
  // Check if file supports preview
  const isPreviewable = activeFileData && (
    activeFileData.language === "markdown" ||
    activeFileData.language === "html" ||
    activeFileData.name.endsWith(".md") ||
    activeFileData.name.endsWith(".mdx") ||
    activeFileData.name.endsWith(".html") ||
    activeFileData.name.endsWith(".htm")
  );

  // Check if file is executable/runnable
  const isRunnable = activeFileData && (
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
  );

  const handleRunFile = async () => {
    if (!activeFileData || !project?.path) return;
    
    setIsRunningFile(true);
    setRunning(true);
    togglePanel(); // Show the output panel
    setOutput("Running " + activeFileData.name + "...\n\n");
    
    try {
      const filePath = activeFileData.path;
      const fileName = activeFileData.name;
      let cmd: string;
      let args: string[];
      
      // Determine how to run based on file extension
      if (fileName.endsWith(".py")) {
        cmd = "python3";
        args = [filePath];
      } else if (fileName.endsWith(".js")) {
        cmd = "node";
        args = [filePath];
      } else if (fileName.endsWith(".ts")) {
        cmd = "npx";
        args = ["ts-node", filePath];
      } else if (fileName.endsWith(".java")) {
        // For Java, compile first then run
        const className = fileName.replace(".java", "");
        const javaCmd = Command.create("exec-sh", ["-c", `cd "${project.path}" && javac "${filePath}" && java -cp "$(dirname "${filePath}")" ${className}`]);
        const javaResult = await javaCmd.execute();
        const javaOutput = (javaResult.stdout || "") + (javaResult.stderr ? "\n" + javaResult.stderr : "");
        appendOutput(javaOutput);
        setIsRunningFile(false);
        setRunning(false);
        return;
      } else if (fileName.endsWith(".rs")) {
        cmd = "cargo";
        args = ["run"];
      } else if (fileName.endsWith(".go")) {
        cmd = "go";
        args = ["run", filePath];
      } else if (fileName.endsWith(".rb")) {
        cmd = "ruby";
        args = [filePath];
      } else if (fileName.endsWith(".sh")) {
        cmd = "exec-sh";
        args = [filePath];
      } else {
        setOutput("Unsupported file type for execution");
        setIsRunningFile(false);
        setRunning(false);
        return;
      }
      
      const runCmd = Command.create(cmd, args, { cwd: project.path });
      const runResult = await runCmd.execute();
      const runOutput = (runResult.stdout || "") + (runResult.stderr ? "\n" + runResult.stderr : "");
      appendOutput(runOutput);
    } catch (err) {
      const errorMsg = "\nError: " + (err instanceof Error ? err.message : String(err));
      appendOutput(errorMsg);
    } finally {
      setIsRunningFile(false);
      setRunning(false);
    }
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure editor theme
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
    monaco.editor.setTheme("shell-dark");
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeFile && value !== undefined) {
      updateFileContent(activeFile, value);
    }
  };

  if (openFiles.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#1e1e1e]">
        <div className="text-center">
          <img src="/favicon.svg" alt="Shell" className="mx-auto mb-4 h-16 w-16" />
          <h2 className="mb-2 text-xl font-medium text-white">
            Welcome to Shell
          </h2>
          <p className="text-sm text-[#6b7280]">
            Open a file or lesson to start coding
          </p>
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
              <div className={cn("flex-1", viewMode === "split" && "border-r border-[#3c3c3c]")}>
                <Editor
                  key={activeFile}
                  height="100%"
                  language={getMonacoLanguage(activeFileData.language)}
                  value={activeFileData.content}
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  options={{
                    fontSize: settings?.font_size || 14,
                    fontFamily: settings?.font_family || "JetBrains Mono, monospace",
                    tabSize: settings?.tab_size || 4,
                    minimap: { enabled: viewMode !== "split" && (settings?.show_minimap ?? true) },
                    wordWrap: settings?.word_wrap ? "on" : "off",
                    lineNumbers: settings?.line_numbers ? "on" : "off",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    renderWhitespace: "selection",
                    bracketPairColorization: { enabled: true },
                    guides: {
                      bracketPairs: true,
                      indentation: true,
                    },
                  }}
                  theme="shell-dark"
                />
              </div>
            )}
            
            {/* Preview pane - show in preview or split mode */}
            {isPreviewable && (viewMode === "preview" || viewMode === "split") && (
              <div className="flex-1">
                <PreviewPane
                  content={activeFileData.content}
                  language={activeFileData.language}
                  filename={activeFileData.name}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
