/**
 * Minimal iCalendar (.ics) generator — RFC 5545.
 * No external dependency: meeting invites only need a handful of fields,
 * and every mainstream calendar app (Google, Outlook, Apple) reads this format.
 */

import { SITE_CONFIG } from "@shared/site";

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/** Formats a Date as UTC in the "YYYYMMDDTHHMMSSZ" iCalendar format. */
function toIcsDate(date: Date): string {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/** Escapes text per RFC 5545 (commas, semicolons, backslashes, newlines). */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Folds long lines at 75 octets as required by RFC 5545 (soft line breaks). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  let first = true;
  while (rest.length > 0) {
    const limit = first ? 75 : 74; // continuation lines start with a space, eating 1 char
    chunks.push((first ? "" : " ") + rest.slice(0, limit));
    rest = rest.slice(limit);
    first = false;
  }
  return chunks.join("\r\n");
}

export interface IcsEventInput {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  durationMinutes: number;
  organizerEmail?: string;
  organizerName?: string;
  attendeeEmail?: string;
  attendeeName?: string;
}

/** Builds the raw VEVENT lines (no VCALENDAR wrapper) for a single event. */
function buildVEventLines(event: IcsEventInput, now: Date): string[] {
  const endsAt = new Date(event.startsAt.getTime() + event.durationMinutes * 60_000);

  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(event.startsAt)}`,
    `DTEND:${toIcsDate(endsAt)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.organizerEmail) {
    const cn = event.organizerName ? `CN=${escapeIcsText(event.organizerName)}:` : ":";
    lines.push(`ORGANIZER;${cn}mailto:${event.organizerEmail}`);
  }
  if (event.attendeeEmail) {
    const cn = event.attendeeName ? `CN=${escapeIcsText(event.attendeeName)};` : "";
    lines.push(`ATTENDEE;${cn}RSVP=TRUE:mailto:${event.attendeeEmail}`);
  }

  lines.push("STATUS:CONFIRMED", "SEQUENCE:0", "END:VEVENT");
  return lines;
}

/** Builds a single-event .ics file as a UTF-8 string. */
export function buildIcsEvent(event: IcsEventInput): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE_CONFIG.brandName}//Meetings//PT-BR`,
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    ...buildVEventLines(event, now),
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/**
 * Builds a multi-event .ics calendar (e.g. project deadline + linked
 * meetings) as a single VCALENDAR with one VEVENT per entry. Reuses the
 * same VEVENT builder as buildIcsEvent for identical field handling.
 */
export function buildIcsCalendar(events: IcsEventInput[]): string {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE_CONFIG.brandName}//Schedule//PT-BR`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events.flatMap((event) => buildVEventLines(event, now)),
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
