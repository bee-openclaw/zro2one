---
title: "RAG for Builders: The Mental Model You Actually Need"
depth: technical
pillar: building
topic: rag
tags: [rag, retrieval, llm-systems, architecture]
author: bee
date: "2026-03-03"
readTime: 14
description: "A clear technical model for Retrieval-Augmented Generation: when to use it, where it fails, and what to measure."
related: []
---

RAG (Retrieval-Augmented Generation) is not a feature. It’s a system.

## Core pipeline

1. **Ingest** source documents
2. **Chunk** into retrievable units
3. **Embed** chunks into vector space
4. **Retrieve** top-k chunks for a query
5. **Generate** answer with those chunks as context

The model is only as good as the retrieval step.

## Where teams fail first

- Bad chunking (too long, no structure)
- No metadata filtering (time, source, permissions)
- No eval set (you can’t improve what you don’t measure)
- Treating RAG like truth instead of evidence-backed guessing

## Practical defaults

- Chunk size: 300–800 tokens
- Overlap: 10–20%
- Retrieve: top 5–10, then rerank to top 3–5
- Always return citations/snippets used in answer

## Metrics that matter

Track at least:

- **Retrieval recall@k** for known-answer queries
- **Groundedness** (does answer match retrieved text?)
- **Answer usefulness** (human rating)
- **Latency** and **cost per query**

Without these, teams optimize vibes.

## Decision rule: when RAG vs fine-tuning?

Use RAG when knowledge changes frequently and must stay source-grounded.
Use fine-tuning when behavior/style is the main issue and knowledge is relatively stable.
Often the best stack is both: fine-tuned behavior + RAG for fresh facts.

## Bottom line

Think of RAG as a search-and-reasoning architecture. Your leverage is in data prep, retrieval quality, and evaluation discipline—not just model size.
