import { describe, expect, it } from "vitest";
import { googleCalendarUrl } from "@/lib/calendar";

describe("googleCalendarUrl", () => {
  it("builds a calendar template URL with formatted dates", () => {
    const url = googleCalendarUrl(
      "Friday evening",
      "2026-09-11T16:00:00",
      "2026-09-11T20:00:00",
      "SitterBook availability window",
    );
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsed.searchParams.get("text")).toBe("Friday evening");
    expect(parsed.searchParams.get("dates")).toBe("20260911T160000/20260911T200000");
    expect(parsed.searchParams.get("details")).toBe("SitterBook availability window");
  });

  it("url-encodes special characters in the title and details", () => {
    const url = googleCalendarUrl(
      "SitterBook: The Smiths & Family",
      "2026-09-11T16:00:00",
      "2026-09-11T18:00:00",
      "Notes: bring snacks?",
    );
    const parsed = new URL(url);

    expect(parsed.searchParams.get("text")).toBe("SitterBook: The Smiths & Family");
    expect(parsed.searchParams.get("details")).toBe("Notes: bring snacks?");
  });
});
