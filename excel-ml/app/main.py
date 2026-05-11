from __future__ import annotations

import os
import time
from io import BytesIO
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

app = FastAPI(title="Excel ML Processor", version="1.0.0")

BASE_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", BASE_DIR / "output"))
MODEL_PATH = Path(os.getenv("MODEL_PATH", BASE_DIR / "models" / "model.joblib"))

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
model = None


@app.on_event("startup")
def startup_load_model() -> None:
    global model
    if MODEL_PATH.exists():
        model = joblib.load(MODEL_PATH)
        print(f"Loaded model from: {MODEL_PATH}")
    else:
        model = None
        print(f"Model file not found at: {MODEL_PATH}")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _predict(df: pd.DataFrame):
    if model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Model not loaded. Place your model at "
                f"'{MODEL_PATH}' or set MODEL_PATH env variable."
            ),
        )

    if hasattr(model, "feature_names_in_"):
        expected = list(model.feature_names_in_)
        missing_columns = [col for col in expected if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing feature columns for model: {missing_columns}",
            )
        inference_df = df[expected]
    else:
        inference_df = df

    return model.predict(inference_df)


@app.post("/process-excel")
async def process_excel(
    file: UploadFile = File(...),
):
    if not file.filename or not file.filename.lower().endswith((".xls", ".xlsx")):
        raise HTTPException(status_code=400, detail="Only Excel files (.xls, .xlsx) are allowed")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        df = pd.read_excel(BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {exc}") from exc

    predictions = _predict(df)
    if len(predictions) != len(df):
        raise HTTPException(
            status_code=500,
            detail="Prediction output length does not match input row count",
        )

    output_df = df.copy()
    output_df["prediction"] = predictions

    timestamp = int(time.time())
    source_stem = Path(file.filename).stem
    out_name = f"{source_stem}_processed_{timestamp}.xlsx"
    out_path = OUTPUT_DIR / out_name
    output_df.to_excel(out_path, index=False)

    return FileResponse(
        path=out_path,
        filename=out_name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
