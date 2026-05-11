# FastAPI Excel Model Processor

This service receives an Excel file, runs ML inference, saves a processed file in `output/`, and returns that file in the API response.

## 1) Setup

From `backend/model_scripts`:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## 2) Add your model

- Place your trained model at `models/model.joblib`
- Or set `MODEL_PATH` to a custom file path

The model should expose `.predict(...)`.
If your model has `feature_names_in_`, the API will enforce those columns from the uploaded Excel.

## 3) Run service

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## 4) Environment variables (optional)

- `MODEL_PATH`: default is `models/model.joblib`
- `OUTPUT_DIR`: default is `output`

## 5) API

- `GET /health`
- `POST /process-excel` (multipart form-data with field name `file`)

Response: processed `.xlsx` file with an added `prediction` column.
