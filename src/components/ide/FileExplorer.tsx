import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useAppStore } from "@/stores/appStore";
import { useEditorStore } from "@/stores/editorStore";
import { listDirectory, createFile, deleteFile } from "@/lib/api";
import { readTextFile, mkdir, remove, rename } from "@tauri-apps/plugin-fs";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { getLanguageFromExtension, getFileExtension, cn } from "@/lib/utils";
import { ContextMenu } from "./ContextMenu";
import type { FileInfo } from "@/types/ipc";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  Image,
  Settings,
  Database,
  FileType,
  Package,
  Globe,
  Coffee,
  Cog,
  Hash,
  FilePlus,
  FolderPlus,
  RefreshCw,
} from "lucide-react";

// Memoized file icon lookup to avoid switch recreation
const getFileIconByExtension = (ext: string) => {
  switch (ext) {
    case "js": return <FileCode className="h-4 w-4 text-yellow-400" />;
    case "jsx": return <FileCode className="h-4 w-4 text-[#61dafb]" />;
    case "ts": return <FileCode className="h-4 w-4 text-blue-500" />;
    case "tsx": return <FileCode className="h-4 w-4 text-[#61dafb]" />;
    case "py": return <FileCode className="h-4 w-4 text-[#3776ab]" />;
    case "rs": return <FileCode className="h-4 w-4 text-orange-600" />;
    case "java": return <Coffee className="h-4 w-4 text-red-500" />;
    case "c": case "h": return <Hash className="h-4 w-4 text-blue-400" />;
    case "cpp": case "hpp": case "cc": return <Hash className="h-4 w-4 text-pink-500" />;
    case "json": return <FileJson className="h-4 w-4 text-yellow-500" />;
    case "yaml": case "yml": return <FileJson className="h-4 w-4 text-red-400" />;
    case "toml": return <FileJson className="h-4 w-4 text-gray-400" />;
    case "html": return <Globe className="h-4 w-4 text-orange-500" />;
    case "css": return <FileCode className="h-4 w-4 text-blue-400" />;
    case "scss": case "sass": return <FileCode className="h-4 w-4 text-pink-400" />;
    case "md": case "mdx": return <FileText className="h-4 w-4 text-[#7DD3FC]" />;
    case "txt": return <FileText className="h-4 w-4 text-gray-400" />;
    case "png": case "jpg": case "jpeg": case "gif": case "svg": case "webp": 
      return <Image className="h-4 w-4 text-purple-400" />;
    case "sql": case "db": case "sqlite": return <Database className="h-4 w-4 text-blue-400" />;
    default: return <File className="h-4 w-4 text-sidebar-fg/50" />;
  }
};

