import { create } from "zustand";

export interface ExecutionStep {
  id: number;
  type: 
    | "variable_declaration"
    | "variable_assignment"
    | "condition_check"
    | "loop_iteration"
    | "loop_init"
    | "loop_update"
    | "function_call"
    | "function_return"
    | "output"
    | "input"
    | "expression"
    | "comparison"
    | "arithmetic"
    | "array_access"
    | "array_modification"
    | "object_access"
    | "object_modification"
    | "error"
    | "comment"
    | "import"
    | "class_definition"
    | "method_call"
    | "constructor"
    | "try_block"
    | "catch_block"
    | "throw_exception"
    | "if_branch"
    | "else_branch"
    | "switch_case"
    | "break"
    | "continue"
    | "return";
  lineNumber: number;
  sourceCode: string;
  explanation: string;
  details: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    value?: unknown;
    condition?: string;
    result?: unknown;
    error?: { message: string; code?: string };
  };
  timestamp: number;
}

export interface Variable {
  name: string;
  value: unknown;
  type: string;
  scope: string;
  history: { value: unknown; step: number }[];
}

export interface CallStackFrame {
  functionName: string;
  lineNumber: number;
  variables: Record<string, Variable>;
}

interface StepDebugState {
  // Execution state
  isExecuting: boolean;
  isPaused: boolean;
  isComplete: boolean;
  hasError: boolean;
  
  // Steps
  steps: ExecutionStep[];
  currentStepIndex: number;
  
  // Variables and state
  variables: Record<string, Variable>;
  callStack: CallStackFrame[];
  output: string[];
  
  // Source tracking
  sourceCode: string;
  language: string;
  currentLine: number;
  
  // Speed control (ms between auto-steps)
  autoPlaySpeed: number;
  isAutoPlaying: boolean;
  
  // Actions
  startExecution: (code: string, language: string) => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToStep: (index: number) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  
  // Internal
  _parseAndGenerateSteps: (code: string, language: string) => ExecutionStep[];
  _autoPlayInterval: NodeJS.Timeout | null;
}

