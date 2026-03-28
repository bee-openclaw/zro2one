---
title: "Semantic Caching for LLM APIs: Cut Costs Without Cutting Quality"
depth: technical
pillar: applied
topic: llm-api-integration
tags: [llm-api-integration, caching, semantic-search, cost-optimization, latency]
author: bee
date: "2026-03-28"
readTime: 10
description: "How semantic caching works for LLM API calls, when it provides real savings, implementation patterns, and the pitfalls that make naive approaches fail."
related: [llm-api-caching-strategies-guide, llm-api-cost-optimization-guide, llm-api-prompt-caching-guide]
---

# Semantic Caching for LLM APIs: Cut Costs Without Cutting Quality

Exact-match caching is straightforward: if the same prompt comes in twice, return the cached response. But LLM queries are rarely identical. "What's the capital of France?" and "what is the capital of france?" are different strings with the same intent. "Tell me about Python error handling" and "How does exception handling work in Python?" ask essentially the same question.

Semantic caching matches queries by meaning rather than exact text, potentially catching 10–50x more cache hits than string matching. When it works, it slashes API costs and latency. When it fails, it returns wrong answers to slightly different questions. The line between these outcomes is thinner than most implementations acknowledge.

## How Semantic Caching Works

The core pipeline:

1. **Embed the incoming query** using a text embedding model (e.g., OpenAI's text-embedding-3-small, Cohere embed, or an open model like BGE)
2. **Search the cache** for stored queries whose embeddings are within a similarity threshold (typically cosine similarity > 0.95)
3. **If a match is found,** return the cached response without calling the LLM
4. **If no match,** call the LLM, store the query embedding + response, and return the response

The embedding model maps text to a vector space where semantically similar queries are close together. The cache lookup is a nearest-neighbor search — fast with approximate nearest neighbor (ANN) indices like FAISS, Pinecone, or pgvector.

## Where It Provides Real Value

Semantic caching is not universally applicable. It works best for specific workload patterns:

**FAQ and support queries.** Users ask the same questions in different ways. "How do I reset my password?" "Password reset help" "I forgot my password, what do I do?" — all should return the same answer. Cache hit rates of 30–60% are common for customer-facing applications.

**Educational and reference content.** Questions about stable facts ("What is photosynthesis?" "Explain TCP/IP") have correct answers that do not change. Caching these saves significant cost for educational platforms.

**Repeated analytical queries.** In data analysis pipelines, similar queries may be generated for different but related datasets. "Summarize the key trends in this quarterly report" may be asked for many reports with the same structure.

**Where it does NOT work:**
- Queries that depend on conversation context (the same words mean different things in different conversations)
- Queries with user-specific data embedded in them
- Creative or generative tasks where different outputs are desired
- Time-sensitive queries ("What's the weather today?" must not return yesterday's answer)

## The Threshold Problem

The similarity threshold is the most critical parameter and the hardest to get right.

**Too high (> 0.98):** Almost no cache hits. Only near-identical phrasings match. You have built an expensive exact-match cache.

**Too low (< 0.90):** False matches. "How do I delete my account?" matches "How do I create my account?" and the user gets instructions for the opposite of what they asked.

**The sweet spot** depends on your embedding model and domain, but 0.94–0.96 is a common starting range. The correct threshold is determined empirically:

1. Collect a sample of real query pairs
2. Compute embeddings and similarity scores
3. Manually label pairs as "same intent" or "different intent"
4. Find the threshold that maximizes true positive matches while keeping false positives near zero
5. Monitor in production and adjust

**Critical insight:** There is no single correct threshold. Different query categories may need different thresholds. "What is X?" definitional queries are safe to match loosely. "How do I do X vs Y?" comparative queries need tight matching because the comparison target matters.

## Implementation Patterns

### Simple In-Memory Cache

For prototyping and low-traffic applications:

```python
import numpy as np
from openai import OpenAI

client = OpenAI()
cache = []  # list of (embedding, query, response)

def get_response(query: str, threshold: float = 0.95):
    query_emb = get_embedding(query)
    
    for cached_emb, cached_query, cached_response in cache:
        similarity = np.dot(query_emb, cached_emb)
        if similarity >= threshold:
            return cached_response, True  # cache hit
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": query}]
    )
    result = response.choices[0].message.content
    cache.append((query_emb, query, result))
    return result, False  # cache miss
```

This scales to thousands of cached entries. Beyond that, use a vector database.

### Production Architecture

For production systems:

```
Query → Embed → Vector DB Search → Hit? → Return cached response
                                    ↓ Miss
                              LLM API call → Store in Vector DB + Response Cache → Return
```

**Key components:**
- **Embedding service:** Dedicated endpoint for query embedding. Use a small, fast model — embedding latency must be much less than LLM latency for caching to be worthwhile.
- **Vector database:** FAISS for single-node, Pinecone/Qdrant/pgvector for distributed. Index size grows with unique queries.
- **Response store:** The actual response text, stored keyed by embedding ID. Can be Redis, PostgreSQL, or any fast KV store.
- **TTL and eviction:** Cached responses should expire. Set TTL based on how often your domain knowledge changes — hours for news, weeks for reference content.

### Cache Key Design

For queries with system prompts or context, the cache key should include the relevant context:

```python
cache_key = f"{system_prompt_hash}:{embed(user_query)}"
```

Different system prompts produce different responses to the same question. A support bot and a sales bot should not share cache entries.

## Measuring Value

Track these metrics to evaluate your semantic cache:

- **Hit rate:** Percentage of queries served from cache. Below 10% means the cache is not worth the complexity. Above 30% is strong.
- **Precision at threshold:** What percentage of cache hits actually returned a correct/appropriate response? Sample and manually review regularly.
- **Latency savings:** Cache hit latency (embedding + search) vs. LLM API latency. If your cache lookup takes 200ms and the LLM takes 800ms, you save 600ms per hit.
- **Cost savings:** (hits × average LLM cost per query) - (all queries × embedding cost per query + infrastructure cost). Semantic caching has overhead — embedding every query is not free.

## Common Pitfalls

**Caching before the system is stable.** If your prompts, system messages, or response formats are still changing, cached responses become stale immediately. Wait until the system is relatively stable before adding semantic caching.

**Ignoring cache invalidation.** When your knowledge base updates, cached responses based on old information must be invalidated. Implement cache clearing tied to content updates, not just time-based TTL.

**Assuming embedding quality is universal.** Embedding models have strengths and weaknesses. A model trained on web text may not distinguish domain-specific queries well. Test with your actual query distribution.

**Over-caching.** Not every query benefits from caching. If a user is having a multi-turn conversation, caching individual turns out of context produces nonsensical hits. Scope your cache to query types where cached responses are truly interchangeable.

Semantic caching is a powerful cost optimization that requires more careful engineering than it appears. Done well, it can reduce LLM API costs by 30–60% for the right workloads. Done carelessly, it serves wrong answers at scale. The difference is in the threshold tuning, the monitoring, and the discipline to cache only what should be cached.
