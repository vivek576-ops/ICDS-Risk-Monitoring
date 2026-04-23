"""
═══════════════════════════════════════════════════════════════
ICDS ML Pipeline — Step 2: Model Training
═══════════════════════════════════════════════════════════════
Trains Random Forest and XGBoost classifiers on screening data.
Evaluates both models, selects the best, and saves it for
inference via the FastAPI microservice.

Usage: python scripts/train_model.py
Output: models/best_model.joblib, models/training_report.json
"""

import os
import json
import warnings
import numpy as np
import pandas as pd
from datetime import datetime

from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    f1_score, precision_score, recall_score
)
from xgboost import XGBClassifier
import joblib

warnings.filterwarnings("ignore")

print("═" * 60)
print("  ICDS ML Pipeline — Model Training")
print("═" * 60)

# ─── Load Data ───
data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "training_data.csv")
print(f"\n📥 Loading training data from: {data_path}")
df = pd.read_csv(data_path)
print(f"   Loaded {len(df)} records with {len(df.columns)} columns")

# ─── Define Features ───
FEATURE_COLUMNS = [
    # Age
    "age_months", "age_band_encoded", "gender",
    # Anthropometrics
    "weight", "height", "bmi", "weight_for_age", "height_for_age",
    # Gross Motor
    "grossMotor_expected", "grossMotor_achieved", "grossMotor_ratio",
    "grossMotor_rawScore", "grossMotor_percentile", "grossMotor_risk",
    # Fine Motor
    "fineMotor_expected", "fineMotor_achieved", "fineMotor_ratio",
    "fineMotor_rawScore", "fineMotor_percentile", "fineMotor_risk",
    # Language
    "language_expected", "language_achieved", "language_ratio",
    "language_rawScore", "language_percentile", "language_risk",
    # Cognitive
    "cognitive_expected", "cognitive_achieved", "cognitive_ratio",
    "cognitive_rawScore", "cognitive_percentile", "cognitive_risk",
    # Socio-Emotional
    "socioEmotional_expected", "socioEmotional_achieved", "socioEmotional_ratio",
    "socioEmotional_rawScore", "socioEmotional_percentile", "socioEmotional_risk",
    # Composite
    "composite_score", "confidence", "flagged_count",
    # Derived
    "avg_domain_ratio", "risk_sum", "delayed_count", "at_risk_count",
    "min_percentile", "max_percentile", "percentile_spread",
]

TARGET = "risk_level_encoded"
TARGET_NAMES = ["low", "moderate", "high", "critical"]

# ─── Prepare Features ───
print("\n🔧 Preparing features...")
X = df[FEATURE_COLUMNS].copy()
y = df[TARGET].copy()

# Handle missing values
X = X.fillna(0)

print(f"   Feature matrix: {X.shape}")
print(f"   Target distribution:")
for val, name in enumerate(TARGET_NAMES):
    count = (y == val).sum()
    pct = count / len(y) * 100
    print(f"     {name:10s}: {count:5d} ({pct:5.1f}%)")

# ─── Train/Test Split ───
print("\n📊 Splitting data (80% train / 20% test, stratified)...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"   Training set: {len(X_train)} records")
print(f"   Test set:     {len(X_test)} records")

# ─── Scale Features ───
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ═══════════════════════════════════════════════════════════════
# MODEL 1: Random Forest
# ═══════════════════════════════════════════════════════════════

print("\n" + "─" * 60)
print("  MODEL 1: Random Forest Classifier")
print("─" * 60)

rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    max_features="sqrt",
    class_weight="balanced",  # Handle class imbalance
    random_state=42,
    n_jobs=-1,
)

print("   Training with 200 trees, max_depth=15, balanced class weights...")
rf_model.fit(X_train_scaled, y_train)
rf_pred = rf_model.predict(X_test_scaled)

rf_accuracy = accuracy_score(y_test, rf_pred)
rf_f1 = f1_score(y_test, rf_pred, average="weighted")
rf_precision = precision_score(y_test, rf_pred, average="weighted")
rf_recall = recall_score(y_test, rf_pred, average="weighted")

print(f"\n   📈 Results:")
print(f"   Accuracy:  {rf_accuracy:.4f} ({rf_accuracy*100:.1f}%)")
print(f"   F1 Score:  {rf_f1:.4f}")
print(f"   Precision: {rf_precision:.4f}")
print(f"   Recall:    {rf_recall:.4f}")

