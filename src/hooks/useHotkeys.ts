/**
 * Hotkeys Hook
 * 
 * Global keyboard shortcuts for Shell IDE
 */

import { useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import { useEditorStore } from "@/stores/editorStore";
import { useNavigate } from "react-router-dom";

interface HotkeyHandler {
  key: string;
  ctrl?: boolean;
  cmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

export function useHotkeys() {
  const navigate = useNavigate();
  const { 
    togglePanel, 
    toggleSidebar, 
    setActiveView,
    panelOpen 
  } = useAppStore();
  const { 
    saveCurrentFile, 
    closeCurrentTab, 
    tabs, 
    activeTabId,
    setActiveTab 
  } = useEditorStore();

  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  const hotkeys: HotkeyHandler[] = [
    // File operations
    {
      key: "s",
      ctrl: !isMac,
      cmd: isMac,
      handler: () => saveCurrentFile(),
      description: "Save current file",
    },
    {
      key: "w",
      ctrl: !isMac,
      cmd: isMac,
      handler: () => closeCurrentTab(),
      description: "Close current tab",
    },
    
    // Panel operations
    {
      key: "`",
      ctrl: true,
      handler: () => togglePanel(),
      description: "Toggle terminal panel",
    },
    {
      key: "j",
      ctrl: !isMac,
      cmd: isMac,
      handler: () => togglePanel(),
      description: "Toggle panel",
    },
    
    // Sidebar operations
    {
      key: "b",
      ctrl: !isMac,
      cmd: isMac,
      handler: () => toggleSidebar(),
      description: "Toggle sidebar",
    },
    
    // Views
    {
      key: "e",
      ctrl: !isMac,
      cmd: isMac,
      shift: true,
      handler: () => setActiveView("explorer"),
      description: "Show explorer",
    },
    {
      key: "f",
      ctrl: !isMac,
      cmd: isMac,
      shift: true,
      handler: () => setActiveView("search"),
      description: "Search in files",
    },
    {
      key: "l",
      ctrl: !isMac,
      cmd: isMac,
      shift: true,
      handler: () => setActiveView("lessons"),
      description: "Show lessons",
    },
    
    // Tab navigation
    {
      key: "Tab",
      ctrl: true,
      handler: () => {
        if (tabs.length > 1 && activeTabId) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          const nextIndex = (currentIndex + 1) % tabs.length;
          setActiveTab(tabs[nextIndex].id);
        }
      },
      description: "Next tab",
    },
    {
      key: "Tab",
      ctrl: true,
      shift: true,
      handler: () => {
        if (tabs.length > 1 && activeTabId) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          setActiveTab(tabs[prevIndex].id);
        }
      },
      description: "Previous tab",
    },
    
    // Settings
    {
      key: ",",
      ctrl: !isMac,
      cmd: isMac,
      handler: () => navigate("/settings"),
      description: "Open settings",
    },
    
    // Run code
    {
      key: "Enter",
      ctrl: !isMac,
      cmd: isMac,
      shift: true,
      handler: () => {
        // Dispatch custom event for run code
        window.dispatchEvent(new CustomEvent("shell:run-code"));
      },
      description: "Run code",
    },
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if we're in an input element (but allow in Monaco editor)
      const target = event.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const isMonaco = target.closest(".monaco-editor");
      
      // Allow shortcuts in Monaco, skip other inputs for certain shortcuts
      if (isInput && !isMonaco) {
        // Only allow save shortcut in regular inputs
        if (!(event.key === "s" && (event.ctrlKey || event.metaKey))) {
          return;
        }
      }

      for (const hotkey of hotkeys) {
        const ctrlMatch = hotkey.ctrl ? (event.ctrlKey || (isMac && event.metaKey)) : true;
        const cmdMatch = hotkey.cmd ? event.metaKey : true;
        const shiftMatch = hotkey.shift ? event.shiftKey : !event.shiftKey || hotkey.shift === undefined;
        const altMatch = hotkey.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === hotkey.key.toLowerCase();

        if (keyMatch && ctrlMatch && cmdMatch && shiftMatch && altMatch) {
          event.preventDefault();
          event.stopPropagation();
          hotkey.handler();
          return;
        }
      }
    },
    [hotkeys, isMac]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { hotkeys };
}

// Export hotkey descriptions for help menu
export function getHotkeyDescriptions() {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const mod = isMac ? "⌘" : "Ctrl";
  
  return [
    { keys: `${mod}+S`, description: "Save current file" },
    { keys: `${mod}+W`, description: "Close current tab" },
    { keys: "Ctrl+`", description: "Toggle terminal" },
    { keys: `${mod}+J`, description: "Toggle panel" },
    { keys: `${mod}+B`, description: "Toggle sidebar" },
    { keys: `${mod}+Shift+E`, description: "Show explorer" },
    { keys: `${mod}+Shift+F`, description: "Search in files" },
    { keys: `${mod}+Shift+L`, description: "Show lessons" },
    { keys: "Ctrl+Tab", description: "Next tab" },
    { keys: "Ctrl+Shift+Tab", description: "Previous tab" },
    { keys: `${mod}+,`, description: "Open settings" },
    { keys: `${mod}+Shift+Enter`, description: "Run code" },
  ];
}
