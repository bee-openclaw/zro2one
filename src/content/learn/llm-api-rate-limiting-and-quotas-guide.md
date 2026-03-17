---
title: "Managing LLM API Rate Limits and Quotas in Production"
depth: technical
pillar: building
topic: llm-api-integration
tags: [llm-api, rate-limiting, quotas, production, reliability]
author: bee
date: "2026-03-17"
readTime: 9
description: "Rate limits are the most common source of production failures in LLM applications. This guide covers strategies for staying within limits, handling throttling gracefully, and scaling reliably."
related: [llm-api-error-handling-retry-patterns, llm-api-fallbacks-and-failover-guide, llm-api-cost-optimization-guide]
---

Your LLM application works perfectly in development. Then you launch, traffic spikes, and everything breaks — not because your code is wrong, but because you've hit rate limits. This scenario is so common it should be in the onboarding docs for every LLM API.

## Understanding rate limit types

LLM providers typically enforce multiple limit types simultaneously:

**Requests per minute (RPM)** — How many API calls you can make. A burst of 100 concurrent requests will hit this even if each request is tiny.

**Tokens per minute (TPM)** — Total input + output tokens consumed. A few requests with large contexts can exhaust this while RPM looks fine.

**Tokens per day (TPD)** — Daily token budgets, especially on free and lower tiers.

**Concurrent requests** — How many requests can be in-flight simultaneously. Some providers limit this separately from RPM.

Different models have different limits. GPT-4 class models typically have lower limits than GPT-3.5 class models. Newer models may have temporarily restricted limits.

## Pre-request strategies

### Token estimation

Before sending a request, estimate the token count. This lets you predict whether the request will push you over limits and adjust accordingly.

```python
import tiktoken

def estimate_tokens(messages: list, model: str = "gpt-4") -> int:
    encoding = tiktoken.encoding_for_model(model)
    total = 0
    for msg in messages:
        total += len(encoding.encode(msg["content"])) + 4  # message overhead
    total += 2  # reply priming
    return total
```

### Request queuing

Don't fire requests directly. Route them through a queue that enforces rate limits:

```python
import asyncio
from collections import deque
import time

class RateLimiter:
    def __init__(self, rpm: int, tpm: int):
        self.rpm = rpm
        self.tpm = tpm
        self.request_times = deque()
        self.token_counts = deque()
    
    async def acquire(self, estimated_tokens: int):
        while True:
            now = time.time()
            # Clear old entries
            while self.request_times and self.request_times[0] < now - 60:
                self.request_times.popleft()
                self.token_counts.popleft()
            
            current_rpm = len(self.request_times)
            current_tpm = sum(self.token_counts)
            
            if current_rpm < self.rpm and current_tpm + estimated_tokens < self.tpm:
                self.request_times.append(now)
                self.token_counts.append(estimated_tokens)
                return
            
            await asyncio.sleep(0.1)
```

### Request batching

When possible, combine multiple small requests into fewer larger ones. Instead of sending 10 requests to classify 10 items, send 1 request that classifies all 10 in a structured format. This reduces RPM consumption dramatically.

## Handling 429 responses

When you do hit rate limits, the API returns HTTP 429 (Too Many Requests). Handle this properly:

**Exponential backoff with jitter:**
```python
import random

async def call_with_retry(fn, max_retries=5):
    for attempt in range(max_retries):
        try:
            return await fn()
        except RateLimitError as e:
            if attempt == max_retries - 1:
                raise
            
            # Check for Retry-After header
            wait = getattr(e, 'retry_after', None)
            if wait is None:
                wait = (2 ** attempt) + random.uniform(0, 1)
            
            await asyncio.sleep(wait)
```

**Respect Retry-After headers.** When present, they tell you exactly how long to wait. Don't retry sooner — you'll just get another 429.

**Don't retry immediately on capacity errors.** If the provider is overloaded (as opposed to you exceeding your rate limit), backing off significantly is the right call.

## Multi-provider strategies

For production applications, relying on a single provider is risky:

**Primary/fallback routing:** Use your primary provider for most requests, but route to a fallback when the primary is rate-limited. OpenAI → Anthropic → Google is a common chain.

**Load balancing across API keys:** If the provider allows multiple API keys, spread requests across them. Each key has independent rate limits.

**Model-tier fallback:** When your GPT-4 quota is exhausted, fall back to GPT-4o-mini for requests where quality reduction is acceptable.

## Monitoring and alerting

Track these metrics:
- Current utilization vs limits (RPM used / RPM available)
- 429 response rate over time
- Queue depth (how many requests are waiting?)
- Average wait time in queue

Alert when:
- Utilization exceeds 80% sustained (you're approaching limits)
- 429 rate exceeds 5% of requests (you're hitting limits regularly)
- Queue depth grows monotonically (demand exceeds capacity)

## Requesting higher limits

Most providers offer higher rate limits for production applications:
- Document your use case and expected traffic patterns
- Show that you handle rate limits gracefully (providers don't want to increase limits for apps that will hammer their API)
- Request limit increases before you need them — the approval process takes time
- Consider enterprise plans, which typically come with dedicated capacity

## The bigger picture

Rate limiting is a fundamental constraint of shared API infrastructure. Rather than fighting it, design your application around it. Pre-compute what you can, cache aggressively, batch when possible, and always have a fallback. The applications that handle rate limits best aren't the ones with the highest limits — they're the ones that make every request count.
