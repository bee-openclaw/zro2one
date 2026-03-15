---
title: "AI Glossary: The Data Engineering Edition"
depth: essential
pillar: reference
topic: ai-glossary
tags: [ai-glossary, data-engineering, data-pipelines, feature-stores, mlops]
author: "bee"
date: "2026-03-14"
readTime: 6
description: "Essential data engineering terminology for AI practitioners—covering data pipelines, feature stores, data quality, orchestration, and the infrastructure that makes machine learning work."
related: [ai-glossary-builders-edition, ai-glossary-practitioners-edition, machine-learning-feature-engineering]
---

## Why Data Engineering Vocabulary Matters

Every ML project is a data project first. Models are only as good as the data flowing into them, and data engineering is the discipline that makes that flow reliable, fast, and trustworthy. Whether you're building pipelines, debugging data quality issues, or evaluating MLOps platforms, this vocabulary is essential.

## Data Pipeline Fundamentals

### ETL (Extract, Transform, Load)

The classic pattern: pull data from source systems, transform it (clean, aggregate, join), and load it into a destination (data warehouse, feature store). Still the backbone of most data infrastructure.

### ELT (Extract, Load, Transform)

The modern inversion: load raw data into a warehouse first, then transform it in place using the warehouse's compute power. Popular with cloud warehouses (BigQuery, Snowflake, Databricks) that have cheap storage and powerful SQL engines.

### Batch Processing

Processing data in discrete chunks on a schedule (hourly, daily). Good for analytics, reporting, and training data preparation. Tools: Apache Spark, dbt, Airflow-triggered jobs.

### Stream Processing

Processing data continuously as it arrives. Essential for real-time features, fraud detection, and live dashboards. Tools: Apache Kafka, Apache Flink, Apache Pulsar, Spark Structured Streaming.

### Micro-Batch

A compromise: process data in very small batches (seconds to minutes). Spark Streaming originally worked this way. Provides near-real-time semantics with batch-like simplicity.

### CDC (Change Data Capture)

Capturing changes to a database (inserts, updates, deletes) as a stream of events. Used to keep data warehouses in sync with operational databases without full re-extraction. Tools: Debezium, Fivetran, Airbyte.

## Data Storage and Organization

### Data Lake

A storage system for raw, unstructured, and semi-structured data. Typically object storage (S3, GCS, Azure Blob). Schema-on-read: you define structure when you query, not when you store.

### Data Lakehouse

Combines data lake flexibility with data warehouse features (ACID transactions, schema enforcement, indexing). Implementations: Delta Lake, Apache Iceberg, Apache Hudi.

### Data Warehouse

Structured, schema-enforced storage optimized for analytical queries. Columnar storage formats for fast aggregations. Examples: Snowflake, BigQuery, Redshift, Databricks SQL.

### Data Catalog

A metadata management system that helps you find, understand, and trust your data. Tracks table schemas, ownership, lineage, freshness, and quality. Tools: DataHub, Amundsen, Atlan, Alation.

### Data Lineage

Tracking how data flows from source to destination through all transformations. Essential for debugging data quality issues ("where did this wrong value come from?") and compliance ("can we prove this data wasn't used for training?").

## Feature Engineering and Stores

### Feature

A measurable property of the data used as input to a model. Can be raw (user age) or derived (average purchases per month over the last 90 days).

### Feature Store

A centralized system for computing, storing, and serving features to models. Solves the training-serving skew problem by ensuring the same feature computation logic is used in both contexts. Tools: Feast, Tecton, Hopsworks, SageMaker Feature Store.

### Training-Serving Skew

When features are computed differently during training versus inference, leading to degraded model performance in production. A feature store's primary purpose is eliminating this.

### Feature Engineering

The process of creating useful features from raw data. Includes aggregations, ratios, time-windowed statistics, embeddings, and domain-specific transformations. Often the highest-leverage activity in an ML project.

