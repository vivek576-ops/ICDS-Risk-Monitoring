"""
Generate synthetic training data matching the ICDS seeded data distributions.
This runs without needing MongoDB - produces identical statistical patterns.
"""
import pandas as pd
import numpy as np
import os

np.random.seed(42)

print("═" * 60)
print("  ICDS ML Pipeline — Synthetic Data Generation")
print("═" * 60)

N = 2510  # Match the seeded screening records count

records = []
for i in range(N):
    age_months = np.random.randint(1, 73)
    age_band = 0 if age_months <= 12 else 1 if age_months <= 24 else 2 if age_months <= 36 else 3 if age_months <= 48 else 4 if age_months <= 60 else 5
    gender = np.random.choice([0, 1])

    # Determine risk (matching PPT distribution: ~55% low, ~23% moderate, ~15% high, ~7% critical)
    risk_roll = np.random.random()
    if risk_roll < 0.548:
        risk = 0  # low
    elif risk_roll < 0.782:
        risk = 1  # moderate
    elif risk_roll < 0.931:
        risk = 2  # high
    else:
        risk = 3  # critical

    is_at_risk = risk >= 2

    # Anthropometrics
    expected_weight = 3 + age_months * 0.4
    if is_at_risk:
        weight = np.random.uniform(expected_weight * 0.5, expected_weight * 0.85)
        weight_for_age = np.random.choice([1, 2], p=[0.6, 0.4])
    else:
        weight = np.random.uniform(expected_weight * 0.8, expected_weight * 1.2)
        weight_for_age = 0

    expected_height = 50 + age_months * 1.2
    height = np.random.uniform(expected_height * 0.88, expected_height * 1.12)
    height_m = height / 100
    bmi = round(weight / (height_m * height_m), 1) if height_m > 0 else 0
    height_for_age = np.random.choice([1, 2], p=[0.7, 0.3]) if is_at_risk and np.random.random() > 0.5 else 0

    # Domain assessments
    domains = ["grossMotor", "fineMotor", "language", "cognitive", "socioEmotional"]
    domain_features = {}
    ratios = []
    percentiles_list = []
    risk_sum = 0
    flagged = 0
    delayed = 0
    at_risk_domains = 0

    for domain in domains:
        expected = np.random.randint(3, 6)

        if is_at_risk:
            if domain == "language" and np.random.random() > 0.4:
                achieved = np.random.randint(0, max(1, expected // 2))
                domain_risk = np.random.choice([2, 3], p=[0.4, 0.6])
            elif np.random.random() > 0.5:
                achieved = np.random.randint(0, max(1, expected // 2 + 1))
                domain_risk = np.random.choice([2, 3], p=[0.5, 0.5])
            else:
                achieved = np.random.randint(expected // 2, expected + 1)
                domain_risk = np.random.choice([0, 1], p=[0.6, 0.4])
        else:
            if risk == 1 and np.random.random() > 0.6:
                achieved = np.random.randint(max(0, expected - 2), expected + 1)
                domain_risk = np.random.choice([0, 1, 2], p=[0.4, 0.4, 0.2])
            else:
                achieved = np.random.randint(max(0, expected - 1), expected + 1)
                domain_risk = np.random.choice([0, 1], p=[0.8, 0.2])

        ratio = achieved / max(expected, 1)
        raw_score = ratio * 100

        # Percentile based on risk
        if domain_risk == 0:
            percentile = np.random.uniform(40, 95)
        elif domain_risk == 1:
            percentile = np.random.uniform(25, 45)
        elif domain_risk == 2:
            percentile = np.random.uniform(10, 30)
        else:
            percentile = np.random.uniform(1, 15)

        domain_features[f"{domain}_expected"] = expected
        domain_features[f"{domain}_achieved"] = achieved
        domain_features[f"{domain}_ratio"] = round(ratio, 4)
        domain_features[f"{domain}_rawScore"] = round(raw_score, 1)
        domain_features[f"{domain}_percentile"] = round(percentile, 1)
        domain_features[f"{domain}_risk"] = domain_risk

        ratios.append(ratio)
        percentiles_list.append(percentile)
        risk_sum += domain_risk
        if domain_risk >= 2:
            flagged += 1
            at_risk_domains += 1
        if domain_risk == 3:
            delayed += 1

    avg_ratio = np.mean(ratios)
    min_pct = min(percentiles_list)
    max_pct = max(percentiles_list)

    # Composite score (weighted average of percentiles)
    weights = [0.18, 0.17, 0.25, 0.22, 0.18]
    composite = sum(percentiles_list[i] * weights[i] for i in range(5))
    if weight_for_age == 2:
        composite -= 10
    elif weight_for_age == 1:
        composite -= 5
    composite = max(0, min(100, composite))

    confidence = np.random.uniform(0.5, 0.95)

    record = {
        "age_months": age_months,
        "age_band_encoded": age_band,
        "gender": gender,
        "weight": round(weight, 1),
        "height": round(height, 1),
        "bmi": bmi,
        "weight_for_age": weight_for_age,
        "height_for_age": height_for_age,
        **domain_features,
        "composite_score": round(composite, 1),
        "confidence": round(confidence, 2),
        "flagged_count": flagged,
        "avg_domain_ratio": round(avg_ratio, 4),
        "risk_sum": risk_sum,
        "delayed_count": delayed,
        "at_risk_count": at_risk_domains,
        "min_percentile": round(min_pct, 1),
        "max_percentile": round(max_pct, 1),
        "percentile_spread": round(max_pct - min_pct, 1),
        "risk_level_encoded": risk,
        "risk_level": ["low", "moderate", "high", "critical"][risk],
    }
    records.append(record)

df = pd.DataFrame(records)

output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "training_data.csv")
df.to_csv(output_path, index=False)

print(f"\n✅ Generated {len(df)} training records")
print(f"   Saved to: {output_path}")
print(f"\n📊 Risk Distribution:")
for level in ["low", "moderate", "high", "critical"]:
    count = len(df[df["risk_level"] == level])
    pct = count / len(df) * 100
    bar = "█" * int(pct / 2)
    print(f"   {level:10s}: {count:5d} ({pct:5.1f}%) {bar}")
