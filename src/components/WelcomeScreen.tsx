/**
 * Welcome Screen - Main landing after login
 * 
 * Simplified single-column layout:
 * - Shelly centered at top
 * - Main actions below
 * - Clone GitHub at bottom center
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { Command } from "@tauri-apps/plugin-shell";
import { readProject } from "@/lib/api";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { useRecentProjectsStore } from "@/stores/recentProjectsStore";
import { signOut } from "@/lib/firebase";
import { NewProjectModal } from "@/components/NewProjectModal";
import { JoinClassroomButton } from "@/components/JoinClassroomModal";
import {
  FolderOpen,
  Plus,
  Clock,
  LogOut,
  Github,
  Cloud,
  Settings,
  X,
  GraduationCap,
} from "lucide-react";

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { setProject } = useAppStore();
  const { user, isEducator, canUseCloudSync, logout } = useAuthStore();
  const { recentProjects, addRecentProject, removeRecentProject } = useRecentProjectsStore();
  const [gitUrl, setGitUrl] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [showCloneInput, setShowCloneInput] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+N or Ctrl+N - New project
      if ((e.metaKey || e.ctrlKey) && e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        setShowNewProjectModal(true);
      }
      // Cmd+Shift+N or Ctrl+Shift+N - New window
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        import("@tauri-apps/api/webviewWindow").then(({ WebviewWindow }) => {
          const webview = new WebviewWindow("shell-new-" + Date.now(), {
            url: "/",
            title: "Shell",
            width: 1200,
            height: 800,
          });
          webview.once("tauri://error", (e) => {
            console.error("Failed to create new window:", e);
          });
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpenFolder = async () => {
    setError(null);
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Open Project Folder",
      });

      if (selected) {
        const projectInfo = await readProject(selected as string);
        setProject(projectInfo);
        
        // Add to recent projects
        addRecentProject({
          path: selected as string,
          name: projectInfo.name,
          language: projectInfo.language || "unknown",
        });
        
        navigate("/ide");
      }
    } catch (err) {
      console.error("Failed to open folder:", err);
      setError("Failed to open folder. Please try again.");
    }
  };

  const handleNewProject = () => {
    setShowNewProjectModal(true);
  };

  const handleProjectCreated = async (path: string) => {
    try {
      const projectInfo = await readProject(path);
      setProject(projectInfo);
      
      // Add to recent projects
      addRecentProject({
        path,
        name: projectInfo.name,
        language: projectInfo.language || "unknown",
      });
      
      navigate("/ide");
    } catch (err) {
      console.error("Failed to open created project:", err);
      setError("Project created but failed to open.");
    }
  };

  const handleCloneFromGitHub = async () => {
    if (!gitUrl.trim()) return;

    setIsCloning(true);
    setError(null);
    try {
      const destination = await open({
        directory: true,
        multiple: false,
        title: "Select destination folder",
      });

      if (destination) {
        // Extract repo name from URL
        const repoName = gitUrl.split("/").pop()?.replace(".git", "") || "repo";
        const projectPath = `${destination}/${repoName}`;
        
        // Actually clone via git
        const command = Command.create("git", ["clone", gitUrl.trim(), projectPath]);
        const output = await command.execute();
        
        if (output.code !== 0) {
          throw new Error(output.stderr || "Git clone failed");
        }
        
        // Try to open the project
        const projectInfo = await readProject(projectPath);
        setProject(projectInfo);
        
        // Add to recent projects
        addRecentProject({
          path: projectPath,
          name: repoName,
          language: projectInfo.language || "unknown",
        });
        
        navigate("/ide");
      }
    } catch (err) {
      console.error("Failed to clone:", err);
      setError(err instanceof Error ? err.message : "Failed to clone repository.");
    } finally {
      setIsCloning(false);
      setShowCloneInput(false);
      setGitUrl("");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    logout();
  };

  const handleOpenRecentProject = async (path: string) => {
    setError(null);
    try {
      const projectInfo = await readProject(path);
      setProject(projectInfo);
      
      // Update lastOpened timestamp
      addRecentProject({
        path,
        name: projectInfo.name,
        language: projectInfo.language || "unknown",
      });
      
      navigate("/ide");
    } catch (err) {
      console.error("Failed to open recent project:", err);
      setError("Failed to open project. It may have been moved or deleted.");
      removeRecentProject(path);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1e1e1e] p-8">
      {/* User header - top right */}
      {user && (
        <div className="absolute right-4 top-4 flex items-center gap-2">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || "User"}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-color)] text-sm font-medium text-white">
              {user.displayName?.charAt(0) || user.email?.charAt(0) || "?"}
            </div>
          )}
          <span className="text-sm text-[#9ca3af]">{user.displayName || user.email}</span>
          {isEducator() && (
            <span className="flex items-center gap-1 rounded-full bg-[#fbbf24]/20 px-2 py-0.5 text-xs text-[#fbbf24]">
              <Crown className="h-3 w-3" />
              Educator
            </span>
          )}
          <button
            onClick={() => navigate("/settings")}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-[#3c3c3c] hover:text-white"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={handleSignOut}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-[#3c3c3c] hover:text-[#ef4444]"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main content - centered */}
      <div className="flex w-full max-w-md flex-col items-center">
        {/* Logo */}
        <img src="/favicon.svg" alt="Shell" className="h-24 w-24 mb-4" />
        <h1 className="text-2xl font-semibold text-white mb-1">Shell</h1>
        <p className="text-sm text-[#6b7280] mb-4">Education-first IDE</p>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-lg bg-[#ef4444]/20 px-4 py-2 text-sm text-[#ef4444]">
            {error}
          </div>
        )}

        {/* Main actions */}
        <div className="mt-8 w-full space-y-3">
          <button
            onClick={handleOpenFolder}
            className="group flex w-full items-center gap-3 rounded-xl bg-[#252526] p-4 text-left hover:bg-[#3c3c3c]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-color)]/20 text-[var(--accent-color)]">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">Open Folder</div>
              <div className="text-xs text-[#6b7280]">Open an existing project</div>
            </div>
          </button>

          <button
            onClick={handleNewProject}
            className="group flex w-full items-center gap-3 rounded-xl bg-[#252526] p-4 text-left hover:bg-[#3c3c3c]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#34d399]/20 text-[#34d399]">
              <Plus className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">New Project</div>
              <div className="text-xs text-[#6b7280]">
                Choose a stack or template
                <span className="ml-2 text-[#4a4a4a]">⌘N</span>
              </div>
            </div>
          </button>

          {/* Cloud Projects - Educator tier only */}
          {canUseCloudSync() && (
            <button className="group flex w-full items-center gap-3 rounded-xl bg-[#252526] p-4 text-left hover:bg-[#3c3c3c]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#38bdf8]/20 text-[#38bdf8]">
                <Cloud className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">Cloud Projects</div>
                <div className="text-xs text-[#6b7280]">Access synced projects</div>
              </div>
            </button>
          )}

          {/* Join Classroom - for students */}
          <JoinClassroomButton
            className="group flex w-full items-center gap-3 rounded-xl bg-[#252526] p-4 text-left hover:bg-[#3c3c3c]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-color)]/20 text-[var(--accent-color)]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">Join Classroom</div>
              <div className="text-xs text-[#6b7280]">Enter a classroom code</div>
            </div>
          </JoinClassroomButton>
        </div>

        {/* Recent projects */}
        <div className="mt-6 w-full">
          <div className="mb-2 flex items-center gap-2 text-xs text-[#6b7280]">
            <Clock className="h-3 w-3" />
            Recent Projects
          </div>
          {recentProjects.length > 0 ? (
            <div className="rounded-lg bg-[#252526] divide-y divide-[#3c3c3c]">
              {recentProjects.slice(0, 5).map((project) => (
                <div
                  key={project.path}
                  className="group flex items-center gap-3 p-3 hover:bg-[#3c3c3c] cursor-pointer first:rounded-t-lg last:rounded-b-lg"
                  onClick={() => handleOpenRecentProject(project.path)}
                >
                  <FolderOpen className="h-4 w-4 text-[var(--accent-color)]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{project.name}</div>
                    <div className="text-xs text-[#6b7280] truncate">{project.path}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentProject(project.path);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#6b7280] hover:text-[#ef4444]"
                    title="Remove from recents"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-[#252526] p-3 text-center text-xs text-[#4a4a4a]">
              No recent projects
            </div>
          )}
        </div>

        {/* Clone from GitHub - front center at bottom */}
        <div className="mt-8 w-full">
          {showCloneInput ? (
            <div className="rounded-xl bg-[#252526] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Github className="h-5 w-5 text-white" />
                <span className="font-medium text-white">Clone from GitHub</span>
              </div>
              <input
                type="text"
                placeholder="https://github.com/user/repo.git"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                className="w-full rounded-lg bg-[#3c3c3c] px-4 py-3 text-white placeholder-[#6b7280] outline-none focus:ring-2 focus:ring-[var(--accent-color)]" 
                onKeyDown={(e) => e.key === "Enter" && handleCloneFromGitHub()}
                autoFocus
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleCloneFromGitHub}
                  disabled={isCloning || !gitUrl.trim()}
                  className="flex-1 rounded-lg bg-[var(--accent-color)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isCloning ? "Cloning..." : "Clone"}
                </button>
                <button
                  onClick={() => { setShowCloneInput(false); setGitUrl(""); }}
                  className="rounded-lg bg-[#3c3c3c] px-4 py-2 text-[#9ca3af] hover:bg-[#4a4a4a]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCloneInput(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#3c3c3c] p-4 text-[#9ca3af] hover:border-[var(--accent-color)] hover:text-white"
            >
              <Github className="h-5 w-5" />
              <span>Clone from GitHub</span>
            </button>
          )}
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-6 text-center text-xs text-[#4a4a4a]">
          ⌘N New Project • ⌘⇧N New Window
        </div>
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
