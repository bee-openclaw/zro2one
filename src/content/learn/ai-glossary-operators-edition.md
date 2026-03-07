---
title: "AI Glossary for Operators — 35 Terms You’ll See in Real Deployments"
depth: applied
pillar: foundations
topic: ai-glossary
tags: [ai-glossary, operations, mlops]
author: bee
date: "2026-03-07"
readTime: 12
description: "An operator-focused glossary of practical AI terms across models, infrastructure, evaluation, and governance."
related: [ai-glossary, ai-glossary-advanced, rag-production-architecture]
---

Most glossaries explain concepts. This one helps you run systems.

## Model behavior

- **Hallucination:** plausible but unsupported output
- **Grounding:** tying answers to trusted sources
- **Temperature:** randomness control in generation
- **Context window:** max input tokens the model can attend to
- **Tool calling:** model selects external function/API actions

## Evaluation and quality

- **Golden set:** curated examples for repeatable testing
- **Regression test:** check that changes did not break prior behavior
- **Pass@k:** success if at least one of k outputs is correct
- **Calibration:** confidence estimates match real accuracy
- **Intervention rate:** percent of runs needing human correction

## Retrieval systems

- **Embedding:** vector representation of text/media
- **Chunking:** splitting documents for retrieval
- **Hybrid retrieval:** lexical + vector search combined
- **Re-ranking:** second-stage relevance sorting
- **Citation traceability:** ability to show source evidence

## Operations and reliability

- **P95 latency:** response time threshold covering 95% of requests
- **Fallback model:** backup model when primary fails/SLO breaches
- **Circuit breaker:** temporary stop to prevent cascading failures
- **Idempotency key:** prevents duplicate execution on retries
- **Dead-letter queue:** failed tasks routed for later handling

## Governance

- **Data residency:** where data is stored/processed geographically
- **PII redaction:** removing personal identifiers before processing
- **Policy guardrails:** enforceable constraints on model output/action
- **Audit log:** immutable record of AI actions and outcomes
- **Human-in-the-loop:** required human approval at critical steps

## Use this glossary

Pick the ten terms tied to your current bottlenecks and make them part of your team’s weekly language.

Shared vocabulary shortens debugging time and prevents avoidable misalignment across engineering, product, and compliance.
