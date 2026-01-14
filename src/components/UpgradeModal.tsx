/**
 * Upgrade Modal Component
 *
 * Shows pricing options for Education tier
 */

import { useState } from "react";
import { X, Check, Crown, Cloud, Users, BarChart3, Shield, Loader2, Key, GraduationCap, Building2, Server } from "lucide-react";
import { PRICING, formatPrice, redirectToCheckout, type PricingInterval } from "@/lib/stripe";
import { upgradeToTeacher } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// All tiers with their features
const tiers = {
  student: {
    name: "Shell Student",
    price: "Free",
    priceNote: "forever",
    icon: GraduationCap,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    features: [
      "Full IDE with LSP support",
      "Local project management",
      "Syntax highlighting for 30+ languages",
      "Integrated terminal",
      "Git integration",
      "Theme customization",
      "Join classrooms with code",
      "Submit assignments",
      "View grades & feedback",
    ],
  },
  teacher: {
    name: "Shell Teacher",
    price: "$8-12",
    priceNote: "/month",
    icon: Crown,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    features: [
      "Everything in Student, plus:",
      "Cloud project sync",
      "Create unlimited classrooms",
      "Custom assignments & lessons",
      "Hosted auto-grading",
      "Student progress analytics",
      "Exam mode (lockdown)",
      "Priority support",
    ],
  },
  school: {
    name: "Shell School",
    price: "$1,500-4,000",
    priceNote: "/year",
    icon: Building2,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    features: [
      "Everything in Teacher, plus:",
      "Unlimited teachers & students",
      "School-wide dashboard",
      "Advanced analytics",
      "Plagiarism detection",
      "SSO integration",
      "Custom branding",
      "Dedicated support",
    ],
  },
  selfHosted: {
    name: "Shell Self-Hosted",
    price: "$2,000-6,000",
    priceNote: "one-time",
    icon: Server,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    features: [
      "Full source access",
      "On-premises deployment",
      "Complete data control",
      "Custom infrastructure",
      "No recurring fees",
      "Installation support",
      "1 year of updates",
    ],
  },
};

const teacherFeatures = [
  { icon: Cloud, label: "Cloud sync across devices" },
  { icon: Users, label: "Create and manage classrooms" },
  { icon: BarChart3, label: "Student analytics & progress" },
  { icon: Shield, label: "Secure exam mode" },
  { icon: Check, label: "Auto-grading for assignments" },
  { icon: Check, label: "Assignment distribution" },
];

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [interval, setInterval] = useState<PricingInterval>("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [accessCodeSuccess, setAccessCodeSuccess] = useState(false);
  const { user, setUser } = useAuthStore();

  if (!isOpen) return null;

  const selectedPricing = PRICING.teacher[interval];

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await redirectToCheckout(interval);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setIsLoading(false);
    }
  };

  const handleAccessCodeRedeem = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setAccessCodeError(null);

    try {
      const success = await upgradeToTeacher(user.uid, accessCode);
      if (success) {
        setAccessCodeSuccess(true);
        // Update user state
        setUser({ ...user, tier: "teacher" });
        setTimeout(() => onClose(), 1500);
      } else {
        setAccessCodeError("Invalid access code. Please check and try again.");
      }
    } catch (err) {
      setAccessCodeError(err instanceof Error ? err.message : "Failed to redeem code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#252526] p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-[#6b7280] hover:bg-[#3c3c3c] hover:text-white"
          aria-label="Close modal"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20">
            <Crown className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              Upgrade to Education Plan
            </h2>
            <p className="text-[#9ca3af]">Unlock all premium features</p>
          </div>
        </div>

        {/* Access Code Section */}
        {!showAccessCode ? (
          <button
            onClick={() => setShowAccessCode(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#3c3c3c] py-2 text-sm text-[#9ca3af] hover:bg-[#3c3c3c] hover:text-white transition-colors"
          >
            <Key className="h-4 w-4" />
            Have an access code?
          </button>
        ) : (
          <div className="mb-4 rounded-xl bg-[#1e1e1e] p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Key className="h-4 w-4 text-[var(--accent-color)]" />
              <span className="font-medium text-white">Redeem Access Code</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter access code..."
                className="flex-1 rounded-lg bg-[#252526] px-3 py-2 text-sm text-white placeholder-[#6b7280] border border-[#3c3c3c] focus:border-[var(--accent-color)] focus:outline-none"
              />
              <button
                onClick={handleAccessCodeRedeem}
                disabled={isLoading || !accessCode.trim()}
                className="rounded-lg bg-[var(--accent-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem"}
              </button>
            </div>
            {accessCodeError && (
              <p className="mt-2 text-xs text-red-400">{accessCodeError}</p>
            )}
            {accessCodeSuccess && (
              <p className="mt-2 text-xs text-green-400 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Access code redeemed! Refreshing...
              </p>
            )}
            <button
              onClick={() => setShowAccessCode(false)}
              className="mt-2 text-xs text-[#6b7280] hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Billing toggle */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setInterval("monthly")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              interval === "monthly"
                ? "bg-[#7DD3FC] text-[#1e1e1e]"
                : "bg-[#3c3c3c] text-[#9ca3af] hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("yearly")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              interval === "yearly"
                ? "bg-[#7DD3FC] text-[#1e1e1e]"
                : "bg-[#3c3c3c] text-[#9ca3af] hover:text-white"
            }`}
          >
            Yearly
            {PRICING.teacher.yearly.savings && (
              <span className="ml-2 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                Save {PRICING.teacher.yearly.savings}
              </span>
            )}
          </button>
        </div>

        {/* Price */}
        <div className="mb-6 text-center">
          <div className="text-4xl font-bold text-white">
            ${selectedPricing.amount.toFixed(2)}
            <span className="text-lg font-normal text-[#9ca3af]">
              /{selectedPricing.interval}
            </span>
          </div>
          {interval === "yearly" && (
            <p className="mt-1 text-sm text-[#9ca3af]">
              Billed annually (${(selectedPricing.amount / 12).toFixed(2)}/month)
            </p>
          )}
        </div>

        {/* Features list */}
        <div className="mb-6 rounded-xl bg-[#1e1e1e] p-4">
          <h3 className="mb-3 font-medium text-white">What's included:</h3>
          <ul className="space-y-2">
            {teacherFeatures.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-[#d4d4d4]">
                <feature.icon className="h-4 w-4 text-[#7DD3FC]" />
                <span>{feature.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7DD3FC] py-4 font-semibold text-[#1e1e1e] hover:bg-[#67c8f7] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Crown className="h-5 w-5" />
              Upgrade Now
            </>
          )}
        </button>

        {/* Footer */}
        <p className="mt-4 text-center text-xs text-[#6b7280]">
          Cancel anytime. 30-day money-back guarantee.
          <br />
          Powered by Stripe for secure payments.
        </p>
      </div>
    </div>
  );
}

/**
 * Simple upgrade button that opens the modal
 */
export function UpgradeButton({
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
          "flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-slate-900 hover:bg-amber-400 transition-colors"
        }
      >
        {children || (
          <>
            <Crown className="h-4 w-4" />
            Upgrade
          </>
        )}
      </button>
      <UpgradeModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
