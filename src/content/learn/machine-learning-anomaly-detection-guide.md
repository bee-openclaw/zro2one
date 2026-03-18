---
title: "Anomaly Detection in Practice: Finding What Doesn't Belong"
depth: applied
pillar: building
topic: machine-learning
tags: [machine-learning, anomaly-detection, outliers, fraud, monitoring]
author: bee
date: "2026-03-18"
readTime: 9
description: "Anomaly detection is one of ML's most practical applications — from fraud to infrastructure monitoring. This guide covers the methods that actually work, when to use each, and the pitfalls that catch most teams."
related: [machine-learning-model-evaluation-guide, machine-learning-feature-engineering, machine-learning-monitoring-playbook-2026]
---

Every fraud team, DevOps org, and quality assurance department needs the same thing: a system that says "this looks wrong" before humans notice. That's anomaly detection — and it's deceptively hard to get right.

## Why Anomaly Detection Is Different

Most ML problems give you labeled examples of both classes. Anomaly detection usually doesn't. You have plenty of "normal" data and almost no examples of anomalies — because by definition, anomalies are rare, and the interesting ones haven't happened yet.

This means standard classification approaches often fail. You can't train a balanced binary classifier when 99.97% of your data is one class.

## The Three Approaches

### 1. Statistical Methods

The simplest and often most effective starting point. If you can describe "normal" mathematically, anything far from normal is anomalous.

**Z-score / Modified Z-score** — Flag data points more than N standard deviations from the mean. Works well for normally distributed data. Use the modified Z-score (based on median absolute deviation) for data with outliers that would skew the mean.

**Isolation Forest** — Randomly partitions data using decision trees. Anomalies, being few and different, get isolated in fewer splits. Fast, works on high-dimensional data, and requires no distributional assumptions. This is the workhorse algorithm — start here.

**DBSCAN** — Density-based clustering that naturally identifies points in low-density regions as anomalies. Good when your data has non-spherical clusters.

### 2. Reconstruction-Based Methods

Train a model to reconstruct normal data. Anomalies reconstruct poorly because the model never learned their patterns.

**Autoencoders** — Compress data to a bottleneck and reconstruct it. The reconstruction error on new data serves as an anomaly score. Deep autoencoders work well for complex data like images or time series.

**Variational Autoencoders (VAEs)** — Add probabilistic structure. Anomalies have low likelihood under the learned distribution. More principled than standard autoencoders but harder to tune.

**PCA-based approaches** — Project data onto principal components, then measure reconstruction error. Fast and interpretable. Works well when anomalies lie off the main variance directions.

### 3. Forecasting-Based Methods (for Time Series)

Predict what should happen next, then flag when reality deviates.

**Prophet / statistical forecasting** — Build a forecast with confidence intervals. Observations outside the interval are anomalous. Works well for data with clear seasonal patterns.

**LSTM / Transformer forecasting** — Train a sequence model on normal behavior. Anomalies produce high prediction errors. Better for complex temporal patterns but needs more data and tuning.

## Choosing Your Approach

| Scenario | Recommended Method |
|----------|-------------------|
| Tabular data, no labels | Isolation Forest |
| Time series with seasonality | Prophet + residual analysis |
| Image/video data | Autoencoder |
| Network traffic | DBSCAN or Isolation Forest |
| Simple numeric metrics | Z-score |
| Complex multivariate time series | LSTM autoencoder |

## The Threshold Problem

Every anomaly detector produces a score. Turning that score into a yes/no decision requires a threshold, and picking the right threshold is the hardest part.

**Too sensitive** → alert fatigue. Your team ignores the system because it cries wolf constantly.

**Too conservative** → missed anomalies. The system exists but doesn't catch the things that matter.

Practical approaches:

- **Start conservative**, then lower the threshold as trust builds
- **Use percentile-based thresholds** (e.g., flag the top 0.1% of anomaly scores) rather than fixed values
- **Different thresholds for different severities** — page on-call for top 0.01%, create tickets for top 0.1%, log for top 1%
- **Adaptive thresholds** that adjust based on recent data distribution — what's anomalous on Monday morning differs from Saturday night

## Common Pitfalls

### Concept Drift

Normal behavior changes over time. A model trained on last year's data flags legitimate new patterns as anomalous. Fix this with rolling training windows or online learning that continuously updates the model.

### Seasonal Blindness

Black Friday traffic isn't anomalous — it's expected. Models that don't account for seasonality generate useless alerts during predictable peaks. Always include temporal features and seasonal decomposition.

### Feature Leakage

The anomaly you're detecting might be directly encoded in your features. If you're detecting fraud and include a "was_flagged_by_analyst" feature, you're not building a detector — you're building a lookup table.

### Evaluation Without Ground Truth

You can't compute precision and recall if you don't know which points are actually anomalous. Strategies:
- Inject synthetic anomalies into historical data and measure detection rate
- Use expert review on a sample of flagged points to estimate precision
- Track downstream outcomes (did flagged fraud actually turn out to be fraud?)

## Production Considerations

**Latency matters.** Fraud detection needs millisecond decisions. Infrastructure monitoring can tolerate seconds. Choose your algorithm accordingly — Isolation Forest is fast; deep autoencoders are not.

**Explain your detections.** "This is anomalous" isn't enough. Teams need to know *why*. SHAP values on Isolation Forest, feature-wise reconstruction errors from autoencoders, or simple rules ("transaction amount is 47x the user's average") all help.

**Feedback loops.** Build a mechanism for humans to mark false positives and true positives. Use this feedback to retrain and improve thresholds. Without this loop, your system stagnates.

**Multi-model ensembles.** In practice, combining two or three different methods (e.g., Isolation Forest + autoencoder + statistical rules) and flagging when multiple agree outperforms any single method.

## Getting Started

1. **Start with Isolation Forest** on your data — it's fast, requires minimal tuning, and handles most data types
2. **Visualize your anomaly scores** before setting thresholds — understand the distribution
3. **Build the feedback loop** from day one — even a simple spreadsheet where analysts mark true/false positives
4. **Add complexity only when the simple approach fails** — autoencoders and LSTMs add value, but also add maintenance burden

Anomaly detection isn't a deploy-and-forget system. It's a living system that needs ongoing calibration, threshold tuning, and model updates. Plan for that from the start.
