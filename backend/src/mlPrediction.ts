import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
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

type ModelPredictionResult = {
  raw_interval_days: number;
  recommended_interval_days: number;
};

const ML_DIR = path.join(process.cwd(), "ml");
const PREDICT_SCRIPT_PATH = path.join(ML_DIR, "predict_recommendation_model.py");
const MODEL_PATH = path.join(ML_DIR, "recommended_service_model.pkl");

export function hasCompleteVhms(
  input: Partial<VhmsInput> | null | undefined
): boolean {
  return (
    input?.Crankshaft != null &&
    input?.Overheating != null &&
    input?.Lubricant != null &&
    input?.Misfires != null &&
    input?.Piston != null &&
    input?.Starter != null &&
    input?.Temperature != null &&
    input?.Humidity != null &&
    input?.Altitude != null
  );
}

function runPythonModel(input: Partial<VhmsInput>): ModelPredictionResult | null {
  if (!fs.existsSync(PREDICT_SCRIPT_PATH)) {
    console.warn("[mlPrediction] Prediction script not found:", PREDICT_SCRIPT_PATH);
    return null;
  }

  if (!fs.existsSync(MODEL_PATH)) {
    console.warn("[mlPrediction] Trained model not found:", MODEL_PATH);
    return null;
  }

  const tempInputPath = path.join(os.tmpdir(), `vhms-input-${Date.now()}.json`);

  fs.writeFileSync(tempInputPath, JSON.stringify(input), "utf-8");

  const pythonCommands: Array<{ command: string; args: string[] }> = [];

  if (process.env.PYTHON_BIN) {
    pythonCommands.push({
      command: process.env.PYTHON_BIN,
      args: [PREDICT_SCRIPT_PATH, tempInputPath],
    });
  }

  pythonCommands.push(
    {
      command: "python",
      args: [PREDICT_SCRIPT_PATH, tempInputPath],
    },
    {
      command: "py",
      args: ["-3.12", PREDICT_SCRIPT_PATH, tempInputPath],
    }
  );

  try {
    for (const item of pythonCommands) {
      try {
        const output = execFileSync(item.command, item.args, {
          cwd: process.cwd(),
          encoding: "utf-8",
          timeout: 30000,
        });

        return JSON.parse(output.trim()) as ModelPredictionResult;
      } catch (error) {
        console.warn(
          `[mlPrediction] Failed with ${item.command}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return null;
  } finally {
    if (fs.existsSync(tempInputPath)) {
      fs.unlinkSync(tempInputPath);
    }
  }
}

export function predictVhms(input: Partial<VhmsInput>): number | null {
  if (!hasCompleteVhms(input)) {
    return null;
  }

  const result = runPythonModel(input);

  if (!result) {
    return null;
  }

  return result.recommended_interval_days;
}