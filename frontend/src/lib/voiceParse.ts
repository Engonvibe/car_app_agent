import { parseFlexibleDate } from "./dates";
import { ENTRY_TYPES, SERVICE_TYPES, CATEGORIES } from "../data/serviceData";
import type { Vehicle } from "./api";

/* ---------------------------------------------------------------------------
   Rule-based extraction of entry fields from spoken text.

   This is deliberately simple (no AI service, no API keys). It scans the
   transcript for known service types, categories, statuses, vehicles, dates
   and an amount, using the same lists and date utilities as the rest of the app.

   It never saves anything — it only suggests values for the form, which the
   user then reviews and corrects before pressing Save.
--------------------------------------------------------------------------- */

export interface VoiceExtraction {
  transcript: string;
  vehicleId?: string;
  entryType?: string;
  serviceType?: string;
  category?: string;
  serviceDate?: string; // ISO "YYYY-MM-DD"
  motDueDate?: string; // ISO, kept separate
  amount?: string;
  status?: string;
  notes?: string;
  missing: string[]; // friendly names of fields we couldn't find
}

const MONTHS_RE =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

const DATE_PATTERNS: RegExp[] = [
  /\b\d{4}-\d{1,2}-\d{1,2}\b/, // ISO 2024-05-12
  /\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b/, // 12/05/2024
  new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTHS_RE}\\.?\\s+\\d{2,4}\\b`, "i"), // 12 May 2024
  new RegExp(`\\b${MONTHS_RE}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{2,4}\\b`, "i"), // May 12 2024
];

/** Find the earliest date-like substring in the text. */
function findDate(text: string): { raw: string; index: number } | null {
  let best: { raw: string; index: number } | null = null;
  for (const re of DATE_PATTERNS) {
    const m = re.exec(text);
    if (m && (best === null || m.index < best.index)) {
      best = { raw: m[0], index: m.index };
    }
  }
  return best;
}

/** Strip ordinal suffixes (12th -> 12) so the date parser can read it. */
function cleanDate(raw: string): string {
  return raw.replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1");
}

/** Lowercase and reduce to single-spaced alphanumerics ("Mercedes-Benz" -> "mercedes benz"). */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Lowercase alphanumerics only, no spaces (for registration plates). */
function compactStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Whole-word/phrase match within a normalized string. */
function hasPhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^| )${escaped}( |$)`).test(haystack);
}

// Model words too generic to identify a car on their own.
const GENERIC_MODEL_WORDS = new Set([
  "series", "class", "model", "line", "edition", "sport", "estate", "saloon",
]);

/**
 * Find the best-matching vehicle for a spoken transcript.
 * Scores each vehicle and returns the highest match, so model-only phrases
 * ("service for the Model 3"), partial brands ("my Mercedes"), hyphenated
 * brands and registration numbers all work — not just "Brand Model".
 */
function matchVehicle(transcript: string, vehicles: Vehicle[]): string | undefined {
  const tNorm = normalize(transcript);
  const tCompact = compactStr(transcript);

  let bestId: string | undefined;
  let bestScore = 0;

  for (const v of vehicles) {
    const brand = normalize(v.brandName);
    const model = normalize(v.model);
    const reg = compactStr(v.registrationNumber);
    let score = 0;

    // Registration plate (strongest, most specific).
    if (reg.length >= 4 && tCompact.includes(reg)) score = Math.max(score, 100);
    // Full "brand + model".
    if (brand && model && hasPhrase(tNorm, brand) && hasPhrase(tNorm, model)) score = Math.max(score, 90);
    // Full model phrase (e.g. "model 3", "3 series").
    if (model && hasPhrase(tNorm, model)) score = Math.max(score, 75);
    // Full brand phrase (e.g. "bmw", "mercedes benz").
    if (brand && hasPhrase(tNorm, brand)) score = Math.max(score, 60);
    // Partial brand token (e.g. just "mercedes" of "mercedes benz").
    if (brand.split(" ").some((tok) => tok.length >= 3 && hasPhrase(tNorm, tok))) score = Math.max(score, 45);
    // Partial, distinctive model token (skip generic words like "series").
    if (model.split(" ").some((tok) => tok.length >= 3 && !GENERIC_MODEL_WORDS.has(tok) && hasPhrase(tNorm, tok))) {
      score = Math.max(score, 40);
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = v.id;
    }
  }

  return bestId;
}

