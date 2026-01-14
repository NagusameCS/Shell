import { useState } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { useAppStore } from "@/stores/appStore";
import { TerminalView } from "./TerminalView";
import { IODiagramView } from "./IODiagramView";
import {
  Terminal,
  AlertCircle,
  CheckCircle,
  Play,
  Square,
  Trash2,
  X,
  FlaskConical,
  Eye,
  EyeOff,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
  passed?: boolean;
  actualOutput?: string;
}

export function Panel() {
  const [activeTab, setActiveTab] = useState<"output" | "problems" | "terminal" | "tests" | "io">(
    "terminal"
  );
  const { output, errors, isRunning, clearOutput, clearErrors } =
    useEditorStore();
  const { togglePanel, lesson } = useAppStore();

  // Get test cases from current lesson
  const testCases: TestCase[] = lesson?.test_cases || [];
  const visibleTests = testCases.filter((t) => !t.hidden);
  const hiddenTests = testCases.filter((t) => t.hidden);

  return (
    <div className="flex h-48 flex-col border-t border-panel-border bg-panel-bg">
      {/* Tab bar */}
      <div className="flex h-9 items-center justify-between border-b border-panel-border px-2">
        <div className="flex">
          <button
            onClick={() => setActiveTab("output")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
              activeTab === "output"
                ? "text-white"
                : "text-sidebar-fg/60 hover:text-sidebar-fg"
            )}
          >
            <Terminal className="h-3.5 w-3.5" />
            Output
          </button>
          <button
            onClick={() => setActiveTab("problems")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
              activeTab === "problems"
                ? "text-white"
                : "text-sidebar-fg/60 hover:text-sidebar-fg"
            )}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Problems
            {errors.length > 0 && (
              <span className="ml-1 rounded-full bg-error px-1.5 text-xxs text-white">
                {errors.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("terminal")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
              activeTab === "terminal"
                ? "text-white"
                : "text-sidebar-fg/60 hover:text-sidebar-fg"
            )}
          >
            Terminal
          </button>
          {lesson && (
            <button
              onClick={() => setActiveTab("tests")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
                activeTab === "tests"
                  ? "text-white"
                  : "text-sidebar-fg/60 hover:text-sidebar-fg"
              )}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Tests
              {testCases.length > 0 && (
                <span className="ml-1 rounded-full bg-[var(--accent-color)] px-1.5 text-xxs text-white">
                  {testCases.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab("io")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
              activeTab === "io"
                ? "text-white"
                : "text-sidebar-fg/60 hover:text-sidebar-fg"
            )}
          >
            <GitBranch className="h-3.5 w-3.5" />
            IO
          </button>
        </div>

        <div className="flex items-center gap-1">
          {activeTab === "output" && (
            <>
              {isRunning ? (
                <button
                  onClick={() => {}}
                  className="p-1 hover:bg-white/10 rounded"
                  title="Stop"
                >
                  <Square className="h-4 w-4 text-error" />
                </button>
              ) : (
                <button
                  onClick={() => {}}
                  className="p-1 hover:bg-white/10 rounded"
                  title="Run"
                >
                  <Play className="h-4 w-4 text-success" />
                </button>
              )}
              <button
                onClick={clearOutput}
                className="p-1 hover:bg-white/10 rounded"
                title="Clear"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={togglePanel}
            className="p-1 hover:bg-white/10 rounded"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2 font-mono text-xs">
        {activeTab === "output" && (
          <div className="whitespace-pre-wrap">
            {output || (
              <span className="text-muted-foreground">
                Run your code to see output here
              </span>
            )}
          </div>
        )}

        {activeTab === "problems" && (
          <div>
            {errors.length === 0 ? (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="h-4 w-4" />
                <span>No problems</span>
              </div>
            ) : (
              <div className="space-y-1">
                {errors.map((error, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded p-1 hover:bg-white/5"
                  >
                    <AlertCircle
                      className={cn(
                        "mt-0.5 h-4 w-4 flex-shrink-0",
                        error.severity === "error"
                          ? "text-error"
                          : error.severity === "warning"
                          ? "text-warning"
                          : "text-shell-400"
                      )}
                    />
                    <div>
                      <span className="text-muted-foreground">
                        {error.file}:{error.line}:{error.column}
                      </span>
                      <span className="ml-2">{error.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "tests" && lesson && (
          <div className="space-y-3">
            {testCases.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FlaskConical className="h-4 w-4" />
                <span>No test cases for this lesson</span>
              </div>
            ) : (
              <>
                {/* Visible Tests */}
                {visibleTests.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-sidebar-fg/80">
                      <Eye className="h-4 w-4" />
                      Visible Tests ({visibleTests.length})
                    </div>
                    {visibleTests.map((test) => (
                      <div
                        key={test.id}
                        className={cn(
                          "rounded-lg border p-3 transition-colors",
                          test.passed === true
                            ? "border-success/30 bg-success/5"
                            : test.passed === false
                            ? "border-error/30 bg-error/5"
                            : "border-border/30 bg-white/5"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{test.name}</span>
                          {test.passed !== undefined && (
                            <span
                              className={cn(
                                "flex items-center gap-1 text-xs",
                                test.passed ? "text-success" : "text-error"
                              )}
                            >
                              {test.passed ? (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Passed
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  Failed
                                </>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-muted-foreground mb-1">Input:</div>
                            <pre className="bg-black/20 rounded p-2 whitespace-pre-wrap">
                              {test.input || "(no input)"}
                            </pre>
                          </div>
                          <div>
                            <div className="text-muted-foreground mb-1">Expected:</div>
                            <pre className="bg-black/20 rounded p-2 whitespace-pre-wrap">
                              {test.expectedOutput}
                            </pre>
                          </div>
                        </div>
                        {test.actualOutput !== undefined && (
                          <div className="mt-2 text-xs">
                            <div className="text-muted-foreground mb-1">Your Output:</div>
                            <pre
                              className={cn(
                                "rounded p-2 whitespace-pre-wrap",
                                test.passed ? "bg-success/10" : "bg-error/10"
                              )}
                            >
                              {test.actualOutput || "(no output)"}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden Tests */}
                {hiddenTests.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-sidebar-fg/80">
                      <EyeOff className="h-4 w-4" />
                      Hidden Tests ({hiddenTests.length})
                    </div>
                    {hiddenTests.map((test) => (
                      <div
                        key={test.id}
                        className={cn(
                          "rounded-lg border p-3 transition-colors",
                          test.passed === true
                            ? "border-success/30 bg-success/5"
                            : test.passed === false
                            ? "border-error/30 bg-error/5"
                            : "border-border/30 bg-white/5"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{test.name}</span>
                          {test.passed !== undefined ? (
                            <span
                              className={cn(
                                "flex items-center gap-1 text-xs",
                                test.passed ? "text-success" : "text-error"
                              )}
                            >
                              {test.passed ? (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Passed
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  Failed
                                </>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Run code to test
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Test details are hidden. Run your code to see if it passes.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "terminal" && (
          <TerminalView />
        )}

        {activeTab === "io" && (
          <IODiagramView />
        )}
      </div>
    </div>
  );
}
