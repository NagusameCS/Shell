import { memo, useMemo, useCallback } from "react";
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

export const ActivityBar = memo(function ActivityBar() {
  // Use selectors to only subscribe to needed state
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const isTeacher = useAppStore((s) => s.isTeacher);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  
  // Check if user is enrolled in any classroom (has lessons access)
  const isEnrolledStudent = isAuthenticated && 
    user?.enrolledClassrooms && 
    user.enrolledClassrooms.length > 0;

  // Memoize items array to prevent recreation on every render
  const items = useMemo(() => {
    const baseItems: ActivityItem[] = [
      { id: "explorer", icon: Files, label: "Explorer" },
      { id: "search", icon: Search, label: "Search" },
      { id: "stepdebug", icon: Footprints, label: "Step-by-Step Execution" },
      { id: "docs", icon: FileText, label: "Documentation" },
    ];
    
    // Only show lessons for enrolled students or teachers
    if (isEnrolledStudent || isTeacher) {
      baseItems.splice(1, 0, { id: "lessons", icon: BookOpen, label: "Lessons" });
    }
    return baseItems;
  }, [isEnrolledStudent, isTeacher]);

  // Memoize click handlers
  const handleViewClick = useCallback((id: ViewId) => {
    setActiveView(id);
  }, [setActiveView]);

  return (
    <div className="flex w-12 flex-col items-center border-r border-panel-border bg-sidebar-bg py-2">
      {items.map((item) => (
        <ActivityButton
          key={item.id}
          item={item}
          isActive={activeView === item.id}
          onClick={handleViewClick}
        />
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

      <ActivityButton
        item={{ id: "settings", icon: Settings, label: "Settings" }}
        isActive={activeView === "settings"}
        onClick={handleViewClick}
      />
    </div>
  );
});

// Memoized button component to prevent unnecessary re-renders
const ActivityButton = memo(function ActivityButton({
  item,
  isActive,
  onClick,
}: {
  item: ActivityItem;
  isActive: boolean;
  onClick: (id: ViewId) => void;
}) {
  const handleClick = useCallback(() => {
    onClick(item.id);
  }, [onClick, item.id]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "activity-icon w-full",
        isActive && "active"
      )}
      title={item.label}
      aria-label={item.label}
    >
      <item.icon className="mx-auto h-5 w-5 text-sidebar-fg/70" />
    </button>
  );
});
