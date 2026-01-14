import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
 * Get file extension from path
 */
export function getFileExtension(path: string): string {
  const parts = path.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

/**
 * Get filename from path
 */
export function getFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || "";
}

/**
 * Get language from file extension
 */
export function getLanguageFromExtension(ext: string): string {
  const map: Record<string, string> = {
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
  return map[ext.toLowerCase()] || "plaintext";
}

/**
 * Get Monaco language ID from language name
 */
export function getMonacoLanguage(language: string): string {
  const map: Record<string, string> = {
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
  return map[language] || "plaintext";
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
