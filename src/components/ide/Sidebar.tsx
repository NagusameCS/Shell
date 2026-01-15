import { memo, useMemo, useState, lazy, Suspense } from "react";
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
  Rocket,
  Zap,
  BookOpen,
  GraduationCap,
  Cloud,
  FileCode,
  Globe,
  Gem,
  Bug,
  Coffee,
  Target,
  Layers,
  Book,
  Github,
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
                  setting.enabled ? "bg-[var(--accent-color)]" : "bg-[#3c3c3c]"
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

// Shell documentation content - embedded from docs page
const SHELL_DOCS = [
  {
    id: "getting-started",
    title: "Getting Started",
    iconType: "rocket" as const,
    content: `Welcome to Shell IDE - an education-first development environment.

**Quick Start:**
1. Open a folder (⌘O) or create a new project (⌘N)
2. Select files from the Explorer to edit
3. Use the integrated terminal (⌘\`) for commands
4. Run your code with the appropriate runtime

**Keyboard Shortcuts:**
• ⌘S - Save file
• ⌘W - Close tab  
• ⌘\` - Toggle terminal
• ⌘N - New project
• ⌘⇧N - New window`,
  },
  {
    id: "features",
    title: "IDE Features",
    iconType: "zap" as const,
    content: `**Full-Featured IDE**
• Syntax highlighting for 30+ languages
• IntelliSense and auto-completion
• Integrated terminal with shell support
• Git version control integration

**Editor Settings**
Access via Settings (⌘,) or the sidebar:
• Font size and family
• Tab size (2, 4, or 8 spaces)
• Show/hide minimap
• Word wrap toggle
• Line numbers
• Auto-save`,
  },
  {
    id: "lessons",
    title: "Lessons & Learning",
    iconType: "book" as const,
    content: `**Interactive Lessons**
Shell includes a built-in lesson system:
• Step-by-step instructions
• Code hints and examples
• Automatic progress tracking
• Exercise validation

**Browse Lessons**
1. Click the book icon in the activity bar
2. Select "Local" for downloaded lessons
3. Select "Marketplace" for community lessons

**For Educators**
Create custom lessons using YAML format.
See the lesson schema documentation.`,
  },
  {
    id: "classroom",
    title: "Classroom Features",
    iconType: "graduation" as const,
    content: `**For Students**
• Join classrooms with 6-character codes
• Submit assignments directly in the IDE
• View grades and feedback

**For Educators** (Education Plan)
• Create and manage classrooms
• Distribute assignments with auto-grading
• Track student progress analytics
• Enable exam mode for tests

**Joining a Classroom**
1. Click "Join Classroom" on welcome screen
2. Enter the 6-character code from your educator
3. Access classroom content in the Lessons tab`,
  },
  {
    id: "cloud",
    title: "Cloud & Sync",
    iconType: "cloud" as const,
    content: `**Cloud Features** (Education Plan)
• Sync projects across devices
• Access your code from anywhere
• Automatic backup and versioning
• 1GB cloud storage included

**Enable Cloud Sync**
1. Upgrade to Education Plan
2. Go to Settings → Cloud & Sync
3. Toggle "Cloud Sync" on
4. Your projects will sync automatically`,
  },
];

// Icon component map
const DocIcon = ({ type, className }: { type: string; className?: string }) => {
  const iconClass = className || "h-5 w-5";
  switch (type) {
    case "rocket": return <Rocket className={iconClass} />;
    case "zap": return <Zap className={iconClass} />;
    case "book": return <BookOpen className={iconClass} />;
    case "graduation": return <GraduationCap className={iconClass} />;
    case "cloud": return <Cloud className={iconClass} />;
    case "python": return <FileCode className={iconClass} />;
    case "javascript": return <Globe className={iconClass} />;
    case "typescript": return <Gem className={iconClass} />;
    case "rust": return <Bug className={iconClass} />;
    case "go": return <Layers className={iconClass} />;
    case "cpp": return <Zap className={iconClass} />;
    case "java": return <Coffee className={iconClass} />;
    case "csharp": return <Target className={iconClass} />;
    default: return <Code className={iconClass} />;
  }
};

