"""
═══════════════════════════════════════════════════════════════
ICDS ML Pipeline — Step 3: Prediction API (FastAPI)
═══════════════════════════════════════════════════════════════
FastAPI microservice that serves the trained ML model for
real-time developmental risk predictions.

Your Node.js backend calls this service at:
  POST http://localhost:8000/predict

Usage: uvicorn api.predict_server:app --host 0.0.0.0 --port 8000
"""

import os
import json
import numpy as np
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime

# ─── Load Model & Artifacts ───
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

try:
    model = joblib.load(os.path.join(MODELS_DIR, "best_model.joblib"))
    scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.joblib"))
    with open(os.path.join(MODELS_DIR, "feature_columns.json")) as f:
        FEATURE_COLUMNS = json.load(f)
    with open(os.path.join(MODELS_DIR, "training_report.json")) as f:
        training_report = json.load(f)
    print(f"✅ Model loaded: {training_report['best_model']}")
    print(f"   Accuracy: {training_report['metrics']['accuracy']*100:.1f}%")
    print(f"   F1 Score: {training_report['metrics']['f1_weighted']:.4f}")
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    print("   Run train_model.py first!")
    model = None
    scaler = None
    FEATURE_COLUMNS = []
    training_report = {}

# ─── FastAPI App ───
app = FastAPI(
    title="ICDS Risk Prediction API",
    description="AI-powered developmental risk assessment for ICDS children",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TARGET_NAMES = ["low", "moderate", "high", "critical"]

# ═══════════════════════════════════════════════════════════════
# REQUEST / RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════

class DomainAssessment(BaseModel):
    expected: int = Field(..., description="Number of milestones expected for this age")
    achieved: int = Field(..., description="Number of milestones the child demonstrated")
    rawScore: float = Field(0, description="Raw score (achieved/expected * 100)")
    percentile: float = Field(50, description="Age-normalized percentile")
    risk: int = Field(0, description="Domain risk: 0=on_track, 1=monitor, 2=at_risk, 3=delayed")

class PredictionRequest(BaseModel):
    age_months: int = Field(..., ge=0, le=72, description="Child's age in months")
    gender: str = Field("male", description="male or female")
    weight: float = Field(0, description="Weight in kg")
    height: float = Field(0, description="Height in cm")
    bmi: float = Field(0, description="BMI (auto-calculated if 0)")
    weight_for_age: int = Field(0, description="0=normal, 1=underweight, 2=severely_underweight")
    height_for_age: int = Field(0, description="0=normal, 1=stunted, 2=severely_stunted")
    grossMotor: DomainAssessment
    fineMotor: DomainAssessment
    language: DomainAssessment
    cognitive: DomainAssessment
    socioEmotional: DomainAssessment
    composite_score: float = Field(0, description="Pre-computed composite score (optional)")
    confidence: float = Field(0.5, description="Assessment confidence (0-1)")

class PredictionResponse(BaseModel):
    risk_level: str
    risk_level_encoded: int
    probabilities: Dict[str, float]
    confidence: float
    model_used: str
    model_accuracy: float
    top_risk_factors: List[Dict[str, object]]
    referral_needed: bool
    referral_urgency: str
    recommended_specialist: Optional[str]
    predicted_at: str

# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {
        "service": "ICDS Risk Prediction API",
        "status": "running",
        "model": training_report.get("best_model", "not loaded"),
        "accuracy": training_report.get("metrics", {}).get("accuracy", 0),
        "endpoints": {
            "predict": "POST /predict",
            "health": "GET /health",
            "model_info": "GET /model-info",
        },
    }

@app.get("/health")
def health():
    return {
        "status": "healthy" if model is not None else "model_not_loaded",
        "model_loaded": model is not None,
        "timestamp": datetime.now().isoformat(),
    }

@app.get("/model-info")
def model_info():
    if not training_report:
        raise HTTPException(status_code=503, detail="Model not trained yet")
    return {
        "model": training_report.get("best_model"),
        "trained_at": training_report.get("trained_at"),
        "metrics": training_report.get("metrics"),
        "feature_count": len(FEATURE_COLUMNS),
        "feature_importance_top10": training_report.get("feature_importance_top10"),
        "class_distribution": training_report.get("class_distribution"),
    }

