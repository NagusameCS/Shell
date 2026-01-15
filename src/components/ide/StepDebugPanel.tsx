import { useStepDebugStore, ExecutionStep } from "@/stores/stepDebugStore";
import { useEditorStore } from "@/stores/editorStore";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  ChevronRight,
  Code,
  Variable,
  Terminal,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function StepDebugPanel() {
  const {
    isExecuting,
    isPaused,
    isComplete,
    hasError,
    steps,
    currentStepIndex,
    variables,
    output,
    sourceCode,
    currentLine,
    autoPlaySpeed,
    isAutoPlaying,
    startExecution,
    stepForward,
    stepBackward,
    play,
    pause,
    reset,
    setSpeed,
    jumpToStep,
  } = useStepDebugStore();

  const { activeFile, openFiles } = useEditorStore();
  const [activeTab, setActiveTab] = useState<"steps" | "variables" | "output">("steps");

  // Get current file content
  const currentFileData = openFiles.find((f) => f.path === activeFile);
  const currentCode = currentFileData?.content || "";
  
  // Detect language from file extension
  const getLanguage = () => {
    if (!activeFile) return "unknown";
    const ext = activeFile.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      py: "python",
      js: "javascript",
      ts: "typescript",
      java: "java",
      c: "c",
      cpp: "cpp",
      cs: "csharp",
      go: "go",
      rs: "rust",
      rb: "ruby",
      php: "php",
      swift: "swift",
      kt: "kotlin",
    };
    return langMap[ext || ""] || ext || "unknown";
  };

  const handleStart = () => {
    if (!currentCode) return;
    startExecution(currentCode, getLanguage());
    stepForward(); // Advance to first step
  };

  const currentStep = steps[currentStepIndex];

  // Speed presets - simplified to 0.5x and 1x only
  const speeds = [
    { label: "0.5x", value: 2000 },
    { label: "1x", value: 1000 },
  ];

  const getStepIcon = (type: ExecutionStep["type"]) => {
    switch (type) {
      case "variable_declaration":
      case "variable_assignment":
        return <Variable className="h-3.5 w-3.5 text-blue-400" />;
      case "output":
        return <Terminal className="h-3.5 w-3.5 text-green-400" />;
      case "error":
        return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
      case "condition_check":
        return <Activity className="h-3.5 w-3.5 text-yellow-400" />;
      case "loop_init":
      case "loop_iteration":
      case "loop_update":
        return <RotateCcw className="h-3.5 w-3.5 text-purple-400" />;
      case "function_call":
      case "method_call":
        return <Zap className="h-3.5 w-3.5 text-orange-400" />;
      case "return":
        return <ChevronRight className="h-3.5 w-3.5 text-cyan-400" />;
      default:
        return <Code className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const getStepTypeLabel = (type: ExecutionStep["type"]) => {
    const labels: Record<ExecutionStep["type"], string> = {
      variable_declaration: "DECLARE",
      variable_assignment: "ASSIGN",
      condition_check: "CONDITION",
      loop_iteration: "LOOP",
      loop_init: "LOOP START",
      loop_update: "LOOP UPDATE",
      function_call: "FUNCTION",
      function_return: "RETURN",
      output: "OUTPUT",
      input: "INPUT",
      expression: "EXECUTE",
      comparison: "COMPARE",
      arithmetic: "MATH",
      array_access: "ARRAY",
      array_modification: "ARRAY MOD",
      object_access: "OBJECT",
      object_modification: "OBJ MOD",
      error: "ERROR",
      comment: "COMMENT",
      import: "IMPORT",
      class_definition: "CLASS",
      method_call: "METHOD",
      constructor: "CONSTRUCTOR",
      try_block: "TRY",
      catch_block: "CATCH",
      throw_exception: "THROW",
      if_branch: "IF TRUE",
      else_branch: "ELSE",
      switch_case: "SWITCH",
      break: "BREAK",
      continue: "CONTINUE",
      return: "RETURN",
    };
    return labels[type] || type.toUpperCase();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with file info */}
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-2 bg-shell-700/50">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-[var(--accent-color)]" />
          <span className="text-xs font-medium text-white/80">
            {activeFile ? activeFile.split("/").pop() : "No file open"}
          </span>
          {getLanguage() !== "unknown" && (
            <span className="px-1.5 py-0.5 text-[10px] bg-[var(--accent-color)]/20 text-[var(--accent-color)] rounded">
              {getLanguage().toUpperCase()}
            </span>
          )}
        </div>
        
        {isExecuting && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-white/50">Step</span>
            <span className="font-mono text-[var(--accent-color)]">
              {currentStepIndex + 1}/{steps.length}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 border-b border-panel-border px-2 py-1.5 bg-shell-800/50">
        {!isExecuting ? (
          <button
            onClick={handleStart}
            disabled={!currentCode}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all",
              currentCode
                ? "bg-[var(--accent-color)] text-white hover:bg-[var(--accent-color-hover)]"
                : "bg-shell-600 text-white/40 cursor-not-allowed"
            )}
          >
            <Play className="h-3.5 w-3.5" />
            Start Step-by-Step
          </button>
        ) : (
          <>
            <button
              onClick={stepBackward}
              disabled={currentStepIndex <= 0}
              className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Previous Step"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            
            {isAutoPlaying ? (
              <button
                onClick={pause}
                className="p-1.5 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                title="Pause"
              >
                <Pause className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={play}
                disabled={isComplete}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  isComplete
                    ? "opacity-30"
                    : "bg-[var(--accent-color)]/20 text-[var(--accent-color)] hover:bg-[var(--accent-color)]/30"
                )}
                title="Auto-Play"
              >
                <Play className="h-4 w-4" />
              </button>
            )}
            
            <button
              onClick={stepForward}
              disabled={isComplete}
              className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Next Step"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            
            <div className="w-px h-4 bg-white/10 mx-1" />
            
            <button
              onClick={reset}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              title="Reset"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            
            {/* Speed selector */}
            <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-shell-700 rounded">
              <Clock className="h-3 w-3 text-white/40" />
              {speeds.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSpeed(s.value)}
                  className={cn(
                    "px-1.5 py-0.5 text-[10px] rounded transition-colors",
                    autoPlaySpeed === s.value
                      ? "bg-[var(--accent-color)] text-white"
                      : "text-white/50 hover:text-white/80"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}
        
        {/* Status indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          {isComplete && (
            <div className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Complete</span>
            </div>
          )}
          {hasError && (
            <div className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Error</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {isExecuting && (
        <div className="flex border-b border-panel-border bg-shell-800/30">
          {[
            { id: "steps" as const, label: "Execution", icon: Activity },
            { id: "variables" as const, label: "Variables", icon: Variable },
            { id: "output" as const, label: "Output", icon: Terminal },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
                activeTab === tab.id
                  ? "text-[var(--accent-color)] border-b-2 border-[var(--accent-color)]"
                  : "text-white/50 hover:text-white/80"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.id === "output" && output.length > 0 && (
                <span className="ml-1 px-1 py-0.5 text-[9px] bg-[var(--accent-color)]/20 text-[var(--accent-color)] rounded">
                  {output.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!isExecuting ? (
          // Welcome state
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-color)]/20 to-[var(--accent-color)]/5 flex items-center justify-center mb-4">
              <Activity className="h-8 w-8 text-[var(--accent-color)]" />
            </div>
            <h3 className="text-sm font-medium text-white mb-2">Step-by-Step Execution</h3>
            <p className="text-xs text-white/50 max-w-xs mb-4">
              Watch your code execute line by line with detailed explanations of each operation.
            </p>
            <div className="space-y-2 text-xs text-white/40">
              <p>• See variable values change in real-time</p>
              <p>• Understand loop iterations step by step</p>
              <p>• Track function calls and returns</p>
              <p>• Identify errors before they crash</p>
            </div>
            {!currentCode && (
              <p className="mt-4 text-xs text-yellow-400/70">
                Open a file to start debugging
              </p>
            )}
          </div>
        ) : activeTab === "steps" ? (
          // Steps list
          <div className="p-2 space-y-1">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => jumpToStep(index)}
                className={cn(
                  "w-full text-left p-2 rounded-lg transition-all",
                  index === currentStepIndex
                    ? "bg-[var(--accent-color)]/20 border border-[var(--accent-color)]/50"
                    : index < currentStepIndex
                    ? "bg-white/5 opacity-60"
                    : "bg-shell-700/30 opacity-40 hover:opacity-60",
                  step.type === "error" && "border-red-500/50 bg-red-500/10"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStepIcon(step.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono px-1 py-0.5 bg-white/10 rounded text-white/60">
                        L{step.lineNumber}
                      </span>
                      <span className="text-[10px] font-medium text-white/50 uppercase">
                        {getStepTypeLabel(step.type)}
                      </span>
                    </div>
                    <p className="text-xs text-white/90 leading-relaxed">
                      {step.explanation}
                    </p>
                    {step.sourceCode && (
                      <code className="block mt-1 text-[10px] font-mono text-white/40 truncate">
                        {step.sourceCode}
                      </code>
                    )}
                  </div>
                </div>
              </button>
            ))}
            
            {isComplete && (
              <div className="text-center py-4 text-xs text-green-400 flex items-center justify-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                Execution complete — {steps.length} steps
              </div>
            )}
          </div>
        ) : activeTab === "variables" ? (
          // Variables view
          <div className="p-3 space-y-2">
            {Object.keys(variables).length === 0 ? (
              <div className="text-center py-8 text-xs text-white/40">
                No variables defined yet
              </div>
            ) : (
              Object.entries(variables).map(([name, variable]) => (
                <div
                  key={name}
                  className="p-2 rounded-lg bg-shell-700/50 border border-white/5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-[var(--accent-color)]">
                      {name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/50">
                      {variable.type}
                    </span>
                  </div>
                  <div className="font-mono text-sm text-white">
                    {JSON.stringify(variable.value)}
                  </div>
                  {variable.history.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="text-[10px] text-white/40 mb-1">History:</div>
                      <div className="flex flex-wrap gap-1">
                        {variable.history.map((h, i) => (
                          <span
                            key={i}
                            className={cn(
                              "px-1.5 py-0.5 text-[10px] font-mono rounded",
                              i === variable.history.length - 1
                                ? "bg-[var(--accent-color)]/20 text-[var(--accent-color)]"
                                : "bg-white/5 text-white/40"
                            )}
                          >
                            {JSON.stringify(h.value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          // Output view
          <div className="p-3">
            {output.length === 0 ? (
              <div className="text-center py-8 text-xs text-white/40">
                No output yet
              </div>
            ) : (
              <div className="font-mono text-sm space-y-1 bg-black/30 rounded-lg p-3">
                {output.map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] text-white/30 select-none w-4">
                      {i + 1}
                    </span>
                    <span className="text-green-400">{line}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current line indicator */}
      {isExecuting && currentStep && (
        <div className="border-t border-panel-border p-2 bg-shell-800/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--accent-color)]/20 text-[var(--accent-color)] rounded">
              Line {currentLine}
            </span>
            <code className="text-xs font-mono text-white/70 truncate flex-1">
              {currentStep.sourceCode}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
