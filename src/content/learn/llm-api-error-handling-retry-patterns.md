---
title: "Error Handling and Retry Patterns for LLM APIs"
depth: technical
pillar: applied
topic: llm-api-integration
tags: [llm-api-integration, error-handling, reliability, production, best-practices]
author: bee
date: "2026-03-16"
readTime: 9
description: "Production-grade error handling for LLM API integrations — retry strategies, fallback patterns, and graceful degradation."
related: [llm-api-fallbacks-and-failover-guide, llm-api-integration-reliability-checklist, llm-api-cost-optimization-guide]
---

# Error Handling and Retry Patterns for LLM APIs

LLM APIs fail. They rate-limit you, time out on long generations, return malformed responses, and occasionally go down entirely. If your application treats these as exceptional events, your users will have a bad time.

Good error handling for LLM APIs isn't about preventing failures — it's about handling them gracefully so your application stays useful.

## The Error Taxonomy

LLM APIs produce a predictable set of errors. Handle each category differently.

### Transient Errors (Retry)

- **429 Too Many Requests**: Rate limited. Almost always worth retrying with backoff.
- **500 Internal Server Error**: Provider-side issue. Retry a few times.
- **502/503 Bad Gateway / Service Unavailable**: Infrastructure issue. Retry with longer backoff.
- **Timeout**: Generation took too long. Retry with shorter max_tokens or a faster model.

### Client Errors (Fix, Don't Retry)

- **400 Bad Request**: Malformed request. Fix your payload.
- **401 Unauthorized**: Invalid API key. Don't retry — fix authentication.
- **403 Forbidden**: Access denied. Check permissions.
- **413 Payload Too Large**: Input exceeds context window. Truncate or chunk.
- **422 Unprocessable Entity**: Invalid parameters. Fix the request.

### Content Errors (Validate and Retry)

- **Empty response**: Model returned nothing useful
- **Malformed JSON**: Asked for structured output, got invalid JSON
- **Refusal**: Model declined to answer (content policy)
- **Truncated output**: Hit max_tokens before completing

## Retry Strategy: Exponential Backoff with Jitter

The standard approach. Wait longer between each retry, with randomness to avoid thundering herd.

```python
import time
import random
from openai import OpenAI, RateLimitError, APITimeoutError, APIConnectionError

client = OpenAI()

def call_llm_with_retry(messages, max_retries=3, base_delay=1.0):
    for attempt in range(max_retries + 1):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                timeout=30,
            )
            return response.choices[0].message.content
        
        except RateLimitError as e:
            if attempt == max_retries:
                raise
            # Use Retry-After header if available
            retry_after = getattr(e, 'retry_after', None)
            delay = retry_after or base_delay * (2 ** attempt)
            delay += random.uniform(0, delay * 0.1)  # jitter
            time.sleep(delay)
        
        except (APITimeoutError, APIConnectionError) as e:
            if attempt == max_retries:
                raise
            delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
            time.sleep(delay)
        
        except Exception as e:
            # Non-retryable error
            raise
```

### Key Parameters

- **Max retries**: 3 is usually enough. More than 5 is rarely helpful.
- **Base delay**: 1 second for rate limits, 2-5 seconds for server errors.
- **Max delay**: Cap at 60 seconds. If you're waiting longer, something is seriously wrong.
- **Jitter**: Always add randomness. Without it, all your retries hit the API simultaneously.

## Fallback Patterns

When retries fail, fall back gracefully.

### Model Fallback Chain

```python
FALLBACK_CHAIN = [
    {"provider": "openai", "model": "gpt-4o"},
    {"provider": "anthropic", "model": "claude-sonnet-4-20250514"},
    {"provider": "openai", "model": "gpt-4o-mini"},
]

async def call_with_fallback(messages):
    errors = []
    for config in FALLBACK_CHAIN:
        try:
            return await call_provider(config, messages)
        except Exception as e:
            errors.append(f"{config['provider']}/{config['model']}: {e}")
            continue
    
    raise AllProvidersFailedError(errors)
```

Design considerations:
- **Cost ordering**: Put cheaper models later in the chain (they serve as fallbacks, not primaries)
- **Capability matching**: Ensure fallback models can handle the task. Don't fall back from GPT-4o to a model that can't do function calling if you need function calling.
- **Provider diversity**: Use multiple providers. If OpenAI is down, Anthropic probably isn't.

