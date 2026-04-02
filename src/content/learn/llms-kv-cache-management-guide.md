---
title: "KV Cache Management: Why LLM Memory Gets Expensive and How to Control It"
depth: technical
pillar: foundations
topic: llms
tags: [llms, kv-cache, inference, memory, optimization]
author: bee
date: "2026-04-02"
readTime: 11
description: "The KV cache is the hidden cost of LLM inference. It grows linearly with sequence length, dominates GPU memory, and determines how many requests you can serve. Here's how to manage it."
related: [llms-inference-time-compute-budgeting, how-llms-work-technical, deep-learning-transformers-architecture]
---

Every time an LLM generates a token, it needs to attend to all previous tokens. Without optimization, this means recomputing the key and value projections for every earlier token at every step — quadratic in sequence length. The KV cache eliminates this redundancy by storing computed key-value pairs and reusing them. But that stored data has a cost: GPU memory.

For a 70B parameter model processing a 32K token sequence, the KV cache alone can consume 20-40GB of memory. At scale, KV cache management is often the binding constraint on throughput, not compute.

## What the KV Cache Stores

In a transformer, each attention layer computes queries (Q), keys (K), and values (V) from the input. During generation, only the new token produces a new Q — but it must attend to K and V from every previous position.

The KV cache stores the K and V tensors for all previous tokens across all attention layers. For a model with L layers, H attention heads, and head dimension D, the cache for a sequence of length S requires:

```
Memory = 2 × L × H × D × S × bytes_per_element
```

The factor of 2 accounts for both K and V. With FP16 (2 bytes per element), a model with 80 layers and 64 heads of dimension 128 caching a 32K sequence uses:

```
2 × 80 × 64 × 128 × 32,768 × 2 bytes ≈ 84 GB
```

This is why you cannot just naively serve long-context requests on a single GPU, even if the model weights fit.

## Why It Matters for Serving

In production serving, you are handling many concurrent requests. Each request maintains its own KV cache. The total memory consumed is:

```
Total = model_weights + sum(KV_cache per active request)
```

This directly limits your maximum batch size and concurrent request count. A server with 80GB of GPU memory might have 15GB of model weights (after quantization) and 65GB available for KV caches. If each request's cache uses 5GB, you can serve 13 concurrent requests. If caches use 10GB, you can serve 6.

KV cache management is therefore a throughput optimization problem: serve more requests concurrently by using less memory per request, without degrading quality.

## Techniques for Reducing KV Cache Memory

### Grouped Query Attention (GQA)

Instead of giving each attention head its own K and V projections, GQA groups multiple query heads to share a single set of K and V heads. A model with 64 query heads and 8 KV heads reduces cache size by 8x compared to standard multi-head attention.

Most modern models (Llama 3, Mistral, Gemma) use GQA by default. This is the single most impactful KV cache reduction technique, and it is applied during model training — not something you can add later.

### KV Cache Quantization

Storing cache entries in lower precision (INT8 or INT4 instead of FP16) reduces memory proportionally. The quality impact is usually minimal for INT8 and measurable but acceptable for INT4, particularly for longer sequences where early cache entries have diminishing influence on later tokens.

Several serving frameworks support KV cache quantization separately from model weight quantization, letting you keep the model at full precision while compressing the cache.

### Paged Attention

Paged attention (introduced by vLLM) borrows the concept of virtual memory paging from operating systems. Instead of allocating a contiguous block of memory for each request's maximum possible sequence length, it allocates memory in fixed-size pages and maps them dynamically.

This eliminates internal fragmentation — the wasted memory from allocating for a 32K sequence when the actual output is 500 tokens. In practice, paged attention can improve memory utilization by 2-4x, directly translating to higher batch sizes and throughput.

### Sliding Window Attention

Some models use a fixed window of recent tokens for attention in certain layers, rather than attending to the full history. This bounds the KV cache size for those layers. Mistral's sliding window approach uses a 4K window in most layers with full attention in a few layers, significantly reducing cache requirements for long sequences.

### Cache Eviction and Token Dropping

When memory is constrained, you can evict older or less-attended cache entries. The simplest approach evicts based on position (drop the oldest tokens). More sophisticated methods track attention scores and keep the tokens that are most frequently attended to.

Heavy Hitter Oracle (H2O) is one such approach — it identifies "heavy hitter" tokens that receive disproportionate attention across many generation steps and preserves those while evicting tokens that are rarely attended to.

## Prefix Caching

When many requests share a common prefix (same system prompt, same few-shot examples), the KV cache for that prefix can be computed once and shared across requests. This is particularly valuable for applications with long system prompts.

The savings are proportional to the shared prefix length. A 2K token system prompt shared across 100 concurrent requests saves 100x the cache for those 2K tokens. Serving frameworks like vLLM and SGLang support prefix caching automatically.

## Monitoring and Capacity Planning

To manage KV cache effectively in production, monitor:

- **Cache memory utilization.** What fraction of available GPU memory is consumed by active KV caches?
- **Cache hit rates** (for prefix caching). Are you getting reuse from shared prefixes?
- **Request queue depth.** If requests are waiting because there is not enough memory for new caches, you are cache-constrained.
- **Average sequence length.** This determines per-request cache cost and directly affects capacity planning.

The right combination of techniques depends on your workload. High-throughput APIs with short responses benefit most from paged attention and prefix caching. Long-context applications need quantization and potentially sliding window approaches. The key is to measure first, then apply the technique that addresses your actual bottleneck.