// Language-agnostic code parser and step generator
function parseCode(code: string, language: string): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  const lines = code.split("\n");
  let stepId = 0;
  
  // Track state for simulation
  const state = {
    variables: new Map<string, { value: unknown; type: string }>(),
    inLoop: false,
    loopVar: "",
    loopCondition: "",
    inFunction: false,
    functionName: "",
    inClass: false,
    className: "",
  };

  const createStep = (
    type: ExecutionStep["type"],
    lineNumber: number,
    sourceCode: string,
    explanation: string,
    details: ExecutionStep["details"] = {}
  ): ExecutionStep => ({
    id: stepId++,
    type,
    lineNumber,
    sourceCode: sourceCode.trim(),
    explanation,
    details,
    timestamp: Date.now(),
  });

  // Helper to format values nicely
  const formatValue = (value: unknown): string => {
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (typeof value === "string") return `"${value}"`;
    if (Array.isArray(value)) return `[${value.map(formatValue).join(", ")}]`;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  // Helper to detect language patterns
  const patterns = getLanguagePatterns(language);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Skip empty lines
    if (!trimmed) continue;

    // Comments
    if (patterns.isComment(trimmed)) {
      steps.push(createStep(
        "comment",
        lineNum,
        trimmed,
        `📝 Comment: "${trimmed.replace(patterns.commentPrefix, "").trim()}"`,
        {}
      ));
      continue;
    }

    // Import/Include statements
    if (patterns.isImport(trimmed)) {
      const moduleName = patterns.extractImport(trimmed);
      steps.push(createStep(
        "import",
        lineNum,
        trimmed,
        `📦 Importing module: ${moduleName}`,
        { value: moduleName }
      ));
      continue;
    }

    // Class definition
    if (patterns.isClass(trimmed)) {
      const className = patterns.extractClassName(trimmed);
      state.inClass = true;
      state.className = className;
      steps.push(createStep(
        "class_definition",
        lineNum,
        trimmed,
        `🏗️ Defining class "${className}"`,
        { value: className }
      ));
      continue;
    }

    // Function/Method definition
    if (patterns.isFunction(trimmed)) {
      const { name, params } = patterns.extractFunction(trimmed);
      state.inFunction = true;
      state.functionName = name;
      const context = state.inClass ? `method of class "${state.className}"` : "function";
      steps.push(createStep(
        "function_call",
        lineNum,
        trimmed,
        `🔧 Defining ${context} "${name}" with parameters: (${params.join(", ") || "none"})`,
        { value: { name, params } }
      ));
      continue;
    }

    // Variable declaration with assignment
    if (patterns.isVariableDeclaration(trimmed)) {
      const { name, value, varType } = patterns.extractVariable(trimmed);
      const evaluatedValue = evaluateExpression(value, state.variables);
      state.variables.set(name, { value: evaluatedValue, type: varType || typeof evaluatedValue });
      
      steps.push(createStep(
        "variable_declaration",
        lineNum,
        trimmed,
        `📌 Declaring variable "${name}" of type ${varType || inferType(evaluatedValue)}`,
        { after: { [name]: evaluatedValue } }
      ));
      
      if (value && value !== "undefined" && value !== "null") {
        steps.push(createStep(
          "variable_assignment",
          lineNum,
          trimmed,
          `   ➜ Assigning value ${formatValue(evaluatedValue)} to "${name}"`,
          { 
            before: { [name]: undefined },
            after: { [name]: evaluatedValue },
            value: evaluatedValue 
          }
        ));
      }
      continue;
    }

    // For loop
    if (patterns.isForLoop(trimmed)) {
      const { init, condition, update } = patterns.extractForLoop(trimmed);
      state.inLoop = true;
      
      // Parse initialization
      if (init) {
        const initMatch = init.match(/(\w+)\s*=\s*(.+)/);
        if (initMatch) {
          const varName = initMatch[1];
          const initValue = evaluateExpression(initMatch[2], state.variables);
          state.variables.set(varName, { value: initValue, type: typeof initValue });
          state.loopVar = varName;
          
          steps.push(createStep(
            "loop_init",
            lineNum,
            trimmed,
            `🔄 Starting FOR loop`,
            {}
          ));
          
          steps.push(createStep(
            "variable_declaration",
            lineNum,
            init,
            `   ➜ Initializing loop variable "${varName}" = ${formatValue(initValue)}`,
            { after: { [varName]: initValue } }
          ));
        }
      }
      
      // Simulate loop iterations (limit to prevent infinite loops)
      const maxIterations = 10;
      for (let iter = 0; iter < maxIterations; iter++) {
        const currentValue = state.variables.get(state.loopVar)?.value;
        const conditionResult = evaluateCondition(condition, state.variables);
        
        steps.push(createStep(
          "condition_check",
          lineNum,
          condition,
          `   ➜ Checking condition: ${condition.replace(state.loopVar, `${state.loopVar}(${currentValue})`)} = ${conditionResult}`,
          { condition, result: conditionResult, value: currentValue }
        ));
        
        if (!conditionResult) {
          steps.push(createStep(
            "loop_iteration",
            lineNum,
            "",
            `   ✋ Loop condition is FALSE — exiting loop`,
            { result: false }
          ));
          break;
        }
        
        steps.push(createStep(
          "loop_iteration",
          lineNum,
          "",
          `   ✅ Loop condition is TRUE — entering iteration ${iter + 1}`,
          { result: true }
        ));
        
        // Find loop body and add those steps
        const bodySteps = findLoopBody(lines, i + 1, patterns);
        for (const bodyLine of bodySteps) {
          // Process body line (simplified - would need full recursive parsing)
          if (patterns.isPrint(bodyLine.trim())) {
            const printContent = patterns.extractPrint(bodyLine.trim());
            const evaluated = evaluateExpression(printContent, state.variables);
            steps.push(createStep(
              "output",
              bodyLine.lineNum,
              bodyLine.trim(),
              `   📤 OUTPUT: ${formatValue(evaluated)}`,
              { value: evaluated }
            ));
          }
        }
        
        // Update step
        if (update) {
          const oldValue = state.variables.get(state.loopVar)?.value as number;
          const newValue = evaluateUpdate(update, oldValue);
          state.variables.set(state.loopVar, { value: newValue, type: "number" });
          
          steps.push(createStep(
            "loop_update",
            lineNum,
            update,
            `   ➜ Update: ${state.loopVar} changes from ${oldValue} to ${newValue} (${update})`,
            { before: { [state.loopVar]: oldValue }, after: { [state.loopVar]: newValue } }
          ));
        }
      }
      
      // Skip the loop body lines since we processed them
      const endBrace = findClosingBrace(lines, i);
      if (endBrace > i) {
        i = endBrace;
      }
      continue;
    }

    // While loop
    if (patterns.isWhileLoop(trimmed)) {
      const condition = patterns.extractWhileCondition(trimmed);
      
      steps.push(createStep(
        "loop_init",
        lineNum,
        trimmed,
        `🔄 Starting WHILE loop with condition: ${condition}`,
        { condition }
      ));
      
      // Simulate a few iterations
      for (let iter = 0; iter < 5; iter++) {
        const result = evaluateCondition(condition, state.variables);
        steps.push(createStep(
          "condition_check",
          lineNum,
          condition,
          `   ➜ Checking: ${condition} = ${result}`,
          { condition, result }
        ));
        
        if (!result) {
          steps.push(createStep(
            "loop_iteration",
            lineNum,
            "",
            `   ✋ Condition FALSE — exiting while loop`,
            {}
          ));
          break;
        }
        
        steps.push(createStep(
          "loop_iteration",
          lineNum,
          "",
          `   ✅ Condition TRUE — executing loop body (iteration ${iter + 1})`,
          {}
        ));
      }
      continue;
    }

    // If statement
    if (patterns.isIf(trimmed)) {
      const condition = patterns.extractIfCondition(trimmed);
      const result = evaluateCondition(condition, state.variables);
      
      steps.push(createStep(
        "condition_check",
        lineNum,
        trimmed,
        `🤔 Evaluating IF condition: ${condition}`,
        { condition }
      ));
      
      steps.push(createStep(
        result ? "if_branch" : "else_branch",
        lineNum,
        "",
        result 
          ? `   ✅ Condition is TRUE — entering IF block`
          : `   ❌ Condition is FALSE — skipping IF block`,
        { result }
      ));
      continue;
    }

    // Else if
    if (patterns.isElseIf(trimmed)) {
      const condition = patterns.extractIfCondition(trimmed);
      steps.push(createStep(
        "condition_check",
        lineNum,
        trimmed,
        `🤔 Evaluating ELSE IF condition: ${condition}`,
        { condition }
      ));
      continue;
    }

    // Else
    if (patterns.isElse(trimmed)) {
      steps.push(createStep(
        "else_branch",
        lineNum,
        trimmed,
        `↪️ Entering ELSE block (previous conditions were FALSE)`,
        {}
      ));
      continue;
    }

    // Print/Output statements
    if (patterns.isPrint(trimmed)) {
      const content = patterns.extractPrint(trimmed);
      const evaluated = evaluateExpression(content, state.variables);
      steps.push(createStep(
        "output",
        lineNum,
        trimmed,
        `📤 OUTPUT: ${formatValue(evaluated)}`,
        { value: evaluated }
      ));
      continue;
    }

    // Return statement
    if (patterns.isReturn(trimmed)) {
      const value = patterns.extractReturn(trimmed);
      const evaluated = value ? evaluateExpression(value, state.variables) : undefined;
      steps.push(createStep(
        "return",
        lineNum,
        trimmed,
        `↩️ Returning ${value ? formatValue(evaluated) : "void"} from function "${state.functionName || "main"}"`,
        { value: evaluated }
      ));
      continue;
    }

    // Assignment (not declaration)
    if (patterns.isAssignment(trimmed)) {
      const { name, operator, value } = patterns.extractAssignment(trimmed);
      const oldValue = state.variables.get(name)?.value;
      const newValue = evaluateAssignment(oldValue, operator, value, state.variables);
      state.variables.set(name, { value: newValue, type: typeof newValue });
      
      steps.push(createStep(
        "variable_assignment",
        lineNum,
        trimmed,
        `📝 Updating "${name}": ${formatValue(oldValue)} ${operator} ${value} ➜ ${formatValue(newValue)}`,
        { 
          before: { [name]: oldValue },
          after: { [name]: newValue }
        }
      ));
      continue;
    }

    // Method/function call
    if (patterns.isMethodCall(trimmed)) {
      const { object, method, args } = patterns.extractMethodCall(trimmed);
      steps.push(createStep(
        "method_call",
        lineNum,
        trimmed,
        `📞 Calling ${object ? `${object}.` : ""}${method}(${args.join(", ")})`,
        { value: { object, method, args } }
      ));
      continue;
    }

    // Try block
    if (patterns.isTry(trimmed)) {
      steps.push(createStep(
        "try_block",
        lineNum,
        trimmed,
        `🛡️ Entering TRY block — exceptions will be caught`,
        {}
      ));
      continue;
    }

    // Catch block
    if (patterns.isCatch(trimmed)) {
      const exceptionType = patterns.extractCatch(trimmed);
      steps.push(createStep(
        "catch_block",
        lineNum,
        trimmed,
        `🎣 CATCH block for ${exceptionType || "Exception"}`,
        { value: exceptionType }
      ));
      continue;
    }

    // Break statement
    if (patterns.isBreak(trimmed)) {
      steps.push(createStep(
        "break",
        lineNum,
        trimmed,
        `🛑 BREAK — exiting current loop immediately`,
        {}
      ));
      continue;
    }

    // Continue statement
    if (patterns.isContinue(trimmed)) {
      steps.push(createStep(
        "continue",
        lineNum,
        trimmed,
        `⏭️ CONTINUE — skipping to next iteration`,
        {}
      ));
      continue;
    }

    // Array access
    if (patterns.isArrayAccess(trimmed)) {
      const { array, index, value } = patterns.extractArrayAccess(trimmed);
      steps.push(createStep(
        "array_access",
        lineNum,
        trimmed,
        `📊 Accessing ${array}[${index}] = ${formatValue(value)}`,
        { value: { array, index, result: value } }
      ));
      continue;
    }

    // Generic expression or unrecognized
    if (trimmed && !trimmed.match(/^[{}]$/)) {
      steps.push(createStep(
        "expression",
        lineNum,
        trimmed,
        `⚡ Executing: ${trimmed}`,
        {}
      ));
    }
  }

  return steps;
}

