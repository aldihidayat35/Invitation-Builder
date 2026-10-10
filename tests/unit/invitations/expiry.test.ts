import { describe, expect, it } from "vitest";
import {
  calculateExpiryDate,
  formatIndonesianDate,
  getRemainingDays,
  isInvitationExpiredOrClosed,
} from "@/features/invitations/expiry";

describe("Invitation Expiry & Closure Logic", () => {
  it("calculates 3 months expiry accurately", () => {
    const base = new Date("2026-01-15T00:00:00Z");
    const expiry = calculateExpiryDate(base, "3_months");
    expect(expiry).not.toBeNull();
    expect(expiry?.getUTCFullYear()).toBe(2026);
    expect(expiry?.getUTCMonth()).toBe(3); // April (month 3, 0-indexed)
    expect(expiry?.getUTCDate()).toBe(15);
  });

  it("calculates 6 months expiry accurately", () => {
    const base = new Date("2026-02-10T00:00:00Z");
    const expiry = calculateExpiryDate(base, "6_months");
    expect(expiry).not.toBeNull();
    expect(expiry?.getUTCFullYear()).toBe(2026);
    expect(expiry?.getUTCMonth()).toBe(7); // August
    expect(expiry?.getUTCDate()).toBe(10);
  });

  it("calculates 1 year expiry accurately", () => {
    const base = new Date("2026-05-20T00:00:00Z");
    const expiry = calculateExpiryDate(base, "1_year");
    expect(expiry).not.toBeNull();
    expect(expiry?.getUTCFullYear()).toBe(2027);
    expect(expiry?.getUTCMonth()).toBe(4); // May
    expect(expiry?.getUTCDate()).toBe(20);
  });

  it("returns null for unlimited duration", () => {
    const base = new Date("2026-05-20T00:00:00Z");
    const expiry = calculateExpiryDate(base, "unlimited");
    expect(expiry).toBeNull();
  });

  it("determines if invitation is closed manually or expired", () => {
    // Manually closed
    expect(isInvitationExpiredOrClosed({ isManuallyClosed: true })).toBe(true);

    // Expired in past
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
    expect(isInvitationExpiredOrClosed({ expiresAt: pastDate })).toBe(true);

    // Active in future
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days future
    expect(isInvitationExpiredOrClosed({ expiresAt: futureDate, isManuallyClosed: false })).toBe(
      false,
    );

    // Unlimited/no expiry
    expect(isInvitationExpiredOrClosed({ expiresAt: null, isManuallyClosed: false })).toBe(false);
  });

  it("calculates remaining days accurately", () => {
    expect(getRemainingDays(null)).toBeNull();
    const pastDate = new Date(Date.now() - 1000 * 60 * 60);
    expect(getRemainingDays(pastDate)).toBe(0);

    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10);
    const days = getRemainingDays(futureDate);
    expect(days).toBeGreaterThanOrEqual(9);
    expect(days).toBeLessThanOrEqual(11);
  });

  it("formats Indonesian date string gracefully", () => {
    expect(formatIndonesianDate(null)).toBe("-");
    const date = new Date("2026-10-10T12:00:00Z");
    const formatted = formatIndonesianDate(date);
    expect(formatted).toContain("Oktober");
    expect(formatted).toContain("2026");
  });
});