@app.post("/predict", response_model=PredictionResponse)
def predict(req: PredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run train_model.py first.")

    # ─── Build Feature Vector ───
    age_band_map = {
        (0, 12): 0, (13, 24): 1, (25, 36): 2,
        (37, 48): 3, (49, 60): 4, (61, 72): 5,
    }
    age_band = 0
    for (lo, hi), code in age_band_map.items():
        if lo <= req.age_months <= hi:
            age_band = code
            break

    # Auto-calculate BMI if not provided
    bmi = req.bmi
    if bmi == 0 and req.weight > 0 and req.height > 0:
        height_m = req.height / 100
        bmi = round(req.weight / (height_m * height_m), 1)

    domains = {
        "grossMotor": req.grossMotor,
        "fineMotor": req.fineMotor,
        "language": req.language,
        "cognitive": req.cognitive,
        "socioEmotional": req.socioEmotional,
    }

    # Build domain features
    domain_features = {}
    flagged_count = 0
    risk_sum = 0
    delayed_count = 0
    at_risk_count = 0
    ratios = []
    percentiles = []

    for name, domain in domains.items():
        ratio = domain.achieved / max(domain.expected, 1)
        domain_features[f"{name}_expected"] = domain.expected
        domain_features[f"{name}_achieved"] = domain.achieved
        domain_features[f"{name}_ratio"] = ratio
        domain_features[f"{name}_rawScore"] = domain.rawScore
        domain_features[f"{name}_percentile"] = domain.percentile
        domain_features[f"{name}_risk"] = domain.risk

        ratios.append(ratio)
        percentiles.append(domain.percentile)
        risk_sum += domain.risk
        if domain.risk >= 2:
            flagged_count += 1
            at_risk_count += 1
        if domain.risk == 3:
            delayed_count += 1

    avg_domain_ratio = np.mean(ratios)
    min_percentile = min(percentiles)
    max_percentile = max(percentiles)
    percentile_spread = max_percentile - min_percentile

    # ─── Assemble Feature Vector ───
    feature_vector = {
        "age_months": req.age_months,
        "age_band_encoded": age_band,
        "gender": 1 if req.gender == "male" else 0,
        "weight": req.weight,
        "height": req.height,
        "bmi": bmi,
        "weight_for_age": req.weight_for_age,
        "height_for_age": req.height_for_age,
        **domain_features,
        "composite_score": req.composite_score,
        "confidence": req.confidence,
        "flagged_count": flagged_count,
        "avg_domain_ratio": round(avg_domain_ratio, 4),
        "risk_sum": risk_sum,
        "delayed_count": delayed_count,
        "at_risk_count": at_risk_count,
        "min_percentile": min_percentile,
        "max_percentile": max_percentile,
        "percentile_spread": percentile_spread,
    }

    # Order features to match training
    X = np.array([[feature_vector.get(col, 0) for col in FEATURE_COLUMNS]])
    X_scaled = scaler.transform(X)

    # ─── Predict ───
    prediction = model.predict(X_scaled)[0]
    risk_level = TARGET_NAMES[prediction]

    # Get probabilities
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X_scaled)[0]
        probabilities = {name: round(float(p), 4) for name, p in zip(TARGET_NAMES, proba)}
    else:
        probabilities = {name: (1.0 if i == prediction else 0.0) for i, name in enumerate(TARGET_NAMES)}

    # ─── Top Risk Factors ───
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        top_factors = sorted(
            zip(FEATURE_COLUMNS, importances),
            key=lambda x: x[1], reverse=True
        )[:5]
        top_risk_factors = [{"feature": f, "importance": round(float(imp), 4)} for f, imp in top_factors]
    else:
        top_risk_factors = []

    # ─── Referral Logic ───
    referral_needed = prediction >= 2  # high or critical
    if prediction == 3:
        referral_urgency = "emergency"
    elif prediction == 2:
        referral_urgency = "urgent"
    elif prediction == 1 and flagged_count > 0:
        referral_urgency = "routine"
    else:
        referral_urgency = "none"

    # Determine specialist
    recommended_specialist = None
    if referral_needed:
        # Find the worst domain
        worst_domain = max(domains.items(), key=lambda x: x[1].risk)
        specialist_map = {
            "language": "Speech-Language Pathologist",
            "grossMotor": "Occupational Therapist",
            "fineMotor": "Occupational Therapist",
            "cognitive": "Developmental Pediatrician",
            "socioEmotional": "Child Psychologist",
        }
        recommended_specialist = specialist_map.get(worst_domain[0], "Pediatrician")

    return PredictionResponse(
        risk_level=risk_level,
        risk_level_encoded=int(prediction),
        probabilities=probabilities,
        confidence=float(max(probabilities.values())),
        model_used=training_report.get("best_model", "unknown"),
        model_accuracy=training_report.get("metrics", {}).get("accuracy", 0),
        top_risk_factors=top_risk_factors,
        referral_needed=referral_needed,
        referral_urgency=referral_urgency,
        recommended_specialist=recommended_specialist,
        predicted_at=datetime.now().isoformat(),
    )

# ─── Run Server ───
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
