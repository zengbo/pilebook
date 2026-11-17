import { describe, expect, it } from "vitest";
import { verifyPassword, hashPassword } from "../src/shared/password";
import { addDays, inReminderWindow, startOfWeek, weekdayOf, zonedLocalToUtc } from "../src/shared/time";

describe("local time helpers", () => {
  it("converts a Chicago wall time to UTC in winter and summer", () => {
    expect(zonedLocalToUtc("2026-11-18T09:00", "America/Chicago").toISOString()).toBe("2026-11-18T15:00:00.000Z");
    expect(zonedLocalToUtc("2026-07-15T09:00", "America/Chicago").toISOString()).toBe("2026-07-15T14:00:00.000Z");
  });

  it("walks calendar dates without timezone drift", () => {
    expect(weekdayOf("2026-11-15")).toBe(0);
    expect(startOfWeek("2026-11-18")).toBe("2026-11-15");
    expect(addDays("2026-11-30", 2)).toBe("2026-12-02");
  });

  it("flags jobs that start 23 to 25 hours out", () => {
    const now = new Date("2026-11-17T15:00:00.000Z");
    expect(inReminderWindow(now, new Date("2026-11-18T15:00:00.000Z"))).toBe(true);
    expect(inReminderWindow(now, new Date("2026-11-18T12:00:00.000Z"))).toBe(false);
    expect(inReminderWindow(now, new Date("2026-11-18T16:30:00.000Z"))).toBe(false);
  });
});

describe("passwords", () => {
  it("round-trips a password hash", async () => {
    const stored = await hashPassword("demo-clean-2026");
    expect(await verifyPassword("demo-clean-2026", stored)).toBe(true);
    expect(await verifyPassword("nope", stored)).toBe(false);
    expect(await verifyPassword("demo-clean-2026", null)).toBe(false);
  });
});
