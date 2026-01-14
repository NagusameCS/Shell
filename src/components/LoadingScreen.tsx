/**
 * LoadingScreen - Displays while app is initializing
 */

import { useEffect, useState } from "react";

export function LoadingScreen() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1e1e1e] z-50">
      {/* Logo with pulse animation */}
      <div className="relative mb-8 animate-pulse">
        <svg
          width="120"
          height="120"
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          {/* Shell logo */}
          <rect width="512" height="512" rx="100" fill="url(#gradient)" />
          <path
            d="M140 180 L260 300 L140 300"
            stroke="white"
            strokeWidth="36"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <line
            x1="290"
            y1="300"
            x2="380"
            y2="300"
            stroke="white"
            strokeWidth="36"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="512" y2="512">
              <stop offset="0%" stopColor="var(--accent-color, #22c55e)" />
              <stop offset="100%" stopColor="var(--accent-color-dark, #16a34a)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* App name */}
      <h1 className="mb-4 text-3xl font-bold text-white">Shell</h1>

      {/* Loading indicator */}
      <div className="flex items-center gap-2 text-[#6b7280]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-sm">Loading{dots}</span>
      </div>

      {/* Subtitle */}
      <p className="mt-8 text-xs text-[#6b7280]">
        Education-first IDE
      </p>
    </div>
  );
}
