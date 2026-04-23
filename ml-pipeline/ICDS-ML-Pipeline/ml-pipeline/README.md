# ICDS ML Pipeline — AI Risk Prediction Engine

## Overview
XGBoost classifier trained on developmental screening data to predict child risk levels (low/moderate/high/critical) across 5 domains (Gross Motor, Fine Motor, Language, Cognitive, Socio-Emotional).

## Results
- **Best Model:** XGBoost
- **Accuracy:** 81.5%
- **F1 Score:** 0.8028
- **CV F1 Mean:** 0.8208 (5-fold)
- **Features:** 48 (age, anthropometrics, 5 domain scores, composite metrics)

## Top 3 Predictive Features
1. `at_risk_count` (0.2989) — Number of domains classified as at-risk or delayed
2. `weight_for_age` (0.1839) — Nutritional status indicator
3. `flagged_count` (0.1544) — Total flagged domains

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Step 1: Extract data from MongoDB (on your local machine)
python scripts/extract_training_data.py

# Step 2: Train the model
python scripts/train_model.py

# Step 3: Start the prediction API
uvicorn api.predict_server:app --host 0.0.0.0 --port 8000
```

## API Usage

```bash
# Health check
curl http://localhost:8000/health

# Model info
curl http://localhost:8000/model-info

# Predict risk
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "age_months": 18,
    "gender": "male",
    "weight": 8.5,
    "height": 75,
    "weight_for_age": 1,
    "height_for_age": 0,
    "grossMotor": {"expected": 5, "achieved": 3, "rawScore": 60, "percentile": 35, "risk": 1},
    "fineMotor": {"expected": 4, "achieved": 3, "rawScore": 75, "percentile": 45, "risk": 0},
    "language": {"expected": 5, "achieved": 1, "rawScore": 20, "percentile": 8, "risk": 3},
    "cognitive": {"expected": 4, "achieved": 3, "rawScore": 75, "percentile": 42, "risk": 0},
    "socioEmotional": {"expected": 4, "achieved": 4, "rawScore": 100, "percentile": 65, "risk": 0},
    "composite_score": 35.2,
    "confidence": 0.8
  }'
```

## File Structure
```
ml-pipeline/
├── api/
│   └── predict_server.py     # FastAPI prediction microservice
├── data/
│   └── training_data.csv     # Extracted/generated training data
├── models/
│   ├── best_model.joblib     # Trained XGBoost model
│   ├── scaler.joblib         # Feature scaler
│   ├── feature_columns.json  # Feature column order
│   └── training_report.json  # Training metrics & details
├── scripts/
│   ├── extract_training_data.py   # Extract from MongoDB
│   ├── generate_synthetic_data.py # Generate synthetic data
│   └── train_model.py             # Train RF + XGBoost
└── requirements.txt
```

## Connecting to Node.js Backend
Add this to your Node.js screening route to call the ML model:

```javascript
const response = await fetch("http://localhost:8000/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(screeningData),
});
const mlPrediction = await response.json();
```
