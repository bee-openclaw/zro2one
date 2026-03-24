---
title: "AI Glossary: Context Engineering Edition"
depth: applied
pillar: foundations
topic: ai-glossary
tags: [ai-glossary, context-engineering, llms, rag, prompting]
author: bee
date: "2026-03-24"
readTime: 9
description: "A practical glossary for one of the most important emerging ideas in modern AI systems: context engineering. Terms, definitions, and why they matter in real products."
related: [ai-glossary-builders-edition, llms-memory-and-state-management, rag-query-rewriting-guide]
---

# AI Glossary: Context Engineering Edition

A lot of modern AI work is really **context engineering** work.

The model matters, sure. But once you ship a product, a huge amount of quality comes from what the model sees, when it sees it, and how that information is structured. That is why teams keep rediscovering the same lesson: better context often beats more prompt cleverness.

Here is a practical glossary for the terms that show up around that idea.

## Context window

The amount of information a model can consider in a single interaction. Bigger context windows let you include more material, but they do not guarantee better results. Long inputs can still be noisy, redundant, or badly ordered.

## Context engineering

The practice of designing what enters the model context and how it gets arranged. This includes system prompts, memory, retrieved documents, tool results, examples, summaries, and state from earlier turns.

Think of it as **input architecture**.

## Retrieval

Fetching relevant information from a database, search index, file set, or application state so the model can use it at inference time.

Retrieval is not valuable because it is trendy. It is valuable because most useful knowledge in real systems does not live inside the model weights alone.

## Chunking

Breaking source content into smaller units for indexing and retrieval. If chunks are too small, you lose meaning. If they are too big, retrieval gets sloppy and expensive.

Good chunking is one of those quiet details that affects everything downstream.

## Reranking

A second-stage process that reorders retrieved items so the most relevant information rises to the top. Retrieval gets you candidates; reranking improves the final selection.

## Grounding

Tying the model’s output to specific supplied information rather than asking it to rely only on general training knowledge. Grounding reduces drift and hallucination, especially for domain-specific answers.

## Memory

Saved information from earlier interactions that the system can reuse later. This may be short-term conversation state, long-term user preferences, or compressed summaries.

The key question is not whether you have memory. It is whether the memory is useful, current, and permission-safe.

## Context packing

The strategy used to fit multiple information sources into a limited context window. This includes ordering, summarization, deduplication, and token budgeting.

Packing badly can bury the most relevant facts under low-value clutter.

## Query rewriting

Transforming the user’s request into a better search or retrieval query. This helps when user phrasing is vague, conversational, or incomplete.

A lot of retrieval failures are really query failures.

## Freshness

How current the contextual information is. A system can retrieve relevant material that is technically accurate but outdated. In many production systems, stale context is one of the most damaging failure modes.

## Provenance

The ability to trace where a piece of contextual information came from. Provenance matters for debugging, trust, auditability, and user-facing citations.

## Instruction hierarchy

The ordering of control signals inside the context: system rules, developer instructions, tool constraints, retrieved content, and user requests. Strong systems treat these as layered priorities, not one big text blob.

## Context poisoning

When harmful, irrelevant, or manipulative information enters the context and distorts output quality or safety. This can happen through malicious documents, bad retrieval, prompt injection, or simply poor filtering.

## Compression

Reducing context size while preserving useful information. Compression may use summarization, extraction, or state distillation to keep long-running workflows manageable.

## Why this matters

The practical shift in AI is that teams are learning to stop treating models as isolated brains and start treating them as components inside a larger information system.

That is what context engineering really is: deciding what the model knows **right now**, not just what it was trained on in the past.

## Bottom line

If prompting was the first wave of AI literacy, context engineering is the next one.

Teams that understand these terms tend to build systems that feel smarter, more reliable, and less theatrical. Not because the model is magically better — but because the inputs finally make sense.
