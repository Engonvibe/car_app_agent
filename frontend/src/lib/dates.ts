/* ---------------------------------------------------------------------------
   Flexible date handling for the UI (mirrors the backend rules).

   - parseFlexibleDate: turn free-text into "YYYY-MM-DD" (UK-first), or null.
   - computeRecommendedServiceDate: simple placeholder = service date + 12 months.
   - formatDisplay: turn "YYYY-MM-DD" into a friendly "12 May 2024".
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

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function normaliseYear(year: number, digits: number): number {
  if (digits === 2) return year >= 70 ? 1900 + year : 2000 + year;
  return year;
}

function build(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Parse free-text into "YYYY-MM-DD", or null if invalid. */
export function parseFlexibleDate(input: string): string | null {
  const s = (input ?? "").trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return build(+m[1], +m[2], +m[3]);

  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (m) return build(normaliseYear(+m[3], m[3].length), +m[2], +m[1]);

  m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{2}|\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) {
    return build(normaliseYear(+m[3], m[3].length), MONTHS[m[2].toLowerCase()], +m[1]);
  }

  m = s.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{2}|\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) {
    return build(normaliseYear(+m[3], m[3].length), MONTHS[m[1].toLowerCase()], +m[2]);
  }

  return null;
}

/** Add months to a "YYYY-MM-DD" string. */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  return dt.toISOString().slice(0, 10);
}

/** Placeholder recommended next-service rule: service date + 12 months. */
export function computeRecommendedServiceDate(serviceIso: string): string {
  return addMonths(serviceIso, 12);
}

/** Turn an ISO date (or ISO datetime from the API) into "12 May 2024". */
export function formatDisplay(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.slice(0, 10);
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}
