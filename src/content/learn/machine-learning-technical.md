---
title: "Machine Learning for Builders — Architecture, Trade-offs, and Deployment"
depth: technical
pillar: building
topic: machine-learning
tags: [machine-learning, ml-systems, engineering]
author: bee
date: "2026-03-03"
readTime: 18
description: "A technical deep dive into the ML system lifecycle: data design, training, evaluation, serving, and reliability."
related: [machine-learning-essential, machine-learning-applied, machine-learning-research]
---

Machine learning systems fail when teams optimize only training metrics.
Production quality comes from end-to-end system design.

## 1) Problem framing

Define prediction target precisely.

- Input space \(X\)
- Target \(Y\)
- Loss function aligned to business cost
- Latency and throughput constraints

Bad framing is unrecoverable by modeling tricks.

## 2) Data pipeline design

Core requirements:

- deterministic feature generation
- clear train/validation/test temporal boundaries
- leakage prevention
- schema versioning

Recommended split strategy:

- time-aware split for temporal domains
- stratified split for imbalanced classes
- holdout set untouched until final model selection

## 3) Baseline hierarchy

Never skip baselines:

1. heuristic baseline
2. linear/tree baseline
3. boosted tree / shallow net
4. heavier architecture only if justified

Track uplift versus simplest stable baseline.

## 4) Evaluation beyond aggregate metrics

Use per-slice metrics:

- geography
- customer tier
- language
- recency bucket
- rare-event cohorts

Global AUC can hide severe subgroup regressions.

For ranking/retrieval tasks, include calibration and top-k quality metrics.

## 5) Serving architecture choices

### Batch scoring

Use when latency is not user-facing.

- lower infrastructure cost
- easier reproducibility
- ideal for nightly prioritization or risk scores

### Online inference

Use for interactive experiences.

- p95 latency budgets matter
- feature freshness matters
- cache strategy matters

Hybrid architectures are common: batch precompute + online re-rank.

## 6) Feature store or not?

You need strong online/offline parity regardless of tooling.

If team is small, start with:

- versioned feature code
- immutable training snapshots
- parity tests between offline and online transformations

Adopt full feature store when scale/teams justify complexity.

## 7) Deployment safety

Minimum deployment controls:

- canary rollout
- shadow evaluation
- automatic rollback on metric breach
- model registry with lineage

Track model artifact + data snapshot + code commit together.

## 8) Drift and retraining policy

Separate two drifts:

- **data drift:** \(P(X)\) changes
- **concept drift:** \(P(Y|X)\) changes

Triggers:

- statistical drift threshold exceeded
- business KPI degradation
- error-rate rise in critical slices

Avoid blind periodic retraining; use policy-based retraining.

## 9) LLM-era ML stacks

Even in LLM-heavy products, classical ML remains critical:

- routing
- ranking
- anomaly/fraud detection
- quality scoring
- personalization

Most robust systems combine deterministic logic + classical ML + LLM components.

## 10) Reliability checklist (copy/paste)

- [ ] leakage checks pass
- [ ] baseline comparisons documented
- [ ] per-slice eval included
- [ ] online/offline parity tested
- [ ] canary + rollback wired
- [ ] drift alerts configured
- [ ] human escalation path defined

## Final take

The best ML engineering is less about clever models, more about reliable decision systems.

If your pipeline, evaluation, and monitoring are strong, model improvements compound.
If they are weak, no architecture will save you.
