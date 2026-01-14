/**
 * Join Classroom Modal
 * 
 * Allows students to join a classroom using a code
 */

import { useState } from "react";
import { X, Users, Loader2, Check, GraduationCap } from "lucide-react";
import { joinClassroom, getCurrentShellUser } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";

interface JoinClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined?: () => void;
}

export function JoinClassroomModal({ isOpen, onClose, onJoined }: JoinClassroomModalProps) {
  const [classCode, setClassCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user, setUser } = useAuthStore();

  if (!isOpen) return null;

  const handleJoin = async () => {
    if (!user || !classCode.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const joined = await joinClassroom(user.uid, classCode.trim().toUpperCase());
      
      if (joined) {
        setSuccess(true);
        // Refresh user data to get updated enrolledClassrooms
        const updatedUser = await getCurrentShellUser();
        if (updatedUser) {
          setUser(updatedUser);
        }
        setTimeout(() => {
          onClose();
          onJoined?.();
        }, 1500);
      } else {
        setError("Classroom not found. Please check the code and try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join classroom");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && classCode.trim()) {
      handleJoin();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-[#252526] p-8 animate-scale-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-[#6b7280] hover:bg-[#3c3c3c] hover:text-white transition-colors"
          aria-label="Close modal"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-color)]/20">
            <GraduationCap className="h-6 w-6 text-[var(--accent-color)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Join a Classroom</h2>
            <p className="text-sm text-[#9ca3af]">Enter the code from your teacher</p>
          </div>
        </div>

        {/* Success State */}
        {success ? (
          <div className="text-center py-8 animate-bounce-in">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <Check className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">You're in!</h3>
            <p className="text-sm text-[#9ca3af]">
              You've successfully joined the classroom. Redirecting...
            </p>
          </div>
        ) : (
          <>
            {/* Input */}
            <div className="mb-6">
              <label className="block text-sm text-[#9ca3af] mb-2">
                Classroom Code
              </label>
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="e.g., ABC123"
                maxLength={8}
                className="w-full rounded-xl bg-[#1e1e1e] px-4 py-3 text-center text-2xl font-mono tracking-widest text-white placeholder-[#6b7280] border border-[#3c3c3c] focus:border-[var(--accent-color)] focus:outline-none uppercase"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-400 text-center">{error}</p>
              )}
            </div>

            {/* Info */}
            <div className="mb-6 rounded-xl bg-[#1e1e1e] p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-[var(--accent-color)] mt-0.5" />
                <div>
                  <p className="text-sm text-white font-medium">
                    What happens when you join?
                  </p>
                  <ul className="mt-2 text-xs text-[#9ca3af] space-y-1">
                    <li>• Access lessons and assignments from your teacher</li>
                    <li>• Submit your work for grading</li>
                    <li>• View feedback and grades</li>
                    <li>• Your teacher can see your progress</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Button */}
            <button
              onClick={handleJoin}
              disabled={isLoading || !classCode.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-color)] py-4 font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <GraduationCap className="h-5 w-5" />
                  Join Classroom
                </>
              )}
            </button>

            {/* Footer */}
            <p className="mt-4 text-center text-xs text-[#6b7280]">
              Don't have a code? Ask your teacher for one.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Simple join button that opens the modal
 */
export function JoinClassroomButton({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={
          className ||
          "flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 font-medium text-white hover:opacity-90 transition-colors"
        }
      >
        {children || (
          <>
            <GraduationCap className="h-4 w-4" />
            Join Classroom
          </>
        )}
      </button>
      <JoinClassroomModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
