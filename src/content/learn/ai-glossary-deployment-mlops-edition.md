---
title: "AI Glossary: Deployment and MLOps Edition"
depth: essential
pillar: practice
topic: ai-glossary
tags: [ai-glossary, mlops, deployment, production, infrastructure]
author: bee
date: "2026-03-16"
readTime: 8
description: "Key terms for deploying and operating AI systems in production — from A/B testing to zero-downtime deployments."
related: [ai-glossary-practitioners-edition, ai-glossary-data-engineering, machine-learning-monitoring-playbook-2026]
---

# AI Glossary: Deployment and MLOps Edition

Getting a model from notebook to production involves its own vocabulary. This glossary covers the terms you'll encounter when deploying, monitoring, and maintaining AI systems at scale.

## A

**A/B Testing (Model)**: Running two model versions simultaneously on different user segments to compare real-world performance. Unlike offline evaluation, A/B tests capture effects on user behavior, latency, and business metrics.

**Artifact**: Any versioned output of the ML pipeline — trained model weights, feature transformers, configuration files, evaluation reports. Artifact stores (MLflow, Weights & Biases) track these with metadata and lineage.

**Auto-scaling**: Automatically adjusting compute resources based on demand. For ML serving, this means adding GPU instances during traffic spikes and removing them during quiet periods. Key challenge: GPU cold-start times are longer than CPU.

## B

**Batch Inference**: Running predictions on a large dataset at once, typically on a schedule. Contrast with real-time inference. Common for recommendation systems, risk scoring, and report generation.

**Blue-Green Deployment**: Running two identical production environments. Deploy the new model to the inactive environment, test it, then switch traffic. Enables instant rollback by switching back.

**Build Reproducibility**: The ability to recreate an exact model from its source code, data, and configuration. Requires pinned dependencies, versioned data, and deterministic training (or close to it).

## C

**Canary Deployment**: Rolling out a new model to a small percentage of traffic first (the "canary"), monitoring for problems, then gradually increasing. Limits blast radius of bad deployments.

**CI/CD for ML**: Continuous integration and deployment adapted for machine learning. Includes model training validation, data validation, model quality gates, and automated deployment pipelines. Tools: GitHub Actions + custom steps, Argo Workflows, Kubeflow Pipelines.

**Cold Start**: The delay when a model serving instance starts up — loading weights into GPU memory, warming caches. For large models, this can take 30-120 seconds. Mitigations: keep warm instances, use smaller models for initial responses.

**Concept Drift**: When the relationship between inputs and outputs changes over time. Example: a fraud model trained on pre-pandemic data may not recognize pandemic-era fraud patterns. Requires monitoring and periodic retraining.

**Containerization**: Packaging a model with its dependencies into a container (Docker) for consistent deployment. Standard practice — eliminates "works on my machine" problems.

## D

**Data Drift**: When the distribution of input data changes from what the model was trained on. Different from concept drift — the inputs change, not the relationship. Example: a model trained on English text receiving increasing amounts of Spanish text.

**Data Pipeline**: The automated flow of data from sources through transformations to the feature store or model training. Tools: Airflow, Dagster, Prefect, dbt.

**Data Versioning**: Tracking changes to training and evaluation datasets over time. Tools: DVC, LakeFS, Delta Lake. Essential for reproducibility and debugging.

## E

**Edge Deployment**: Running models on edge devices (phones, IoT, embedded systems) rather than cloud servers. Constraints: limited memory, compute, and power. Requires model compression, quantization, or purpose-built small models.

**Endpoint**: A URL that accepts inference requests and returns predictions. The standard interface for serving models. REST and gRPC are the common protocols.

**Experiment Tracking**: Recording the parameters, metrics, and artifacts of each training run. Essential for understanding what works and reproducing results. Tools: MLflow, Weights & Biases, Neptune.

## F

**Feature Store**: A centralized system for computing, storing, and serving ML features. Ensures consistency between training and serving. See our [full guide on feature stores](/learn/machine-learning-feature-stores-in-production).

**Fine-tuning (Production)**: Adapting a pre-trained model on domain-specific data. In a production context, this includes versioning the fine-tuned model, evaluating against the base model, and managing the fine-tuning pipeline.

## G