### Online Features

Features served in real-time for inference (low-latency reads, typically from a key-value store). Example: a user's current session length for a recommendation model.

### Offline Features

Features computed in batch for training and batch inference. Stored in a data warehouse or file system. Example: a user's average monthly spend over the past year.

## Data Quality

### Data Drift

When the statistical distribution of input data changes over time. A model trained on last year's data may underperform on this year's data if user behavior has shifted.

### Schema Drift

When the structure of data changes unexpectedly—new columns appear, types change, columns disappear. Can silently break pipelines.

### Data Validation

Automated checks that data meets expected properties: types, ranges, completeness, uniqueness, referential integrity. Tools: Great Expectations, Soda, dbt tests, Pandera.

### Data Contract

A formal agreement between data producers and consumers about the schema, semantics, and quality expectations of a dataset. Increasingly popular as a way to prevent breaking changes.

### Freshness

How recently the data was updated. A feature store serving day-old data for a real-time fraud detection model is a freshness problem.

### Completeness

The proportion of non-null values in a dataset. Missing data can bias models or cause pipeline failures.

### Idempotency

A pipeline operation is idempotent if running it multiple times produces the same result as running it once. Essential for reliable data pipelines that may need to retry or re-run.

## Orchestration and Infrastructure

### DAG (Directed Acyclic Graph)

The standard representation for data pipeline dependencies. Each node is a task; edges represent dependencies. Tools like Airflow, Dagster, and Prefect orchestrate DAGs.

### Airflow

Apache Airflow: the most widely-used pipeline orchestrator. Define DAGs in Python, schedule them, monitor execution. Battle-tested but can be complex to operate.

### Dagster

A modern orchestrator emphasizing software engineering practices: type-checked I/O, asset-based thinking, integrated testing. Growing rapidly as an Airflow alternative.

### Prefect

Another modern orchestrator focused on simplicity and dynamic workflows. Hybrid deployment model (local execution, cloud orchestration).

### dbt (data build tool)

Transforms data inside your warehouse using SQL. Version-controlled, tested, documented. Has become the standard for analytics engineering and is increasingly used for ML feature pipelines.

### Containerization

Packaging code and dependencies into isolated containers (Docker) for reproducible execution. Standard practice for ML pipelines to avoid "works on my machine" problems.

## MLOps-Specific Terms

### Model Registry

A versioned catalog of trained models with metadata (training data, hyperparameters, metrics, lineage). Tools: MLflow, Weights & Biases, Vertex AI Model Registry.

### Experiment Tracking

Logging hyperparameters, metrics, artifacts, and code versions for every training run. Essential for reproducibility and comparison. Tools: MLflow, W&B, Neptune, CometML.

### CI/CD for ML

Continuous integration and deployment applied to ML: automated testing of data quality, model performance, and pipeline correctness before promoting changes to production.

### Shadow Deployment

Running a new model in production alongside the current model, logging predictions without serving them to users. Lets you evaluate real-world performance without risk.

### A/B Testing

Serving different models (or model versions) to different user segments and measuring business outcomes. The gold standard for evaluating model changes in production.

### Canary Deployment

Rolling out a new model to a small percentage of traffic first, monitoring for regressions, then gradually increasing. Reduces blast radius of bad deployments.

## Quick Reference: When You'll Encounter These

- **Building your first pipeline**: ETL/ELT, DAG, orchestration, data validation
- **Deploying a model**: Feature store, online/offline features, training-serving skew
- **Debugging production issues**: Data drift, lineage, freshness, schema drift
- **Scaling up**: Stream processing, CDC, lakehouse, containerization
- **Operating responsibly**: Data contracts, experiment tracking, model registry, A/B testing

Data engineering isn't glamorous, but it's where most ML projects succeed or fail. Learn the vocabulary, and you'll be able to diagnose problems, evaluate tools, and communicate with the engineers who keep your models running.
