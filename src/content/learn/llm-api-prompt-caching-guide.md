---
title: "LLM Prompt Caching: Cut Costs and Latency by 90%"
depth: technical
pillar: building
topic: llm-api-integration
tags: [llm-api-integration, prompt-caching, optimization, cost, latency]
author: bee
date: "2026-03-19"
readTime: 8
description: "Prompt caching is the single biggest optimization for LLM applications with shared context. This guide covers how it works across providers, implementation patterns, and the tradeoffs."
related: [llm-api-caching-strategies-guide, llm-api-cost-optimization-guide, llm-api-streaming-responses]
---

If your LLM application sends the same system prompt, few-shot examples, or document context with every request, you're paying full price for the same computation over and over. Prompt caching fixes this — and the savings are dramatic.

## What Prompt Caching Does

When you send a prompt to an LLM, the model processes every token in the input (the "prefill" phase) before generating output. For a request with a 10,000-token system prompt and a 100-token user query, 99% of the compute goes to processing context that's identical across requests.

Prompt caching stores the intermediate computation (the KV cache) from the shared prefix, so subsequent requests skip the prefill for cached tokens. The result:

- **50-90% cost reduction** on cached tokens (provider-dependent)
- **Dramatically lower latency** (cached prefill is nearly instant)
- **Same output quality** (the computation is mathematically identical)

## Provider Support

### Anthropic (Claude)

Anthropic offers explicit prompt caching with cache breakpoints:

```python
from anthropic import Anthropic

client = Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": large_system_prompt,  # 10K+ tokens
            "cache_control": {"type": "ephemeral"}
        }
    ],
    messages=[{"role": "user", "content": "User's actual question"}]
)
```

- Cached input tokens cost 90% less than regular input tokens
- Cache write costs 25% more than regular input (one-time overhead)
- Cache TTL is ~5 minutes (refreshed on each hit)
- Minimum cacheable prefix: 1,024 tokens (Sonnet), 2,048 tokens (Opus)

### OpenAI (GPT)

OpenAI automatically caches prompts without explicit configuration:

```python
# No special syntax needed — identical prefixes are cached automatically
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": large_system_prompt},
        {"role": "user", "content": user_query}
    ]
)
# Check usage for cache stats
print(response.usage.prompt_tokens_details.cached_tokens)
```

- Cached tokens cost 50% less
- Automatic — no code changes needed
- Minimum cacheable prefix: 1,024 tokens
- Cache lifetime: varies (minutes to hours based on traffic)

### Google (Gemini)

Google offers explicit context caching with longer TTLs:

```python
from google import genai

# Create a cached context
cache = client.caches.create(
    model="gemini-2.0-flash",
    contents=[large_document_content],
    ttl="3600s"  # 1 hour
)

# Use the cache
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="User's question about the document",
    cached_content=cache.name
)
```

- Cached tokens cost 75% less
- Explicit TTL control (up to 48 hours)
- Minimum 32,768 tokens for caching
- Storage costs apply for long-lived caches

## Architecture Patterns

### Pattern 1: Shared System Prompt

The simplest case. Your application has one system prompt used across all requests:

```
[System prompt: 5K tokens] [User message: varies]
       ↑ cached                    ↑ not cached
```

Every request after the first gets the cached rate. This is the default benefit with OpenAI's automatic caching.

### Pattern 2: Document Q&A

A user uploads a document and asks multiple questions:

```
[System prompt: 1K] [Document: 50K tokens] [Q1: 100 tokens]
[System prompt: 1K] [Document: 50K tokens] [Q2: 150 tokens]
[System prompt: 1K] [Document: 50K tokens] [Q3: 80 tokens]
      ↑ cached on all requests               ↑ only this varies
```

Without caching: 3 × 51,000 = 153,000 input tokens billed at full price
With caching: 51,000 (first request) + 2 × 51,000 at cached rate + variable tokens
Savings: ~60% on total input costs

### Pattern 3: Multi-Turn Conversation

Each turn includes the full conversation history:

```
Turn 1: [System] [User1]
Turn 2: [System] [User1] [Asst1] [User2]
Turn 3: [System] [User1] [Asst1] [User2] [Asst2] [User3]
         ↑────── cached prefix grows ──────↑
```

The cache grows with each turn. Later turns benefit most.

### Pattern 4: Few-Shot Examples

Applications with shared few-shot examples in the prompt:

```
[System] [Example1] [Example2] ... [Example20] [User query]
                  ↑ all cached                   ↑ varies
```

## Optimization Tips

**1. Order your prompt strategically**: Put stable content (system prompt, examples, documents) first. Put variable content (user query, conversation history) last. Caching only works on prefixes.

**2. Keep the variable suffix short**: The longer your uncached suffix relative to your cached prefix, the better your savings ratio.

**3. Batch similar requests together**: If 100 users are querying the same document, their requests all share the cached prefix. Time-clustering these requests maximizes cache hit rates.

**4. Monitor cache hit rates**:

```python
# Anthropic
usage = response.usage
cache_hit_rate = usage.cache_read_input_tokens / (
    usage.cache_read_input_tokens + usage.input_tokens
)

# OpenAI  
cached = response.usage.prompt_tokens_details.cached_tokens
total = response.usage.prompt_tokens
cache_hit_rate = cached / total
```

**5. Warm the cache proactively**: For Anthropic's ephemeral cache, send a lightweight request to populate the cache before user traffic arrives.

## When Caching Doesn't Help

- **Unique prompts**: If every request is completely different, there's no shared prefix to cache
- **Short prompts**: Below the minimum token threshold, caching doesn't activate
- **Low request frequency**: If requests are too spread out, the cache expires between them
- **Highly dynamic system prompts**: If your system prompt changes frequently, the cache invalidates

## Cost Modeling

Before optimizing, measure your actual caching opportunity:

```python
# Analyze your request log
requests = load_request_log()
shared_prefix_lengths = []
for i in range(1, len(requests)):
    shared = common_prefix_length(requests[i-1], requests[i])
    shared_prefix_lengths.append(shared)

avg_cacheable = sum(shared_prefix_lengths) / len(shared_prefix_lengths)
avg_total = sum(len(r) for r in requests) / len(requests)
cache_opportunity = avg_cacheable / avg_total
print(f"~{cache_opportunity:.0%} of tokens are cacheable")
```

If the opportunity is >50%, prompt caching should be a priority optimization.
