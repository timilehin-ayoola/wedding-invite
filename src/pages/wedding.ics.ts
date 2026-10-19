import type { APIRoute } from "astro";
import { wedding } from "../data/wedding";

// Builds a downloadable calendar file from the same date in src/data/wedding.ts,
// so guests can add the wedding to their phone calendar. Static, no server.
export const prerender = true;

/** Escape text for the iCalendar format. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Convert a Date to the UTC timestamp format iCalendar expects. */
function toIcsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export const GET: APIRoute = () => {
  const start = new Date(wedding.date.iso);
  const end = new Date(start.getTime() + 6 * 60 * 60 * 1000); // 6-hour celebration
  const { couple, venue, meta } = wedding;

  const location = [venue.name, ...venue.addressLines].join(", ");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//wedding-invite//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${couple.partnerOne}-${couple.partnerTwo}-wedding@wedding-invite`,
    `DTSTAMP:${toIcsStamp(new Date())}`,
    `DTSTART:${toIcsStamp(start)}`,
    `DTEND:${toIcsStamp(end)}`,
    `SUMMARY:${escapeText(`${couple.partnerOne} & ${couple.partnerTwo} — Wedding`)}`,
    `LOCATION:${escapeText(location)}`,
    `DESCRIPTION:${escapeText(`${meta.description} ${venue.mapUrl}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="wedding-invite.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
};