export function parseVoiceEntry(rawTranscript: string, vehicles: Vehicle[]): VoiceExtraction {
  const transcript = rawTranscript.trim();
  const lower = transcript.toLowerCase();
  const result: VoiceExtraction = { transcript, missing: [] };

  // --- MOT due date (kept separate). Look for "mot ... due/expiry" + a date.
  let motRaw: string | null = null;
  const motPhrase = /m\.?o\.?t\.?[^.]{0,20}?(due|expiry|expires?|expire)/i.exec(transcript);
  if (motPhrase) {
    const after = transcript.slice(motPhrase.index);
    const d = findDate(after);
    if (d) {
      const iso = parseFlexibleDate(cleanDate(d.raw));
      if (iso) {
        result.motDueDate = iso;
        motRaw = d.raw;
      }
    }
  }

  // --- Service date = first date that isn't the MOT date.
  let working = transcript;
  if (motRaw) working = working.replace(motRaw, " ");
  const sd = findDate(working);
  if (sd) {
    const iso = parseFlexibleDate(cleanDate(sd.raw));
    if (iso) result.serviceDate = iso;
  }

  // --- Service type (longest match wins). Then a few spoken synonyms.
  const sortedTypes = [...SERVICE_TYPES].sort((a, b) => b.length - a.length);
  for (const t of sortedTypes) {
    if (lower.includes(t.toLowerCase())) {
      result.serviceType = t;
      break;
    }
  }
  if (!result.serviceType) {
    if (/\bm\.?o\.?t\b/.test(lower)) result.serviceType = "MOT Test";
    else if (/\bfull service\b|\bservice\b/.test(lower)) result.serviceType = "Full Service";
    else if (/\boil\b/.test(lower)) result.serviceType = "Oil Change";
  }

  // --- Entry type.
  if (/\binsurance\b/.test(lower)) result.entryType = "Insurance";
  else if (/\broad tax\b|\bcar tax\b|\bvehicle tax\b/.test(lower)) result.entryType = "Road Tax";
  else if (/\brepair\b/.test(lower)) result.entryType = "Repair";
  else if (/\bm\.?o\.?t\b/.test(lower)) result.entryType = "MOT";
  else if (result.serviceType) result.entryType = "Service";
  // Only use a known value.
  if (result.entryType && !ENTRY_TYPES.includes(result.entryType)) result.entryType = undefined;

  // --- Category (skip generic catch-all categories).
  const skipCats = new Set(["Other", "Other Equipment", "General Defect"]);
  const sortedCats = [...CATEGORIES].filter((c) => !skipCats.has(c)).sort((a, b) => b.length - a.length);
  for (const c of sortedCats) {
    if (lower.includes(c.toLowerCase())) {
      result.category = c;
      break;
    }
  }

  // --- Vehicle: robust matching (registration, brand+model, model-only,
  // brand-only, and partial tokens) via a scored matcher.
  result.vehicleId = matchVehicle(transcript, vehicles);

  // --- Amount (search text with the dates removed, so years aren't misread).
  let amtText = lower;
  [sd?.raw, motRaw].forEach((r) => {
    if (r) amtText = amtText.replace(r.toLowerCase(), " ");
  });
  const amtMatch =
    amtText.match(/£\s*(\d+(?:\.\d{1,2})?)/) ||
    amtText.match(/(\d+(?:\.\d{1,2})?)\s*(?:pounds?|quid|gbp)\b/) ||
    amtText.match(/\b(?:amount|cost|costs|price|paid|charge[ds]?|fee)\b\s*(?:of|was|is|:)?\s*£?\s*(\d+(?:\.\d{1,2})?)/);
  if (amtMatch) result.amount = amtMatch[1];

  // --- Status.
  if (/\b(done|completed?|finished)\b/.test(lower)) result.status = "Done";
  else if (/\boverdue\b/.test(lower)) result.status = "Overdue";
  else if (/\bpending\b/.test(lower)) result.status = "Due";
  else if (/\bcancel(?:l)?ed\b/.test(lower)) result.status = "Cancelled";
  else if (/\bdue\b/.test(lower)) result.status = "Due";

  // --- Notes (text after a "notes"/"fault" keyword).
  const notesMatch = transcript.match(/\b(?:notes?|fault|description|comment)s?\b[:\s-]*(.+)$/i);
  if (notesMatch && notesMatch[1].trim()) result.notes = notesMatch[1].trim();

  // --- Missing information the user should add manually.
  if (!result.serviceDate) result.missing.push("Service Date");
  if (!result.amount) result.missing.push("Amount");

  return result;
}
