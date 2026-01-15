import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Memoization cache for cn function to avoid recalculating same class combinations
const cnCache = new Map<string, string>();

export function cn(...inputs: ClassValue[]) {
  const key = JSON.stringify(inputs);
  if (cnCache.has(key)) {
    return cnCache.get(key)!;
  }
  const result = twMerge(clsx(inputs));
  // Limit cache size to prevent memory leaks
  if (cnCache.size > 1000) {
    const firstKey = cnCache.keys().next().value;
    if (firstKey) cnCache.delete(firstKey);
  }
  cnCache.set(key, result);
  return result;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get file extension from path - optimized with direct split
 */
export function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf(".");
  return lastDot > path.lastIndexOf("/") ? path.slice(lastDot + 1) : "";
}

/**
 * Get filename from path - optimized
 */
export function getFileName(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
}

// Pre-computed extension to language map for O(1) lookups
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  py: "python",
  js: "javascript",
  ts: "typescript",
  jsx: "javascript",
  tsx: "typescript",
  rs: "rust",
  go: "go",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  rb: "ruby",
  php: "php",
  cs: "csharp",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  r: "r",
  sql: "sql",
  html: "html",
  css: "css",
  scss: "scss",
  less: "less",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
  md: "markdown",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  toml: "toml",
  ini: "ini",
};

/**
 * Get language from file extension - optimized with pre-computed map
 */
export function getLanguageFromExtension(ext: string): string {
  return EXTENSION_TO_LANGUAGE[ext.toLowerCase()] || "plaintext";
}

// Pre-computed language to Monaco map for O(1) lookups
const LANGUAGE_TO_MONACO: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  rust: "rust",
  go: "go",
  java: "java",
  c: "c",
  cpp: "cpp",
  csharp: "csharp",
  ruby: "ruby",
  php: "php",
  swift: "swift",
  kotlin: "kotlin",
  scala: "scala",
  r: "r",
  sql: "sql",
  html: "html",
  css: "css",
  scss: "scss",
  less: "less",
  json: "json",
  yaml: "yaml",
  xml: "xml",
  markdown: "markdown",
  shell: "shell",
  plaintext: "plaintext",
};

/**
 * Get Monaco language ID from language name - optimized with pre-computed map
 */
export function getMonacoLanguage(language: string): string {
  return LANGUAGE_TO_MONACO[language] || "plaintext";
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
