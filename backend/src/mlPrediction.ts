import fs from "fs";
import path from "path";

export type VhmsInput = {
  Crankshaft?: number;
  Overheating?: number;
  Lubricant?: number;
  Misfires?: number;
  Piston?: number;
  Starter?: number;
  Temperature?: number;
  Humidity?: number;
  Altitude?: number;
};

type DatasetRow = VhmsInput & {
  recommended_interval_days?: number;
};

const DATASET_PATH = path.join(
  process.cwd(),
  "ml",
  "augmented_data_with_environment.csv"
);

let cachedRows: DatasetRow[] | null = null;

function toNumber(value: string | undefined): number | undefined {
  if (value == null || value.trim() === "") return undefined;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCsvLine(line: string): string[] {
  return line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
}

function loadDataset(): DatasetRow[] {
  if (cachedRows) return cachedRows;

  if (!fs.existsSync(DATASET_PATH)) {
    cachedRows = [];
    return cachedRows;
  }

  const csvText = fs.readFileSync(DATASET_PATH, "utf-8");
  const lines = csvText.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) {
    cachedRows = [];
    return cachedRows;
  }

  const headers = parseCsvLine(lines[0]);

  cachedRows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    return {
      Crankshaft: toNumber(row.Crankshaft),
      Overheating: toNumber(row.Overheating),
      Lubricant: toNumber(row.Lubricant),
      Misfires: toNumber(row.Misfires),
      Piston: toNumber(row.Piston),
      Starter: toNumber(row.Starter),
      Temperature: toNumber(row.Temperature),
      Humidity: toNumber(row.Humidity),
      Altitude: toNumber(row.Altitude),
      recommended_interval_days: toNumber(row.recommended_interval_days),
    };
  });

  return cachedRows;
}

export function hasCompleteVhms(input: VhmsInput): boolean {
  return (
    input.Crankshaft != null &&
    input.Overheating != null &&
    input.Lubricant != null &&
    input.Misfires != null &&
    input.Piston != null &&
    input.Starter != null &&
    input.Temperature != null &&
    input.Humidity != null &&
    input.Altitude != null
  );
}

function distance(input: VhmsInput, row: DatasetRow): number {
  const keys: Array<keyof VhmsInput> = [
    "Crankshaft",
    "Overheating",
    "Lubricant",
    "Misfires",
    "Piston",
    "Starter",
    "Temperature",
    "Humidity",
    "Altitude",
  ];

  return keys.reduce((total, key) => {
    const inputValue = input[key] ?? 0;
    const rowValue = row[key] ?? 0;
    const diff = inputValue - rowValue;

    return total + diff * diff;
  }, 0);
}

export function predictVhms(input: VhmsInput): number | null {
  const rows = loadDataset().filter(
    (row) => row.recommended_interval_days != null
  );

  if (rows.length === 0) return null;

  const nearestRow = rows.reduce((best, current) => {
    return distance(input, current) < distance(input, best) ? current : best;
  });

  return nearestRow.recommended_interval_days ?? null;
}