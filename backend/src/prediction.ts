import { addMonths } from "./dates";

/* ---------------------------------------------------------------------------
   Smart (but explainable) service prediction engine.

   This is RULE-BASED on purpose — no machine learning. Every adjustment is a
   simple, documented rule so it can be explained in a college project and
   reproduced by hand.

   How it works:
   1. Start with a BASE interval (in months) that depends on the Service Type.
      e.g. an Oil Change is due more often than a Timing Belt.
   2. Multiply that base by a series of factors based on the vehicle and entry:
      fuel type, mileage, vehicle age, brand/model (performance/luxury),
      category (safety-critical), and entry type.
   3. Blend in the vehicle's own service history if we have enough of it.
   4. The Recommended Service Date = Service Date + the final interval.

   IMPORTANT: This only ever affects the Recommended Service Date.
   It NEVER touches the MOT Due Date, which is a separate, user-entered field.
--------------------------------------------------------------------------- */

export interface PredictionVehicle {
  brandName: string;
  model: string;
  fuelType: string;
  registeredYear: number;
  mileage?: number | null;
  vehicleType?: string | null;
}

export interface PredictionInput {
  vehicle: PredictionVehicle;
  entryType: string;
  serviceType: string;
  category?: string | null;
  serviceDateIso: string; // "YYYY-MM-DD"
  historyDatesIso?: string[]; // other service dates for the same vehicle
}

export interface PredictionResult {
  intervalMonths: number;
  recommendedServiceDate: string; // "YYYY-MM-DD"
  reasons: string[]; // short cause clauses, e.g. "this is a diesel vehicle"
  explanation: string; // one friendly sentence
}

/** Base service interval (months) per service type. Falls back to 12. */
const BASE_INTERVAL_MONTHS: Record<string, number> = {
  "Oil Change": 6,
  "Oil Filter Replacement": 6,
  "Interim Service": 6,
  "Tyre Check": 6,
  "Washer Fluid Top-up": 6,
  "Air Filter Replacement": 12,
  "Cabin/Pollen Filter Replacement": 12,
  "Full Service": 12,
  "MOT Test": 12,
  "Brake Inspection": 12,
  "Wheel Alignment": 12,
  "Wheel Balancing": 12,
  "Suspension Check": 12,
  "Steering Check": 12,
  "Battery Check": 12,
  "Engine Diagnostic": 12,
  "Coolant Check": 12,
  "Clutch Check": 12,
  "Exhaust System Check": 12,
  "Emissions Check": 12,
  "Fuel System Check": 12,
  "Lights Check": 12,
  "Windscreen / Wiper Check": 12,
  "Seat Belt Check": 12,
  "EV Battery Check": 12,
  "EV Charging System Check": 12,
  "Hybrid System Check": 12,
  "General Repair": 12,
  "Other Service": 12,
  "Brake Pad Replacement": 18,
  "Fuel Filter Replacement": 24,
  "Brake Disc Replacement": 24,
  "Brake Fluid Change": 24,
  "Coolant Replacement": 24,
  "Gearbox / Transmission Service": 24,
  "Air Conditioning Service": 24,
  "Tyre Replacement": 36,
  "Shock Absorber Replacement": 36,
  "Battery Replacement": 48,
  "Timing Belt Replacement": 60,
};

// Brands that are typically performance / luxury and need more frequent,
// specialist servicing.
const PERFORMANCE_LUXURY_BRANDS = new Set([
  "Ferrari", "Lamborghini", "McLaren", "Aston Martin", "Bentley",
  "Rolls-Royce", "Porsche", "Maserati", "Lotus", "Alpine", "Morgan",
  "Caterham", "Corvette",
]);

// Performance trims/models (keyword match on the model name).
const PERFORMANCE_MODEL_RE =
  /\b(M[0-9]|RS\d?|AMG|GTI?|GTR|GT3|GT4|Type R|Nismo|ST|Cupra|Trofeo|Competizione|Black Series|Vantage|Huracan)\b/i;

// Categories that are safety-critical and worth checking a little sooner.
const SAFETY_CRITICAL = new Set(["Brakes", "Tyres", "Suspension", "Steering", "Wheels"]);

const RENEWAL_TYPES = new Set(["Insurance", "Road Tax"]);

function currentYear(): number {
  return new Date().getFullYear();
}

