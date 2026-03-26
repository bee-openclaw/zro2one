---
title: "Sparse Attention: How Modern Models Handle Million-Token Contexts"
depth: technical
pillar: foundations
topic: deep-learning
tags: [deep-learning, attention, sparse-attention, efficiency]
author: bee
date: "2026-03-26"
readTime: 9
description: "How sparse attention mechanisms break the quadratic bottleneck of standard transformers — from sliding windows to learned sparsity patterns — and why they matter for long-context AI."
related: [deep-learning-transformers-architecture, ai-foundations-attention-mechanisms, llms-context-length-frontier-2026]
---

Standard self-attention has a problem: it's quadratic. Every token attends to every other token, making the computation scale as O(n²) with sequence length. A 4K context? No problem. A 128K context? That's 1,024x more attention computation. A million tokens? Completely infeasible with dense attention.

Sparse attention mechanisms solve this by having each token attend to only a subset of other tokens. The key insight: most attention weights in a trained transformer are near-zero anyway. If we can identify which connections actually matter and skip the rest, we can scale to much longer sequences without proportional compute increases.

## The Dense Attention Baseline

In standard multi-head attention, for a sequence of length n:

- The attention matrix is n × n
- Computing it requires O(n²) operations
- Storing it requires O(n²) memory

For n = 1,000, that's 1 million entries. For n = 100,000, it's 10 billion. Memory, not compute, is typically the binding constraint — the full attention matrix for long sequences simply doesn't fit in GPU memory.

## Fixed Sparse Patterns

### Sliding Window (Local) Attention

The simplest approach: each token attends only to its w nearest neighbors (w/2 on each side).

**Complexity:** O(n × w) — linear in sequence length for fixed window size.

**Intuition:** Most relevant context is nearby. The word "it" usually refers to something in the last few sentences, not 50 paragraphs ago.

**Limitation:** No mechanism for long-range dependencies. Information must propagate token-by-token across windows, requiring O(n/w) layers for a token to access distant context.

**Used in:** Mistral (sliding window of 4096 tokens in every layer), Longformer (combined with global tokens).

### Dilated (Strided) Attention

Like sliding window, but with gaps. A token attends to every k-th token within a larger range, creating a pattern similar to dilated convolutions.

**Why it helps:** Covers a larger receptive field than sliding window with the same number of attention connections. A dilated pattern with stride 4 over 1024 positions covers the same range as a full window of 1024 but with only 256 connections.

**Limitation:** Misses tokens between the strides. Works best when combined with local attention in alternating layers.

### Global Tokens

Designate certain tokens (CLS tokens, sentinel tokens, or every k-th token) as "global" — they attend to all positions and all positions attend to them.

**Intuition:** Global tokens act as information bottlenecks. Any piece of information can reach any other piece by routing through a global token in at most two hops.

**Used in:** Longformer (uses CLS and task-specific global tokens), BigBird (combines local + global + random attention).

### BigBird's Recipe

BigBird proved that the combination of local attention + global tokens + random connections achieves full transformer expressiveness (it's a universal approximator of sequence functions) with O(n) complexity.

The random connections are the surprising ingredient — even a small number of random long-range connections dramatically improves information flow compared to purely local patterns.

## Learned Sparse Patterns

### Routing-Based Attention

Instead of fixed patterns, let the model learn which tokens to attend to.

**Hash-based routing (Reformer).** Hash query and key vectors using locality-sensitive hashing (LSH). Similar vectors hash to the same bucket; attention is computed only within buckets. Complexity: O(n log n).

**The reality:** Reformer's approach was theoretically elegant but practically underwhelming. The hashing overhead and the mismatch between hash buckets and actual attention patterns limited its advantage over simpler sparse patterns.

### Top-k Attention

Compute approximate attention scores cheaply, then compute full attention only for the top-k most relevant keys per query.

**How it works in practice:**

1. Use a lightweight scoring mechanism (linear projection, random feature approximation) to estimate which keys each query should attend to
2. Select the top-k keys per query
3. Compute full softmax attention only over these k keys

**Complexity:** O(n × k) where k << n.

**Used in:** Various production systems where the sparsity pattern needs to be data-dependent but the overhead of routing must be minimal.

## Multi-Scale Approaches

### Hierarchical Attention

Process the sequence at multiple resolutions:

1. **Fine-grained:** Full attention within small blocks (e.g., 256 tokens)
2. **Coarse-grained:** Attention between block summaries (compressed representations of each block)
3. **Global:** Attention over the entire sequence using highly compressed representations

This mirrors how humans process long documents — detailed attention to the current paragraph, awareness of section themes, general understanding of the overall document.

### Mixture of Attention Spans

Different attention heads get different context window sizes. Some heads use local windows (128 tokens) for syntactic patterns. Others use medium windows (1024 tokens) for paragraph-level semantics. A few use the full context for long-range dependencies.

**Research finding:** When given the freedom to learn their attention spans, transformer heads naturally specialize — most heads learn short spans, and only a few learn long spans. This matches the intuition that most processing is local.

## KV-Cache Compression

For autoregressive generation, the attention pattern isn't the only bottleneck — the key-value cache grows linearly with sequence length and must be stored for every layer and head.

### Grouped Query Attention (GQA)

Instead of separate key and value projections for each attention head, share K and V across groups of heads. With 32 attention heads and 8 KV groups, memory is reduced 4x.

**Used in:** Llama 2, Llama 3, Mistral, and virtually every production LLM in 2026. The quality impact is negligible; the memory savings are substantial.

### Multi-Query Attention (MQA)

The extreme version: all attention heads share a single set of keys and values. Maximum memory efficiency, slight quality degradation.

**Used in:** Falcon, PaLM. Most teams prefer GQA as a better quality-efficiency tradeoff.

### KV-Cache Eviction

During long-context inference, maintain only the most important cached KV pairs. Eviction policies based on attention score history, recency, or learned importance keep cache size bounded while preserving the most useful context.

**StreamingLLM** demonstrated that keeping the first few tokens (attention sinks) plus a sliding window of recent tokens enables effectively infinite-length generation with finite cache.

## What Actually Ships in 2026

The production landscape has converged on a practical recipe:

1. **GQA** for KV-cache efficiency (universal)
2. **Sliding window attention** in most layers for linear-complexity processing
3. **Full attention every k layers** (e.g., every 4th or 8th layer) for long-range dependencies
4. **RoPE with NTK-aware scaling** for extending trained context windows at inference time

This hybrid approach achieves near-linear scaling with sequence length while maintaining the quality of full attention for tasks that require long-range reasoning.

## The Remaining Challenge

Sparse attention solves the compute and memory problem. It doesn't solve the information retrieval problem. A model with a 1M token context window can process a million tokens, but can it reliably find and use a specific fact buried on page 47 of a 200-page document?

Benchmarks like NIAH (Needle in a Haystack) test this directly, and the results are sobering — even models that technically support long contexts often fail to retrieve information from the middle of very long sequences.

The next frontier isn't making context windows bigger. It's making them more reliable.
