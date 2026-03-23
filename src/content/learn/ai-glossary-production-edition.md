---
title: "AI Glossary: Production & Operations Edition"
depth: applied
pillar: foundations
topic: ai-glossary
tags: [ai-glossary, production, mlops, terminology]
author: bee
date: "2026-03-23"
readTime: 8
description: "Essential terminology for running AI systems in production — from model serving and feature stores to observability, canary deployments, and shadow mode, explained for practitioners."
related: [ai-glossary-deployment-mlops-edition, ai-glossary-enterprise-edition, machine-learning-monitoring-playbook-2026]
---

# AI Glossary: Production & Operations Edition

Getting a model to work in a notebook is one thing. Running it reliably in production is another discipline entirely. This glossary covers the terms you'll encounter when deploying, monitoring, and maintaining AI systems at scale.

## Serving and Deployment

**Model serving** — the infrastructure that takes a trained model and makes it available to handle requests. Includes loading the model into memory, preprocessing inputs, running inference, and returning results. Think of it as the "web server" for your model.

**Inference** — using a trained model to make predictions on new data. Contrasted with training (learning from data). In production, inference is what happens every time a user sends a request.

**Batch inference** — processing a large set of inputs at once, typically on a schedule. "Score all customers every night." Cheaper per-prediction than real-time, but results are stale until the next batch runs.

**Online inference (real-time)** — processing individual requests as they arrive, with low-latency requirements. "Score this transaction for fraud right now." More expensive but always fresh.

**Model registry** — a versioned repository for trained models, like Git for code. Stores model artifacts, metadata, training parameters, and performance metrics. Enables reproducibility and rollback.

**Canary deployment** — rolling out a new model to a small percentage of traffic (e.g., 5%) while the old model serves the rest. Monitor for regressions before increasing traffic. Named after the canary in a coal mine.

**Shadow mode (dark launch)** — running a new model in parallel with the production model. Both process every request, but only the production model's output is shown to users. Compare outputs offline to validate the new model before switching.

**Blue-green deployment** — maintaining two identical production environments. Deploy the new model to the idle environment, test it, then switch traffic. If something goes wrong, switch back instantly.

**A/B testing** — splitting traffic between two models to measure which performs better on business metrics. Unlike canary (which validates safety), A/B tests measure which model is *better* by a specific metric.

## Feature Engineering

**Feature** — an input variable used by a model to make predictions. "User's age," "number of transactions in the last hour," "average order value." Good features are the difference between a mediocre model and a great one.

**Feature store** — a centralized system for defining, computing, storing, and serving features. Ensures the same feature calculations are used in training and serving (avoiding training-serving skew). Examples: Feast, Tecton, Databricks Feature Store.

**Feature pipeline** — the code that transforms raw data into features. "Count the number of logins in the past 7 days" is a feature pipeline. These run on a schedule (batch) or in real-time (streaming).

**Training-serving skew** — when the features a model sees in production differ from what it saw during training, even subtly. Maybe training used a pandas calculation and serving uses a SQL query, and they handle nulls differently. This is one of the most common (and hardest to debug) production ML bugs.

**Point-in-time correctness** — ensuring that when you compute features for training, you only use data that was available at the time of each training example. Using future data (even accidentally) creates data leakage and inflates training metrics.

## Monitoring and Observability

**Data drift** — when the distribution of input data changes over time compared to the training data. Users start behaving differently, seasonal patterns shift, or new data sources are added. Models trained on old distributions may perform poorly on new data.

**Concept drift** — when the relationship between inputs and outputs changes. Even if the data looks the same, what constitutes "fraud" or "spam" evolves. The model's learned patterns become stale.

**Model drift** — general term covering data drift, concept drift, and performance degradation over time. All models drift. The question is how fast and whether you detect it.

**Prediction monitoring** — tracking model outputs in production. Distribution of predicted classes, confidence scores, response times. Alerts when patterns change unexpectedly.

**Ground truth delay** — the time between a prediction and when you learn the correct answer. Fraud detection might take weeks (until the customer reports it). This delay makes monitoring harder — you can't immediately know if the model is wrong.

**Observability** — the ability to understand what's happening inside your AI system from its external outputs. Goes beyond monitoring (which tracks known metrics) to enable investigating unknown problems. Includes logging, tracing, and metrics.

## Reliability

**Fallback** — a simpler model or rule-based system that handles requests when the primary model is unavailable. "If the ML model times out, use a rules-based scorer." Essential for production reliability.

**Circuit breaker** — a pattern that automatically stops sending requests to a failing model and falls back to an alternative. After a cooldown period, it tries the primary model again. Prevents cascading failures.

**Rate limiting** — controlling how many requests a model serves per unit time. Prevents overload, manages costs, and ensures fair resource allocation across users.

**Graceful degradation** — designing the system to provide reduced functionality (rather than complete failure) when components fail. If the recommendation model is down, show popular items instead of personalized ones.

**Idempotency** — ensuring that processing the same request multiple times produces the same result. Important for retry logic — if a request times out and is retried, you don't want double-processing.

## Cost and Efficiency

**Token** — the basic unit of text processing for LLMs. Words are split into tokens (roughly 0.75 words per token for English). You're billed per token for both input and output.

**GPU utilization** — the percentage of GPU compute capacity being used. Low utilization (< 50%) means you're paying for compute you're not using. Batching requests improves utilization.

**Quantization** — reducing model precision (e.g., from 32-bit to 8-bit numbers) to reduce memory usage and speed up inference. Some accuracy loss, significant efficiency gain.

**Distillation** — training a smaller "student" model to mimic a larger "teacher" model. The student runs faster and cheaper while retaining most of the teacher's capability.

**Caching** — storing model outputs for repeated inputs. If 1000 users ask "what's the capital of France," compute the answer once and serve from cache. Obvious but often overlooked.

## Pipeline Operations

**DAG (Directed Acyclic Graph)** — the structure of a data/ML pipeline where tasks have dependencies but no circular references. Task B depends on Task A; Task C depends on Tasks A and B. Tools like Airflow, Dagster, and Prefect orchestrate DAGs.

**Orchestration** — coordinating the execution of multiple pipeline steps: data extraction, feature computation, model training, evaluation, deployment. The "conductor" of your ML pipeline.

**Lineage** — tracking the provenance of data and models. "This prediction was made by model v2.3, trained on dataset X, with features computed by pipeline Y." Essential for debugging and compliance.

**Reproducibility** — the ability to recreate any model, prediction, or result given the same inputs. Requires versioning data, code, configuration, and environment. Harder than it sounds.

## Quick Reference

| Term | One-Line Definition |
|------|-------------------|
| Model serving | Infrastructure that runs model inference for requests |
| Feature store | Central system for computing and serving model inputs |
| Training-serving skew | Features differ between training and production |
| Data drift | Input data distribution changes over time |
| Shadow mode | Run new model in parallel, compare without user impact |
| Circuit breaker | Auto-stop sending to failing model, use fallback |
| Quantization | Reduce model precision for speed/efficiency |
| Lineage | Track provenance of data and model artifacts |

These terms are the vocabulary of production AI. Knowing them won't make your models better — but it'll make your systems more reliable, your debugging faster, and your conversations with platform teams more productive.