# Cross-validation
print("\n   🔄 5-Fold Cross Validation...")
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
rf_cv_scores = cross_val_score(rf_model, X_train_scaled, y_train, cv=cv, scoring="f1_weighted")
print(f"   CV F1 Scores: {rf_cv_scores}")
print(f"   CV Mean F1:   {rf_cv_scores.mean():.4f} (+/- {rf_cv_scores.std()*2:.4f})")

print(f"\n   Classification Report:")
print(classification_report(y_test, rf_pred, target_names=TARGET_NAMES))

# ═══════════════════════════════════════════════════════════════
# MODEL 2: XGBoost
# ═══════════════════════════════════════════════════════════════

print("─" * 60)
print("  MODEL 2: XGBoost Classifier")
print("─" * 60)

# Calculate class weights for XGBoost
class_counts = np.bincount(y_train.values)
total = len(y_train)
sample_weights = np.array([total / (len(class_counts) * class_counts[c]) for c in y_train])

xgb_model = XGBClassifier(
    n_estimators=200,
    max_depth=8,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=3,
    gamma=0.1,
    reg_alpha=0.1,
    reg_lambda=1.0,
    objective="multi:softmax",
    num_class=4,
    eval_metric="mlogloss",
    random_state=42,
    n_jobs=-1,
    verbosity=0,
)

print("   Training with 200 rounds, max_depth=8, lr=0.1...")
xgb_model.fit(X_train_scaled, y_train, sample_weight=sample_weights)
xgb_pred = xgb_model.predict(X_test_scaled)

xgb_accuracy = accuracy_score(y_test, xgb_pred)
xgb_f1 = f1_score(y_test, xgb_pred, average="weighted")
xgb_precision = precision_score(y_test, xgb_pred, average="weighted")
xgb_recall = recall_score(y_test, xgb_pred, average="weighted")

print(f"\n   📈 Results:")
print(f"   Accuracy:  {xgb_accuracy:.4f} ({xgb_accuracy*100:.1f}%)")
print(f"   F1 Score:  {xgb_f1:.4f}")
print(f"   Precision: {xgb_precision:.4f}")
print(f"   Recall:    {xgb_recall:.4f}")

# Cross-validation
print("\n   🔄 5-Fold Cross Validation...")
xgb_cv_scores = cross_val_score(xgb_model, X_train_scaled, y_train, cv=cv, scoring="f1_weighted")
print(f"   CV F1 Scores: {xgb_cv_scores}")
print(f"   CV Mean F1:   {xgb_cv_scores.mean():.4f} (+/- {xgb_cv_scores.std()*2:.4f})")

print(f"\n   Classification Report:")
print(classification_report(y_test, xgb_pred, target_names=TARGET_NAMES))

# ═══════════════════════════════════════════════════════════════
# MODEL COMPARISON & SELECTION
# ═══════════════════════════════════════════════════════════════

print("═" * 60)
print("  MODEL COMPARISON")
print("═" * 60)

comparison = {
    "Random Forest": {
        "accuracy": rf_accuracy, "f1": rf_f1,
        "precision": rf_precision, "recall": rf_recall,
        "cv_mean_f1": rf_cv_scores.mean(), "cv_std": rf_cv_scores.std(),
    },
    "XGBoost": {
        "accuracy": xgb_accuracy, "f1": xgb_f1,
        "precision": xgb_precision, "recall": xgb_recall,
        "cv_mean_f1": xgb_cv_scores.mean(), "cv_std": xgb_cv_scores.std(),
    },
}

print(f"\n   {'Metric':<20} {'Random Forest':>15} {'XGBoost':>15} {'Winner':>15}")
print(f"   {'─'*65}")
metrics = ["accuracy", "f1", "precision", "recall", "cv_mean_f1"]
for metric in metrics:
    rf_val = comparison["Random Forest"][metric]
    xgb_val = comparison["XGBoost"][metric]
    winner = "RF ✓" if rf_val >= xgb_val else "XGB ✓"
    print(f"   {metric:<20} {rf_val:>15.4f} {xgb_val:>15.4f} {winner:>15}")

# Select best model based on CV F1 (most robust metric)
if rf_cv_scores.mean() >= xgb_cv_scores.mean():
    best_model = rf_model
    best_name = "Random Forest"
    best_pred = rf_pred
    best_metrics = comparison["Random Forest"]
else:
    best_model = xgb_model
    best_name = "XGBoost"
    best_pred = xgb_pred
    best_metrics = comparison["XGBoost"]

print(f"\n   🏆 Best Model: {best_name} (CV F1: {best_metrics['cv_mean_f1']:.4f})")

# ═══════════════════════════════════════════════════════════════
# FEATURE IMPORTANCE
# ═══════════════════════════════════════════════════════════════

