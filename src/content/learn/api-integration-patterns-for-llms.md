---
title: "API Integration Patterns for LLM Features"
depth: technical
pillar: building
topic: llm-api-integration
tags: [api, llm, backend, architecture]
author: bee
date: "2026-03-03"
readTime: 13
description: "A technical guide to shipping LLM features safely: request shaping, guardrails, retries, and observability."
related: [rag-for-builders-mental-model]
---

Adding an LLM call to your product is easy. Getting it to behave reliably in production — under load, with diverse inputs, across model versions, without leaking data — is where most teams underinvest.

This is the integration pattern guide you should read before you ship LLM-powered features to real users. It covers the architecture decisions that compound over time: the ones that are cheap to get right in week one and expensive to retrofit in month six.

## Baseline architecture: keep the model out of the UI

The most common mistake is calling the LLM directly from client-side code. This exposes your API key, puts prompt logic where users can inspect it, and makes it impossible to add server-side controls.

The baseline pattern:

```
Client → API Gateway → LLM Service Layer → Provider(s)
```

**Client** sends a structured request with the user's intent. It doesn't know which model is being used, what the prompt looks like, or how retries are handled.

**API Gateway** handles auth, rate limiting, and request logging before anything reaches the LLM layer.

**LLM Service Layer** is where your prompt templates live, your policy controls run, and provider logic is isolated. This layer owns the LLM interface — everything above it communicates through your API contract.

**Provider(s)** are OpenAI, Anthropic, Google, or whatever model backend you're using. They're swappable at this layer because the service layer abstracts them.

This structure lets you swap providers, run A/B tests on prompts, and add controls without touching client code.

## Input → process → output: a real integration flow

**Scenario:** A B2B SaaS product wants to add an AI feature that summarizes support tickets.

**Input (from client):** `{ "ticket_id": "T-8812", "ticket_body": "We can't export to CSV anymore after the last update..." }`

**LLM Service Layer processes:**
1. Fetch full ticket content by ID
2. Strip PII (customer name, email, account ID) before sending to provider
3. Render prompt template: "Summarize this support ticket in 2 sentences for an agent. Identify: issue type, urgency, and suggested first step. [ticket body]"
4. Call provider API with retry logic, 8-second timeout
5. Validate output against expected schema
6. Re-inject customer context from local data (not from LLM response)
7. Return structured response to client

**Output (to client):** `{ "summary": "User can't export to CSV after recent update, blocking end-of-month reporting.", "issue_type": "regression", "urgency": "high", "suggested_step": "Check export service changelog for breaking changes in last release." }`

The client gets a clean, structured object. The provider never saw PII. The prompt is versioned server-side. The output is validated. This is what production-grade LLM integration looks like.

## Required controls: the non-negotiables

**Timeouts and retries.** LLM providers have variable latency. Without a timeout, a slow request blocks your thread. Set a firm timeout (typically 8–15 seconds for most LLM calls). Add retry logic with exponential backoff and jitter to handle transient failures — but cap retries at 2–3 attempts and track the failure rate.

```python
# Pseudocode for retry with jitter
for attempt in range(MAX_RETRIES):
    try:
        response = call_llm(prompt, timeout=10)
        break
    except TimeoutError:
        wait = base_delay * (2 ** attempt) + random.uniform(0, 1)
        sleep(wait)
```

**Circuit breaker.** If your LLM provider is degraded, you want to stop sending requests and fail fast — not queue hundreds of requests that will all fail after timeout. A circuit breaker opens when error rates exceed a threshold and stops calls until the provider recovers.

**Prompt versioning.** Every prompt template should have a version identifier. When you change a prompt, you should be able to trace which version was used for any given output. This is essential for debugging regressions and auditing behavior changes.

**Output schema validation.** Validate LLM output before returning it to the client. If you ask for JSON and get something that doesn't parse, handle it gracefully — don't let it crash your application. Use a fallback path: log the raw output, trigger a retry with a more explicit format instruction, or return a safe error state.

**PII redaction before logging.** Log prompts and responses for observability — but strip sensitive data first. A customer's email address or account number should never appear in your LLM request logs. Apply PII redaction as a pipeline step before any content reaches your logging layer.

## Response shaping: structured outputs

Unstructured LLM text is hard to use reliably in applications. Use structured output modes wherever your provider supports them.

