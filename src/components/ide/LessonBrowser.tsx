import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { BookOpen, GraduationCap, Clock, Star, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonSummary, Difficulty } from "@/types/ipc";

export function LessonBrowser() {
  const { lesson, setLesson } = useAppStore();
  const [activeTab, setActiveTab] = useState<"local" | "marketplace">("local");

  // Demo lessons for UI
  const demoLessons: LessonSummary[] = [
    {
      id: "intro-python",
      title: "Introduction to Python",
      description: "Learn the basics of Python programming",
      language: "python",
      difficulty: "beginner",
      path: "/lessons/intro-python/lesson.yaml",
    },
    {
      id: "loops",
      title: "Loops and Iteration",
      description: "Master for and while loops",
      language: "python",
      difficulty: "beginner",
      path: "/lessons/loops/lesson.yaml",
    },
    {
      id: "functions",
      title: "Functions and Scope",
      description: "Write reusable code with functions",
      language: "python",
      difficulty: "intermediate",
      path: "/lessons/functions/lesson.yaml",
    },
  ];

  const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case "beginner":
        return "text-emerald-400 bg-emerald-400/10";
      case "intermediate":
        return "text-amber-400 bg-amber-400/10";
      case "advanced":
        return "text-red-400 bg-red-400/10";
    }
  };

  return (
    <div className="flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-panel-border">
        <button
          onClick={() => setActiveTab("local")}
          className={cn(
            "flex-1 px-4 py-2 text-xs font-medium transition-colors",
            activeTab === "local"
              ? "border-b-2 border-shell-500 text-white"
              : "text-sidebar-fg/60 hover:text-sidebar-fg"
          )}
        >
          Local
        </button>
        <button
          onClick={() => setActiveTab("marketplace")}
          className={cn(
            "flex-1 px-4 py-2 text-xs font-medium transition-colors",
            activeTab === "marketplace"
              ? "border-b-2 border-shell-500 text-white"
              : "text-sidebar-fg/60 hover:text-sidebar-fg"
          )}
        >
          Marketplace
        </button>
      </div>

      {/* Lesson list */}
      <div className="flex-1 overflow-auto p-2">
        {activeTab === "local" ? (
          demoLessons.length > 0 ? (
            <div className="space-y-2">
              {demoLessons.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    // TODO: Load lesson
                  }}
                  className="group w-full rounded-lg bg-sidebar-hover/50 p-3 text-left transition-colors hover:bg-sidebar-hover"
                >
                  <div className="mb-1 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-shell-400" />
                      <span className="text-sm font-medium text-white">
                        {l.title}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-sidebar-fg/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                  </div>
                  <p className="mb-2 text-xs text-sidebar-fg/60 line-clamp-2">
                    {l.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xxs font-medium capitalize",
                        getDifficultyColor(l.difficulty)
                      )}
                    >
                      {l.difficulty}
                    </span>
                    <span className="text-xxs text-sidebar-fg/40">
                      {l.language}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="mb-2 h-8 w-8 text-sidebar-fg/30" />
              <p className="text-sm text-sidebar-fg/60">No local lessons</p>
              <p className="text-xs text-sidebar-fg/40">
                Download from marketplace
              </p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <GraduationCap className="mb-2 h-8 w-8 text-sidebar-fg/30" />
            <p className="text-sm text-sidebar-fg/60">Marketplace</p>
            <p className="text-xs text-sidebar-fg/40">Coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}
