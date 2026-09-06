function calendarDate(value: string) {
  return `${value.slice(0, 10).replaceAll("-", "")}T${value.slice(11, 19).replaceAll(":", "")}`;
}

export function googleCalendarUrl(title: string, start: string, end: string, details: string) {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", `${calendarDate(start)}/${calendarDate(end)}`);
  url.searchParams.set("details", details);
  return url.toString();
}