export const FileExplorer = memo(function FileExplorer() {
  const project = useAppStore((s) => s.project);
  const openFile = useEditorStore((s) => s.openFile);
  const closeFile = useEditorStore((s) => s.closeFile);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<Map<string, FileInfo[]>>(new Map());
  const [newItemPath, setNewItemPath] = useState<string | null>(null);
  const [newItemType, setNewItemType] = useState<"file" | "folder">("file");
  const [newItemName, setNewItemName] = useState("");
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [clipboard, setClipboard] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    path: string;
    name: string;
    isDirectory: boolean;
  } | null>(null);

  useEffect(() => {
    if (project?.path) {
      loadDirectory(project.path);
    }
  }, [project?.path]);

  const loadDirectory = useCallback(async (path: string) => {
    try {
      const contents = await listDirectory(path);
      setFiles((prev) => new Map(prev).set(path, contents.entries));
    } catch (error) {
      console.error("Failed to load directory:", error);
    }
  }, []);

  const refreshAll = useCallback(() => {
    if (project?.path) {
      setFiles(new Map());
      loadDirectory(project.path);
    }
  }, [project?.path, loadDirectory]);

  const handleNewFile = useCallback((parentPath?: string) => {
    const path = parentPath || project?.path;
    if (path) {
      setNewItemPath(path);
      setNewItemType("file");
      setNewItemName("");
      setExpanded((prev) => new Set(prev).add(path));
    }
  }, [project?.path]);

  const handleNewFolder = useCallback((parentPath?: string) => {
    const path = parentPath || project?.path;
    if (path) {
      setNewItemPath(path);
      setNewItemType("folder");
      setNewItemName("");
      setExpanded((prev) => new Set(prev).add(path));
    }
  }, [project?.path]);

  const handleCreateItem = useCallback(async () => {
    if (!newItemPath || !newItemName.trim()) {
      setNewItemPath(null);
      return;
    }

    const fullPath = `${newItemPath}/${newItemName.trim()}`;

    try {
      if (newItemType === "folder") {
        await mkdir(fullPath, { recursive: true });
      } else {
        await createFile(fullPath, "");
        // Open the new file
        const ext = getFileExtension(fullPath);
        openFile({
          path: fullPath,
          name: newItemName.trim(),
          content: "",
          language: getLanguageFromExtension(ext),
          modified: false,
        });
      }
      // Refresh the parent directory
      await loadDirectory(newItemPath);
    } catch (error) {
      console.error("Failed to create item:", error);
    }

    setNewItemPath(null);
    setNewItemName("");
  }, [newItemPath, newItemName, newItemType, openFile, loadDirectory]);

  const toggleExpanded = useCallback((path: string) => {
    setExpanded((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
        loadDirectory(path);
      }
      return newExpanded;
    });
  }, [loadDirectory]);

  const handleRename = useCallback(async (oldPath: string, newName: string) => {
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/"));
    const newPath = `${parentPath}/${newName}`;
    try {
      await rename(oldPath, newPath);
      await loadDirectory(parentPath);
    } catch (error) {
      console.error("Failed to rename:", error);
    }
    setRenamingPath(null);
  }, [loadDirectory]);

  const handleDelete = useCallback(async (path: string, isDirectory: boolean) => {
    try {
      await remove(path, { recursive: isDirectory });
      const parentPath = path.substring(0, path.lastIndexOf("/"));
      await loadDirectory(parentPath);
      closeFile(path);
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  }, [loadDirectory, closeFile]);

  const handleCopyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(path);
    setClipboard(path);
  }, []);

  const handleContextMenuAction = useCallback((
    action: string,
    path: string,
    name: string,
    isDirectory: boolean
  ) => {
    setContextMenu(null);
    switch (action) {
      case "copy":
        handleCopyPath(path);
        break;
      case "rename":
        setRenamingPath(path);
        setRenameValue(name);
        break;
      case "delete":
        handleDelete(path, isDirectory);
        break;
      case "newFile":
        handleNewFile(path);
        break;
      case "newFolder":
        handleNewFolder(path);
        break;
      case "openInFinder":
        shellOpen(isDirectory ? path : path.substring(0, path.lastIndexOf("/")));
        break;
    }
  }, [handleCopyPath, handleDelete, handleNewFile, handleNewFolder]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center text-sm text-sidebar-fg/60">
        <p className="mb-2">No folder opened</p>
        <p className="text-xs">Open a folder to start</p>
      </div>
    );
  }

  const rootFiles = files.get(project.path) || [];

  return (
    <div className="text-sm">
      {/* Project header with actions */}
      <div className="sticky top-0 bg-sidebar-bg px-2 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-sidebar-fg/60">
            <Folder className="h-4 w-4" />
            <span className="truncate">{project.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleNewFile()}
              className="rounded p-1 hover:bg-white/10"
              title="New File"
            >
              <FilePlus className="h-4 w-4 text-sidebar-fg/60 hover:text-sidebar-fg" />
            </button>
            <button
              onClick={() => handleNewFolder()}
              className="rounded p-1 hover:bg-white/10"
              title="New Folder"
            >
              <FolderPlus className="h-4 w-4 text-sidebar-fg/60 hover:text-sidebar-fg" />
            </button>
            <button
              onClick={refreshAll}
              className="rounded p-1 hover:bg-white/10"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-sidebar-fg/60 hover:text-sidebar-fg" />
            </button>
          </div>
        </div>
      </div>

      {/* New item input at root */}
      {newItemPath === project.path && (
        <div className="px-2 py-1">
          <div className="flex items-center gap-1">
            {newItemType === "folder" ? (
              <Folder className="h-4 w-4 text-amber-500" />
            ) : (
              <File className="h-4 w-4 text-sidebar-fg/50" />
            )}
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateItem();
                if (e.key === "Escape") setNewItemPath(null);
              }}
              onBlur={handleCreateItem}
              placeholder={newItemType === "folder" ? "folder name" : "file name"}
              className="flex-1 bg-[#3c3c3c] px-2 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-[#7DD3FC] rounded"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* File tree */}
      <div className="px-1">
        {rootFiles.map((file) => (
          <FileTreeItem
            key={file.path}
            file={file}
            depth={0}
            expanded={expanded}
            files={files}
            onToggle={toggleExpanded}
            newItemPath={newItemPath}
            newItemType={newItemType}
            newItemName={newItemName}
            setNewItemName={setNewItemName}
            handleCreateItem={handleCreateItem}
            setNewItemPath={setNewItemPath}
            handleNewFile={handleNewFile}
            handleNewFolder={handleNewFolder}
            renamingPath={renamingPath}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            onRenameSubmit={handleRename}
            onContextMenu={(e, f) => {
              e.preventDefault();
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                path: f.path,
                name: f.name,
                isDirectory: f.is_directory,
              });
            }}
          />
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isDirectory={contextMenu.isDirectory}
          filePath={contextMenu.path}
          fileName={contextMenu.name}
          onClose={() => setContextMenu(null)}
          onRename={() => handleContextMenuAction("rename", contextMenu.path, contextMenu.name, contextMenu.isDirectory)}
          onDelete={() => handleContextMenuAction("delete", contextMenu.path, contextMenu.name, contextMenu.isDirectory)}
          onCopy={() => handleContextMenuAction("copy", contextMenu.path, contextMenu.name, contextMenu.isDirectory)}
          onPaste={() => {}} // TODO: implement paste
          onNewFile={() => handleContextMenuAction("newFile", contextMenu.path, contextMenu.name, contextMenu.isDirectory)}
          onNewFolder={() => handleContextMenuAction("newFolder", contextMenu.path, contextMenu.name, contextMenu.isDirectory)}
          onRevealInFinder={() => handleContextMenuAction("openInFinder", contextMenu.path, contextMenu.name, contextMenu.isDirectory)}
        />
      )}
    </div>
  );
});

