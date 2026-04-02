---
title: "AI Glossary: Context Packing Edition"
depth: applied
pillar: building
topic: ai-glossary
tags: [ai-glossary, context-packing, rag, prompting, llm-systems]
author: bee
date: "2026-04-02"
readTime: 8
description: "A practical glossary for the terms that matter when you are fitting evidence, instructions, and tool results into a limited context budget."
related: [ai-glossary-context-engineering-edition, prompting-context-window-management-guide, llm-api-structured-outputs-guide]
---

Packing context is one of the most practical problems in modern AI systems. You rarely have unlimited room, and even when you do, more context is not automatically better context.

This glossary focuses on the terms that matter when the real job is deciding what gets included, what gets cut, and what gets reordered.

## Context packing

The process of selecting, ordering, and compressing information so the most useful material fits inside the model context budget.

## Token budget

The amount of space available for instructions, retrieved evidence, examples, tool outputs, and the model's own response. Every extra document competes with everything else.

## Salience

How important a piece of information is for the current task. Salient content should survive the cut when less important context has to go.

## Redundancy

Repeated or overlapping information that consumes context without adding much new value. Some redundancy is useful for robustness; too much crowds out better evidence.

## Compression

Reducing context size while preserving the parts that matter. Compression can be summarization, extraction, field selection, or deduplication.

## Ordering

The sequence in which context appears. Ordering matters because models do not treat all positions equally, especially in long prompts.

## Lost in the middle

A failure mode where important information placed in the middle of a long context receives less attention than material near the beginning or end.

## Evidence density

How much actionable information a chunk contains relative to its token count. High-density context is usually more valuable than long, fluffy context.

## Metadata filtering

Using structured attributes like source type, recency, customer tier, permissions, or product version to narrow context before semantic ranking.

## Instruction payload

The part of the context devoted to rules, format requirements, or system behavior. Good instruction payloads are specific enough to guide the model without crowding out the actual evidence.

## Tool result

Structured output returned from an external function or API call. Tool results often deserve priority because they are current, task-specific, and machine-readable.

## Context collision

When two pieces of context conflict or pull the model toward incompatible conclusions. This can come from stale documents, mixed permissions, or contradictory instructions.

## Truncation risk

The chance that important information gets clipped or pushed into low-attention regions because too much other material was included first.

## Packing policy

The system rule that decides how context is assembled. This may prefer fresh sources, high-authority documents, user-specific state, or structured outputs over free-form text.

## Bottom line

Context packing is where many AI systems quietly win or lose quality. Better packing usually beats blindly stuffing more text into a larger window.

That is why the vocabulary matters. Once you can name the failure modes, you can start engineering around them.
