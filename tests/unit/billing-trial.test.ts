import { describe, expect, it } from "vitest";

import { getTrialStatus, TRIAL_DAYS } from "@/lib/billing/trial";

describe("getTrialStatus", () => {
  it("grants the full trial window right after signup", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-01T00:00:00Z");

    const status = getTrialStatus(createdAt.toISOString(), now);

    expect(status.expired).toBe(false);
    expect(status.daysRemaining).toBe(TRIAL_DAYS);
  });

  it("counts down as the trial progresses", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-12T00:00:00Z");

    const status = getTrialStatus(createdAt.toISOString(), now);

    expect(status.expired).toBe(false);
    expect(status.daysRemaining).toBe(3);
  });

  it("expires exactly 14 days after signup", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-15T00:00:00Z");

    const status = getTrialStatus(createdAt.toISOString(), now);

    expect(status.expired).toBe(true);
    expect(status.daysRemaining).toBe(0);
  });

  it("stays expired well after the trial window", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-03-01T00:00:00Z");

    const status = getTrialStatus(createdAt.toISOString(), now);

    expect(status.expired).toBe(true);
    expect(status.daysRemaining).toBe(0);
  });
});
