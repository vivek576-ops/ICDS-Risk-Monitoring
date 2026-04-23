"""
═══════════════════════════════════════════════════════════════
ICDS ML Pipeline — Step 1: Data Extraction
═══════════════════════════════════════════════════════════════
Extracts screening records from MongoDB and transforms them
into a feature matrix suitable for ML training.

Usage: python scripts/extract_training_data.py
Output: data/training_data.csv
"""

import json
import csv
import os
import sys
from pymongo import MongoClient
import pandas as pd
import numpy as np

# ─── Connect to MongoDB ───
MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/icds")
client = MongoClient(MONGO_URI)
db = client["icds"]

print("═" * 60)
print("  ICDS ML Pipeline — Data Extraction")
print("═" * 60)

# ─── Extract Screening Records ───
print("\n📥 Extracting screening records from MongoDB...")
screenings = list(db.screeningrecords.find({}))
print(f"   Found {len(screenings)} screening records")

if len(screenings) == 0:
    print("❌ No screening records found. Run 'npm run seed' first.")
    sys.exit(1)

# ─── Extract Child Data ───
print("📥 Extracting child profiles...")
children = list(db.children.find({}))
child_map = {str(c["_id"]): c for c in children}
print(f"   Found {len(children)} children")

# ─── Build Feature Matrix ───
print("\n🔧 Building feature matrix...")

records = []
for s in screenings:
    child_id = str(s.get("childId", ""))
    child = child_map.get(child_id, {})

    # ─── Age Features ───
    age_months = s.get("ageAtScreening", {}).get("months", 0)
    age_band = s.get("ageAtScreening", {}).get("band", "unknown")

    # Age band encoding
    age_band_map = {
        "0-12 mo": 0, "13-24 mo": 1, "25-36 mo": 2,
        "37-48 mo": 3, "49-60 mo": 4, "61-72 mo": 5
    }
    age_band_encoded = age_band_map.get(age_band, -1)

    # ─── Domain Assessment Features ───
    assessments = s.get("assessments", [])
    domain_features = {}

    domain_keys = ["grossMotor", "fineMotor", "language", "cognitive", "socioEmotional"]
    for domain in domain_keys:
        # Find this domain's assessment
        domain_assessment = None
        for a in assessments:
            if a.get("domain") == domain:
                domain_assessment = a
                break

        if domain_assessment:
            expected = domain_assessment.get("milestonesExpected", 1)
            achieved = domain_assessment.get("milestonesAchieved", 0)

            domain_features[f"{domain}_expected"] = expected
            domain_features[f"{domain}_achieved"] = achieved
            domain_features[f"{domain}_ratio"] = achieved / max(expected, 1)
            domain_features[f"{domain}_rawScore"] = domain_assessment.get("rawScore", 0)
            domain_features[f"{domain}_percentile"] = domain_assessment.get("percentile", 50)

            # Domain risk encoding
            risk_map = {"on_track": 0, "monitor": 1, "at_risk": 2, "delayed": 3}
            domain_features[f"{domain}_risk"] = risk_map.get(
                domain_assessment.get("domainRisk", "on_track"), 0
            )
        else:
            domain_features[f"{domain}_expected"] = 0
            domain_features[f"{domain}_achieved"] = 0
            domain_features[f"{domain}_ratio"] = 0
            domain_features[f"{domain}_rawScore"] = 0
            domain_features[f"{domain}_percentile"] = 50
            domain_features[f"{domain}_risk"] = 0

    # ─── Anthropometric Features ───
    anthro = child.get("anthropometrics", [])
    latest_anthro = anthro[-1] if anthro else {}

    weight = latest_anthro.get("weight", 0)
    height = latest_anthro.get("height", 0)
    bmi = latest_anthro.get("bmi", 0)

    # Weight-for-age encoding
    wfa_map = {"normal": 0, "underweight": 1, "severely_underweight": 2}
    weight_for_age = wfa_map.get(latest_anthro.get("weightForAge", "normal"), 0)

    hfa_map = {"normal": 0, "stunted": 1, "severely_stunted": 2}
    height_for_age = hfa_map.get(latest_anthro.get("heightForAge", "normal"), 0)

    # ─── Composite Features ───
    composite_score = s.get("compositeScore", 0)
    confidence = s.get("confidence", 0)
    flagged_count = len(s.get("flaggedDomains", []))

    # ─── Derived Features ───
    # Average domain ratio
    ratios = [domain_features.get(f"{d}_ratio", 0) for d in domain_keys]
    avg_domain_ratio = np.mean(ratios) if ratios else 0

    # Domain risk sum (higher = worse)
    risk_sum = sum(domain_features.get(f"{d}_risk", 0) for d in domain_keys)

    # Number of delayed domains
    delayed_count = sum(1 for d in domain_keys if domain_features.get(f"{d}_risk", 0) == 3)

    # Number of at-risk domains
    at_risk_count = sum(1 for d in domain_keys if domain_features.get(f"{d}_risk", 0) >= 2)

    # Min domain percentile (weakest domain)
    percentiles = [domain_features.get(f"{d}_percentile", 50) for d in domain_keys]
    min_percentile = min(percentiles) if percentiles else 50
    max_percentile = max(percentiles) if percentiles else 50
    percentile_spread = max_percentile - min_percentile

    # ─── Target Variable ───
    risk_level = s.get("riskLevel", "low")
    risk_level_map = {"low": 0, "moderate": 1, "high": 2, "critical": 3}
    risk_level_encoded = risk_level_map.get(risk_level, 0)

    # ─── Build Record ───
    record = {
        "age_months": age_months,
        "age_band_encoded": age_band_encoded,
        "gender": 1 if child.get("gender") == "male" else 0,
        "weight": weight,
        "height": height,
        "bmi": bmi,
        "weight_for_age": weight_for_age,
        "height_for_age": height_for_age,
        **domain_features,
        "composite_score": composite_score,
        "confidence": confidence,
        "flagged_count": flagged_count,
        "avg_domain_ratio": round(avg_domain_ratio, 4),
        "risk_sum": risk_sum,
        "delayed_count": delayed_count,
        "at_risk_count": at_risk_count,
        "min_percentile": min_percentile,
        "max_percentile": max_percentile,
        "percentile_spread": percentile_spread,
        # Target
        "risk_level": risk_level,
        "risk_level_encoded": risk_level_encoded,
        # Metadata (not used as features)
        "district": s.get("district", ""),
        "child_id": child_id,
    }
    records.append(record)

