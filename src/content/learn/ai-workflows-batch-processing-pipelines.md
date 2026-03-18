---
title: "AI Batch Processing: Running Thousands of LLM Calls Without Going Broke"
depth: applied
pillar: building
topic: ai-workflows
tags: [ai-workflows, batch-processing, pipelines, cost-optimization, automation]
author: bee
date: "2026-03-18"
readTime: 8
description: "When you need to process 10,000 documents through an LLM, you can't just loop and pray. This guide covers architectures for reliable, cost-effective batch AI processing."
related: [ai-workflows-document-processing, llm-api-cost-optimization-guide, llm-api-rate-limiting-and-quotas-guide]
---

You've built a great prompt that classifies customer support tickets. It works perfectly on one ticket. Now you need to run it on 50,000 tickets from last quarter. The naive approach — a for loop with API calls — will cost a fortune, take forever, and fail halfway through with no way to resume.

Here's how to build batch processing pipelines that actually work.

## The Architecture

A production batch pipeline has five components:

```
[Input Queue] → [Rate Limiter] → [LLM Caller] → [Result Store] → [Monitor]
                      ↑                                    |
                      └──────── [Retry Handler] ←──────────┘
```

Each piece solves a specific problem. Skip any one and you'll regret it at scale.

## Input Management

### Chunking Your Workload

Don't load 50,000 items into memory. Process in manageable chunks:

```python
import json
from pathlib import Path

def chunk_inputs(input_file, chunk_size=100):
    """Yield chunks of input records."""
    chunk = []
    with open(input_file) as f:
        for line in f:
            chunk.append(json.loads(line))
            if len(chunk) >= chunk_size:
                yield chunk
                chunk = []
    if chunk:
        yield chunk
```

### Idempotent Processing

Every item needs a unique ID. Before processing, check if it's already done. This makes your pipeline resumable — when it fails at item 23,847, you restart and it skips the first 23,846.

```python
def process_batch(items, results_db):
    for item in items:
        if results_db.exists(item['id']):
            continue  # Already processed
        result = call_llm(item)
        results_db.save(item['id'], result)
```

## Rate Limiting and Concurrency

### Respect API Limits

Every LLM API has rate limits (tokens per minute, requests per minute). Hit them and you get 429 errors. Hit them repeatedly and you might get temporarily banned.

Use a token bucket rate limiter:

```python
import asyncio
import time

class RateLimiter:
    def __init__(self, requests_per_minute, tokens_per_minute):
        self.rpm = requests_per_minute
        self.tpm = tokens_per_minute
        self.request_times = []
        self.token_count = 0
        self.token_reset = time.time()

    async def acquire(self, estimated_tokens):
        # Wait for request capacity
        while len(self.request_times) >= self.rpm:
            oldest = self.request_times[0]
            wait = 60 - (time.time() - oldest)
            if wait > 0:
                await asyncio.sleep(wait)
            self.request_times = [
                t for t in self.request_times
                if time.time() - t < 60
            ]

        # Wait for token capacity
        if time.time() - self.token_reset > 60:
            self.token_count = 0
            self.token_reset = time.time()

        while self.token_count + estimated_tokens > self.tpm:
            await asyncio.sleep(1)
            if time.time() - self.token_reset > 60:
                self.token_count = 0
                self.token_reset = time.time()

        self.request_times.append(time.time())
        self.token_count += estimated_tokens
```

### Optimal Concurrency

Too little concurrency: slow. Too much: rate limit errors. Start with 5–10 concurrent requests and adjust based on your rate limits. Most APIs can handle 20–50 concurrent requests if you stay within RPM limits.

## Using Batch APIs

Major providers now offer batch APIs specifically for this use case:

**OpenAI Batch API** — Submit a JSONL file of requests, get results back within 24 hours at 50% discount. Perfect for non-urgent processing.

**Anthropic Message Batches** — Similar concept. Submit batches, results returned asynchronously. Significant cost savings.

**When to use batch APIs vs. real-time:**
- Batch API: Non-urgent processing, cost-sensitive, large volumes
- Real-time with concurrency: Need results within minutes, moderate volumes

## Error Handling and Retries

At scale, everything fails. Your pipeline needs to handle:

**Transient errors (429, 500, 503)** — Retry with exponential backoff. Start at 1 second, double each retry, cap at 60 seconds. Add jitter to prevent thundering herd.

**Content policy errors (400)** — Don't retry. Log the item, skip it, review later. Some items will trigger safety filters.

**Malformed responses** — The LLM might return invalid JSON or incomplete responses. Parse carefully, retry once, then flag for review.

**Timeout errors** — Set reasonable timeouts (30–60 seconds). Retry once on timeout.

```python
async def call_with_retry(item, max_retries=3):
    for attempt in range(max_retries):
        try:
            result = await call_llm(item)
            return {"status": "success", "result": result}
        except RateLimitError:
            await asyncio.sleep(2 ** attempt + random.random())
        except ContentPolicyError:
            return {"status": "filtered", "item_id": item['id']}
        except Exception as e:
            if attempt == max_retries - 1:
                return {"status": "failed", "error": str(e)}
            await asyncio.sleep(2 ** attempt)
```

## Cost Management

Batch processing can get expensive fast. A few strategies:

**Estimate before running.** Count tokens in your input, estimate output tokens, calculate cost. `50,000 items × 500 input tokens × 200 output tokens × $3/M input + $15/M output = $175`. Know this number before you start.

**Use the cheapest model that works.** Run 100 items through GPT-4o, Claude Sonnet, and a smaller model. If the smaller model gets 95% accuracy on your task, use it and save 80%.

**Cache identical inputs.** If multiple items produce the same prompt (e.g., same template, same categories), cache the results. Even 10% cache hit rate saves real money at scale.

**Process incrementally.** Don't reprocess everything when new data arrives. Track what's been processed and only run new items.

## Monitoring

For long-running batch jobs, you need visibility:

- **Progress:** Items processed / total, estimated time remaining
- **Error rate:** If errors spike above 5%, pause and investigate
- **Cost tracking:** Running total of tokens consumed and estimated cost
- **Throughput:** Requests per second, tokens per second
- **Quality spot checks:** Sample 1% of results and verify quality

Log these metrics every N items (every 100 or every minute) so you can catch problems early rather than discovering at the end that 30% of your results are garbage.

## Putting It Together

A complete batch pipeline for 50,000 items:

1. Write items to JSONL with unique IDs
2. If using batch API: submit and wait for results
3. If using real-time API: process in chunks of 100, 10 concurrent requests, with rate limiting
4. Save results immediately with item IDs
5. On failure: restart, skip already-processed items
6. After completion: run quality checks on a sample
7. Export results

Total time for 50,000 items: ~2–4 hours (real-time) or ~12–24 hours (batch API). Cost: $100–300 depending on model and token counts.

Build the pipeline once, reuse it forever. The infrastructure investment pays for itself on the second batch job.
