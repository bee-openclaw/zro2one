---
title: "AI Glossary: Context Windows and Retrieval Edition"
depth: applied
pillar: building
topic: ai-glossary
tags: [ai-glossary, context-engineering, rag, prompting, llm-systems]
author: bee
date: "2026-04-02"
readTime: 8
description: "A practical glossary for the context and retrieval terms that show up constantly in modern LLM systems, from chunking and grounding to reranking and provenance."
related: [ai-glossary-context-engineering-edition, prompting-context-window-management-guide, rag-query-rewriting-guide]
---

Context engineering is the part of AI work that decides **what the model sees before it answers**. That sounds simple, but most production quality issues show up here.

This glossary covers the terms that matter most.

## Context engineering

The practice of designing the information, instructions, tools, and constraints presented to a model at inference time. It includes retrieval, formatting, ordering, filtering, and budget decisions.

## Context window

The maximum amount of input and generated text a model can handle in one interaction. A larger window helps, but it does not remove the need to choose what belongs inside it.

## Retrieval

The step where a system finds potentially relevant external information before generation. In RAG, retrieval usually happens from a vector store, search index, or knowledge base.

## Grounding

Anchoring a model's answer to supplied evidence rather than relying only on model memory. Grounded answers are easier to verify and usually safer for factual tasks.

## Reranking

A second-pass scoring step used after initial retrieval. The first retrieval stage casts a wider net; reranking narrows the set to the chunks most likely to help answer the question.

## Chunking

Breaking source documents into retrievable units. Good chunks preserve a coherent idea. Bad chunks cut through definitions, examples, or instructions in ways that make retrieval weaker.

## Compression

Reducing context size while preserving useful information. This can include summarizing documents, extracting key fields, or collapsing repeated material before sending it to the model.

## Salience

How important a piece of information is for the current task. Salient context is the context that should survive the cut when the window is limited.

## Metadata filtering

Using structured attributes like source type, date, permissions, customer tier, or product version to narrow the candidate context before semantic ranking happens.

## Lost in the middle

A known failure pattern where information placed in the middle of a long context receives less attention than material near the beginning or end. Ordering still matters even with large context windows.

## Instruction hierarchy

The relative priority of system instructions, developer rules, user input, retrieved context, and tool outputs. If this hierarchy is unclear, models often follow the wrong signal.

## Tool call

A structured request from the model to an external function, API, or system action. Tool use is part of context engineering because the returned tool result becomes new context.

## Schema-constrained output

Output shaped to a predefined structure such as JSON, XML, or typed fields. This reduces ambiguity and makes downstream systems easier to trust.

## Freshness

How current the provided context is. A semantically relevant chunk can still be the wrong chunk if it is outdated.

## Provenance

The origin of a piece of context. Good provenance answers, "Where did this information come from, and should I trust it?"

## Context packing

The act of selecting and ordering multiple pieces of context to maximize usefulness inside a fixed token budget. It is often where real system quality gets won or lost.

## Bottom line

Prompting is only part of the story. In production systems, better results usually come from better context selection, better evidence, and better structure.

That is why context engineering deserves its own vocabulary. It is not a buzzword. It is the practical layer between raw information and useful model behavior.
