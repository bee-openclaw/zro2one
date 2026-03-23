---
title: "LLM API Webhooks and Async Patterns: Beyond Request-Response"
depth: technical
pillar: integrations
topic: llm-api-integration
tags: [llm-api-integration, webhooks, async, architecture]
author: bee
date: "2026-03-23"
readTime: 10
description: "How to build LLM-powered systems that go beyond synchronous request-response — covering webhook callbacks, job queues, long-running tasks, and event-driven architectures."
related: [llm-api-streaming-responses, llm-api-rate-limiting-and-quotas-guide, llm-api-error-handling-retry-patterns]
---

# LLM API Webhooks and Async Patterns: Beyond Request-Response

Most LLM API tutorials show synchronous request-response: send a prompt, wait for the answer. This works for chatbots but breaks down for production systems that need to process documents, run multi-step workflows, or handle high throughput.

Real systems need async patterns. Here's how to build them.

## Why Sync Breaks Down

LLM API calls are slow. A complex prompt with a long response can take 30-60 seconds. In a synchronous architecture:

- **HTTP timeouts** — load balancers, API gateways, and clients all have timeout limits (often 30s)
- **Thread exhaustion** — each waiting request holds a thread/connection. 100 concurrent LLM calls = 100 blocked threads.
- **User experience** — nobody wants to stare at a spinner for 45 seconds
- **Retry complexity** — if the connection drops at second 29 of a 30-second call, you start over

## Pattern 1: Job Queue

The most common async pattern. Decouple request submission from result retrieval.

```
Client → POST /analyze → 202 Accepted {jobId: "abc123"}
                              ↓
                        Job Queue (Redis/SQS/RabbitMQ)
                              ↓
                        Worker picks up job
                              ↓
                        Worker calls LLM API
                              ↓
                        Worker stores result
                              ↓
Client → GET /jobs/abc123 → 200 {status: "complete", result: ...}
```

### Implementation

```python
# API endpoint - submit job
@app.post("/analyze")
async def submit_analysis(request: AnalysisRequest):
    job_id = str(uuid.uuid4())
    await redis.set(f"job:{job_id}:status", "queued")
    await queue.enqueue("llm_analysis", job_id=job_id, payload=request.dict())
    return {"jobId": job_id, "status": "queued"}

# Worker - process job
async def process_analysis(job_id: str, payload: dict):
    await redis.set(f"job:{job_id}:status", "processing")
    
    try:
        result = await llm.chat(messages=payload["messages"])
        await redis.set(f"job:{job_id}:status", "complete")
        await redis.set(f"job:{job_id}:result", json.dumps(result))
    except Exception as e:
        await redis.set(f"job:{job_id}:status", "failed")
        await redis.set(f"job:{job_id}:error", str(e))

# API endpoint - check status
@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    status = await redis.get(f"job:{job_id}:status")
    result = await redis.get(f"job:{job_id}:result")
    return {"jobId": job_id, "status": status, "result": json.loads(result) if result else None}
```

**Advantages:** simple, resilient, naturally rate-limited by worker count
**Disadvantages:** polling for results wastes resources, latency for simple requests

## Pattern 2: Webhook Callbacks

Instead of the client polling, your system calls the client back when the result is ready.

```
Client → POST /analyze {callbackUrl: "https://client.com/webhook"} → 202 Accepted
                              ↓
                        Process asynchronously
                              ↓
                        POST https://client.com/webhook {jobId, result}
```

### Implementation

```python
async def process_with_callback(job_id: str, payload: dict, callback_url: str):
    try:
        result = await llm.chat(messages=payload["messages"])
        
        # Call back the client
        await httpx.post(callback_url, json={
            "jobId": job_id,
            "status": "complete",
            "result": result,
            "completedAt": datetime.utcnow().isoformat()
        }, headers={
            "X-Webhook-Signature": sign_payload(result, webhook_secret)
        })
    except Exception as e:
        await httpx.post(callback_url, json={
            "jobId": job_id,
            "status": "failed",
            "error": str(e)
        })
```

### Webhook Reliability

Webhooks fail. The client's server might be down. The network might glitch. Build in:

1. **Retry with backoff** — retry failed webhook deliveries: 1s, 10s, 60s, 300s, 3600s
2. **Idempotency keys** — include a unique delivery ID so clients can deduplicate
3. **Signature verification** — HMAC signatures prove the webhook came from you
4. **Dead letter queue** — after max retries, store failed deliveries for manual review
5. **Status endpoint** — always provide a polling fallback for when webhooks fail

## Pattern 3: Server-Sent Events (SSE)

For streaming results to web clients. The LLM generates tokens, and you forward them in real-time.

```python
@app.get("/stream/{job_id}")
async def stream_result(job_id: str):
    async def event_generator():
        async for chunk in llm.chat_stream(messages=messages):
            yield f"data: {json.dumps({'token': chunk.content})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

**Best for:** user-facing chat interfaces where you want token-by-token streaming
**Watch out for:** proxy/load balancer timeouts on long-lived connections, connection recovery on mobile networks

## Pattern 4: Event-Driven Pipeline

For multi-step workflows where each LLM call triggers the next step.

```
Document uploaded
  → Event: document.uploaded
  → Worker 1: Extract text → Event: text.extracted
  → Worker 2: Summarize (LLM) → Event: summary.ready
  → Worker 3: Extract entities (LLM) → Event: entities.extracted
  → Worker 4: Generate report (LLM) → Event: report.ready
  → Notify user
```

Each step is independent, retryable, and observable. If the summarization step fails, you retry just that step — not the entire pipeline.

```python
# Event handler
@event_bus.on("text.extracted")
async def summarize(event):
    text = event.payload["text"]
    summary = await llm.chat(messages=[
        {"role": "system", "content": "Summarize this document concisely."},
        {"role": "user", "content": text}
    ])
    await event_bus.emit("summary.ready", {
        "documentId": event.payload["documentId"],
        "summary": summary.content
    })
```

## Rate Limiting and Backpressure

Async systems can submit LLM requests faster than the API can handle them. Build in backpressure:

```python
class RateLimitedLLMClient:
    def __init__(self, rpm_limit=60):
        self.semaphore = asyncio.Semaphore(rpm_limit)
        self.rate_limiter = TokenBucket(rpm_limit, per_seconds=60)
    
    async def chat(self, **kwargs):
        await self.rate_limiter.acquire()
        async with self.semaphore:
            try:
                return await self._client.chat(**kwargs)
            except RateLimitError as e:
                await asyncio.sleep(e.retry_after)
                return await self.chat(**kwargs)
```

## Monitoring Async LLM Systems

Track these metrics:
- **Queue depth** — jobs waiting. Growing = workers can't keep up.
- **Processing time** — end-to-end, not just LLM latency. Includes queue wait time.
- **Webhook delivery rate** — percentage of successful first-attempt deliveries
- **Retry rate** — high retry rates indicate downstream issues
- **Cost per job** — token usage × price, tracked per job type

## Choosing the Right Pattern

| Pattern | Best For | Complexity |
|---------|----------|------------|
| Job Queue + Polling | Simple async, internal systems | Low |
| Webhooks | B2B integrations, server-to-server | Medium |
| SSE/Streaming | User-facing chat, real-time UI | Medium |
| Event-Driven Pipeline | Multi-step workflows | High |
| Hybrid (queue + webhook + SSE) | Production systems at scale | High |

Most production systems end up with a hybrid: job queues for processing, webhooks for server-to-server notification, and SSE for user-facing streaming. Start with the simplest pattern that meets your needs and add complexity as requirements demand it.
