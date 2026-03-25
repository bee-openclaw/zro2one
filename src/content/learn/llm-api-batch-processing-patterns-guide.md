---
title: "LLM API Batch Processing Patterns: Processing Thousands of Items Efficiently"
depth: technical
pillar: building
topic: llm-api-integration
tags: [llm-api-integration, batch-processing, async, concurrency, cost-optimization]
author: bee
date: "2026-03-25"
readTime: 11
description: "Practical patterns for batch-processing large volumes of data through LLM APIs — covering concurrency control, error handling, cost management, and the trade-offs between real-time and batch architectures."
related: [llm-api-rate-limiting-and-quotas-guide, llm-api-cost-optimization-guide, llm-api-error-handling-retry-patterns]
---

# LLM API Batch Processing Patterns: Processing Thousands of Items Efficiently

You have 50,000 customer reviews to classify. Or 10,000 documents to summarize. Or 100,000 records to enrich with AI-extracted data. Single API calls won't cut it — you need a batch processing system that handles volume, failures, cost, and latency.

This guide covers the patterns that work in production for processing large datasets through LLM APIs.

## The Architecture Decision: Real-Time vs. Batch

Before building anything, decide your processing model:

**Real-time (synchronous):** Process items as they arrive. Low latency, high per-item cost, complex error handling under load.

**Batch:** Collect items, process in bulk on a schedule or trigger. Higher latency (minutes to hours), lower cost, simpler error handling.

**Micro-batch:** Process small batches frequently (every few seconds or minutes). A middle ground.

For most data processing tasks — classification, extraction, summarization over large datasets — batch is the right choice. The rest of this guide assumes batch processing.

## Pattern 1: Concurrent Queue with Rate Limiting

The foundational pattern. Items enter a queue; worker processes pull items, call the API, and store results.

```python
import asyncio
import aiohttp
from asyncio import Semaphore

class BatchProcessor:
    def __init__(self, max_concurrent=20, rpm_limit=500):
        self.semaphore = Semaphore(max_concurrent)
        self.rpm_limit = rpm_limit
        self.request_times = []
    
    async def process_item(self, item, session):
        async with self.semaphore:
            await self._wait_for_rate_limit()
            try:
                result = await self._call_api(item, session)
                return {"id": item["id"], "result": result, "status": "success"}
            except Exception as e:
                return {"id": item["id"], "error": str(e), "status": "failed"}
    
    async def process_batch(self, items):
        async with aiohttp.ClientSession() as session:
            tasks = [self.process_item(item, session) for item in items]
            return await asyncio.gather(*tasks)
```

Key parameters:
- **Concurrency limit**: How many requests fly simultaneously. Start at 10-20, increase until you hit rate limits.
- **RPM/TPM limits**: Respect the provider's rate limits. Track your request rate and throttle proactively rather than waiting for 429s.

## Pattern 2: Provider Batch APIs

OpenAI, Anthropic, and other providers now offer dedicated batch APIs that accept a file of requests and return results asynchronously. These typically offer:

- **50% cost reduction** compared to real-time API calls
- **Higher throughput limits** (separate from real-time rate limits)
- **24-hour processing window** (results returned within 24 hours, often much faster)

```python
# OpenAI Batch API pattern
import json

# Prepare batch file
requests = []
for item in items:
    requests.append({
        "custom_id": item["id"],
        "method": "POST",
        "url": "/v1/chat/completions",
        "body": {
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": item["prompt"]}]
        }
    })

# Upload and submit
batch_file = client.files.create(file=jsonl_bytes, purpose="batch")
batch = client.batches.create(input_file_id=batch_file.id, endpoint="/v1/chat/completions")

# Poll for completion
while batch.status != "completed":
    await asyncio.sleep(60)
    batch = client.batches.retrieve(batch.id)
```

**When to use**: Any non-time-sensitive workload. The 50% cost savings alone justifies it for large volumes.

## Pattern 3: Checkpoint and Resume

Large batch jobs will fail partway through. Network issues, rate limit exhaustion, API outages — something will go wrong. Design for resumability from the start.

```python
class CheckpointedProcessor:
    def __init__(self, checkpoint_path):
        self.checkpoint_path = checkpoint_path
        self.completed = self._load_checkpoint()
    
    def _load_checkpoint(self):
        try:
            with open(self.checkpoint_path) as f:
                return set(json.load(f))
        except FileNotFoundError:
            return set()
    
    def _save_checkpoint(self):
        with open(self.checkpoint_path, 'w') as f:
            json.dump(list(self.completed), f)
    
    async def process_batch(self, items):
        pending = [i for i in items if i["id"] not in self.completed]
        print(f"Resuming: {len(self.completed)} done, {len(pending)} remaining")
        
        for chunk in chunked(pending, 100):
            results = await self._process_chunk(chunk)
            for r in results:
                if r["status"] == "success":
                    self.completed.add(r["id"])
            self._save_checkpoint()
```

