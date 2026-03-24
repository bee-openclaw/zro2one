---
title: "Machine Learning Drift Detection: When Your Model Stops Working and How to Catch It"
depth: applied
pillar: practice
topic: machine-learning
tags: [machine-learning, drift-detection, monitoring, production, mlops]
author: bee
date: "2026-03-24"
readTime: 10
description: "How to detect data drift, concept drift, and prediction drift in production ML systems before they silently degrade your results."
related: [machine-learning-monitoring-playbook-2026, machine-learning-model-evaluation-guide, machine-learning-feature-stores-in-production]
---

Your model worked great in testing. It performed well for the first few weeks in production. Then, gradually, metrics started slipping. No one changed the model. No one changed the code. The world changed, and your model didn't.

This is drift, and it's the most common way production ML systems fail. Not with a crash, but with a slow, silent degradation that's easy to miss until the business impact becomes obvious.

## Types of drift

There are three distinct types of drift, and they require different detection strategies.

**Data drift** (also called covariate shift) means the distribution of your input features has changed. Your model was trained on data that looked one way; it's now seeing data that looks different. Example: a credit scoring model trained on pre-pandemic financial data suddenly sees widespread income volatility. The features themselves have shifted.

**Concept drift** means the relationship between inputs and outputs has changed. Even if the input distribution stays the same, what the "right answer" is for a given input has changed. Example: a fraud detection model where fraudsters have adopted new tactics. The same transaction patterns now have different risk profiles.

**Prediction drift** means the distribution of your model's outputs has changed. This is often the first visible symptom of data or concept drift. If your classifier suddenly predicts class A 80% of the time when it used to be 50/50, something has shifted.

In practice, these often co-occur. Data drift can cause prediction drift. Concept drift manifests as prediction drift. Monitoring all three gives you the best chance of catching problems early.

## Statistical tests for drift detection

### Population Stability Index (PSI)

PSI compares two distributions by dividing values into bins and measuring the divergence.

PSI = sum((actual_pct - expected_pct) * ln(actual_pct / expected_pct))

| PSI Value | Interpretation |
|---|---|
| < 0.1 | No significant drift |
| 0.1 - 0.2 | Moderate drift, investigate |
| > 0.2 | Significant drift, action needed |

PSI works well for both numerical and categorical features. It's the most commonly used drift metric in production because it's simple, interpretable, and has well-established thresholds.

```python
import numpy as np

def calculate_psi(expected, actual, bins=10):
    """Calculate Population Stability Index between two distributions."""
    breakpoints = np.linspace(
        min(expected.min(), actual.min()),
        max(expected.max(), actual.max()),
        bins + 1
    )
    expected_pcts = np.histogram(expected, breakpoints)[0] / len(expected)
    actual_pcts = np.histogram(actual, breakpoints)[0] / len(actual)

    # Avoid division by zero
    expected_pcts = np.clip(expected_pcts, 1e-4, None)
    actual_pcts = np.clip(actual_pcts, 1e-4, None)

    psi = np.sum((actual_pcts - expected_pcts) * np.log(actual_pcts / expected_pcts))
    return psi
```

### Kolmogorov-Smirnov (KS) Test

The KS test measures the maximum distance between two cumulative distribution functions. It's non-parametric (no assumptions about distribution shape) and works well for continuous features.

A p-value below 0.05 typically indicates significant drift. The KS statistic itself (ranging from 0 to 1) gives you a measure of how far the distributions have diverged.

### Chi-Squared Test

For categorical features, the chi-squared test compares observed frequencies against expected frequencies. It's the standard choice when your features are categorical or have been binned.

### Jensen-Shannon Divergence

JSD is a symmetric, bounded (0 to 1) measure of distributional difference. It's particularly useful when you want a smooth, interpretable metric that works across feature types.

## Drift detection windows and alerting

How you window your data for drift detection matters as much as which test you use.

**Reference window:** The baseline distribution. Usually your training data or a validated production period. Update this when you retrain.

**Detection window:** Recent production data. The question is how recent.

- **Too short** (hours): High variance, many false positives. You'll detect noise, not drift.
- **Too long** (months): Low sensitivity. By the time you detect drift, it's been degrading performance for weeks.
- **Recommended starting point:** 7-day rolling windows compared against the training distribution, calculated daily. Adjust based on your data volume and how fast your domain changes.

**Alerting thresholds** should be tiered:

1. **Warning:** PSI > 0.1 on any top-importance feature, or prediction distribution shift > 1 standard deviation
2. **Alert:** PSI > 0.2 on multiple features, or sustained prediction drift for 3+ consecutive windows
3. **Critical:** PSI > 0.25 across feature groups, or ground truth metrics (when available) show degradation > 5%

## Practical monitoring architecture

A production drift monitoring system needs these components:

**Feature logging.** Capture input features for every prediction. Store them in a format that supports efficient statistical computation (columnar storage like Parquet works well).

**Prediction logging.** Store model outputs alongside inputs. Include confidence scores, not just predictions.

**Reference statistics.** Precompute and store the statistical profiles (histograms, quantiles, moments) of your training data. Computing these on-the-fly against the full training set is expensive.

**Scheduled comparison jobs.** Run drift detection on a schedule (daily for most applications, hourly for high-stakes real-time systems). Compare recent windows against reference statistics.

**Dashboard and alerting.** Visualize feature-level and prediction-level drift metrics over time. Route alerts to the team that owns the model.

Tools like Evidently, NannyML, and Whylabs handle much of this. If you're building in-house, the architecture above is the minimum viable setup.

## When to retrain vs fine-tune

Detecting drift is step one. Deciding what to do about it is step two.

**Retrain from scratch when:**
- Multiple feature distributions have shifted significantly
- The underlying task has fundamentally changed
- You have enough new labeled data to train a full model
- Performance has degraded beyond your acceptable threshold

**Fine-tune or update when:**
- Drift is limited to a few features or a specific data segment
- You have limited new labeled data
- The core patterns still hold but need adjustment
- You need a fast fix while planning a full retrain

**Do nothing (but keep watching) when:**
- Drift is detected but performance metrics haven't degraded
- The drift is seasonal and expected
- The statistical significance is borderline

## Real examples of drift in production

**E-commerce recommendation models** commonly experience drift during sales events. Purchase patterns during Black Friday look nothing like regular weeks. Teams that don't account for this see their models recommend sale items long after the event ends. The fix: seasonal reference windows and event-aware monitoring.

**NLP classification models** drift when language patterns change. Customer support ticket classifiers trained in 2024 may struggle with inquiries about products launched in 2026. The vocabulary has shifted, new intents have emerged, and existing intent boundaries have moved.

**Healthcare risk models** face concept drift when treatment protocols change. A model predicting patient outcomes based on treatment plans becomes unreliable when new treatments become standard. The same patient profile now has different expected outcomes.

## Key takeaways

Monitor all three drift types: data, concept, and prediction. Start with PSI for its simplicity and established thresholds. Use 7-day rolling windows as your starting point. Set tiered alerts to avoid alert fatigue. And most importantly, instrument your system from day one. Retrofitting drift detection onto a production model that's already drifting is much harder than building it in from the start.

Drift is not a bug in your model. It's a feature of deploying models in a changing world. The question isn't whether your model will drift -- it's whether you'll notice when it does.
