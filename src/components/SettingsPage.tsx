/**
 * Settings Page
 *
 * User account settings and preferences
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useAppStore } from "@/stores/appStore";
import { updateUserSettings, signOut } from "@/lib/firebase";
import { UpgradeButton } from "@/components/UpgradeModal";
import {
  ArrowLeft,
  User,
  Palette,
  GraduationCap,
  Crown,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Check,
  Loader2,
  Code,
  Save,
} from "lucide-react";

type ThemeOption = "dark" | "light" | "system";

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const sections: SettingsSection[] = [
  { id: "account", label: "Account", icon: <User className="h-5 w-5" /> },
  { id: "editor", label: "Editor", icon: <Code className="h-5 w-5" /> },
  { id: "appearance", label: "Appearance", icon: <Palette className="h-5 w-5" /> },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, isTeacher, logout } = useAuthStore();
  const { theme, setTheme, settings, updateSettings } = useAppStore();
  const [activeSection, setActiveSection] = useState("account");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  // Theme effect - apply theme to document
  useEffect(() => {
    const applyTheme = (themeSetting: string) => {
      let actualTheme = themeSetting;
      
      if (themeSetting === "system") {
        actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      
      if (actualTheme === "light") {
        document.documentElement.classList.add("light-theme");
        document.documentElement.style.setProperty("--background", "0 0% 96%");
        document.documentElement.style.setProperty("--foreground", "0 0% 15%");
        document.documentElement.style.setProperty("--card", "0 0% 100%");
        document.documentElement.style.setProperty("--card-foreground", "0 0% 15%");
        document.documentElement.style.setProperty("--border", "0 0% 85%");
        document.body.style.backgroundColor = "#f5f5f5";
        document.body.style.color = "#1e1e1e";
      } else {
        document.documentElement.classList.remove("light-theme");
        document.documentElement.style.setProperty("--background", "0 0% 12%");
        document.documentElement.style.setProperty("--foreground", "0 0% 83%");
        document.documentElement.style.setProperty("--card", "0 0% 14%");
        document.documentElement.style.setProperty("--card-foreground", "0 0% 83%");
        document.documentElement.style.setProperty("--border", "0 0% 24%");
        document.body.style.backgroundColor = "#1e1e1e";
        document.body.style.color = "#d4d4d4";
      }
      
      localStorage.setItem("shell-theme", themeSetting);
    };
    
    applyTheme(theme);
    
    // Listen for system theme changes if using system theme
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme]);
  
  // Editor settings - initialize from appStore
  const [fontSize, setFontSize] = useState(settings?.font_size ?? 14);
  const [fontFamily, setFontFamily] = useState(
    settings?.font_family ?? "JetBrains Mono, monospace"
  );
  const [tabSize, setTabSize] = useState(settings?.tab_size ?? 4);
  const [showMinimap, setShowMinimap] = useState(settings?.show_minimap ?? true);
  const [wordWrap, setWordWrap] = useState(settings?.word_wrap ?? false);
  const [lineNumbers, setLineNumbers] = useState(settings?.line_numbers ?? true);
  const [autoSave, setAutoSave] = useState(settings?.auto_save ?? true);
  const [formatOnSave, setFormatOnSave] = useState(settings?.format_on_save ?? false);
  
  // Appearance settings
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem("shell-accent-color") || "#22c55e";
  });
  
  // Accent color presets
  const accentPresets = [
    { name: "Green", color: "#22c55e" },
    { name: "Blue", color: "#3b82f6" },
    { name: "Purple", color: "#8b5cf6" },
    { name: "Pink", color: "#ec4899" },
    { name: "Orange", color: "#f97316" },
    { name: "Cyan", color: "#06b6d4" },
    { name: "Red", color: "#ef4444" },
    { name: "Yellow", color: "#eab308" },
  ];
  
  // Apply accent color to CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty("--accent-color", accentColor);
    // Convert hex to RGB for rgba usage
    const hex = accentColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    document.documentElement.style.setProperty("--accent-color-rgb", `${r}, ${g}, ${b}`);
    // Calculate hover color (slightly darker)
    const hoverR = Math.max(0, r - 20);
    const hoverG = Math.max(0, g - 20);
    const hoverB = Math.max(0, b - 20);
    document.documentElement.style.setProperty(
      "--accent-color-hover",
      `rgb(${hoverR}, ${hoverG}, ${hoverB})`
    );
    localStorage.setItem("shell-accent-color", accentColor);
  }, [accentColor]);

  // Sync state with settings when they change
  useEffect(() => {
    if (settings) {
      setFontSize(settings.font_size);
      setFontFamily(settings.font_family);
      setTabSize(settings.tab_size);
      setShowMinimap(settings.show_minimap);
      setWordWrap(settings.word_wrap);
      setLineNumbers(settings.line_numbers);
      setAutoSave(settings.auto_save);
      setFormatOnSave(settings.format_on_save);
    }
  }, [settings]);

  const handleSignOut = async () => {
    await signOut();
    logout();
    navigate("/");
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // Update local settings
      updateSettings({
        font_size: fontSize,
        font_family: fontFamily,
        tab_size: tabSize,
        show_minimap: showMinimap,
        word_wrap: wordWrap,
        line_numbers: lineNumbers,
        auto_save: autoSave,
        format_on_save: formatOnSave,
      });

      // Save to localStorage
      localStorage.setItem("shell-editor-settings", JSON.stringify({
        font_size: fontSize,
        font_family: fontFamily,
        tab_size: tabSize,
        show_minimap: showMinimap,
        word_wrap: wordWrap,
        line_numbers: lineNumbers,
        auto_save: autoSave,
        format_on_save: formatOnSave,
        theme,
      }));

      // If user is logged in, sync settings
      if (user) {
        await updateUserSettings(user.uid, {
          fontSize,
          fontFamily,
          theme: theme as "dark" | "light" | "system",
        });
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const themeOptions: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  ];

  const fontOptions = [
    "JetBrains Mono",
    "Fira Code",
    "SF Mono",
    "Monaco",
    "Consolas",
    "Source Code Pro",
  ];

  return (
    <div className="flex h-screen bg-[#1e1e1e]">
      {/* Sidebar */}
      <div className="w-64 border-r border-[#3c3c3c] p-6">
        <button
          onClick={() => navigate("/")}
          className="mb-8 flex items-center gap-2 text-[#6b7280] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>

        <div className="mb-8 flex items-center gap-3">
          <img src="/favicon.svg" alt="Shell" className="h-10 w-10" />
          <div>
            <h1 className="text-lg font-semibold text-white">Settings</h1>
            <p className="text-sm text-[#6b7280]">Customize Shell</p>
          </div>
        </div>

        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                activeSection === section.id
                  ? "bg-[#7DD3FC]/20 text-[#7DD3FC]"
                  : "text-[#9ca3af] hover:bg-[#3c3c3c] hover:text-white"
              }`}
            >
              {section.icon}
              <span>{section.label}</span>
            </button>
          ))}
        </nav>

        {/* Save button */}
        <div className="mt-8 pt-8 border-t border-[#3c3c3c]">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveSuccess ? "Saved!" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl">
          {/* Account Section */}
          {activeSection === "account" && (
            <div>
              <h2 className="mb-6 text-2xl font-semibold text-white">Account</h2>

              {/* Profile card */}
              <div className="mb-6 rounded-xl bg-[#252526] p-6">
                <div className="flex items-center gap-4">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="h-16 w-16 rounded-full"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-color)] text-2xl font-medium text-white">
                      {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "?"}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-medium text-white">
                        {user?.displayName || "User"}
                      </h3>
                      {isTeacher() && (
                        <span className="flex items-center gap-1 rounded-full bg-[#fbbf24]/20 px-2 py-0.5 text-xs text-[#fbbf24]">
                          <Crown className="h-3 w-3" />
                          Teacher
                        </span>
                      )}
                    </div>
                    <p className="text-[#6b7280]">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Subscription status */}
              <div className="mb-6 rounded-xl bg-[#252526] p-6">
                <h3 className="mb-4 text-lg font-medium text-white flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Subscription
                </h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {isTeacher() ? "Education Plan" : "Free Plan"}
                    </p>
                    <p className="text-sm text-[#6b7280]">
                      {isTeacher()
                        ? "Cloud sync, classrooms, and more"
                        : "Basic features, offline only"}
                    </p>
                  </div>
                  {!isTeacher() && (
                    <UpgradeButton />
                  )}
                </div>
              </div>

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 p-4 text-[#ef4444] hover:bg-[#ef4444]/20 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Editor Section */}
          {activeSection === "editor" && (
            <div>
              <h2 className="mb-6 text-2xl font-semibold text-white">Editor</h2>

              {/* Font Size */}
              <div className="mb-6 rounded-xl bg-[#252526] p-6">
                <h3 className="mb-4 text-lg font-medium text-white">Font Size</h3>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={10}
                    max={24}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="flex-1 accent-[var(--accent-color)]"
                    aria-label="Font size"
                    title="Adjust font size"
                  />
                  <span className="w-12 text-center text-white">{fontSize}px</span>
                </div>
              </div>

              {/* Font Family */}
              <div className="mb-6 rounded-xl bg-[#252526] p-6">
                <h3 className="mb-4 text-lg font-medium text-white">Font Family</h3>
                <div className="grid grid-cols-2 gap-2">
                  {fontOptions.map((font) => (
                    <button
                      key={font}
                      onClick={() => setFontFamily(font)}
                      className={`rounded-lg p-3 text-left transition-colors ${
                        fontFamily === font || fontFamily.startsWith(font)
                          ? "bg-[var(--accent-color)]/20 text-[var(--accent-color)] ring-1 ring-[var(--accent-color)]"
                          : "bg-[#3c3c3c] text-[#d4d4d4] hover:bg-[#4a4a4a]"
                      }`}
                      style={{ fontFamily: font }}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Size */}
              <div className="mb-6 rounded-xl bg-[#252526] p-6">
                <h3 className="mb-4 text-lg font-medium text-white">Tab Size</h3>
                <div className="flex gap-2">
                  {[2, 4, 8].map((size) => (
                    <button
                      key={size}
                      onClick={() => setTabSize(size)}
                      className={`rounded-lg px-4 py-2 transition-colors ${
                        tabSize === size
                          ? "bg-[var(--accent-color)] text-white"
                          : "bg-[#3c3c3c] text-[#d4d4d4] hover:bg-[#4a4a4a]"
                      }`}
                    >
                      {size} spaces
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle options */}
              <div className="mb-6 rounded-xl bg-[#252526] p-6">
                <h3 className="mb-4 text-lg font-medium text-white">Display Options</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-[#d4d4d4]">Show minimap</span>
                    <input
                      type="checkbox"
                      checked={showMinimap}
                      onChange={(e) => setShowMinimap(e.target.checked)}
                      className="h-5 w-5"
                      style={{ accentColor: 'var(--accent-color)' }}
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-[#d4d4d4]">Word wrap</span>
                    <input
                      type="checkbox"
                      checked={wordWrap}
                      onChange={(e) => setWordWrap(e.target.checked)}
                      className="h-5 w-5"
                      style={{ accentColor: 'var(--accent-color)' }}
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-[#d4d4d4]">Line numbers</span>
                    <input
                      type="checkbox"
                      checked={lineNumbers}
                      onChange={(e) => setLineNumbers(e.target.checked)}
                      className="h-5 w-5"
                      style={{ accentColor: 'var(--accent-color)' }}
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-[#d4d4d4]">Auto save</span>
                    <input
                      type="checkbox"
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      className="h-5 w-5"
                      style={{ accentColor: 'var(--accent-color)' }}
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-[#d4d4d4]">Format on save</span>
                    <input
                      type="checkbox"
                      checked={formatOnSave}
                      onChange={(e) => setFormatOnSave(e.target.checked)}
                      className="h-5 w-5"
                      style={{ accentColor: 'var(--accent-color)' }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === "appearance" && (
            <div>
              <h2 className="mb-6 text-2xl font-semibold text-white">Appearance</h2>

              {/* Theme */}
              <div className="mb-6 rounded-xl bg-[#252526] p-6">
                <h3 className="mb-4 text-lg font-medium text-white">Theme</h3>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={`flex items-center justify-center gap-2 rounded-lg p-3 transition-colors ${
                        theme === option.value
                          ? "bg-[var(--accent-color)] text-white"
                          : "bg-[#3c3c3c] text-[#d4d4d4] hover:bg-[#4a4a4a]"
                      }`}
                    >
                      {option.icon}
                      <span>{option.label}</span>
                      {theme === option.value && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div className="mb-6 rounded-xl bg-[#252526] p-6">
                <h3 className="mb-4 text-lg font-medium text-white">Accent Color</h3>
                <p className="mb-4 text-sm text-[#6b7280]">
                  Choose a color that will be used throughout the app for highlights and accents.
                </p>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {accentPresets.map((preset) => (
                    <button
                      key={preset.color}
                      onClick={() => setAccentColor(preset.color)}
                      className={`flex flex-col items-center gap-2 rounded-lg p-3 transition-all ${
                        accentColor === preset.color
                          ? "ring-2 ring-white bg-[#3c3c3c]"
                          : "bg-[#3c3c3c] hover:bg-[#4a4a4a]"
                      }`}
                    >
                      <div
                        className="h-8 w-8 rounded-full transition-transform hover:scale-110"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span className="text-xs text-[#d4d4d4]">{preset.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-[#d4d4d4]">Custom:</label>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-20 cursor-pointer rounded-lg border-0 bg-transparent"
                    aria-label="Custom accent color"
                    title="Pick custom accent color"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        setAccentColor(val);
                      }
                    }}
                    className="w-24 rounded-lg bg-[#3c3c3c] px-3 py-2 text-sm text-white uppercase"
                    placeholder="#22c55e"
                  />
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
