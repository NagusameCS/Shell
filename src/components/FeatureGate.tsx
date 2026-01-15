/**
 * Feature Gate Component
 *
 * Shows feature availability based on tier and connectivity
 * Gracefully degrades when cloud is not available
 */

import { useState, useEffect, memo } from "react";
import { Cloud, CloudOff, Crown, Lock, Wifi, WifiOff } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { UpgradeButton } from "./UpgradeModal";

interface FeatureGateProps {
  feature: string;
  requiresEducator?: boolean;
  requiresCloud?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Feature definitions with their requirements
 */
export const FEATURES = {
  // Free tier features (always available)
  local_editor: { educator: false, cloud: false, label: "Code Editor" },
  local_execution: { educator: false, cloud: false, label: "Local Execution" },
  local_testing: { educator: false, cloud: false, label: "Local Testing" },
  local_lessons: { educator: false, cloud: false, label: "Lesson Viewer" },
  lsp_support: { educator: false, cloud: false, label: "Language Support" },
  
  // Educator tier features
  cloud_sync: { educator: true, cloud: true, label: "Cloud Sync" },
  classrooms: { educator: true, cloud: true, label: "Classrooms" },
  auto_grading: { educator: true, cloud: true, label: "Auto-Grading" },
  assignment_distribution: { educator: true, cloud: true, label: "Assignments" },
  analytics: { educator: true, cloud: true, label: "Analytics" },
  exam_mode: { educator: true, cloud: false, label: "Exam Mode" },
  plagiarism_detection: { educator: true, cloud: true, label: "Plagiarism Check" },
} as const;

export type FeatureKey = keyof typeof FEATURES;

/**
 * Hook to check feature availability
 */
export function useFeatureAvailable(feature: FeatureKey): {
  available: boolean;
  reason: "available" | "requires_educator" | "requires_cloud" | "offline";
} {
  const { isEducator } = useAuthStore();
  const featureConfig = FEATURES[feature];
  
  // Check if we're online (simplified check)
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  
  if (featureConfig.educator && !isEducator()) {
    return { available: false, reason: "requires_educator" };
  }
  
  if (featureConfig.cloud && !isOnline) {
    return { available: false, reason: "offline" };
  }
  
  return { available: true, reason: "available" };
}

/**
 * FeatureGate - Conditionally renders content based on feature availability
 */
export function FeatureGate({
  feature,
  requiresEducator = false,
  requiresCloud = false,
  children,
  fallback,
}: FeatureGateProps) {
  const { isEducator } = useAuthStore();
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  
  const canAccess = (!requiresEducator || isEducator()) && (!requiresCloud || isOnline);
  
  if (canAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <FeatureLockedCard
      requiresEducator={requiresEducator}
      requiresCloud={requiresCloud}
      isOnline={isOnline}
    />
  );
}

/**
 * Locked feature placeholder
 */
function FeatureLockedCard({
  requiresEducator,
  requiresCloud,
  isOnline,
}: {
  requiresEducator: boolean;
  requiresCloud: boolean;
  isOnline: boolean;
}) {
  if (requiresEducator) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
          <Crown className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-white">Educator Feature</h3>
        <p className="mb-4 text-sm text-slate-400">
          This feature is available with the Educator plan
        </p>
        <UpgradeButton />
      </div>
    );
  }
  
  if (requiresCloud && !isOnline) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
          <WifiOff className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-white">Offline</h3>
        <p className="text-sm text-slate-400">
          This feature requires an internet connection
        </p>
      </div>
    );
  }
  
  return null;
}

/**
 * Feature status indicator badge
 */
export function FeatureStatusBadge({ feature }: { feature: FeatureKey }) {
  const { available, reason } = useFeatureAvailable(feature);
  const config = FEATURES[feature];
  
  if (available) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
        {config.cloud ? <Cloud className="h-3 w-3" /> : null}
        Available
      </span>
    );
  }
  
  switch (reason) {
    case "requires_educator":
      return (
        <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
          <Crown className="h-3 w-3" />
          Educator Only
        </span>
      );
    case "offline":
      return (
        <span className="flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-1 text-xs text-slate-400">
          <CloudOff className="h-3 w-3" />
          Offline
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-400">
          <Lock className="h-3 w-3" />
          Locked
        </span>
      );
  }
}

/**
 * Offline indicator banner
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  
  // Listen for online/offline events - properly using useEffect
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  
  if (isOnline) return null;
  
  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
      <WifiOff className="h-4 w-4" />
      <span>You're offline. Some features may be unavailable.</span>
    </div>
  );
}

/**
 * Cloud feature indicator
 */
export function CloudFeatureIndicator({ className = "" }: { className?: string }) {
  const { isEducator } = useAuthStore();
  
  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      {isEducator() ? (
        <>
          <Cloud className="h-4 w-4 text-purple-400" />
          <span className="text-purple-400">Cloud Enabled</span>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4 text-slate-500" />
          <span className="text-slate-500">Local Only</span>
        </>
      )}
    </div>
  );
}