**JSON Schema enforcement** (OpenAI, Anthropic support this): define the exact shape of your response and the model is constrained to produce it. This eliminates the "I got a paragraph when I needed a JSON object" failure mode.

```json
{
  "summary": "string",
  "urgency": "low | medium | high",
  "suggested_step": "string"
}
```

**When structured output isn't available:** add explicit format instructions to the prompt ("Return ONLY valid JSON. No explanation. No markdown code blocks.") and run the output through a parser with error handling. Log failures by prompt version so you can improve the instruction over time.

**Fallback gracefully.** When output fails validation, don't crash. Return a degraded-but-safe response ("We couldn't generate a summary for this ticket. Review it manually.") and log the failure for analysis.

## Observability: what to track

You cannot improve what you don't measure. These are the four metrics every LLM integration should track from day one:

**Latency (p50 and p95).** p50 tells you typical performance. p95 tells you what your worst-case users experience. If your p95 latency is 12 seconds, that's a UX problem even if your p50 is 2 seconds. Track by prompt version and provider separately.

**Token cost per request.** LLM costs scale with token volume. Track input tokens + output tokens per request type. A single prompt template that runs 10,000 times a day at 2,000 tokens each is $X — you need to know that number before you're surprised by the invoice.

**Error rate by prompt version.** Track validation failures, timeouts, and provider errors separately. A spike in validation failures after a prompt update is a clear signal that the update broke something. Version-level error tracking makes this visible immediately.

**Human override rate.** For features where humans review AI output before it's used, track how often they override it. A 40% override rate means the AI is wrong or poorly calibrated nearly half the time — that's not a successful feature, it's extra work for the user. Use override signals to improve prompts.

## Multi-provider strategy: optionality before you need it

Vendor lock-in is real with LLM providers. A single provider going down, raising prices, or degrading in quality on your use case is a real risk. Design for optionality from the start.

**Provider abstraction layer:** all provider calls go through a single interface in your code. Switching providers means changing one configuration, not refactoring call sites across your codebase.

```python
class LLMProvider:
    def complete(self, prompt: str, schema: dict) -> dict:
        raise NotImplementedError

class OpenAIProvider(LLMProvider):
    def complete(self, prompt, schema): ...

class AnthropicProvider(LLMProvider):
    def complete(self, prompt, schema): ...
```

**Standardized request/response model:** define your own request and response format that maps to any provider. This prevents provider-specific formats from bleeding into your application logic.

**Policy layer independent of vendor:** content policies, retry logic, PII handling, and cost controls belong in your LLM service layer — not inside any provider-specific code. This means your policies stay consistent regardless of which provider you're routing to.

## Pitfalls and failure modes

**Calling the LLM directly from the frontend.** This exposes your API key and removes all server-side controls. Even for prototypes, route through a backend.

**No rate limiting on your own API.** Without rate limits, a single misbehaving client or a traffic spike can send thousands of LLM calls, racking up costs and hitting provider rate limits. Implement rate limiting at the API gateway level from the start.

**Ignoring token budget management.** Very large inputs can exceed context windows or produce enormous costs. Validate input length before calling the provider. For user-supplied inputs, truncate or reject inputs that exceed your token budget.

**Trusting LLM output without validation.** A model asked to return JSON will sometimes return JSON with a sentence before it. Or a number as a string instead of an integer. Or an array instead of an object. Don't assume the output is valid — validate every time.

**No versioning of prompts.** When something breaks in production, you need to know what changed. Without prompt versioning, you're debugging blindly.

**No eval before shipping.** Build a small evaluation set — 20–50 representative inputs with expected outputs — before you ship. Run it whenever you change a prompt or switch providers. This is the minimum viable quality bar for production LLM features.

## The integration quality ladder

Think of LLM integration quality in tiers:

**Tier 1 (prototype):** direct API call, no error handling, no validation, no logging. Fine for demos.

**Tier 2 (internal tool):** server-side calls, basic retries, prompt stored server-side, some logging. Acceptable for internal use.

**Tier 3 (production feature):** full architecture above — timeouts, circuit breaker, PII redaction, structured output, schema validation, prompt versioning, cost tracking, human override logging. Required for customer-facing features.

Most teams underinvest in the jump from Tier 1 to Tier 3 because the demo worked and the pressure to ship is high. The cost shows up later: in incidents, in debugging time, in surprise invoices, and in features that quietly stop working when the model updates.

Build it right once. It's cheaper than fixing it in production.