interface FileTreeItemProps {
  file: FileInfo;
  depth: number;
  expanded: Set<string>;
  files: Map<string, FileInfo[]>;
  onToggle: (path: string) => void;
  newItemPath: string | null;
  newItemType: "file" | "folder";
  newItemName: string;
  setNewItemName: (name: string) => void;
  handleCreateItem: () => void;
  setNewItemPath: (path: string | null) => void;
  handleNewFile: (path?: string) => void;
  handleNewFolder: (path?: string) => void;
  renamingPath: string | null;
  renameValue: string;
  setRenameValue: (value: string) => void;
  onRenameSubmit: (oldPath: string, newName: string) => void;
  onContextMenu: (e: React.MouseEvent, file: FileInfo) => void;
}

function FileTreeItem({
  file,
  depth,
  expanded,
  files,
  onToggle,
  newItemPath,
  newItemType,
  newItemName,
  setNewItemName,
  handleCreateItem,
  setNewItemPath,
  handleNewFile,
  handleNewFolder,
  renamingPath,
  renameValue,
  setRenameValue,
  onRenameSubmit,
  onContextMenu,
}: FileTreeItemProps) {
  const openFile = useEditorStore((s) => s.openFile);
  const isExpanded = expanded.has(file.path);
  const children = useMemo(() => files.get(file.path) || [], [files, file.path]);

  const handleClick = useCallback(() => {
    if (file.is_directory) {
      onToggle(file.path);
    } else {
      handleOpenFile();
    }
  }, [file.is_directory, file.path, onToggle]);

  const handleOpenFile = useCallback(async () => {
    try {
      const content = await readTextFile(file.path);
      const ext = getFileExtension(file.path);
      const language = getLanguageFromExtension(ext);

      openFile({
        path: file.path,
        name: file.name,
        content,
        language,
        modified: false,
      });
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  }, [file.path, file.name, openFile]);

  // Memoize file icon to avoid recreating on every render
  const fileIcon = useMemo(() => {
    if (file.is_directory) {
      return isExpanded ? (
        <FolderOpen className="h-4 w-4 text-amber-500" />
      ) : (
        <Folder className="h-4 w-4 text-amber-500" />
      );
    }

    const ext = getFileExtension(file.path);
    const name = file.name.toLowerCase();
    
    // Special files
    if (name === "package.json") return <Package className="h-4 w-4 text-green-500" />;
    if (name === "tsconfig.json") return <Settings className="h-4 w-4 text-blue-500" />;
    if (name === ".gitignore") return <Cog className="h-4 w-4 text-gray-500" />;
    if (name === "dockerfile") return <Database className="h-4 w-4 text-blue-400" />;
    if (name.startsWith(".env")) return <Cog className="h-4 w-4 text-yellow-600" />;
    
    return getFileIconByExtension(ext);
  }, [file.is_directory, file.path, file.name, isExpanded]);

  const handleContextMenuEvent = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, file);
  }, [onContextMenu, file]);

  const isRenaming = renamingPath === file.path;

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenuEvent}
        className={cn(
          "sidebar-item group",
          "select-none"
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {file.is_directory && (
          <span className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        )}
        {!file.is_directory && <span className="w-4" />}
        {fileIcon}
        {isRenaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onRenameSubmit(file.path, renameValue);
              }
              if (e.key === "Escape") {
                onRenameSubmit(file.path, file.name); // Cancel - keep same name
              }
            }}
            onBlur={() => onRenameSubmit(file.path, renameValue)}
            className="flex-1 bg-[#3c3c3c] px-2 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-[#7DD3FC] rounded"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            aria-label="Rename file or folder"
            title="Rename file or folder"
          />
        ) : (
          <span className="flex-1 truncate">{file.name}</span>
        )}
        
        {/* Action buttons for directories */}
        {file.is_directory && (
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); handleNewFile(file.path); }}
              className="rounded p-0.5 hover:bg-white/10"
              title="New File"
            >
              <FilePlus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNewFolder(file.path); }}
              className="rounded p-0.5 hover:bg-white/10"
              title="New Folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* New item input in folder */}
      {file.is_directory && newItemPath === file.path && (
        <div style={{ paddingLeft: `${8 + (depth + 1) * 12}px` }} className="py-1">
          <div className="flex items-center gap-1">
            {newItemType === "folder" ? (
              <Folder className="h-4 w-4 text-amber-500" />
            ) : (
              <File className="h-4 w-4 text-sidebar-fg/50" />
            )}
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateItem();
                if (e.key === "Escape") setNewItemPath(null);
              }}
              onBlur={handleCreateItem}
              placeholder={newItemType === "folder" ? "folder name" : "file name"}
              className="flex-1 bg-[#3c3c3c] px-2 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-[#7DD3FC] rounded"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Children */}
      {file.is_directory && isExpanded && (
        <div>
          {children.map((child) => (
            <FileTreeItem
              key={child.path}
              file={child}
              depth={depth + 1}
              expanded={expanded}
              files={files}
              onToggle={onToggle}
              newItemPath={newItemPath}
              newItemType={newItemType}
              newItemName={newItemName}
              setNewItemName={setNewItemName}
              handleCreateItem={handleCreateItem}
              setNewItemPath={setNewItemPath}
              handleNewFile={handleNewFile}
              handleNewFolder={handleNewFolder}
              renamingPath={renamingPath}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              onRenameSubmit={onRenameSubmit}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