### Cached Response Fallback

For queries that repeat, serve a cached response when live calls fail:

```python
import hashlib

def get_cache_key(messages):
    content = str(messages)
    return hashlib.sha256(content.encode()).hexdigest()

async def call_with_cache_fallback(messages):
    cache_key = get_cache_key(messages)
    
    try:
        response = await call_llm(messages)
        await cache.set(cache_key, response, ttl=3600)
        return response
    except Exception:
        cached = await cache.get(cache_key)
        if cached:
            return cached  # Stale is better than nothing
        raise
```

### Graceful Degradation

When AI features fail, the app should still work:

```python
async def get_product_description(product):
    try:
        return await generate_ai_description(product)
    except Exception:
        # Fall back to template-based description
        return f"{product.name} - {product.category}. {product.basic_description}"
```

## Handling Content-Level Errors

API calls succeed, but the response isn't what you wanted.

### JSON Validation

When you need structured output:

```python
import json
from pydantic import BaseModel, ValidationError

class ProductReview(BaseModel):
    sentiment: str  # positive, negative, neutral
    score: float    # 0.0 to 1.0
    summary: str

def parse_llm_json(response_text, max_retries=2):
    for attempt in range(max_retries + 1):
        try:
            # Try to extract JSON from response
            text = response_text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            
            data = json.loads(text)
            return ProductReview(**data)
        
        except (json.JSONDecodeError, ValidationError) as e:
            if attempt == max_retries:
                raise
            # Ask the model to fix its output
            response_text = call_llm([
                {"role": "user", "content": f"Fix this JSON to match the schema. Error: {e}\n\nBroken JSON:\n{response_text}"}
            ])
```

Better approach: use structured output features when available (OpenAI's `response_format`, Anthropic's tool use for structured data). These guarantee valid JSON from the API.

### Truncation Detection

```python
def check_truncation(response):
    if response.choices[0].finish_reason == "length":
        # Response was cut off — hit max_tokens
        # Options: increase max_tokens, ask for continuation, or accept partial
        return True
    return False
```

### Refusal Handling

```python
REFUSAL_INDICATORS = [
    "I can't help with",
    "I'm not able to",
    "I apologize, but I cannot",
    "As an AI, I",
]

def is_refusal(response_text):
    return any(indicator.lower() in response_text.lower() 
               for indicator in REFUSAL_INDICATORS)
```

When you detect a refusal, options include: rephrasing the prompt, using a different model, or escalating to a human.

## Circuit Breaker Pattern

When a provider is consistently failing, stop hammering it:

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failures = 0
        self.threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.last_failure_time = 0
        self.state = "closed"  # closed = normal, open = blocking
    
    def can_proceed(self):
        if self.state == "closed":
            return True
        if time.time() - self.last_failure_time > self.recovery_timeout:
            self.state = "half-open"
            return True  # Allow one test request
        return False
    
    def record_success(self):
        self.failures = 0
        self.state = "closed"
    
    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.threshold:
            self.state = "open"
```

## Monitoring and Alerting

Track these metrics:

- **Error rate by type** (429, 500, timeout, content errors)
- **Retry rate** (high retry rate = something's wrong even if requests eventually succeed)
- **Fallback activation rate** (how often you're using backup models)
- **P95/P99 latency** (including retries)
- **Cost per successful request** (retries cost money)

Alert when:
- Error rate exceeds 5% over 5 minutes
- A provider's circuit breaker opens
- Fallback chain reaches the last option
- Average latency doubles

## Production Checklist

Before deploying an LLM-powered feature:

- [ ] All API calls have timeouts set
- [ ] Retries with exponential backoff for transient errors
- [ ] Fallback chain with at least one alternative
- [ ] Graceful degradation when all AI calls fail
- [ ] Structured output validation
- [ ] Truncation detection
- [ ] Rate limit awareness (respect Retry-After headers)
- [ ] Circuit breakers for each provider
- [ ] Error logging with request/response context
- [ ] Cost monitoring and alerts
- [ ] User-facing error messages that make sense

LLM APIs are unreliable by nature — variable latency, rate limits, content filtering, occasional outages. Build your application assuming every call might fail, and it'll work well when they don't.
