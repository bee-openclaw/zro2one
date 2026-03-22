---
title: "Load Testing LLM APIs: Strategies for Capacity Planning and Performance"
depth: technical
pillar: practice
topic: llm-api-integration
tags: [llm-api, load-testing, performance, capacity-planning, reliability]
author: bee
date: "2026-03-22"
readTime: 10
description: "How to load test LLM APIs effectively — from designing realistic test scenarios and measuring the right metrics to capacity planning and handling the unique challenges of generative AI workloads."
related: [llm-api-rate-limiting-and-quotas-guide, llm-api-error-handling-retry-patterns, llm-api-streaming-responses]
---

# Load Testing LLM APIs: Strategies for Capacity Planning and Performance

LLM APIs don't behave like traditional web APIs. Response times vary from 500ms to 60 seconds. Token generation is sequential, so streaming responses trickle in over seconds. Rate limits are measured in tokens per minute, not requests per second. And costs scale linearly with usage — a load test that sends 100K requests can cost thousands of dollars.

All of this means standard load testing approaches need adaptation. Here's how to do it right.

## Why LLM API Load Testing Is Different

### Variable Response Times

A traditional API returns in 50-200ms with low variance. An LLM API might return in 800ms for a short response or 30 seconds for a long one. The response time is primarily determined by output token count, which varies based on the prompt.

This means:
- **Percentile metrics matter more than averages.** P50 might be 2s while P99 is 45s.
- **Concurrent connection count is more important than requests per second.** With 30-second responses, even modest throughput requires many concurrent connections.

### Token-Based Rate Limits

Most LLM providers rate-limit on tokens per minute (TPM), not requests per minute. A single request with a 4000-token prompt and 2000-token response consumes 6000 tokens. Your effective request rate depends on your prompt and response sizes.

### Streaming vs. Non-Streaming

Streaming responses (Server-Sent Events) behave fundamentally differently from buffered responses:
- **Time to First Token (TTFT):** How quickly the first token arrives (typically 200-800ms)
- **Inter-Token Latency (ITL):** Time between successive tokens (typically 15-50ms)
- **Total Generation Time:** TTFT + (output_tokens × ITL)

Your users experience TTFT (when they see the response start) and ITL (how fast it "types"). Both matter more than total response time.

### Cost

A load test that sends 10,000 requests with 2000 input + 1000 output tokens each at $3/M input + $15/M output tokens costs:

```
Input:  10,000 × 2,000 = 20M tokens × $3/M  = $60
Output: 10,000 × 1,000 = 10M tokens × $15/M = $150
Total: $210
```

Scale that to 100K requests and you're at $2,100. Plan your budget before you start.

## Designing Test Scenarios

### Prompt Distribution

Your test prompts should match production traffic. Don't use a single fixed prompt — it won't exercise caching, context handling, or response length variation realistically.

**Build a prompt corpus:**

1. Sample 500-1000 real prompts from production logs (sanitized of PII)
2. Categorize by input length: short (<500 tokens), medium (500-2000), long (2000+)
3. Categorize by expected output length: short, medium, long
4. Weight each category to match production distribution

```python
import random

prompt_corpus = {
    "short_in_short_out": (prompts_ss, 0.40),  # 40% of traffic
    "short_in_long_out": (prompts_sl, 0.25),
    "long_in_short_out": (prompts_ls, 0.20),
    "long_in_long_out": (prompts_ll, 0.15),
}

def get_test_prompt():
    category = random.choices(
        list(prompt_corpus.keys()),
        weights=[v[1] for v in prompt_corpus.values()]
    )[0]
    return random.choice(prompt_corpus[category][0])
```

### Traffic Patterns

LLM API traffic is rarely uniform. Model realistic patterns:

- **Ramp-up:** Gradually increase from 0 to peak over 10-15 minutes
- **Sustained peak:** Hold peak load for 30+ minutes to identify thermal issues
- **Burst:** Sudden 5x spike for 2-3 minutes (simulates viral moment or batch job start)
- **Diurnal:** If testing self-hosted, simulate a full day's traffic pattern

### Concurrency Levels

Calculate your target concurrency:

```
Required concurrency = Target RPS × Average response time (seconds)

Example:
- Target: 50 requests/second
- Average response: 5 seconds
- Required concurrency: 250 simultaneous connections
```

For hosted APIs, also check your provider's concurrency limits. Some providers limit concurrent requests per API key independently of TPM limits.

## Metrics to Measure

### Latency Metrics

| Metric | What It Measures | Why It Matters |
|--------|-----------------|----------------|
| TTFT | Time to first token | User-perceived responsiveness |
| ITL | Inter-token latency | Streaming "smoothness" |
| Total latency | Full response time | Queue management, timeouts |
| P50, P95, P99 | Latency percentiles | Tail latency affects real users |

### Throughput Metrics

| Metric | What It Measures |
|--------|-----------------|
| Requests/second | Raw request throughput |
| Tokens/second (output) | Generation throughput |
| Tokens/minute (total) | Rate limit utilization |
| Successful request rate | Reliability under load |

### Error Metrics

| Metric | What to Watch |
|--------|---------------|
| 429 rate | Rate limiting frequency |
| 500/503 rate | Server errors under load |
| Timeout rate | Requests exceeding your timeout |
| Truncated responses | Hitting max_tokens before completion |

### Cost Metrics

