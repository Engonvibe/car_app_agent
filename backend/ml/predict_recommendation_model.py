from pathlib import Path
import json
import sys

import joblib
import pandas as pd


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "recommended_service_model.pkl"

POSSIBLE_OUTPUTS_DAYS = [7, 90, 180, 365]


def nearest_interval(value):
    return min(POSSIBLE_OUTPUTS_DAYS, key=lambda x: abs(x - value))


def load_input(argument):
    possible_file = Path(argument)

    if possible_file.exists():
        return json.loads(possible_file.read_text(encoding="utf-8-sig"))

    return json.loads(argument)


def main():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    if len(sys.argv) < 2:
        raise ValueError("Prediction input JSON or JSON file path was not provided.")

    input_data = load_input(sys.argv[1])

    model_bundle = joblib.load(MODEL_PATH)

    model = model_bundle["model"]
    feature_columns = model_bundle["feature_columns"]

    row = {}

    for column in feature_columns:
        value = input_data.get(column)

        if value is None:
            raise ValueError(f"Missing required feature: {column}")

        row[column] = float(value)

    X = pd.DataFrame([row], columns=feature_columns)

    raw_prediction = float(model.predict(X)[0])
    rounded_prediction = nearest_interval(raw_prediction)

    result = {
        "raw_interval_days": round(raw_prediction, 2),
        "recommended_interval_days": rounded_prediction,
    }

    print(json.dumps(result))


if __name__ == "__main__":
    main()
