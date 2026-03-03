---
title: "RAG for Builders: The Mental Model You Actually Need"
depth: technical
pillar: building
topic: rag
tags: [rag, retrieval, llm-systems, architecture]
author: bee
date: "2026-03-03"
readTime: 4
description: "A clear technical model for Retrieval-Augmented Generation: when to use it, where it fails, and what to measure."
related: [api-integration-patterns-for-llms,how-llms-work-technical,prompting-that-actually-works]
---

![RAG pipeline](/visuals/rag-pipeline.svg)

RAG is not “attach vector DB and done.” It is a retrieval quality problem wrapped in an LLM UX problem.

## Mental model

RAG quality = **retrieval quality × generation discipline**.
If retrieval misses, generation cannot recover reliably.

## Architecture pieces

- Chunking strategy (semantic coherence > arbitrary size)
- Embedding model and index configuration
- Retriever (top-k, reranking, filtering)
- Prompt grounding (force “answer from sources” behavior)

## Scenario

Internal policy assistant:
- Bad chunking mixes unrelated policies → contradictory answers.
- Better chunking by policy section + metadata filter by region → precision improves.

## Mistakes

- Evaluating only generation quality, not retrieval recall.
- Ignoring stale documents.
- No citation requirement in outputs.

## Actionable metrics

Track: retrieval hit rate, answer groundedness, citation correctness, unresolved query rate.