| Metric | How to Calculate |
|--------|-----------------|
| Cost per request | (input_tokens × input_price + output_tokens × output_price) |
| Cost per user action | Aggregate across multi-request workflows |
| Cost at peak load | Extrapolate from test to production traffic |

## Load Testing Tools

### Adapted General-Purpose Tools

**k6 (Grafana):** Scriptable in JavaScript, supports streaming, good for custom LLM scenarios. Use the `k6/experimental/streams` module for SSE.

**Locust:** Python-based, easy to script complex LLM API interactions. Handles long-running requests well.

**Artillery:** YAML config, supports custom JS functions for prompt selection and response validation.

### LLM-Specific Tools

**LLMPerf:** Purpose-built for LLM benchmarking. Measures TTFT, ITL, and throughput natively. Supports OpenAI, Anthropic, and custom endpoints.

**vLLM benchmarking tools:** If you're self-hosting with vLLM, use its built-in benchmarking scripts that understand the engine's internals.

**LiteLLM load test:** Built into the LiteLLM proxy, tests across multiple providers with unified metrics.

### DIY with asyncio

For quick tests, a simple Python script works:

```python
import asyncio
import time
import aiohttp

async def send_request(session, prompt, results):
    start = time.monotonic()
    first_token_time = None
    tokens = 0
    
    async with session.post(
        "https://api.openai.com/v1/chat/completions",
        json={"model": "gpt-4o", "messages": [{"role": "user", "content": prompt}], "stream": True},
        headers={"Authorization": f"Bearer {API_KEY}"}
    ) as resp:
        async for line in resp.content:
            if line.startswith(b"data: ") and b"[DONE]" not in line:
                if first_token_time is None:
                    first_token_time = time.monotonic()
                tokens += 1
    
    end = time.monotonic()
    results.append({
        "ttft": first_token_time - start if first_token_time else None,
        "total": end - start,
        "tokens": tokens,
        "status": resp.status
    })

async def load_test(prompts, concurrency=50, total_requests=1000):
    results = []
    semaphore = asyncio.Semaphore(concurrency)
    
    async def bounded_request(prompt):
        async with semaphore:
            await send_request(session, prompt, results)
    
    async with aiohttp.ClientSession() as session:
        tasks = [bounded_request(random.choice(prompts)) for _ in range(total_requests)]
        await asyncio.gather(*tasks)
    
    return results
```

## Capacity Planning

### Estimating Production Requirements

**Step 1: Profile your workload**
- Average prompt length (tokens)
- Average response length (tokens)
- Peak requests per second
- Acceptable P95 latency

**Step 2: Calculate token budget**
```
Peak TPM = Peak RPS × 60 × (avg_input_tokens + avg_output_tokens)

Example:
- Peak: 20 RPS
- Avg input: 1500 tokens, avg output: 800 tokens
- Peak TPM: 20 × 60 × 2300 = 2,760,000 TPM
```

**Step 3: Compare against provider tiers**
Most providers offer tiered rate limits. Map your peak TPM to the appropriate tier and add 30-50% headroom.

**Step 4: Plan for growth**
LLM usage typically grows faster than traditional API usage as teams find new applications. Plan for 2-3x growth over 6 months.

### Multi-Provider Strategy

Don't put all your tokens in one basket:

- **Primary provider:** Handles 70-80% of traffic
- **Fallback provider:** Takes overflow and handles primary outages
- **Load test both paths** including failover scenarios

Test failover by simulating primary provider outages during load tests. Measure how quickly traffic shifts and whether the fallback can handle the surge.

## Self-Hosted Considerations

If you're running your own inference (vLLM, TGI, SGLang):

### GPU Saturation Testing

Push until GPUs are fully utilized. Monitor:
- GPU utilization (should approach 95-100% at peak)
- GPU memory usage
- KV cache utilization (vLLM-specific)
- Batch sizes achieved by continuous batching

### Queue Depth

Self-hosted systems queue requests when GPU capacity is exhausted. Monitor:
- Queue depth over time
- Queue wait time (not counted in generation metrics)
- Request rejection rate when queue is full

### Scaling Triggers

Determine at what load levels you need to scale:
- What concurrency causes P95 latency to exceed your SLA?
- What throughput causes queue depth to grow unboundedly?
- How quickly can you scale (auto-scaling latency for GPU instances)?

## Common Mistakes

1. **Testing with a single prompt.** Provider caching and KV cache reuse make single-prompt tests unrealistically fast.
2. **Ignoring warm-up.** First requests after a cold start are slower. Include a warm-up phase.
3. **Not testing streaming.** If your app uses streaming, test streaming. The performance characteristics are different.
4. **Forgetting cost.** Set a budget cap before starting. It's easy to burn thousands accidentally.
5. **Testing in isolation.** Your production system has middleware, caching layers, and orchestration. Test the full stack, not just the raw API.

## Key Takeaways

- LLM APIs need **different load testing approaches** than traditional APIs — variable latency, token-based limits, and high costs
- **TTFT and ITL** matter more than total response time for user experience
- Build a **realistic prompt corpus** weighted to match production traffic
- **Calculate costs before testing** and set budget caps
- Measure **P95/P99 latency**, not just averages — tail latency is where problems hide
- Plan capacity at **2-3x current peak** to handle growth
- Test **failover paths** and multi-provider routing under load
