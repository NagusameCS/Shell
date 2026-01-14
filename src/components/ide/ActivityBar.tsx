import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import {
  Files,
  BookOpen,
  Search,
  Settings,
  GraduationCap,
  FileText,
  Footprints,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewId = "explorer" | "lessons" | "search" | "extensions" | "settings" | "docs" | "stepdebug";

interface ActivityItem {
  id: ViewId;
  icon: LucideIcon;
  label: string;
}

export function ActivityBar() {
  const { activeView, setActiveView, isTeacher } = useAppStore();
  const { user, isAuthenticated } = useAuthStore();
  
  // Check if user is enrolled in any classroom (has lessons access)
  const isEnrolledStudent = isAuthenticated && 
    user?.enrolledClassrooms && 
    user.enrolledClassrooms.length > 0;

  // Base items - always show
  const items: ActivityItem[] = [
    { id: "explorer", icon: Files, label: "Explorer" },
    { id: "search", icon: Search, label: "Search" },
    { id: "stepdebug", icon: Footprints, label: "Step-by-Step Execution" },
    { id: "docs", icon: FileText, label: "Documentation" },
  ];
  
  // Only show lessons for enrolled students or teachers
  if (isEnrolledStudent || isTeacher) {
    items.splice(1, 0, { id: "lessons", icon: BookOpen, label: "Lessons" });
  }

  return (
    <div className="flex w-12 flex-col items-center border-r border-panel-border bg-sidebar-bg py-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveView(item.id)}
          className={cn(
            "activity-icon w-full",
            activeView === item.id && "active"
          )}
          title={item.label}
          aria-label={item.label}
        >
          <item.icon className="mx-auto h-5 w-5 text-sidebar-fg/70" />
        </button>
      ))}

      <div className="flex-1" />

      {isTeacher && (
        <button 
          className="activity-icon w-full" 
          title="Classroom"
          aria-label="Classroom"
        >
          <GraduationCap className="mx-auto h-5 w-5 text-shell-400" />
        </button>
      )}

      <button
        onClick={() => setActiveView("settings")}
        className={cn(
          "activity-icon w-full",
          activeView === "settings" && "active"
        )}
        title="Settings"
        aria-label="Settings"
      >
        <Settings className="mx-auto h-5 w-5 text-sidebar-fg/70" />
      </button>
    </div>
  );
}
