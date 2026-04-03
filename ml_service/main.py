"""
SentinelOps ML Service — FastAPI Application
Isolation Forest + One-Class SVM anomaly detection
"""
import os
import uuid
import json
import asyncio
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
from dotenv import load_dotenv

from models.isolation_forest import IsolationForestModel
from models.svm import OneClassSVMModel
from utils.dataset_adapter import DatasetAdapter
from utils.preprocessor import Preprocessor

load_dotenv()

MODEL_SAVE_PATH = Path(os.getenv("MODEL_SAVE_PATH", "./data/saved_models"))
MODEL_SAVE_PATH.mkdir(parents=True, exist_ok=True)

# Global model registry
models: dict = {}
job_store: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load persisted models on startup."""
    global models
    for model_file in MODEL_SAVE_PATH.glob("*.joblib"):
        model_id = model_file.stem
        try:
            if "svm" in model_id:
                m = OneClassSVMModel()
            else:
                m = IsolationForestModel()
            m.load(str(model_file))
            models[model_id] = m
            print(f"[ML] Loaded model: {model_id}")
        except Exception as e:
            print(f"[ML] Failed to load {model_id}: {e}")
    yield
    # cleanup
    models.clear()


app = FastAPI(
    title="SentinelOps ML Service",
    description="Anomaly detection microservice for network traffic analysis",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────

class TrainRequest(BaseModel):
    dataset_source: str  # "UNSW-NB15" | "NSL-KDD" | "CICIDS"
    model_type: str = "isolation_forest"  # "isolation_forest" | "one_class_svm"
    contamination: float = 0.1
    dataset_id: str  # MongoDB dataset ID for result storage


class PredictRequest(BaseModel):
    model_id: str
    dataset_source: str
    dataset_id: Optional[str] = None


class JobStatus(BaseModel):
    job_id: str
    status: str  # queued | running | complete | failed
    progress: int = 0
    message: str = ""
    result: Optional[dict] = None


# ─────────────────────────────────────────────────────────────
# Background Training Job
# ─────────────────────────────────────────────────────────────

def _run_training_job(job_id: str, df: pd.DataFrame, req: TrainRequest):
    """Blocking training function executed in thread pool."""
    try:
        job_store[job_id]["status"] = "running"
        job_store[job_id]["progress"] = 10

        # Preprocess
        preprocessor = Preprocessor()
        X, y, feature_names = preprocessor.fit_transform(df)
        job_store[job_id]["progress"] = 30

        # Train model
        if req.model_type == "one_class_svm":
            model = OneClassSVMModel(nu=req.contamination)
        else:
            model = IsolationForestModel(contamination=req.contamination)

        model.fit(X, feature_names)
        job_store[job_id]["progress"] = 70

        # Predict on training data to get initial anomaly count
        predictions = model.predict(X)
        risk_scores = model.score_samples(X)
        job_store[job_id]["progress"] = 85

        # Save model
        model_id = f"{req.model_type}_{req.dataset_id}_{job_id[:8]}"
        save_path = MODEL_SAVE_PATH / f"{model_id}.joblib"
        model.save(str(save_path))
        models[model_id] = model

        # Build result
        anomaly_count = int(np.sum(predictions == -1))
        total = len(predictions)
        critical = int(np.sum(risk_scores > 0.7))
        suspicious = int(np.sum((risk_scores > 0.4) & (risk_scores <= 0.7)))
        normal = total - anomaly_count

        job_store[job_id]["progress"] = 100
        job_store[job_id]["status"] = "complete"
        job_store[job_id]["result"] = {
            "model_id": model_id,
            "model_type": req.model_type,
            "dataset_id": req.dataset_id,
            "total_records": total,
            "anomaly_count": anomaly_count,
            "normal_count": normal,
            "critical_count": critical,
            "suspicious_count": suspicious,
            "contamination": req.contamination,
            "feature_names": feature_names,
            "accuracy_estimate": round((total - anomaly_count) / total * 100, 2),
        }
    except Exception as e:
        job_store[job_id]["status"] = "failed"
        job_store[job_id]["message"] = str(e)
        print(f"[ML] Training job {job_id} failed: {e}")


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": len(models)}


@app.post("/ml/train")
async def train_model(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    dataset_source: str = "UNSW-NB15",
    model_type: str = "isolation_forest",
    contamination: float = 0.1,
    dataset_id: str = "unknown",
):
    """Upload CSV and train a new model asynchronously."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are accepted")

    try:
        content = await file.read()
        df_raw = pd.read_csv(__import__("io").BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Failed to parse CSV: {e}")

    # Adapt schema
    adapter = DatasetAdapter(dataset_source)
    try:
        df = adapter.adapt(df_raw)
    except Exception as e:
        raise HTTPException(422, f"Schema validation failed: {e}")

    job_id = str(uuid.uuid4())
    job_store[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "progress": 0,
        "message": "Queued for training",
        "result": None,
    }

    req = TrainRequest(
        dataset_source=dataset_source,
        model_type=model_type,
        contamination=contamination,
        dataset_id=dataset_id,
    )

    # Run in thread pool so FastAPI stays async
    import concurrent.futures
    loop = asyncio.get_event_loop()
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
    loop.run_in_executor(executor, _run_training_job, job_id, df, req)

    return {"job_id": job_id, "status": "queued", "message": "Training started"}


@app.get("/ml/train/{job_id}/status")
def get_train_status(job_id: str):
    """Poll training job status."""
    if job_id not in job_store:
        raise HTTPException(404, "Job not found")
    return job_store[job_id]


@app.post("/ml/predict")
async def predict(
    file: UploadFile = File(...),
    model_id: str = "",
    dataset_source: str = "UNSW-NB15",
    dataset_id: str = "unknown",
):
    """Run predictions on new CSV data with an existing model."""
    if model_id not in models:
        raise HTTPException(404, f"Model '{model_id}' not found. Train first.")

    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are accepted")

    try:
        content = await file.read()
        df_raw = pd.read_csv(__import__("io").BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Failed to parse CSV: {e}")

    adapter = DatasetAdapter(dataset_source)
    df = adapter.adapt(df_raw)

    preprocessor = Preprocessor()
    X, y, feature_names = preprocessor.fit_transform(df)

    model = models[model_id]
    predictions = model.predict(X)
    risk_scores = model.score_samples(X)

    results = []
    for i in range(len(df)):
        row = df.iloc[i]
        risk = float(risk_scores[i])
        classification = (
            "critical" if risk > 0.7
            else "suspicious" if risk > 0.4
            else "normal"
        )
        results.append({
            "index": i,
            "src_ip": str(row.get("src_ip", "")),
            "dst_ip": str(row.get("dst_ip", "")),
            "protocol": str(row.get("protocol", "")),
            "packet_size": float(row.get("packet_size", 0)),
            "duration": float(row.get("duration", 0)),
            "byte_rate": float(row.get("byte_rate", 0)),
            "risk_score": round(risk, 4),
            "classification": classification,
            "is_anomaly": bool(predictions[i] == -1),
            "dataset_id": dataset_id,
        })

    anomaly_count = sum(1 for r in results if r["is_anomaly"])
    critical_count = sum(1 for r in results if r["classification"] == "critical")

    return {
        "model_id": model_id,
        "total_records": len(results),
        "anomaly_count": anomaly_count,
        "critical_count": critical_count,
        "results": results,
    }


@app.get("/ml/model/status")
def model_status():
    """Return metadata for all loaded models."""
    return {
        "models": [
            {
                "model_id": mid,
                "model_type": m.__class__.__name__,
                "trained": m.is_trained,
                "feature_count": len(m.feature_names) if m.feature_names else 0,
                "contamination": getattr(m, "contamination", None),
            }
            for mid, m in models.items()
        ],
        "total": len(models),
    }


@app.post("/ml/retrain")
async def retrain(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    model_id: str = "",
    dataset_source: str = "UNSW-NB15",
    contamination: float = 0.1,
):
    """Retrain an existing model with new data."""
    if model_id not in models:
        raise HTTPException(404, f"Model '{model_id}' not found")

    content = await file.read()
    df_raw = pd.read_csv(__import__("io").BytesIO(content))
    adapter = DatasetAdapter(dataset_source)
    df = adapter.adapt(df_raw)

    job_id = str(uuid.uuid4())
    existing = models[model_id]
    req = TrainRequest(
        dataset_source=dataset_source,
        model_type="isolation_forest" if "isolation" in model_id else "one_class_svm",
        contamination=contamination,
        dataset_id=model_id,
    )

    job_store[job_id] = {"job_id": job_id, "status": "queued", "progress": 0, "message": "Retraining queued", "result": None}

    import concurrent.futures
    loop = asyncio.get_event_loop()
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
    loop.run_in_executor(executor, _run_training_job, job_id, df, req)

    return {"job_id": job_id, "status": "queued", "message": "Retraining started"}


@app.get("/ml/export")
def export_results(model_id: str = "", limit: int = 1000):
    """Export anomaly report as CSV stream."""
    # Build CSV from job results
    rows = []
    for jid, job in job_store.items():
        if job.get("status") == "complete" and job.get("result"):
            r = job["result"]
            if not model_id or r.get("model_id") == model_id:
                rows.append({
                    "job_id": jid,
                    "model_id": r.get("model_id"),
                    "dataset_id": r.get("dataset_id"),
                    "total_records": r.get("total_records"),
                    "anomaly_count": r.get("anomaly_count"),
                    "critical_count": r.get("critical_count"),
                    "contamination": r.get("contamination"),
                    "accuracy_estimate": r.get("accuracy_estimate"),
                })

    if not rows:
        raise HTTPException(404, "No completed jobs found")

    import io
    df_out = pd.DataFrame(rows[:limit])
    csv_buffer = io.StringIO()
    df_out.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)

    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=anomaly_report.csv"},
    )