# ─── Create DataFrame ───
df = pd.DataFrame(records)

# ─── Save to CSV ───
output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "training_data.csv")
df.to_csv(output_path, index=False)

# ─── Print Summary ───
print(f"\n✅ Training data saved to: {output_path}")
print(f"   Total records: {len(df)}")
print(f"   Features: {len(df.columns) - 3} (excluding target + metadata)")
print(f"\n📊 Risk Level Distribution:")
for level, count in df["risk_level"].value_counts().items():
    pct = count / len(df) * 100
    bar = "█" * int(pct / 2)
    print(f"   {level:10s}: {count:5d} ({pct:5.1f}%) {bar}")

print(f"\n📊 Age Band Distribution:")
for band_code in sorted(df["age_band_encoded"].unique()):
    band_names = {0: "0-12 mo", 1: "13-24 mo", 2: "25-36 mo", 3: "37-48 mo", 4: "49-60 mo", 5: "61-72 mo"}
    count = len(df[df["age_band_encoded"] == band_code])
    print(f"   {band_names.get(band_code, 'unknown'):10s}: {count:5d}")

print(f"\n📊 Feature Columns:")
feature_cols = [c for c in df.columns if c not in ["risk_level", "risk_level_encoded", "district", "child_id"]]
for i, col in enumerate(feature_cols):
    print(f"   {i+1:2d}. {col}")

client.close()
print("\n✅ Data extraction complete!")
