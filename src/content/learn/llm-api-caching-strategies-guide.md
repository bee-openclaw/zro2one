---
title: "LLM API Caching Strategies: Stop Paying for the Same Answer Twice"
depth: technical
pillar: integration
topic: llm-api-integration
tags: [llm-api, caching, cost-optimization, performance, architecture]
author: bee
date: "2026-03-15"
readTime: 9
description: "Caching is the most underused optimization in LLM applications. This guide covers exact caching, semantic caching, prompt caching, and when each strategy applies."
related: [llm-api-cost-optimization-guide, llm-api-structured-outputs-guide, llm-api-streaming-responses]
---

Most LLM applications send the same (or nearly the same) prompts to the API repeatedly. Customer support bots answering common questions. RAG systems with overlapping context. Batch pipelines processing similar documents. Every duplicate call costs money and adds latency.

Caching fixes this. But LLM caching is more nuanced than traditional HTTP caching. Here's what works.

## The three layers of LLM caching

### Layer 1: Exact match caching

The simplest approach. Hash the complete request (prompt, model, temperature, etc.) and cache the response. If you've seen this exact request before, return the cached response.

```python
import hashlib, json, redis

def get_or_call(prompt, model, **params):
    cache_key = hashlib.sha256(
        json.dumps({"prompt": prompt, "model": model, **params}, 
                   sort_keys=True).encode()
    ).hexdigest()
    
    cached = redis.get(cache_key)
    if cached:
        return json.loads(cached)
    
    response = call_llm(prompt, model, **params)
    redis.setex(cache_key, ttl=3600, value=json.dumps(response))
    return response
```

**When it works:** Deterministic calls (temperature=0), batch processing with repeated inputs, system prompts that don't change.

**When it doesn't:** Anything with temperature > 0, personalized prompts, or where freshness matters.

**Hit rates:** Surprisingly high for many applications. Customer support bots see 30-50% exact cache hits because users ask the same questions in the same words. Batch processing pipelines can hit 60-80% when processing documents with shared boilerplate.

### Layer 2: Semantic caching

Users don't always phrase things identically. "What's your return policy?" and "How do I return something?" should probably get the same cached response.

Semantic caching embeds the query, searches for similar cached queries, and returns the response if similarity exceeds a threshold.

```python
from sentence_transformers import SentenceTransformer

embedder = SentenceTransformer('all-MiniLM-L6-v2')

def semantic_cache_lookup(query, threshold=0.92):
    query_embedding = embedder.encode(query)
    
    # Search vector store for similar cached queries
    results = vector_store.search(query_embedding, top_k=1)
    
    if results and results[0].score > threshold:
        return cache.get(results[0].id)
    return None
```

**Threshold selection is critical.** Too low (0.80) and you return wrong answers for different-but-similar queries. Too high (0.98) and you barely get any cache hits. Start at 0.92-0.95 and adjust based on your error tolerance.

**When it works:** FAQ-style applications, customer support, search queries, any domain with a bounded set of intents.

**When it doesn't:** Complex, context-dependent queries. "Tell me about the project" means different things in different conversations.

**Hit rates:** Adds 15-30% cache hits on top of exact matching for conversational applications.

### Layer 3: Prompt prefix caching (provider-level)

Most providers now offer prompt caching — if your request shares a prefix with a recent request, the cached KV computations are reused.

**Anthropic:** Automatic prompt caching for shared prefixes. Mark cacheable sections with cache control headers. Up to 90% discount on cached tokens.

**OpenAI:** Automatic prefix caching for requests sharing the first N tokens. No configuration needed. 50% discount on cached input tokens.

**Google:** Context caching API for Gemini. Explicitly create a cached context, reference it in subsequent requests.

**How to maximize prefix cache hits:**

1. **Put static content first.** System prompt → few-shot examples → context documents → user query. The long, expensive prefix stays cached.

2. **Standardize system prompts.** If every request uses the same system prompt, every request benefits from the cache. Small variations kill cache hits.

3. **Batch similar requests.** Process all requests for one document together, not interleaved with other documents. The document context stays in cache.

## Architecture patterns

### Pattern 1: Cache-aside with TTL

The standard pattern. Check cache, call API on miss, store result.

Best for: General-purpose applications where freshness matters.

```
Request → Check Cache → [HIT] → Return cached
                      → [MISS] → Call API → Store in cache → Return
```

TTL guidelines:
- Factual/reference queries: 24-72 hours
- Dynamic/news content: 1-4 hours
- Personalized responses: don't cache (or cache per-user)
- Classification/extraction: indefinite (deterministic)

### Pattern 2: Pre-warming

For predictable query patterns, pre-generate and cache responses before users ask.

Best for: FAQ pages, product descriptions, scheduled content.

```python
# Nightly batch: pre-cache top 1000 FAQ responses
for question in top_faqs:
    response = call_llm(question, temperature=0)
    cache.set(question, response, ttl=86400)
```

### Pattern 3: Hierarchical caching

Combine multiple cache layers for maximum hit rate:

1. **L1: In-memory exact cache** (< 1ms latency, limited size)
2. **L2: Redis semantic cache** (5-10ms latency, larger)
3. **L3: Provider prompt caching** (reduces API cost, no latency benefit)
4. **L4: Cold storage** (for analytics and retraining, not real-time)

### Pattern 4: Response decomposition

Cache sub-components of responses separately. For a RAG system:

- Cache the retrieval results (which chunks are relevant)
- Cache the synthesis (given these chunks, what's the answer)
- If chunks change, only re-synthesize. If the question changes but retrieval is similar, reuse chunks.

## Invalidation

The hardest part of any caching system. For LLM caches:

**Time-based (TTL).** Simplest. Set expiration based on how quickly the underlying information changes.

**Event-based.** When source data changes, invalidate related cache entries. If a product's return policy changes, invalidate all cached responses about returns.

**Version-based.** Include a version tag in cache keys. When you update your system prompt or model, bump the version to invalidate all stale entries.

**Confidence-based.** For semantic caching, periodically verify cached responses against fresh API calls. If the model's response has drifted significantly, invalidate.

## Measuring cache effectiveness

Track these metrics:

- **Hit rate** — percentage of requests served from cache
- **Cost savings** — (cached_requests × average_cost_per_request)
- **Latency improvement** — P50 and P99 response times, cached vs. uncached
- **Staleness rate** — how often cached responses are outdated (sample and verify)
- **Semantic cache precision** — of semantic cache hits, what percentage were actually correct matches?

A well-implemented caching layer typically reduces LLM API costs by 30-60% and P50 latency by 70-90% (cache hits are 1-10ms vs 500-2000ms for API calls).

## Common mistakes

**Caching with temperature > 0.** Non-deterministic responses mean the cached response is just one of many possible answers. Fine for some applications, misleading for others.

**Not caching embeddings.** If you're calling an embedding API with the same texts repeatedly (common in RAG), cache the embeddings. They're deterministic and never expire unless the model changes.

**Ignoring cache key collisions.** Two different prompts can hash to the same key (extremely rare with SHA-256 but possible with shorter hashes). Always include enough context in the cache key.

**Over-caching personalized content.** If responses should vary per user, per-user cache keys are essential. A generic cache serving one user's personalized response to another is a bug and a privacy issue.

Caching is the closest thing to free money in LLM engineering. The work to implement it is modest. The savings are immediate and compounding.
