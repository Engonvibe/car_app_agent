/* ---------------------------------------------------------------------------
   Flexible date handling.

   Users may type dates in several formats. We parse them into a clean,
   standard internal format: "YYYY-MM-DD". UK-first rules apply, so for
   numeric dates the DAY comes first (e.g. 12/05/2024 = 12 May 2024).

   Accepted examples:
     2024-05-12     (ISO)
     12/05/2024     (UK day/month/year)
     12-05-2024  12.05.2024
     12/05/24       (2-digit year)
     12 May 2024    "12 May 24"
     May 12, 2024
--------------------------------------------------------------------------- */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/** Expand a 2-digit year. 70-99 -> 1900s, 00-69 -> 2000s. */
function normaliseYear(year: number, digits: number): number {
  if (digits === 2) return year >= 70 ? 1900 + year : 2000 + year;
  return year;
}

/** Build a validated "YYYY-MM-DD" string, or null if the date is not real. */
function build(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null; // e.g. 31 February
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Parse a free-text date into "YYYY-MM-DD", or return null if invalid.
 */
export function parseFlexibleDate(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (!s) return null;

  // ISO: YYYY-MM-DD (also tolerate / or .)
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return build(+m[1], +m[2], +m[3]);

  // Numeric UK-first: D/M/Y  (also - or .)
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (m) return build(normaliseYear(+m[3], m[3].length), +m[2], +m[1]);

  // "12 May 2024" / "12 May 24"
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{2}|\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) {
    return build(normaliseYear(+m[3], m[3].length), MONTHS[m[2].toLowerCase()], +m[1]);
  }

  // "May 12, 2024" / "May 12 2024"
  m = s.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{2}|\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) {
    return build(normaliseYear(+m[3], m[3].length), MONTHS[m[1].toLowerCase()], +m[2]);
  }

  return null;
}

/** Add a number of months to a "YYYY-MM-DD" string. */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

/**
 * Simple, rule-based placeholder for the recommended NEXT service date.
 * (A smarter, vehicle-aware version comes in a later phase.)
 * Rule: 12 months after the service date.
 */
export function computeRecommendedServiceDate(serviceIso: string): string {
  return addMonths(serviceIso, 12);
}

/** Convert a "YYYY-MM-DD" string to a Date stored at midnight UTC. */
export function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Today's date as "YYYY-MM-DD" (UTC). */
export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Turn any Date (or ISO string) into "YYYY-MM-DD". */
export function toIso(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

/** Whole days from `fromIso` to `toIso` (positive if toIso is later). */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = isoToDate(fromIso).getTime();
  const b = isoToDate(toIso).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Simple, rule-based reminder status for a due date.
 *   - Overdue: the due date is in the past
 *   - Due:     within the next 30 days
 *   - Upcoming: further than 30 days away
 */
export function reminderStatus(dueIso: string): "Overdue" | "Due" | "Upcoming" {
  const diff = daysBetween(isoToday(), dueIso);
  if (diff < 0) return "Overdue";
  if (diff <= 30) return "Due";
  return "Upcoming";
}
