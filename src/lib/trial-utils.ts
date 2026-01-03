import { Timestamp } from "firebase/firestore";
import { User } from "./types";

/**
 * Calculates if a user's trial period has expired
 * @param user The user object
 * @returns true if trial has expired, false otherwise
 */
export function isTrialExpired(user: User): boolean {
  if (user.subscription !== "trial") {
    return false; // Premium users don't have expired trials
  }

  if (!user.trialStartDate) {
    return true; // No trial start date means trial expired
  }

  const trialEndDate = new Date(user.trialStartDate.toDate());
  trialEndDate.setDate(trialEndDate.getDate() + 10); // Add 10 days

  return new Date() > trialEndDate;
}

/**
 * Calculates remaining days in trial
 * @param user The user object
 * @returns Number of days remaining (0 if expired, null if not a trial user)
 */
export function calculateTrialDaysRemaining(user: User): number | null {
  if (user.subscription !== "trial") {
    return null; // Not a trial user
  }

  if (!user.trialStartDate) {
    return 0; // No trial start date means 0 days left
  }

  const trialStartDate = new Date(user.trialStartDate.toDate());
  const trialEndDate = new Date(trialStartDate);
  trialEndDate.setDate(trialEndDate.getDate() + 10);

  const now = new Date();
  if (now > trialEndDate) {
    return 0; // Trial expired
  }

  const daysRemaining = Math.ceil(
    (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, daysRemaining);
}

/**
 * Checks if user can resend verification email
 * Implements rate limiting: max 1 resend per 60 seconds
 * @param user The user object
 * @returns true if can resend, false if on cooldown
 */
export function canResendVerificationEmail(user: User): boolean {
  if (user.emailVerified) {
    return false; // Already verified
  }

  if (!user.verificationSentAt) {
    return true; // Never sent before
  }

  const lastSentTime = new Date(user.verificationSentAt.toDate());
  const timeSinceLastSend = new Date().getTime() - lastSentTime.getTime();
  const cooldownMs = 60 * 1000; // 60 seconds

  return timeSinceLastSend >= cooldownMs;
}

/**
 * Gets the time until user can resend verification email (in seconds)
 * @param user The user object
 * @returns Seconds until can resend, or 0 if can resend now
 */
export function getVerificationResendCooldownSeconds(user: User): number {
  if (!user.verificationSentAt) {
    return 0;
  }

  const lastSentTime = new Date(user.verificationSentAt.toDate());
  const timeSinceLastSend = new Date().getTime() - lastSentTime.getTime();
  const cooldownMs = 60 * 1000; // 60 seconds

  const remaining = cooldownMs - timeSinceLastSend;
  return Math.max(0, Math.ceil(remaining / 1000));
}
/**
 * Checks if a user can write/modify data
 * @param user The user object
 * @returns true if user can write, false otherwise
 */
export function canWrite(user: User | null): boolean {
  if (!user) return false;

  if (user.subscription === "premium") {
    return true; // Premium users can write
  }

  if (user.role === "admin") {
    return true; // Admins can write
  }

  if (user.subscription === "trial") {
    return true; // Trial users CAN write (all data stored locally in IndexedDB only)
  }

  if (user.subscription === "expired") {
    return false; // Expired users cannot write
  }

  return false; // Default deny
}

/**
 * Checks if a user can export data
 * @param user The user object
 * @returns true if user can export, false otherwise
 */
export function canExport(user: User | null): boolean {
  if (!user) return false;

  if (user.subscription === "premium") {
    return true; // Premium users can always export
  }

  if (user.role === "admin") {
    return true; // Admins can always export
  }

  if (user.subscription === "trial") {
    return false; // Trial users cannot export (always false per requirements)
  }

  return false; // Default deny
}

/**
 * Gets a user-friendly message explaining why export is restricted
 * @param user The user object
 * @returns A message explaining the restriction
 */
export function getExportRestrictionMessage(user: User | null): string {
  if (!user) {
    return "You must be logged in to export data.";
  }

  if (user.subscription === "trial") {
    return "Trial users cannot export data. Upgrade to Premium to unlock this feature.";
  }

  return "You don't have permission to export data.";
}

/**
 * Gets a user-friendly message explaining why write operations are restricted
 * @param user The user object
 * @returns A message explaining the restriction
 */
export function getWriteRestrictionMessage(user: User | null): string {
  if (!user) {
    return "You must be logged in to perform this action.";
  }

  if (user.subscription === "trial") {
    return "Trial users cannot add or modify data. Upgrade to Premium to unlock this feature.";
  }

  return "You don't have permission to perform this action.";
}