// Language pattern detection
function getLanguagePatterns(language: string) {
  const lang = language.toLowerCase();
  
  // Common patterns that work across most languages
  const common = {
    isComment: (line: string) => 
      line.startsWith("//") || line.startsWith("#") || line.startsWith("--") ||
      line.startsWith("/*") || line.startsWith("'''") || line.startsWith('"""'),
    commentPrefix: /^(\/\/|#|--|\/\*|\*|'''|""")\s*/,
    
    isImport: (line: string) =>
      line.startsWith("import ") || line.startsWith("from ") ||
      line.startsWith("#include") || line.startsWith("using ") ||
      line.startsWith("require"),
    extractImport: (line: string) => {
      const match = line.match(/(?:import|from|#include|using|require)\s*[<"]?([^>";\s]+)/);
      return match?.[1] || line;
    },
    
    isClass: (line: string) =>
      /^(public\s+|private\s+|protected\s+)?(abstract\s+|final\s+)?class\s+\w+/.test(line) ||
      /^class\s+\w+/.test(line),
    extractClassName: (line: string) => {
      const match = line.match(/class\s+(\w+)/);
      return match?.[1] || "Unknown";
    },
    
    isFunction: (line: string) =>
      /^(public|private|protected|static|async|def|func|function|fn)\s+\w+/.test(line) ||
      /^\w+\s+\w+\s*\([^)]*\)\s*[{:]?/.test(line) ||
      /^(\w+)\s*=\s*(function|\([^)]*\)\s*=>)/.test(line),
    extractFunction: (line: string) => {
      // Match various function patterns
      let match = line.match(/(?:def|func|function|fn)\s+(\w+)\s*\(([^)]*)\)/);
      if (!match) match = line.match(/(\w+)\s*\(([^)]*)\)\s*[{:]/);
      if (!match) match = line.match(/(?:public|private|static)\s+\w+\s+(\w+)\s*\(([^)]*)\)/);
      return {
        name: match?.[1] || "anonymous",
        params: match?.[2]?.split(",").map(p => p.trim()).filter(Boolean) || [],
      };
    },
    
    isVariableDeclaration: (line: string) =>
      /^(let|const|var|int|float|double|string|bool|char|auto|val|final)\s+\w+/.test(line) ||
      /^\w+\s*:\s*\w+\s*=/.test(line) || // TypeScript/Python type hints
      /^(\w+)\s+(\w+)\s*=/.test(line), // Java/C style: int x = 5
    extractVariable: (line: string) => {
      // Multiple patterns for different languages
      let match = line.match(/(?:let|const|var|int|float|double|string|bool|char|auto|val|final)\s+(\w+)\s*(?::\s*\w+)?\s*=\s*(.+)/);
      if (!match) match = line.match(/(\w+)\s*:\s*\w+\s*=\s*(.+)/);
      if (!match) match = line.match(/^\w+\s+(\w+)\s*=\s*(.+)/);
      
      const varType = line.match(/^(int|float|double|string|bool|char|let|const|var|val)/)?.[1];
      return {
        name: match?.[1] || "unknown",
        value: match?.[2]?.replace(/;$/, "") || "undefined",
        varType,
      };
    },
    
    isForLoop: (line: string) =>
      /^for\s*\(/.test(line) || /^for\s+\w+\s+in/.test(line) ||
      /^for\s+\w+\s*,?\s*\w*\s+in/.test(line),
    extractForLoop: (line: string) => {
      // C-style for loop
      const cMatch = line.match(/for\s*\(\s*(.+?);\s*(.+?);\s*(.+?)\s*\)/);
      if (cMatch) {
        return { init: cMatch[1], condition: cMatch[2], update: cMatch[3] };
      }
      // Python/JS for-in
      const inMatch = line.match(/for\s+(\w+)\s+in\s+(.+?)[:{]/);
      if (inMatch) {
        return { init: `${inMatch[1]} in ${inMatch[2]}`, condition: "has next", update: "next item" };
      }
      return { init: "", condition: "", update: "" };
    },
    
    isWhileLoop: (line: string) => /^while\s*\(/.test(line) || /^while\s+/.test(line),
    extractWhileCondition: (line: string) => {
      const match = line.match(/while\s*\(?\s*(.+?)\s*\)?[:{]?\s*$/);
      return match?.[1] || "true";
    },
    
    isIf: (line: string) => /^if\s*\(/.test(line) || /^if\s+/.test(line),
    isElseIf: (line: string) => /^else\s*if|^elif|^elsif/.test(line),
    isElse: (line: string) => /^else\s*[:{]?\s*$|^else$/.test(line),
    extractIfCondition: (line: string) => {
      const match = line.match(/(?:else\s*)?if\s*\(?\s*(.+?)\s*\)?[:{]?\s*$/);
      return match?.[1] || "true";
    },
    
    isPrint: (line: string) =>
      /print\s*\(/.test(line) || /console\.log\s*\(/.test(line) ||
      /System\.out\.print/.test(line) || /printf\s*\(/.test(line) ||
      /cout\s*<</.test(line) || /puts\s*\(/.test(line) ||
      /echo\s+/.test(line) || /fmt\.Print/.test(line),
    extractPrint: (line: string) => {
      const match = line.match(/(?:print|console\.log|System\.out\.println?|printf|puts|echo|fmt\.Println?)\s*\(?\s*(.+?)\s*\)?;?\s*$/);
      if (match) return match[1];
      const coutMatch = line.match(/cout\s*<<\s*(.+?)\s*(?:<<|;|$)/);
      return coutMatch?.[1] || line;
    },
    
    isReturn: (line: string) => /^return\s/.test(line) || line === "return",
    extractReturn: (line: string) => {
      const match = line.match(/return\s+(.+?);?\s*$/);
      return match?.[1] || "";
    },
    
    isAssignment: (line: string) =>
      /^\w+\s*(\+\+|--|\+=|-=|\*=|\/=|%=|=)\s*.+/.test(line) &&
      !/^(let|const|var|int|float|double|string)/.test(line),
    extractAssignment: (line: string) => {
      const match = line.match(/^(\w+)\s*(\+\+|--|\+=|-=|\*=|\/=|%=|=)\s*(.*)$/);
      return {
        name: match?.[1] || "",
        operator: match?.[2] || "=",
        value: match?.[3]?.replace(/;$/, "") || "",
      };
    },
    
    isMethodCall: (line: string) =>
      /\w+\.\w+\s*\(/.test(line) || /^\w+\s*\(/.test(line),
    extractMethodCall: (line: string) => {
      const match = line.match(/(?:(\w+)\.)?(\w+)\s*\(\s*(.*)?\s*\)/);
      return {
        object: match?.[1] || "",
        method: match?.[2] || "unknown",
        args: match?.[3]?.split(",").map(a => a.trim()).filter(Boolean) || [],
      };
    },
    
    isTry: (line: string) => /^try\s*[:{]?\s*$/.test(line),
    isCatch: (line: string) => /^catch\s*\(|^except\s/.test(line),
    extractCatch: (line: string) => {
      const match = line.match(/catch\s*\(\s*(\w+)/);
      return match?.[1] || "Exception";
    },
    
    isBreak: (line: string) => /^break\s*;?\s*$/.test(line),
    isContinue: (line: string) => /^continue\s*;?\s*$/.test(line),
    
    isArrayAccess: (line: string) => /\w+\[.+\]/.test(line),
    extractArrayAccess: (line: string) => {
      const match = line.match(/(\w+)\[(.+?)\]/);
      return {
        array: match?.[1] || "",
        index: match?.[2] || "0",
        value: undefined,
      };
    },
  };

  return common;
}

// Helper functions for evaluation
function evaluateExpression(expr: string, variables: Map<string, { value: unknown }>): unknown {
  if (!expr) return undefined;
  expr = expr.trim().replace(/;$/, "");
  
  // String literal
  if (/^["'].*["']$/.test(expr)) {
    return expr.slice(1, -1);
  }
  
  // Number
  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    return parseFloat(expr);
  }
  
  // Boolean
  if (expr === "true" || expr === "True") return true;
  if (expr === "false" || expr === "False") return false;
  
  // null/None
  if (expr === "null" || expr === "None" || expr === "nil") return null;
  
  // Variable reference
  if (variables.has(expr)) {
    return variables.get(expr)?.value;
  }
  
  // Array literal
  if (expr.startsWith("[") && expr.endsWith("]")) {
    return expr; // Return as string for display
  }
  
  // Simple arithmetic
  const arithMatch = expr.match(/^(.+?)\s*([+\-*/%])\s*(.+)$/);
  if (arithMatch) {
    const left = evaluateExpression(arithMatch[1], variables);
    const right = evaluateExpression(arithMatch[3], variables);
    if (typeof left === "number" && typeof right === "number") {
      switch (arithMatch[2]) {
        case "+": return left + right;
        case "-": return left - right;
        case "*": return left * right;
        case "/": return left / right;
        case "%": return left % right;
      }
    }
  }
  
  return expr;
}

function evaluateCondition(condition: string, variables: Map<string, { value: unknown }>): boolean {
  condition = condition.trim();
  
  // Comparison operators
  const ops = ["<=", ">=", "==", "!=", "<", ">", "===", "!=="];
  for (const op of ops) {
    if (condition.includes(op)) {
      const [left, right] = condition.split(op).map(s => s.trim());
      const leftVal = evaluateExpression(left, variables);
      const rightVal = evaluateExpression(right, variables);
      
      switch (op) {
        case "<": return (leftVal as number) < (rightVal as number);
        case ">": return (leftVal as number) > (rightVal as number);
        case "<=": return (leftVal as number) <= (rightVal as number);
        case ">=": return (leftVal as number) >= (rightVal as number);
        case "==":
        case "===": return leftVal === rightVal;
        case "!=":
        case "!==": return leftVal !== rightVal;
      }
    }
  }
  
  return true;
}

function evaluateUpdate(update: string, currentValue: number): number {
  update = update.trim();
  if (update.includes("++")) return currentValue + 1;
  if (update.includes("--")) return currentValue - 1;
  
  const match = update.match(/\w+\s*(\+=|-=|\*=|\/=)\s*(\d+)/);
  if (match) {
    const delta = parseInt(match[2]);
    switch (match[1]) {
      case "+=": return currentValue + delta;
      case "-=": return currentValue - delta;
      case "*=": return currentValue * delta;
      case "/=": return currentValue / delta;
    }
  }
  
  return currentValue + 1;
}

function evaluateAssignment(
  oldValue: unknown,
  operator: string,
  expr: string,
  variables: Map<string, { value: unknown }>
): unknown {
  const exprValue = evaluateExpression(expr, variables);
  
  switch (operator) {
    case "=": return exprValue;
    case "++": return (oldValue as number) + 1;
    case "--": return (oldValue as number) - 1;
    case "+=": return (oldValue as number) + (exprValue as number);
    case "-=": return (oldValue as number) - (exprValue as number);
    case "*=": return (oldValue as number) * (exprValue as number);
    case "/=": return (oldValue as number) / (exprValue as number);
    case "%=": return (oldValue as number) % (exprValue as number);
    default: return exprValue;
  }
}

function inferType(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function findLoopBody(
  lines: string[],
  startIndex: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _patterns: ReturnType<typeof getLanguagePatterns>
): { trim: () => string; lineNum: number }[] {
  const body: { trim: () => string; lineNum: number }[] = [];
  let braceCount = 1;
  
  for (let i = startIndex; i < lines.length && braceCount > 0; i++) {
    const line = lines[i];
    if (line.includes("{")) braceCount++;
    if (line.includes("}")) braceCount--;
    
    if (braceCount > 0 && line.trim() && !line.trim().match(/^[{}]$/)) {
      body.push({ trim: () => line, lineNum: i + 1 });
    }
  }
  
  return body;
}

function findClosingBrace(lines: string[], startIndex: number): number {
  let braceCount = 0;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    braceCount += (line.match(/{/g) || []).length;
    braceCount -= (line.match(/}/g) || []).length;
    if (braceCount === 0) return i;
  }
  return startIndex;
}

export const useStepDebugStore = create<StepDebugState>((set, get) => ({
  // Initial state
  isExecuting: false,
  isPaused: true,
  isComplete: false,
  hasError: false,
  
  steps: [],
  currentStepIndex: -1,
  
  variables: {},
  callStack: [],
  output: [],
  
  sourceCode: "",
  language: "",
  currentLine: 0,
  
  autoPlaySpeed: 1000,
  isAutoPlaying: false,
  _autoPlayInterval: null,
  
  // Actions
  startExecution: (code: string, language: string) => {
    const steps = parseCode(code, language);
    
    set({
      isExecuting: true,
      isPaused: true,
      isComplete: false,
      hasError: false,
      steps,
      currentStepIndex: -1,
      variables: {},
      callStack: [],
      output: [],
      sourceCode: code,
      language,
      currentLine: 0,
    });
  },
  
  stepForward: () => {
    const { steps, currentStepIndex, isComplete } = get();
    if (isComplete) return;
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= steps.length) {
      set({ isComplete: true, isPaused: true, isAutoPlaying: false });
      const interval = get()._autoPlayInterval;
      if (interval) clearInterval(interval);
      return;
    }
    
    const step = steps[nextIndex];
    const newOutput = [...get().output];
    
    // Track output
    if (step.type === "output" && step.details.value !== undefined) {
      newOutput.push(String(step.details.value));
    }
    
    // Track variables
    const newVariables = { ...get().variables };
    if (step.details.after) {
      for (const [name, value] of Object.entries(step.details.after)) {
        if (newVariables[name]) {
          newVariables[name] = {
            ...newVariables[name],
            value,
            history: [...newVariables[name].history, { value, step: nextIndex }],
          };
        } else {
          newVariables[name] = {
            name,
            value,
            type: typeof value,
            scope: "local",
            history: [{ value, step: nextIndex }],
          };
        }
      }
    }
    
    set({
      currentStepIndex: nextIndex,
      currentLine: step.lineNumber,
      output: newOutput,
      variables: newVariables,
      hasError: step.type === "error",
    });
  },
  
  stepBackward: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex <= 0) return;
    
    set({
      currentStepIndex: currentStepIndex - 1,
      isComplete: false,
    });
  },
  
  jumpToStep: (index: number) => {
    const { steps } = get();
    if (index < 0 || index >= steps.length) return;
    
    set({
      currentStepIndex: index,
      currentLine: steps[index].lineNumber,
      isComplete: index === steps.length - 1,
    });
  },
  
  play: () => {
    const { stepForward, autoPlaySpeed } = get();
    
    const interval = setInterval(() => {
      const { isComplete, isAutoPlaying } = get();
      if (isComplete || !isAutoPlaying) {
        clearInterval(interval);
        return;
      }
      stepForward();
    }, autoPlaySpeed);
    
    set({ isAutoPlaying: true, isPaused: false, _autoPlayInterval: interval });
  },
  
  pause: () => {
    const interval = get()._autoPlayInterval;
    if (interval) clearInterval(interval);
    set({ isAutoPlaying: false, isPaused: true, _autoPlayInterval: null });
  },
  
  reset: () => {
    const interval = get()._autoPlayInterval;
    if (interval) clearInterval(interval);
    
    set({
      isExecuting: false,
      isPaused: true,
      isComplete: false,
      hasError: false,
      steps: [],
      currentStepIndex: -1,
      variables: {},
      callStack: [],
      output: [],
      sourceCode: "",
      language: "",
      currentLine: 0,
      isAutoPlaying: false,
      _autoPlayInterval: null,
    });
  },
  
  setSpeed: (speed: number) => {
    set({ autoPlaySpeed: speed });
  },
  
  _parseAndGenerateSteps: parseCode,
}));
