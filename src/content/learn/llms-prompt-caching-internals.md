---
title: "Prompt Caching in LLMs: How Providers Save You Time and Money"
depth: technical
pillar: llms
topic: llms
tags: [llms, prompt-caching, inference, optimization, cost]
author: bee
date: "2026-03-30"
readTime: 10
description: "Prompt caching lets LLM providers skip redundant computation when your prompt shares a prefix with a previous request. This guide explains how it works internally, which providers support it, and how to structure prompts to maximize cache hits."
related: [llms-kv-cache-optimization-guide, llm-api-prompt-caching-guide, llm-api-caching-strategies-guide]
---

Every time you send a prompt to an LLM, the model processes every token from scratch — even if the first 3,000 tokens are identical to your last request. Prompt caching changes that. By storing the intermediate computation (the KV cache) for shared prefixes, providers can skip reprocessing and deliver results faster and cheaper.

## How Prompt Caching Works

When an LLM processes a prompt, it computes attention keys and values for each token. These KV pairs are the expensive part — they require full forward passes through every layer. Prompt caching stores these KV pairs so that when a new request shares the same prefix, the model starts computation only from where the prefix ends.

The key insight: this isn't semantic similarity. It's exact prefix matching. If even one token differs early in your prompt, the cache misses entirely.

### The Cache Hierarchy

Most providers implement a tiered approach:

1. **Session-level cache** — persists across turns in a conversation. Your system prompt and conversation history are cached automatically.
2. **Cross-request cache** — shared across different API calls from the same account. If multiple requests share a long system prompt, all benefit.
3. **Global cache** — some providers cache popular system prompts across all users (anonymized). This is why common frameworks get fast responses.

## Provider Implementations

### Anthropic

Anthropic's prompt caching is explicit. You mark cache breakpoints in your messages using `cache_control` blocks. The model caches everything up to that breakpoint. Cached input tokens cost 90% less than regular input tokens, and cache writes cost 25% more (amortized over hits).

Key constraints:
- Minimum cacheable prefix: 1,024 tokens (Claude 3.5 Sonnet) or 2,048 tokens (Claude 3 Opus/Haiku)
- Cache TTL: 5 minutes, refreshed on each hit
- Up to 4 cache breakpoints per request

### OpenAI

OpenAI caches automatically — no special markup needed. Any prefix of 1,024+ tokens that repeats across requests gets cached. Cached tokens are billed at 50% of input token price. The cache is model-specific and scoped to your organization.

### Google

Gemini offers "context caching" as an explicit feature. You create a cached content object with a specified TTL (default 1 hour, max 24 hours). You pay for storage per hour plus a reduced per-token rate for cached content. This works well for scenarios where you're querying against a large document repeatedly.

## Structuring Prompts for Maximum Cache Hits

The cardinal rule: **put stable content first, variable content last.**

### Before (cache-unfriendly)

```
User query: {variable_query}

Context: {large_static_document}

System instructions: {stable_instructions}
```

Every request has a different prefix because the query comes first. Zero cache hits.

### After (cache-friendly)

```
System instructions: {stable_instructions}

Context: {large_static_document}

User query: {variable_query}
```

The system instructions and context form a stable prefix. Only the final query changes between requests.

### Practical Patterns

**RAG with caching:** Place your system prompt and base instructions first, then your retrieved documents (sorted deterministically), then the user query. If you're querying the same document set repeatedly, the entire prefix caches.

**Multi-turn conversations:** Each turn extends the prefix. Turn 5 of a conversation caches turns 1–4 automatically. This is why chatbots get progressively cheaper per turn.

**Batch processing:** If you're running the same analysis across many inputs, structure your prompt so the analysis instructions are the prefix and each input is appended. All requests after the first get cache hits.

## Measuring Cache Effectiveness

Track these metrics:

- **Cache hit rate** — percentage of input tokens served from cache. Target: >60% for conversational workloads, >80% for batch processing.
- **Effective input cost** — actual cost per input token after cache discounts.
- **Time to first token (TTFT)** — cached prefixes reduce TTFT proportionally to prefix length. A 10,000-token cached prefix can cut TTFT by 5–10x.

Most providers include cache hit/miss information in response headers or usage objects. Log these.

## When Prompt Caching Doesn't Help

- **Highly variable prompts** — if every request is unique, there's nothing to cache
- **Short prompts** — below the minimum cacheable length (typically 1,024 tokens), caching doesn't activate
- **Low request volume** — cache entries expire. If requests are too infrequent, entries evaporate before reuse
- **Semantic similarity without prefix match** — two prompts can mean the same thing but have different token sequences. The cache doesn't care about meaning, only exact prefix match

## Advanced: Self-Hosted Caching

If you're running open-weight models, you can implement your own prompt caching with libraries like vLLM or TensorRT-LLM. The concept is the same — store KV caches for common prefixes — but you control the eviction policy, cache size, and matching strategy.

vLLM's automatic prefix caching uses a radix tree to match prefixes efficiently across requests. It works out of the box with `--enable-prefix-caching`.

## The Economics

For a typical RAG application with a 4,000-token system prompt + context and a 200-token user query:

- Without caching: 4,200 input tokens billed at full price per request
- With caching (after first request): 4,000 tokens at cached rate + 200 at full rate
- At Anthropic's pricing: ~85% cost reduction on input tokens
- At OpenAI's pricing: ~47% cost reduction on input tokens

Over thousands of requests per day, this adds up to significant savings — often the difference between a viable product and an unsustainable one.

## Key Takeaways

1. Prompt caching is about exact prefix matching, not semantic similarity
2. Put stable content first, variable content last
3. Different providers have different mechanisms — some explicit, some automatic
4. Monitor cache hit rates as a core metric
5. The savings compound: longer prefixes and higher request volumes mean bigger wins
