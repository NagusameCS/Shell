import { memo, useMemo, lazy, Suspense } from "react";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { FileExplorer } from "./FileExplorer";
import { LessonBrowser } from "./LessonBrowser";
import { SearchPanel } from "./SearchPanel";
import { StepDebugPanel } from "./StepDebugPanel";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  Palette,
  Code,
  User,
  ExternalLink,
  Moon,
  Sun,
  Type,
  Hash,
  Eye,
  EyeOff,
  WrapText,
  Save,
  Loader2,
} from "lucide-react";

// Loading fallback for lazy-loaded panels
const PanelLoading = () => (
  <div className="flex h-full items-center justify-center">
    <Loader2 className="h-5 w-5 animate-spin text-sidebar-fg/40" />
  </div>
);

// Header title map
const HEADER_TITLES: Record<string, string> = {
  explorer: "Explorer",
  lessons: "Lessons",
  search: "Search",
  stepdebug: "Step-by-Step",
  extensions: "Extensions",
  settings: "Settings",
  docs: "Documentation",
};

export const Sidebar = memo(function Sidebar() {
  const activeView = useAppStore((s) => s.activeView);

  // Memoize header title
  const headerTitle = useMemo(() => HEADER_TITLES[activeView] || "", [activeView]);

  return (
    <div className="flex w-60 flex-col border-r border-panel-border bg-sidebar-bg">
      {/* Header */}
      <div className="flex h-9 items-center border-b border-panel-border px-4 text-xs font-medium uppercase tracking-wide text-sidebar-fg/60">
        {headerTitle}
      </div>

      {/* Content - conditional rendering with memoized components */}
      <div className="flex-1 overflow-auto">
        <SidebarContent activeView={activeView} />
      </div>
    </div>
  );
});

// Separate content component to prevent re-renders
const SidebarContent = memo(function SidebarContent({ activeView }: { activeView: string }) {
  switch (activeView) {
    case "explorer":
      return <FileExplorer />;
    case "lessons":
      return <LessonBrowser />;
    case "search":
      return <SearchPanel />;
    case "stepdebug":
      return <StepDebugPanel />;
    case "extensions":
      return <ExtensionsPanel />;
    case "settings":
      return <SettingsPanel />;
    case "docs":
      return <DocsPanel />;
    default:
      return null;
  }
});

const ExtensionsPanel = memo(function ExtensionsPanel() {
  return (
    <div className="p-4 text-sm text-sidebar-fg/60">
      <p>Extensions coming soon...</p>
    </div>
  );
});

