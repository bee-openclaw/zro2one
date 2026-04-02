---
title: "RAG Freshness and Reindexing: How to Keep Retrieval Useful After the Docs Change"
depth: technical
pillar: building
topic: rag
tags: [rag, retrieval, indexing, freshness, search]
author: bee
date: "2026-04-02"
readTime: 10
description: "A RAG system is only as current as its index. This guide covers freshness strategy, reindexing triggers, and the operational tradeoffs behind keeping retrieval up to date."
related: [rag-metadata-filtering-guide, rag-query-rewriting-guide, rag-for-builders-mental-model]
---

A lot of RAG systems are evaluated like static software and operated like static software. That is a mistake.

Your documents change. Policies change. Product pages change. Pricing changes. If the retrieval index lags behind reality, the system can stay semantically impressive while becoming operationally wrong.

This is the freshness problem.

## Why freshness matters

Users do not care that your retrieval stack found a relevant chunk. They care that it found the **current** chunk.

An outdated answer with excellent semantic similarity is still a bad answer. In many production systems, freshness is as important as relevance.

## What reindexing actually includes

Reindexing is not only "rerun embeddings."

It can include:

- detecting source changes
- re-chunking updated documents
- recalculating embeddings
- refreshing metadata
- removing or archiving old chunks
- rebuilding search or reranking structures

The right design depends on how dynamic the corpus is.

## Trigger models

### Scheduled reindexing

Simple and dependable. Run daily, hourly, or weekly based on how often the corpus changes.

Good for stable documentation sets. Weak for high-change environments where users expect same-day accuracy.

### Event-driven reindexing

Trigger updates whenever the source changes: a CMS publish event, a database write, a file upload, or a repo merge.

This gives better freshness but requires stronger operational discipline because partial failures are now easier to create.

### Hybrid models

Many teams should use both:

- event-driven updates for urgent change paths
- scheduled backfills to catch anything missed

That gives you speed without trusting every integration perfectly.

## Freshness is also a ranking problem

Even after reindexing, newer content may need ranking preference.

If a system retrieves an old FAQ and a new policy page as equally relevant, date or source authority should influence the result. This is where metadata matters. Freshness should be visible to the ranker, not only to the storage layer.

## The operational hazards

The first hazard is duplicate chunks from old and new versions coexisting with no versioning discipline.

The second is partial updates, where metadata changes but embeddings do not, or the vector store updates before the search index does.

The third is weak invalidation. If caches keep serving stale retrieval results after the index changes, the user still experiences old knowledge.

## A sane operating model

For most teams:

1. attach version and timestamp metadata to every chunk
2. define which sources are authoritative
3. trigger reindexing on important source updates
4. run scheduled reconciliation jobs
5. measure freshness failures explicitly

That fifth step matters. Many teams track relevance and forget to measure stale-answer incidents.

## What to measure

Track:

- time from source update to index availability
- stale-answer rate on known changed documents
- duplicate version collisions
- retrieval share by source type and age

These metrics tell you whether the index is keeping pace with the business.

## Bottom line

RAG is not maintained when the prompt looks good. It is maintained when the index reflects the current world.

If your knowledge changes, freshness strategy is core infrastructure, not maintenance trivia. Systems that ignore this usually work right up until the moment they become confidently obsolete.
