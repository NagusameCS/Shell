import { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  X, 
  Replace, 
  ChevronDown, 
  ChevronRight, 
  File,
  CaseSensitive,
  Regex,
  WholeWord,
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import { useEditorStore } from "@/stores/editorStore";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/lib/utils";

interface SearchResult {
  filePath: string;
  fileName: string;
  matches: {
    line: number;
    column: number;
    text: string;
    matchStart: number;
    matchEnd: number;
  }[];
}

export function SearchPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  
  const { openFiles, openFile, activeFile } = useEditorStore();
  const { project } = useAppStore();

  // Search in open files
  const performSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalMatches(0);
      return;
    }

    setIsSearching(true);
    const searchResults: SearchResult[] = [];
    let matchCount = 0;

    // Build regex pattern
    let pattern: RegExp;
    try {
      let flags = "g" + (caseSensitive ? "" : "i");
      let query = useRegex ? searchQuery : escapeRegex(searchQuery);
      if (wholeWord) {
        query = `\\b${query}\\b`;
      }
      pattern = new RegExp(query, flags);
    } catch (e) {
      // Invalid regex
      setIsSearching(false);
      return;
    }

    // Search in open files
    for (const file of openFiles) {
      const matches: SearchResult["matches"] = [];
      const lines = file.content.split("\n");

      lines.forEach((line, lineIndex) => {
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(line)) !== null) {
          matches.push({
            line: lineIndex + 1,
            column: match.index + 1,
            text: line,
            matchStart: match.index,
            matchEnd: match.index + match[0].length,
          });
          matchCount++;
        }
      });

      if (matches.length > 0) {
        const fileName = file.path.split("/").pop() || file.path;
        searchResults.push({
          filePath: file.path,
          fileName,
          matches,
        });
      }
    }

    setResults(searchResults);
    setTotalMatches(matchCount);
    setExpandedFiles(new Set(searchResults.map((r) => r.filePath)));
    setIsSearching(false);
  }, [searchQuery, caseSensitive, wholeWord, useRegex, openFiles]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [performSearch]);

  // Toggle file expansion
  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  // Navigate to match
  const goToMatch = (filePath: string, line: number, column: number) => {
    const file = openFiles.find((f) => f.path === filePath);
    if (file) {
      // File is already open, just need to navigate
      // This would require Monaco editor integration
      console.log(`Navigate to ${filePath}:${line}:${column}`);
    } else {
      openFile(filePath);
    }
  };

  // Replace in current file
  const replaceInFile = (filePath: string) => {
    // Implementation would modify the file content
    console.log(`Replace in ${filePath}: "${searchQuery}" -> "${replaceQuery}"`);
  };

  // Replace all
  const replaceAll = () => {
    // Implementation would modify all files
    console.log(`Replace all: "${searchQuery}" -> "${replaceQuery}"`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 space-y-2">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-fg/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full rounded bg-editor-bg py-1.5 pl-8 pr-20 text-sm text-white placeholder-sidebar-fg/40 focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <button
              onClick={() => setCaseSensitive(!caseSensitive)}
              className={cn(
                "p-1 rounded hover:bg-white/10",
                caseSensitive && "bg-[var(--accent-color)]/20 text-[var(--accent-color)]"
              )}
              title="Match Case"
            >
              <CaseSensitive className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setWholeWord(!wholeWord)}
              className={cn(
                "p-1 rounded hover:bg-white/10",
                wholeWord && "bg-[var(--accent-color)]/20 text-[var(--accent-color)]"
              )}
              title="Match Whole Word"
            >
              <WholeWord className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setUseRegex(!useRegex)}
              className={cn(
                "p-1 rounded hover:bg-white/10",
                useRegex && "bg-[var(--accent-color)]/20 text-[var(--accent-color)]"
              )}
              title="Use Regular Expression"
            >
              <Regex className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Replace toggle */}
        <button
          onClick={() => setShowReplace(!showReplace)}
          className="flex items-center gap-1 text-xs text-sidebar-fg/60 hover:text-sidebar-fg transition-colors"
        >
          {showReplace ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <Replace className="h-3 w-3" />
          Replace
        </button>

        {/* Replace input */}
        {showReplace && (
          <div className="relative animate-fade-in">
            <Replace className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-fg/40" />
            <input
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Replace..."
              className="w-full rounded bg-editor-bg py-1.5 pl-8 pr-8 text-sm text-white placeholder-sidebar-fg/40 focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
            />
            {replaceQuery && (
              <button
                onClick={replaceAll}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 rounded bg-[var(--accent-color)] text-white hover:opacity-90"
                title="Replace All"
              >
                All
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        <div className="text-xs text-sidebar-fg/60 flex items-center justify-between">
          <span>
            {isSearching ? (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Searching...
              </span>
            ) : searchQuery ? (
              `${totalMatches} results in ${results.length} files`
            ) : (
              "Type to search"
            )}
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-1 hover:bg-white/10 rounded"
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto text-sm">
        {results.map((result) => (
          <div key={result.filePath} className="animate-fade-in">
            {/* File header */}
            <button
              onClick={() => toggleFile(result.filePath)}
              className="flex w-full items-center gap-1 px-2 py-1 text-sidebar-fg/80 hover:bg-white/5 transition-colors"
            >
              {expandedFiles.has(result.filePath) ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <File className="h-3.5 w-3.5 text-[var(--accent-color)]" />
              <span className="flex-1 text-left truncate">{result.fileName}</span>
              <span className="text-xs text-sidebar-fg/40">{result.matches.length}</span>
            </button>

            {/* Matches */}
            {expandedFiles.has(result.filePath) && (
              <div className="ml-4 border-l border-[#3c3c3c]">
                {result.matches.map((match, i) => (
                  <button
                    key={i}
                    onClick={() => goToMatch(result.filePath, match.line, match.column)}
                    className="flex w-full items-start gap-2 px-2 py-1 text-left hover:bg-white/5 transition-colors group"
                  >
                    <span className="text-xs text-sidebar-fg/40 w-8 flex-shrink-0 text-right">
                      {match.line}
                    </span>
                    <span className="flex-1 truncate">
                      {match.text.substring(0, match.matchStart)}
                      <span className="bg-[var(--accent-color)]/30 text-[var(--accent-color)] rounded">
                        {match.text.substring(match.matchStart, match.matchEnd)}
                      </span>
                      {match.text.substring(match.matchEnd)}
                    </span>
                    {showReplace && replaceQuery && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Replace single match
                        }}
                        className="opacity-0 group-hover:opacity-100 text-xs px-1 rounded bg-[var(--accent-color)]/20 text-[var(--accent-color)] hover:bg-[var(--accent-color)]/30"
                      >
                        Replace
                      </button>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Empty state */}
        {!isSearching && searchQuery && results.length === 0 && (
          <div className="p-4 text-center text-sidebar-fg/40">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No results found</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