const SettingsPanel = memo(function SettingsPanel() {
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const user = useAuthStore((s) => s.user);

  const toggleSetting = (key: "show_minimap" | "word_wrap" | "line_numbers" | "auto_save") => {
    if (settings) {
      updateSettings({ [key]: !settings[key] });
    }
  };

  const quickSettings = useMemo(() => [
    {
      label: "Theme",
      icon: theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />,
      value: theme === "dark" ? "Dark" : "Light",
      onClick: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
    {
      label: "Font Size",
      icon: <Type className="h-4 w-4" />,
      value: `${settings?.font_size || 14}px`,
      onClick: () => navigate("/settings"),
    },
    {
      label: "Tab Size",
      icon: <Hash className="h-4 w-4" />,
      value: `${settings?.tab_size || 4} spaces`,
      onClick: () => navigate("/settings"),
    },
  ], [theme, settings?.font_size, settings?.tab_size, setTheme, navigate]);

  const toggleSettings = useMemo(() => [
    {
      label: "Minimap",
      enabled: settings?.show_minimap ?? true,
      icon: settings?.show_minimap ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />,
      onToggle: () => toggleSetting("show_minimap"),
    },
    {
      label: "Word Wrap",
      enabled: settings?.word_wrap ?? false,
      icon: <WrapText className="h-4 w-4" />,
      onToggle: () => toggleSetting("word_wrap"),
    },
    {
      label: "Line Numbers",
      enabled: settings?.line_numbers ?? true,
      icon: <Code className="h-4 w-4" />,
      onToggle: () => toggleSetting("line_numbers"),
    },
    {
      label: "Auto Save",
      enabled: settings?.auto_save ?? true,
      icon: <Save className="h-4 w-4" />,
      onToggle: () => toggleSetting("auto_save"),
    },
  ], [settings?.show_minimap, settings?.word_wrap, settings?.line_numbers, settings?.auto_save, toggleSetting]);

  return (
    <div className="p-3">
      {/* Quick Settings */}
      <div className="mb-4">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-sidebar-fg/50">
          Quick Settings
        </h3>
        <div className="space-y-1">
          {quickSettings.map((setting) => (
            <button
              key={setting.label}
              onClick={setting.onClick}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-fg/80 hover:bg-[#3c3c3c] transition-colors"
            >
              {setting.icon}
              <span className="flex-1 text-left">{setting.label}</span>
              <span className="text-xs text-sidebar-fg/50">{setting.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toggle Settings */}
      <div className="mb-4">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-sidebar-fg/50">
          Editor
        </h3>
        <div className="space-y-1">
          {toggleSettings.map((setting) => (
            <button
              key={setting.label}
              onClick={setting.onToggle}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-fg/80 hover:bg-[#3c3c3c] transition-colors"
            >
              {setting.icon}
              <span className="flex-1 text-left">{setting.label}</span>
              <div
                className={`h-4 w-7 rounded-full transition-colors ${
                  setting.enabled ? "bg-[#7DD3FC]" : "bg-[#3c3c3c]"
                }`}
              >
                <div
                  className={`h-3 w-3 mt-0.5 rounded-full bg-white transition-transform ${
                    setting.enabled ? "ml-3.5" : "ml-0.5"
                  }`}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* All Settings Link */}
      <button
        onClick={() => navigate("/settings")}
        className="flex w-full items-center gap-2 rounded-md border border-[#3c3c3c] px-3 py-2 text-sm text-sidebar-fg/80 hover:bg-[#3c3c3c] transition-colors"
      >
        <Settings className="h-4 w-4" />
        <span className="flex-1 text-left">All Settings</span>
        <ExternalLink className="h-3 w-3 text-sidebar-fg/50" />
      </button>

      {/* Account Info */}
      {user && (
        <div className="mt-4 pt-4 border-t border-[#3c3c3c]">
          <div className="flex items-center gap-2 text-xs text-sidebar-fg/50">
            <User className="h-3 w-3" />
            <span className="truncate">{user.email}</span>
          </div>
        </div>
      )}
    </div>
  );
});

// Language documentation data - static, no need to recreate
const LANGUAGE_DOCS = [
  {
    name: "Python",
    icon: "🐍",
    docs: "https://docs.python.org/3/",
    description: "Official Python documentation",
  },
  {
    name: "JavaScript",
    icon: "📜",
    docs: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    description: "MDN JavaScript Guide",
  },
  {
    name: "TypeScript",
    icon: "💎",
    docs: "https://www.typescriptlang.org/docs/",
    description: "TypeScript Handbook",
  },
  {
    name: "Rust",
    icon: "🦀",
    docs: "https://doc.rust-lang.org/book/",
    description: "The Rust Programming Language",
  },
  {
    name: "Go",
    icon: "🐹",
    docs: "https://go.dev/doc/",
    description: "Go Documentation",
  },
  {
    name: "C++",
    icon: "⚡",
    docs: "https://en.cppreference.com/w/",
    description: "C++ Reference",
  },
  {
    name: "Java",
    icon: "☕",
    docs: "https://docs.oracle.com/en/java/",
    description: "Java SE Documentation",
  },
  {
    name: "C#",
    icon: "🎯",
    docs: "https://learn.microsoft.com/en-us/dotnet/csharp/",
    description: "C# Documentation",
  },
];

const DocsPanel = memo(function DocsPanel() {
  const openDocs = (url: string) => {
    import("@tauri-apps/plugin-shell").then(({ open }) => {
      open(url);
    });
  };

  return (
    <div className="p-3 space-y-4">
      <p className="text-xs text-sidebar-fg/60">
        Quick access to language documentation
      </p>
      
      <div className="space-y-1">
        {LANGUAGE_DOCS.map((lang) => (
          <button
            key={lang.name}
            onClick={() => openDocs(lang.docs)}
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-all hover:bg-white/5 group animate-fade-in"
          >
            <span className="text-xl">{lang.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-sidebar-fg group-hover:text-[var(--accent-color)] transition-colors">
                {lang.name}
              </div>
              <div className="text-xs text-sidebar-fg/50 truncate">
                {lang.description}
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-sidebar-fg/30 group-hover:text-sidebar-fg/60 transition-colors" />
          </button>
        ))}
      </div>

      <div className="pt-4 border-t border-[#3c3c3c]">
        <p className="text-xs text-sidebar-fg/40 mb-2">Resources</p>
        <div className="space-y-1">
          <button
            onClick={() => openDocs("https://stackoverflow.com")}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-fg/70 hover:bg-white/5 transition-colors"
          >
            <span>📚</span>
            <span>Stack Overflow</span>
          </button>
          <button
            onClick={() => openDocs("https://github.com")}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-fg/70 hover:bg-white/5 transition-colors"
          >
            <span>🐙</span>
            <span>GitHub</span>
          </button>
          <button
            onClick={() => openDocs("https://devdocs.io")}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-fg/70 hover:bg-white/5 transition-colors"
          >
            <span>📖</span>
            <span>DevDocs</span>
          </button>
        </div>
      </div>
    </div>
  );
});
