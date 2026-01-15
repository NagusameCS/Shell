/**
 * TerminalView - Interactive terminal using xterm.js with Tauri shell
 * 
 * Features:
 * - Full PTY emulation via shell commands
 * - Auto-resize on panel resize
 * - Web links addon for clickable URLs
 */

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Command } from "@tauri-apps/plugin-shell";
import { useAppStore } from "@/stores/appStore";
import "@xterm/xterm/css/xterm.css";

export function TerminalView() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const commandBufferRef = useRef<string>("");
  const { project } = useAppStore();

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const term = new Terminal({
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#7DD3FC",
        cursorAccent: "#1e1e1e",
        selectionBackground: "#264f78",
        black: "#1e1e1e",
        red: "#f48771",
        green: "#89d185",
        yellow: "#dcdcaa",
        blue: "#569cd6",
        magenta: "#c586c0",
        cyan: "#7DD3FC",
        white: "#d4d4d4",
        brightBlack: "#808080",
        brightRed: "#f14c4c",
        brightGreen: "#89d185",
        brightYellow: "#dcdcaa",
        brightBlue: "#569cd6",
        brightMagenta: "#c586c0",
        brightCyan: "#7DD3FC",
        brightWhite: "#ffffff",
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, monospace",
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: "bar",
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Print welcome message
    const projectName = project?.name || "Shell";
    term.writeln("\x1b[36m╭──────────────────────────────────────╮\x1b[0m");
    term.writeln(`\x1b[36m│\x1b[0m  \x1b[1m${projectName}\x1b[0m Terminal`);
    term.writeln("\x1b[36m╰──────────────────────────────────────╯\x1b[0m");
    term.writeln("");
    printPrompt(term);

    // Handle input
    term.onData((data) => {
      handleInput(term, data);
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    // ResizeObserver for panel resizing
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [project?.name]);

  const printPrompt = (term: Terminal) => {
    const cwd = project?.path?.split("/").pop() || "~";
    term.write(`\x1b[32m${cwd}\x1b[0m \x1b[34m>\x1b[0m `);
  };

  const handleInput = (term: Terminal, data: string) => {
    const ord = data.charCodeAt(0);

    // Enter key
    if (ord === 13) {
      term.writeln("");
      const command = commandBufferRef.current.trim();
      commandBufferRef.current = "";

      if (command) {
        executeCommand(term, command);
      } else {
        printPrompt(term);
      }
    }
    // Backspace
    else if (ord === 127) {
      if (commandBufferRef.current.length > 0) {
        commandBufferRef.current = commandBufferRef.current.slice(0, -1);
        term.write("\b \b");
      }
    }
    // Ctrl+C
    else if (ord === 3) {
      term.writeln("^C");
      commandBufferRef.current = "";
      printPrompt(term);
    }
    // Ctrl+L (clear)
    else if (ord === 12) {
      term.clear();
      printPrompt(term);
    }
    // Regular characters
    else if (ord >= 32) {
      commandBufferRef.current += data;
      term.write(data);
    }
  };

  const executeCommand = async (term: Terminal, command: string) => {
    // Handle built-in commands
    if (command === "clear" || command === "cls") {
      term.clear();
      printPrompt(term);
      return;
    }

    if (command === "exit") {
      term.writeln("\x1b[33mUse Cmd+` to hide terminal\x1b[0m");
      printPrompt(term);
      return;
    }

    try {
      // Execute via shell wrapper for full command support
      const shellCommand = Command.create("exec-sh", ["-c", command], {
        cwd: project?.path || undefined,
      });

      const output = await shellCommand.execute();

      if (output.stdout) {
        term.write(output.stdout.replace(/\n/g, "\r\n"));
      }
      if (output.stderr) {
        term.write(`\x1b[31m${output.stderr.replace(/\n/g, "\r\n")}\x1b[0m`);
      }

      printPrompt(term);
    } catch (err) {
      // Fallback: try running directly without shell
      try {
        const parts = command.split(" ");
        const cmd = parts[0];
        const args = parts.slice(1);

        const directCommand = Command.create(cmd, args, {
          cwd: project?.path || undefined,
        });

        const output = await directCommand.execute();

        if (output.stdout) {
          term.write(output.stdout.replace(/\n/g, "\r\n"));
        }
        if (output.stderr) {
          term.write(`\x1b[31m${output.stderr.replace(/\n/g, "\r\n")}\x1b[0m`);
        }
      } catch {
        term.writeln(`\x1b[31mCommand not found: ${command}\x1b[0m`);
        term.writeln(`\x1b[33mNote: Shell commands require configuration in tauri.conf.json\x1b[0m`);
      }

      printPrompt(term);
    }
  };

  return (
    <div 
      ref={terminalRef} 
      className="h-full w-full bg-[#1e1e1e]"
      style={{ padding: "4px" }}
    />
  );
}
