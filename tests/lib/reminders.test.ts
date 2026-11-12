import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import { returnReminderFor } from "@/lib/reminders";

describe("returnReminderFor", () => {
  it("reminds the day before and the day of", () => {
    expect(returnReminderFor("2026-11-23", "2026-11-22")).toBe("due_tomorrow");
    expect(returnReminderFor("2026-11-23", "2026-11-23")).toBe("due_today");
  });

  it("stays quiet otherwise, including once it's late", () => {
    expect(returnReminderFor("2026-11-23", "2026-11-20")).toBeNull();
    expect(returnReminderFor("2026-11-23", "2026-11-24")).toBeNull();
  });

  it("handles month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(returnReminderFor("2026-12-01", "2026-11-30")).toBe("due_tomorrow");
  });
});
