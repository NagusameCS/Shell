/**
 * Stripe Payment Integration
 *
 * Handles Educator tier subscriptions and payments
 * Cloud service - never required for basic IDE functionality
 */

import { loadStripe, Stripe } from "@stripe/stripe-js";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase";

// Stripe publishable key (replace with your actual key)
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Get Stripe instance (lazy loaded)
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise && STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise || Promise.resolve(null);
}

/**
 * Pricing tiers
 */
export const PRICING = {
  educator: {
    monthly: {
      priceId: "price_educator_monthly", // Replace with actual Stripe price ID
      amount: 9.99,
      interval: "month" as const,
    },
    yearly: {
      priceId: "price_educator_yearly", // Replace with actual Stripe price ID
      amount: 99.99,
      interval: "year" as const,
      savings: "17%",
    },
  },
} as const;

export type PricingInterval = "monthly" | "yearly";

/**
 * Subscription status
 */
export interface SubscriptionStatus {
  active: boolean;
  tier: "free" | "educator";
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

/**
 * Create a checkout session for Educator subscription
 * This calls your backend to create a Stripe checkout session
 */
export async function createCheckoutSession(
  interval: PricingInterval = "monthly"
): Promise<{ sessionId: string; url: string } | null> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to subscribe");
  }

  const priceId = PRICING.educator[interval].priceId;

  try {
    // Call your backend to create checkout session
    // For now, we'll use Firebase Functions or a separate API
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({
        priceId,
        userId: user.uid,
        userEmail: user.email,
        successUrl: `${window.location.origin}/settings?success=true`,
        cancelUrl: `${window.location.origin}/settings?canceled=true`,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create checkout session");
    }

    return await response.json();
  } catch (error) {
    console.error("Checkout session error:", error);
    return null;
  }
}

/**
 * Redirect to Stripe Checkout
 */
export async function redirectToCheckout(interval: PricingInterval = "monthly"): Promise<void> {
  const stripe = await getStripe();
  if (!stripe) {
    throw new Error("Stripe not initialized");
  }

  const session = await createCheckoutSession(interval);
  if (!session) {
    throw new Error("Failed to create checkout session");
  }

  // Use the checkout session URL for redirection
  // @ts-expect-error - Using Stripe Checkout redirect
  const { error } = await stripe.redirectToCheckout({
    sessionId: session.sessionId,
  });

  if (error) {
    throw error;
  }
}

/**
 * Create a portal session for managing subscription
 */
export async function createPortalSession(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in");
  }

  try {
    const response = await fetch("/api/create-portal-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({
        returnUrl: `${window.location.origin}/settings`,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create portal session");
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error("Portal session error:", error);
    return null;
  }
}

/**
 * Get user's subscription status from Firestore
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const user = auth.currentUser;
  if (!user) {
    return {
      active: false,
      tier: "free",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const data = userDoc.data();

    if (!data?.subscription) {
      return {
        active: false,
        tier: "free",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };
    }

    const sub = data.subscription;
    return {
      active: sub.status === "active" || sub.status === "trialing",
      tier: sub.status === "active" || sub.status === "trialing" ? "educator" : "free",
      currentPeriodEnd: sub.currentPeriodEnd?.toDate() || null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd || false,
      stripeCustomerId: sub.stripeCustomerId || null,
      stripeSubscriptionId: sub.stripeSubscriptionId || null,
    };
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return {
      active: false,
      tier: "free",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }
}

/**
 * Update user tier after successful payment (called by webhook)
 * This should be called from your backend after Stripe webhook confirmation
 */
export async function updateUserTier(
  userId: string,
  tier: "free" | "educator",
  subscriptionData?: {
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    currentPeriodEnd: Date;
    status: string;
    cancelAtPeriodEnd: boolean;
  }
): Promise<void> {
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    tier,
    ...(subscriptionData && {
      subscription: {
        stripeCustomerId: subscriptionData.stripeCustomerId,
        stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        status: subscriptionData.status,
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
      },
    }),
    updatedAt: new Date(),
  });
}

/**
 * Check if a feature requires Educator tier
 */
export function requiresEducatorTier(feature: string): boolean {
  const educatorFeatures = [
    "cloud_sync",
    "classrooms",
    "assignment_distribution",
    "auto_grading",
    "analytics",
    "exam_mode",
    "plagiarism_detection",
  ];
  return educatorFeatures.includes(feature);
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, interval: "month" | "year"): string {
  return `$${amount.toFixed(2)}/${interval}`;
}