/** Average gap in months between a sorted list of dates. */
function averageGapMonths(datesIso: string[]): number | null {
  if (datesIso.length < 2) return null;
  const sorted = [...datesIso].sort();
  let totalDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(`${sorted[i - 1]}T00:00:00Z`).getTime();
    const b = new Date(`${sorted[i]}T00:00:00Z`).getTime();
    totalDays += (b - a) / (1000 * 60 * 60 * 24);
  }
  const avgDays = totalDays / (sorted.length - 1);
  return avgDays / 30.44;
}

/**
 * Predict the recommended next-service date and explain why.
 */
export function predictRecommendation(input: PredictionInput): PredictionResult {
  const { vehicle, entryType, serviceType, category, serviceDateIso } = input;
  const history = input.historyDatesIso ?? [];

  // Insurance / Road Tax are annual admin renewals, not mechanical servicing.
  if (RENEWAL_TYPES.has(entryType)) {
    const interval = 12;
    return {
      intervalMonths: interval,
      recommendedServiceDate: addMonths(serviceDateIso, interval),
      reasons: ["it's an annual renewal"],
      explanation: `Recommended about ${interval} months after the date (annual renewal reminder).`,
    };
  }

  const base = BASE_INTERVAL_MONTHS[serviceType] ?? 12;
  let factor = 1;
  const reasons: string[] = [];

  // --- Fuel type ---
  switch (vehicle.fuelType) {
    case "Diesel":
      factor *= 0.85;
      reasons.push("this is a diesel vehicle");
      break;
    case "Electric":
      factor *= 1.4;
      reasons.push("it's electric, with fewer moving parts");
      break;
    case "Hybrid":
    case "Plug-in Hybrid":
      factor *= 1.1;
      reasons.push("it's a hybrid");
      break;
    case "LPG":
      factor *= 0.95;
      reasons.push("it runs on LPG");
      break;
    default:
      break; // Petrol / Other: no change
  }

  // --- Mileage ---
  const mileage = vehicle.mileage ?? null;
  if (mileage != null) {
    if (mileage >= 100000) {
      factor *= 0.75;
      reasons.push("it has very high mileage");
    } else if (mileage >= 60000) {
      factor *= 0.85;
      reasons.push("it has higher mileage");
    } else if (mileage < 20000) {
      factor *= 1.1;
      reasons.push("it has low mileage");
    }
  }

  // --- Vehicle age (from Registered Year) ---
  const age = currentYear() - vehicle.registeredYear;
  if (age >= 20) {
    factor *= 0.8;
    reasons.push("it's an older / classic vehicle");
  } else if (age >= 12) {
    factor *= 0.88;
    reasons.push("it's an older vehicle");
  } else if (age >= 6) {
    factor *= 0.95;
  }

  // --- Brand / model (performance or luxury) ---
  if (PERFORMANCE_LUXURY_BRANDS.has(vehicle.brandName)) {
    factor *= 0.85;
    reasons.push("it's a performance or luxury vehicle");
  } else if (PERFORMANCE_MODEL_RE.test(vehicle.model)) {
    factor *= 0.9;
    reasons.push("it's a performance model");
  }

  // --- Category (safety-critical) ---
  if (category && SAFETY_CRITICAL.has(category)) {
    factor *= 0.9;
    reasons.push(`it involves a safety-critical system (${category})`);
  }

  // --- Entry type ---
  if (entryType === "Repair") {
    factor *= 0.9;
    reasons.push("it's a follow-up after a repair");
  }

  let interval = Math.round(base * factor);

  // --- Service history blend ---
  const avgGap = averageGapMonths(history);
  if (avgGap != null && avgGap > 0 && avgGap < interval) {
    interval = Math.round((interval + avgGap) / 2);
    reasons.push(`your previous services were about ${Math.round(avgGap)} months apart`);
  }

  // Keep within sensible bounds.
  interval = Math.max(1, Math.min(72, interval));

  // --- Build a friendly explanation ---
  let explanation: string;
  if (interval < base && reasons.length) {
    explanation = `Recommended sooner (about ${interval} months) because ${reasons.join("; ")}.`;
  } else if (interval > base && reasons.length) {
    explanation = `Recommended later (about ${interval} months) because ${reasons.join("; ")}.`;
  } else {
    explanation = `Recommended about ${interval} months after the service date.`;
  }

  return {
    intervalMonths: interval,
    recommendedServiceDate: addMonths(serviceDateIso, interval),
    reasons,
    explanation,
  };
}
