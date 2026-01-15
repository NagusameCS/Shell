/**
 * Login Page - First page users see
 *
 * Features:
 * - Google Sign-In via Firebase
 * - Simple code-based sign-in for desktop app
 * - Shelly2 mascot
 * - Class code step after sign-in
 * - 30-day session persistence
 */

import { useState, useEffect, useRef } from "react";
import { signInWithGoogle, joinClassroom, AUTH_PAGE_URL, parseAuthCode } from "../lib/firebase";
import type { ShellUser } from "../lib/firebase";

// Check if running in Tauri
const IS_TAURI = typeof window !== 'undefined' && '__TAURI__' in window;

interface LoginPageProps {
  onLoginSuccess: (user: ShellUser) => void;
}

type Step = "login" | "code" | "classCode";

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [step, setStep] = useState<Step>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classCode, setClassCode] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [pendingUser, setPendingUser] = useState<ShellUser | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input when showing code step
  useEffect(() => {
    if (step === "code" && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [step]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    // In Tauri, open the auth page in the default browser
    if (IS_TAURI) {
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(AUTH_PAGE_URL);
        // Show code input step
        setStep("code");
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to open browser:", err);
        setError("Failed to open browser. Please try again.");
        setIsLoading(false);
      }
      return;
    }

    // In browser, try direct sign-in
    try {
      const user = await signInWithGoogle();
      setPendingUser(user);
      setStep("classCode");
    } catch (err) {
      console.error("Sign-in error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow alphanumeric
    const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    
    const newCode = authCode.split('');
    newCode[index] = char;
    const combined = newCode.join('').slice(0, 6);
    setAuthCode(combined);
    
    // Auto-advance to next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when complete
    if (combined.length === 6) {
      handleCodeSubmit(combined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !authCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodeSubmit = async (code?: string) => {
    const codeToUse = code || authCode;
    if (codeToUse.length !== 6) {
      setError("Please enter the 6-character code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const user = await parseAuthCode(codeToUse);
      setPendingUser(user);
      setStep("classCode");
    } catch (err) {
      console.error("Code sign-in error:", err);
      const errorMessage = err instanceof Error ? err.message : "Invalid code. Please try again.";
      setError(errorMessage);
      setAuthCode("");
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!pendingUser) return;
    
    setIsLoading(true);
    setError(null);

    try {
      if (classCode.trim()) {
        const success = await joinClassroom(pendingUser.uid, classCode.trim().toUpperCase());
        if (!success) {
          setError("Invalid class code. Please check and try again.");
          setIsLoading(false);
          return;
        }
      }
      onLoginSuccess(pendingUser);
    } catch (err) {
      console.error("Join class error:", err);
      setError("Failed to join class. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipClassCode = () => {
    if (pendingUser) {
      onLoginSuccess(pendingUser);
    }
  };

  const handleOfflineMode = () => {
    onLoginSuccess({
      uid: "local",
      email: "local@shell.ide",
      displayName: "Local User",
      photoURL: null,
      tier: "free",
      createdAt: null as any,
      lastLoginAt: null as any,
      settings: {
        theme: "dark",
        fontSize: 14,
        fontFamily: "JetBrains Mono",
        tabSize: 2,
        autoSave: true,
        cloudSyncEnabled: false,
      },
    });
  };

  // Login step
  if (step === "login") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#1e1e1e]">
        <div className="flex flex-col items-center space-y-6">
          {/* Shell logo */}
          <img src="/favicon.svg" alt="Shell" className="h-32 w-32" />

          {/* App name and tagline */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white">Shell</h1>
            <p className="mt-2 text-base text-[#9ca3af]">
              Education-first IDE for everyone
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="max-w-sm rounded-lg bg-[#ef4444]/20 px-4 py-2 text-sm text-[#ef4444]">
              {error}
            </div>
          )}

          {/* Sign in button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="flex items-center gap-3 rounded-lg bg-white px-6 py-3 text-gray-800 hover:bg-gray-100 disabled:opacity-50"
          >
            {/* Google Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium">
              {isLoading ? "Opening browser..." : "Sign in with Google"}
            </span>
          </button>

          {/* Offline mode */}
          <button
            className="text-sm text-[#9ca3af] hover:text-white"
            onClick={handleOfflineMode}
          >
            Continue offline (limited features)
          </button>

          {/* GitHub link */}
          <div className="pt-6 text-center">
            <p className="text-xs text-[#6b7280]">
              Open source •{" "}
              <a
                href="https://github.com/NagusameCS/Shell"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                View on GitHub
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-center">
          <p className="text-xs text-[#6b7280]">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    );
  }

  // Code input step (for Tauri app)
  if (step === "code") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#1e1e1e]">
        <div className="flex w-full max-w-md flex-col items-center space-y-6 px-4">
          {/* Shell mascot */}
          <img 
            src="/favicon.svg" 
            alt="Shell IDE" 
            className="h-[120px] w-[120px]"
          />

          {/* Instructions */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">
              Enter Sign-In Code
            </h1>
            <p className="mt-2 text-sm text-[#9ca3af]">
              Complete sign-in in your browser, then enter<br />
              the 6-character code shown.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="w-full rounded-lg bg-[#ef4444]/20 px-4 py-2 text-center text-sm text-[#ef4444]">
              {error}
            </div>
          )}

          {/* Code input - 6 boxes */}
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                maxLength={1}
                value={authCode[i] || ''}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={isLoading}
                className="h-14 w-12 rounded-lg bg-[#252526] text-center text-2xl font-mono font-bold text-white outline-none focus:ring-2 focus:ring-[#60b24f] disabled:opacity-50"
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex w-full flex-col gap-2">
            <button
              onClick={() => handleCodeSubmit()}
              disabled={isLoading || authCode.length !== 6}
              className="w-full rounded-lg bg-[#60b24f] px-4 py-3 font-medium text-white hover:bg-[#7dd36a] disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Continue"}
            </button>
            <button
              onClick={() => {
                setStep("login");
                setAuthCode("");
                setError(null);
              }}
              disabled={isLoading}
              className="w-full rounded-lg bg-[#3c3c3c] px-4 py-3 text-[#9ca3af] hover:bg-[#4a4a4a] hover:text-white"
            >
              Back
            </button>
          </div>

          {/* Help text */}
          <p className="text-center text-xs text-[#6b7280]">
            Didn't see a browser? <button 
              onClick={handleGoogleSignIn}
              className="underline hover:text-white"
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Class code step
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#1e1e1e]">
      <div className="flex w-full max-w-sm flex-col items-center space-y-6">
        {/* Welcome message */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">
            Welcome, {pendingUser?.displayName?.split(" ")[0] || "there"}!
          </h1>
          <p className="mt-2 text-sm text-[#9ca3af]">
            Do you have a class code from your teacher?
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full rounded-lg bg-[#ef4444]/20 px-4 py-2 text-center text-sm text-[#ef4444]">
            {error}
          </div>
        )}

        {/* Class code input */}
        <div className="w-full">
          <input
            type="text"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
            placeholder="Enter class code (e.g., ABC123)"
            className="w-full rounded-lg bg-[#252526] px-4 py-3 text-center text-lg font-mono tracking-widest text-white placeholder-[#6b7280] outline-none focus:ring-2 focus:ring-[#60b24f]"
            maxLength={6}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && classCode.trim()) {
                handleJoinClass();
              }
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2">
          <button
            onClick={handleJoinClass}
            disabled={isLoading || !classCode.trim()}
            className="w-full rounded-lg bg-[#60b24f] px-4 py-3 font-medium text-white hover:bg-[#7dd36a] disabled:opacity-50"
          >
            {isLoading ? "Joining..." : "Join Class"}
          </button>
          <button
            onClick={handleSkipClassCode}
            disabled={isLoading}
            className="w-full rounded-lg bg-[#3c3c3c] px-4 py-3 text-[#9ca3af] hover:bg-[#4a4a4a] hover:text-white"
          >
            I don't have a code
          </button>
        </div>

        {/* Info text */}
        <p className="text-center text-xs text-[#6b7280]">
          You can join a class later from Settings
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