print("\n" + "─" * 60)
print("  FEATURE IMPORTANCE (Top 15)")
print("─" * 60)

if best_name == "Random Forest":
    importances = best_model.feature_importances_
else:
    importances = best_model.feature_importances_

feature_importance = sorted(
    zip(FEATURE_COLUMNS, importances),
    key=lambda x: x[1],
    reverse=True
)

for i, (feat, imp) in enumerate(feature_importance[:15]):
    bar = "█" * int(imp * 100)
    print(f"   {i+1:2d}. {feat:<30s} {imp:.4f} {bar}")

# ═══════════════════════════════════════════════════════════════
# CONFUSION MATRIX
# ═══════════════════════════════════════════════════════════════

print("\n" + "─" * 60)
print("  CONFUSION MATRIX")
print("─" * 60)

cm = confusion_matrix(y_test, best_pred)
print(f"\n   {'':>12} {'Pred Low':>10} {'Pred Mod':>10} {'Pred High':>10} {'Pred Crit':>10}")
for i, name in enumerate(TARGET_NAMES):
    row = "   ".join(f"{cm[i][j]:>10d}" for j in range(len(TARGET_NAMES)))
    print(f"   {name:>12} {row}")

# ═══════════════════════════════════════════════════════════════
# SAVE MODEL & ARTIFACTS
# ═══════════════════════════════════════════════════════════════

print("\n" + "─" * 60)
print("  SAVING MODEL & ARTIFACTS")
print("─" * 60)

models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
os.makedirs(models_dir, exist_ok=True)

# Save model
model_path = os.path.join(models_dir, "best_model.joblib")
joblib.dump(best_model, model_path)
print(f"   ✅ Model saved: {model_path}")

# Save scaler
scaler_path = os.path.join(models_dir, "scaler.joblib")
joblib.dump(scaler, scaler_path)
print(f"   ✅ Scaler saved: {scaler_path}")

# Save feature columns
features_path = os.path.join(models_dir, "feature_columns.json")
with open(features_path, "w") as f:
    json.dump(FEATURE_COLUMNS, f, indent=2)
print(f"   ✅ Feature columns saved: {features_path}")

# Save training report
report = {
    "trained_at": datetime.now().isoformat(),
    "training_records": len(X_train),
    "test_records": len(X_test),
    "total_features": len(FEATURE_COLUMNS),
    "best_model": best_name,
    "best_model_params": {k: (float(v) if isinstance(v, (np.floating,)) else int(v) if isinstance(v, (np.integer,)) else v) for k, v in best_model.get_params().items() if v is not None and not callable(v)},
    "metrics": {
        "accuracy": round(best_metrics["accuracy"], 4),
        "f1_weighted": round(best_metrics["f1"], 4),
        "precision_weighted": round(best_metrics["precision"], 4),
        "recall_weighted": round(best_metrics["recall"], 4),
        "cv_f1_mean": round(best_metrics["cv_mean_f1"], 4),
        "cv_f1_std": round(best_metrics["cv_std"], 4),
    },
    "comparison": {k: {m: round(float(v), 4) for m, v in vals.items()} for k, vals in comparison.items()},
    "feature_importance_top10": [
        {"feature": f, "importance": round(float(imp), 4)}
        for f, imp in feature_importance[:10]
    ],
    "confusion_matrix": cm.tolist(),
    "target_names": TARGET_NAMES,
    "class_distribution": {
        name: int((y == i).sum()) for i, name in enumerate(TARGET_NAMES)
    },
}

report_path = os.path.join(models_dir, "training_report.json")
with open(report_path, "w") as f:
    json.dump(report, f, indent=2)
print(f"   ✅ Training report saved: {report_path}")

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════

print("\n" + "═" * 60)
print("  TRAINING COMPLETE — Summary")
print("═" * 60)
print(f"   Best Model:     {best_name}")
print(f"   Accuracy:       {best_metrics['accuracy']*100:.1f}%")
print(f"   F1 Score:       {best_metrics['f1']:.4f}")
print(f"   CV F1 Mean:     {best_metrics['cv_mean_f1']:.4f}")
print(f"   Training Data:  {len(X_train)} records")
print(f"   Test Data:      {len(X_test)} records")
print(f"   Features:       {len(FEATURE_COLUMNS)}")
print(f"\n   Top 3 Features:")
for i, (feat, imp) in enumerate(feature_importance[:3]):
    print(f"     {i+1}. {feat} ({imp:.4f})")
print(f"\n   Files saved in: {models_dir}/")
print("═" * 60)
