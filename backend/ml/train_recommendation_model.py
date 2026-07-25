from pathlib import Path
import json

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parent

DATASET_PATH = BASE_DIR / "augmented_data_with_environment.csv"
MODEL_PATH = BASE_DIR / "recommended_service_model.pkl"
METRICS_PATH = BASE_DIR / "model_metrics.json"

FEATURE_COLUMNS = [
    "Crankshaft",
    "Overheating",
    "Lubricant",
    "Misfires",
    "Piston",
    "Starter",
    "Temperature",
    "Humidity",
    "Altitude",
]

POSSIBLE_OUTPUTS_DAYS = [7, 90, 180, 365]


def nearest_interval(value):
    return min(POSSIBLE_OUTPUTS_DAYS, key=lambda x: abs(x - value))


def create_target_if_missing(df):
    """
    If the dataset does not already have recommended_interval_days,
    create it from a simple vehicle-health risk score.
    Higher risk means earlier recommended service.
    """

    if "recommended_interval_days" in df.columns:
        return df

    risk_score = (
        df["Crankshaft"].rank(pct=True)
        + df["Overheating"].rank(pct=True)
        + df["Lubricant"].rank(pct=True)
        + df["Misfires"].rank(pct=True)
        + df["Piston"].rank(pct=True)
        + df["Starter"].rank(pct=True)
    ) / 6

    df["recommended_interval_days"] = risk_score.apply(
        lambda score: 7 if score >= 0.75 else 90 if score >= 0.50 else 180 if score >= 0.25 else 365
    )

    return df


def main():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}")

    df = pd.read_csv(DATASET_PATH)

    missing_features = [col for col in FEATURE_COLUMNS if col not in df.columns]

    if missing_features:
        raise ValueError(f"Missing feature columns in dataset: {missing_features}")

    df = create_target_if_missing(df)

    df = df.dropna(subset=FEATURE_COLUMNS + ["recommended_interval_days"])

    X = df[FEATURE_COLUMNS]
    y = df["recommended_interval_days"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
    )

    model = RandomForestRegressor(
        n_estimators=100,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    raw_predictions = model.predict(X_test)
    rounded_predictions = [nearest_interval(value) for value in raw_predictions]

    raw_mae = mean_absolute_error(y_test, raw_predictions)
    rounded_mae = mean_absolute_error(y_test, rounded_predictions)
    r2 = r2_score(y_test, raw_predictions)

    model_bundle = {
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "possible_outputs_days": POSSIBLE_OUTPUTS_DAYS,
    }

    joblib.dump(model_bundle, MODEL_PATH)

    metrics = {
        "model_name": "Random Forest Regressor",
        "target": "recommended_interval_days",
        "feature_columns": FEATURE_COLUMNS,
        "possible_outputs_days": POSSIBLE_OUTPUTS_DAYS,
        "mean_absolute_error_days_raw": round(float(raw_mae), 2),
        "mean_absolute_error_days_rounded": round(float(rounded_mae), 2),
        "r2_score": round(float(r2), 4),
        "target_distribution": y.value_counts().sort_index().to_dict(),
        "important_note": (
            "If the original dataset did not contain real recommended service dates, "
            "recommended_interval_days was derived from a risk-score formula based on vehicle health indicators."
        ),
    }

    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print("AI model training completed successfully.")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Metrics saved to: {METRICS_PATH}")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