// Language documentation data - static, no need to recreate
const LANGUAGE_DOCS = [
  {
    name: "Python",
    iconType: "python",
    docs: "https://docs.python.org/3/",
    description: "Official Python documentation",
  },
  {
    name: "JavaScript",
    iconType: "javascript",
    docs: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    description: "MDN JavaScript Guide",
  },
  {
    name: "TypeScript",
    iconType: "typescript",
    docs: "https://www.typescriptlang.org/docs/",
    description: "TypeScript Handbook",
  },
  {
    name: "Rust",
    iconType: "rust",
    docs: "https://doc.rust-lang.org/book/",
    description: "The Rust Programming Language",
  },
  {
    name: "Go",
    iconType: "go",
    docs: "https://go.dev/doc/",
    description: "Go Documentation",
  },
  {
    name: "C++",
    iconType: "cpp",
    docs: "https://en.cppreference.com/w/",
    description: "C++ Reference",
  },
  {
    name: "Java",
    iconType: "java",
    docs: "https://docs.oracle.com/en/java/",
    description: "Java SE Documentation",
  },
  {
    name: "C#",
    iconType: "csharp",
    docs: "https://learn.microsoft.com/en-us/dotnet/csharp/",
    description: "C# Documentation",
  },
];

const DocsPanel = memo(function DocsPanel() {
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"shell" | "languages">("shell");
  
  const openDocs = (url: string) => {
    import("@tauri-apps/plugin-shell").then(({ open }) => {
      open(url);
    });
  };

  const activeDocContent = SHELL_DOCS.find(d => d.id === activeDoc);

  // Render markdown-like content
  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={i} className="font-semibold text-white mt-3 mb-1">{line.replace(/\*\*/g, '')}</h4>;
      }
      if (line.startsWith('• ')) {
        return <li key={i} className="ml-4 text-sidebar-fg/80">{line.substring(2)}</li>;
      }
      if (line.match(/^\d+\./)) {
        return <li key={i} className="ml-4 text-sidebar-fg/80 list-decimal">{line.substring(line.indexOf('.') + 2)}</li>;
      }
      if (line.trim() === '') {
        return <br key={i} />;
      }
      return <p key={i} className="text-sidebar-fg/80">{line}</p>;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[#3c3c3c]">
        <button
          onClick={() => { setActiveTab("shell"); setActiveDoc(null); }}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "shell" ? "text-white border-b-2" : "text-sidebar-fg/60 hover:text-sidebar-fg"
          }`}
          style={activeTab === "shell" ? { borderBottomColor: 'var(--accent-color)' } : {}}
        >
          Shell Docs
        </button>
        <button
          onClick={() => { setActiveTab("languages"); setActiveDoc(null); }}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "languages" ? "text-white border-b-2" : "text-sidebar-fg/60 hover:text-sidebar-fg"
          }`}
          style={activeTab === "languages" ? { borderBottomColor: 'var(--accent-color)' } : {}}
        >
          Languages
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {activeTab === "shell" ? (
          activeDoc && activeDocContent ? (
            /* Doc detail view */
            <div className="animate-fade-in">
              <button
                onClick={() => setActiveDoc(null)}
                className="flex items-center gap-1 text-xs text-sidebar-fg/60 hover:text-sidebar-fg mb-3"
              >
                ← Back to docs
              </button>
              <div className="flex items-center gap-2 mb-3">
                <DocIcon type={activeDocContent.iconType} className="h-6 w-6 text-[var(--accent-color)]" />
                <h3 className="text-lg font-medium text-white">{activeDocContent.title}</h3>
              </div>
              <div className="text-sm space-y-1">
                {renderContent(activeDocContent.content)}
              </div>
            </div>
          ) : (
            /* Doc list view */
            <div className="space-y-2">
              <p className="text-xs text-sidebar-fg/60 mb-3">
                Learn how to use Shell IDE
              </p>
              {SHELL_DOCS.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setActiveDoc(doc.id)}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all hover:bg-white/5 group"
                >
                  <DocIcon type={doc.iconType} className="h-5 w-5 text-sidebar-fg/70 group-hover:text-[var(--accent-color)]" />
                  <span className="text-sm font-medium text-sidebar-fg group-hover:text-[var(--accent-color)] transition-colors">
                    {doc.title}
                  </span>
                </button>
              ))}
            </div>
          )
        ) : (
          /* Languages tab */
          <div className="space-y-4">
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
                  <DocIcon type={lang.iconType} className="h-5 w-5 text-sidebar-fg/70 group-hover:text-[var(--accent-color)]" />
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
                  <Book className="h-4 w-4" />
                  <span>Stack Overflow</span>
                </button>
                <button
                  onClick={() => openDocs("https://github.com")}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-fg/70 hover:bg-white/5 transition-colors"
                >
                  <Github className="h-4 w-4" />
                  <span>GitHub</span>
                </button>
                <button
                  onClick={() => openDocs("https://devdocs.io")}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-fg/70 hover:bg-white/5 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>DevDocs</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