**GPU Utilization**: The percentage of GPU compute capacity actually being used. Low utilization (common in serving) means you're paying for idle compute. Batching requests and right-sizing instances improve utilization.

**Guardrails**: Runtime checks on model inputs and outputs to prevent harmful, off-topic, or policy-violating responses. Especially important for LLM deployments. Can be rule-based, model-based, or hybrid.

## I

**Inference Optimization**: Techniques to make model predictions faster and cheaper. Includes quantization, pruning, distillation, batching, caching, and hardware-specific compilation (TensorRT, ONNX Runtime).

**Infrastructure as Code (IaC)**: Defining ML infrastructure (compute, storage, networking) in code files rather than manual configuration. Tools: Terraform, Pulumi, CloudFormation. Enables reproducible environments.

## L

**Latency (P50/P95/P99)**: Prediction response time at various percentiles. P50 is the median; P99 is the slowest 1% of requests. SLAs are typically defined at P95 or P99. For real-time serving, targets are often <100ms P95.

**Load Testing**: Simulating production traffic to verify that model serving infrastructure handles expected load. Tools: Locust, k6, Vegeta. Test before deploying, not after.

## M

**MLOps**: The practice of deploying and maintaining ML models in production reliably and efficiently. Combines ML, DevOps, and data engineering. Not a tool — a discipline.

**Model Card**: Documentation describing a model's intended use, limitations, evaluation results, training data, and ethical considerations. Increasingly required by regulation (EU AI Act).

**Model Registry**: A central catalog of trained models with versioning, stage tracking (staging → production → archived), and metadata. The ML equivalent of a container registry. Tools: MLflow Model Registry, Vertex AI Model Registry.

**Model Serving**: The infrastructure that makes a trained model available for predictions. Options range from simple Flask APIs to dedicated frameworks (Triton, vLLM, TorchServe) to managed services.

**Monitoring (ML)**: Tracking model performance, data quality, and system health in production. Beyond standard DevOps monitoring, ML monitoring includes prediction distribution, feature drift, and business metric correlation.

## O

**Observability**: The ability to understand the internal state of your ML system from its external outputs. Combines logging, metrics, and tracing. For ML: includes feature values, model confidence, and decision explanations.

**ONNX**: Open Neural Network Exchange — a standard format for representing ML models. Enables training in one framework (PyTorch) and deploying in another (ONNX Runtime). Good for cross-platform deployment.

## P

**Pipeline Orchestration**: Coordinating the steps of an ML workflow — data ingestion, feature computation, training, evaluation, deployment. Tools: Airflow, Dagster, Kubeflow Pipelines, Prefect.

**Production Readiness Review**: A checklist-based review before deploying a model. Covers: offline evaluation, online evaluation plan, monitoring setup, rollback plan, documentation, and compliance review.

## R

**Rollback**: Reverting to a previous model version when the new one underperforms. Requires model versioning and deployment infrastructure that supports instant switches (blue-green, canary).

**Real-time Inference**: Generating predictions on-demand for individual requests, typically with latency requirements under 100ms. Contrast with batch inference.

## S

**Shadow Deployment**: Running a new model in production alongside the current one, but not serving its predictions to users. Used to evaluate real-world performance without risk. The shadow model's predictions are logged for comparison.

**SLA (Service Level Agreement)**: Commitments on availability, latency, and throughput for model serving. Example: "99.9% uptime, P95 latency < 200ms, 1000 requests/second."

**Streaming Inference**: Processing a continuous stream of data in real-time. Used for event-driven applications like fraud detection, anomaly detection, and real-time personalization.

## T

**Technical Debt (ML)**: Hidden costs that accumulate in ML systems over time. Sources: unused features, undocumented models, hardcoded thresholds, tangled pipelines, dead experimental code. Harder to identify than traditional software debt.

**Training-Serving Skew**: Differences between the data or computation a model sees during training vs. serving. The most common source of silent model degradation in production.

## Z

**Zero-Downtime Deployment**: Deploying a new model version without any service interruption. Achieved through blue-green deployments, rolling updates, or canary releases. Table stakes for production ML serving.

---

*Terms missing from this list? Each edition of the glossary covers a different domain. Check the [beginner glossary](/learn/ai-glossary-beginner) for foundational terms and the [data engineering glossary](/learn/ai-glossary-data-engineering) for data infrastructure terminology.*
