/**
 * ContextMenu - Right-click context menu for file explorer
 */

import { useEffect, useRef } from "react";
import {
  Trash2,
  Copy,
  Clipboard,
  Edit,
  FilePlus,
  FolderPlus,
  ExternalLink,
  FileCode,
} from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  isDirectory: boolean;
  filePath: string;
  fileName: string;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onOpenInTerminal?: () => void;
  onRevealInFinder?: () => void;
}

export function ContextMenu({
  x,
  y,
  isDirectory,
  filePath,
  fileName,
  onClose,
  onRename,
  onDelete,
  onCopy,
  onPaste,
  onNewFile,
  onNewFolder,
  onOpenInTerminal,
  onRevealInFinder,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  const MenuItem = ({
    icon: Icon,
    label,
    onClick,
    danger = false,
    disabled = false,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
  }) => (
    <button
      onClick={() => {
        if (!disabled) {
          onClick();
          onClose();
        }
      }}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
        disabled
          ? "text-[#6b7280] cursor-not-allowed"
          : danger
          ? "text-[#ef4444] hover:bg-[#ef4444]/20"
          : "text-[#d4d4d4] hover:bg-[#3c3c3c]"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );

  const Separator = () => <div className="my-1 h-px bg-[#3c3c3c]" />;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-lg border border-[#3c3c3c] bg-[#252526] py-1 shadow-lg"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {isDirectory ? (
        <>
          <MenuItem icon={FilePlus} label="New File" onClick={onNewFile} />
          <MenuItem icon={FolderPlus} label="New Folder" onClick={onNewFolder} />
          <Separator />
          <MenuItem icon={Copy} label="Copy Path" onClick={onCopy} />
          <MenuItem icon={Clipboard} label="Paste" onClick={onPaste} />
          <Separator />
          <MenuItem icon={Edit} label="Rename" onClick={onRename} />
          <MenuItem icon={Trash2} label="Delete" onClick={onDelete} danger />
          {onRevealInFinder && (
            <>
              <Separator />
              <MenuItem
                icon={ExternalLink}
                label="Reveal in Finder"
                onClick={onRevealInFinder}
              />
            </>
          )}
        </>
      ) : (
        <>
          <MenuItem icon={FileCode} label="Open" onClick={onClose} />
          <Separator />
          <MenuItem icon={Copy} label="Copy Path" onClick={onCopy} />
          <MenuItem icon={Clipboard} label="Paste" onClick={onPaste} disabled />
          <Separator />
          <MenuItem icon={Edit} label="Rename" onClick={onRename} />
          <MenuItem icon={Trash2} label="Delete" onClick={onDelete} danger />
          {onRevealInFinder && (
            <>
              <Separator />
              <MenuItem
                icon={ExternalLink}
                label="Reveal in Finder"
                onClick={onRevealInFinder}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