Save checkpoints every N items (100-1000). Store both completed IDs and failed IDs with error details. On restart, skip completed items and optionally retry failed ones.

## Pattern 4: Adaptive Concurrency

Rate limits are not always fixed. Providers may reduce limits during high-traffic periods. Time-of-day affects throughput. Your concurrency should adapt.

```python
class AdaptiveConcurrency:
    def __init__(self, initial=10, min_c=2, max_c=50):
        self.current = initial
        self.min = min_c
        self.max = max_c
        self.consecutive_successes = 0
        self.consecutive_429s = 0
    
    def on_success(self):
        self.consecutive_429s = 0
        self.consecutive_successes += 1
        if self.consecutive_successes >= 20:
            self.current = min(self.current + 2, self.max)
            self.consecutive_successes = 0
    
    def on_rate_limit(self):
        self.consecutive_successes = 0
        self.consecutive_429s += 1
        self.current = max(self.current // 2, self.min)
```

Increase concurrency slowly on success; decrease aggressively on rate limits. This auto-tunes to whatever the provider allows.

## Pattern 5: Cost-Aware Processing

LLM API costs add up fast at batch scale. Build cost tracking into your pipeline.

**Before processing:**
- Estimate total tokens from your dataset (character count ÷ 4 is a rough token estimate)
- Calculate expected cost at current pricing
- Set a cost budget with an automatic stop

**During processing:**
- Track actual tokens consumed (from API response headers/body)
- Compare to budget
- Alert and pause if costs exceed expectations

**Optimization levers:**
- **Prompt compression**: Minimize prompt length while maintaining quality. A 20% shorter prompt saves 20% on input tokens.
- **Model selection**: Use the cheapest model that produces acceptable quality. Test GPT-4o-mini or Claude Haiku before defaulting to expensive models.
- **Caching**: If many items produce identical prompts (same template, same context), cache responses.
- **Batched prompts**: Process multiple items in a single API call when possible (e.g., "Classify the following 5 reviews" instead of 5 separate calls).

## Pattern 6: Quality Sampling

At batch scale, you cannot review every result. Build in quality checks:

1. **Pre-flight sample**: Process 50-100 items first. Manually review results. Adjust prompts if quality is poor.
2. **Running sample**: Randomly flag 1-2% of results for human review during processing.
3. **Post-processing validation**: Run automated checks on all results (valid JSON? expected categories? reasonable length?).
4. **Drift detection**: Compare result distributions across the batch. If the first 10,000 items are 60% positive and the next 10,000 are 30% positive, something changed.

## Error Handling at Scale

Individual errors become systemic at batch scale. Handle them categorically:

| Error Type | Response |
|---|---|
| 429 Rate Limit | Exponential backoff, reduce concurrency |
| 500 Server Error | Retry with backoff (up to 3 times) |
| 400 Bad Request | Log and skip — the item has a problem |
| Timeout | Retry once, then flag for manual review |
| Context Length | Truncate input and retry, or split into smaller pieces |
| Malformed Output | Retry with stricter formatting instructions (up to 2 times) |

Collect all failures into a retry queue. After the main batch completes, reprocess failures with lower concurrency and more conservative settings.

## Monitoring and Observability

Track these metrics during batch processing:

- **Throughput**: Items processed per minute
- **Error rate**: Percentage of failures (alert if > 5%)
- **Latency distribution**: P50, P95, P99 of API response times
- **Cost**: Running total and cost per item
- **Progress**: Items completed / total items, estimated time remaining
- **Quality signals**: Distribution of outputs (category counts, average lengths)

A simple dashboard showing these metrics saves hours of debugging when something goes wrong at item 37,000 of 50,000.

## Putting It Together

A production batch pipeline typically combines several patterns:

1. Provider batch API for cost savings (Pattern 2)
2. Checkpoint/resume for reliability (Pattern 3)
3. Cost tracking with budget limits (Pattern 5)
4. Quality sampling at pre-flight and during processing (Pattern 6)
5. Structured error handling with retry queues (Error Handling section)

Start simple — a concurrent queue with checkpointing handles most needs. Add complexity only when the scale or reliability requirements demand it.
