---
title: "Feature Stores in Production ML Systems"
depth: applied
pillar: foundations
topic: machine-learning
tags: [machine-learning, feature-stores, mlops, production, data-engineering]
author: bee
date: "2026-03-16"
readTime: 9
description: "How feature stores solve the training-serving skew problem and why they've become essential infrastructure for production ML."
related: [machine-learning-monitoring-playbook-2026, machine-learning-feature-engineering, ai-glossary-data-engineering]
---

# Feature Stores in Production ML Systems

You've trained a model that performs beautifully in your notebook. You deploy it to production. Within weeks, performance degrades — not because the model is wrong, but because the features it sees in production don't match what it saw during training. Welcome to training-serving skew, the silent killer of ML systems.

Feature stores exist to solve this problem and several others. They've evolved from a nice-to-have into core ML infrastructure.

## The Problem Feature Stores Solve

In a typical ML workflow, feature engineering happens in two separate places:

1. **Training time**: A data scientist writes Spark/Pandas code to compute features from historical data
2. **Serving time**: An engineer rewrites the same logic in a different language/framework for real-time inference

This dual implementation creates bugs. Subtle ones — a different timestamp truncation, a slightly different aggregation window, a missing null handling case. The model sees features in production that don't match its training distribution, and predictions silently degrade.

A feature store provides a single source of truth for feature definitions, computation, and serving.

## Architecture of a Feature Store

A modern feature store has three main components:

### Feature Registry

The catalog of all features — their definitions, owners, data types, and lineage. Think of it as a schema registry for ML features.

```yaml
# Example feature definition
name: user_purchase_count_30d
entity: user_id
type: int64
description: "Number of purchases in the last 30 days"
owner: growth-ml-team
source: transactions_table
aggregation:
  function: count
  window: 30d
  filter: "status = 'completed'"
```

### Offline Store

Stores historical feature values for training. Typically backed by a data warehouse (BigQuery, Snowflake, Delta Lake). Supports point-in-time lookups — critical for avoiding data leakage during training.

Point-in-time correctness means: when generating training data for a prediction that happened at time T, the feature store returns only feature values that were available at time T. No future data leaks in.

### Online Store

Low-latency key-value store for serving features during inference. Backed by Redis, DynamoDB, or similar. Typical latency requirement: single-digit milliseconds for a feature vector lookup.

The offline and online stores stay synchronized through materialization jobs — batch or streaming pipelines that compute features and write them to both stores.

## When You Need a Feature Store

**You probably need one if:**
- Multiple models share the same features
- You've been bitten by training-serving skew
- Feature computation is expensive and you're recomputing redundantly
- Your team is growing and feature discovery is a problem
- You need point-in-time correct training data

**You probably don't need one if:**
- You have one model in production
- Features are simple (raw columns, no aggregations)
- Your team is 1-2 people
- Latency requirements are relaxed (batch predictions only)

## The Major Options in 2026

### Feast (Open Source)

Feast has matured into the default open-source choice. It supports multiple offline and online store backends, integrates with most ML platforms, and has a straightforward Python SDK.

```python
from feast import FeatureStore

store = FeatureStore(repo_path="feature_repo/")

# Get features for training
training_df = store.get_historical_features(
    entity_df=entity_df,  # entities + timestamps
    features=[
        "user_features:purchase_count_30d",
        "user_features:avg_order_value_90d",
        "product_features:category_popularity",
    ],
).to_df()

# Get features for serving
feature_vector = store.get_online_features(
    features=[
        "user_features:purchase_count_30d",
        "user_features:avg_order_value_90d",
    ],
    entity_rows=[{"user_id": "abc123"}],
).to_dict()
```

### Managed Solutions

- **Databricks Feature Store**: Tightly integrated with Unity Catalog and MLflow. Best if you're already on Databricks.
- **Vertex AI Feature Store**: Google Cloud native. Good for GCP-heavy stacks.
- **SageMaker Feature Store**: AWS native. Integrates with SageMaker pipelines.
- **Tecton**: Purpose-built managed feature platform. Most feature-rich but also most expensive.

### Build vs. Buy

Building a feature store from scratch is tempting and almost always a mistake. The core key-value lookup is simple; the hard parts are point-in-time correctness, materialization orchestration, monitoring, and schema evolution. Use Feast if you want control, a managed solution if you want less operational burden.

## Feature Engineering Patterns

Feature stores work best when you adopt consistent patterns for feature computation.

### Batch Features

Computed on a schedule (hourly, daily). Examples:
- User's average session length over 30 days
- Product's return rate over 90 days
- Seller's average response time this week

These are the bread and butter. Compute in your data warehouse, materialize to the online store.

### Streaming Features

Computed from real-time event streams. Examples:
- Number of page views in the last 5 minutes
- Running average of transaction amounts today
- Current cart value

Require a streaming engine (Flink, Spark Streaming) and add significant operational complexity. Only add streaming features when batch freshness isn't sufficient.

### On-Demand Features

Computed at request time from the input data. Examples:
- Time since last login (requires current timestamp)
- Distance between user location and store
- Text length of the current query

These can't be precomputed. Feature stores support them via transformation functions that run during the serving request.

## Avoiding Common Pitfalls

### Pitfall 1: Ignoring Point-in-Time Correctness

The most dangerous mistake. If your training data includes feature values from after the prediction timestamp, your model will perform unrealistically well in backtesting and poorly in production. Always use point-in-time joins.

### Pitfall 2: Over-Engineering Early

Start with batch features in a simple offline store. Add streaming features only when you have evidence that fresher features improve predictions. Many teams add a streaming pipeline, discover it doesn't help, and are stuck maintaining it.

### Pitfall 3: Feature Explosion

Just because you can compute 10,000 features doesn't mean you should. Each feature has a maintenance cost. Start with a small, well-understood feature set and add features based on measured model improvement.

### Pitfall 4: Missing Monitoring

Feature distributions drift. A feature store should include monitoring for:
- Distribution shift (KL divergence, PSI)
- Missing value rates
- Latency of online serving
- Freshness of materialized features

## A Minimal Production Setup

If you're starting fresh, here's a practical path:

1. **Week 1**: Set up Feast with your data warehouse as the offline store and Redis as the online store
2. **Week 2**: Define your first feature service — the features for your most important model
3. **Week 3**: Migrate your training pipeline to pull features from the offline store
4. **Week 4**: Migrate your serving pipeline to pull features from the online store
5. **Ongoing**: Add features incrementally, monitor distributions, expand to additional models

## The Bigger Picture

Feature stores are one piece of the MLOps puzzle, but they're a foundational one. They enforce discipline: features are versioned, documented, tested, and shared. They prevent the most common production ML failure mode — your model seeing different data in production than in training.

If you're running more than a couple of models in production, a feature store isn't optional. It's infrastructure.
