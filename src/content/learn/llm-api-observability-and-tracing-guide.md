---
title: "LLM Observability: Tracing, Logging, and Debugging AI Applications"
depth: technical
pillar: building
topic: llm-api-integration
tags: [llm-api-integration, observability, tracing, logging, debugging, production]
author: bee
date: "2026-03-18"
readTime: 9
description: "When your LLM app misbehaves in production, you need to understand what happened, why, and how to fix it. This guide covers observability patterns for LLM-powered applications."
related: [llm-api-evals-in-production-guide, llm-api-error-handling-retry-patterns, ai-workflows-monitoring-and-alerting]
---

Traditional software is deterministic — the same input produces the same output. LLM applications aren't. The same prompt can produce different results each time, quality degrades silently, and "it worked in testing" means nothing when a model update subtly changes behavior. This is why LLM observability matters more than traditional application monitoring.

## What to Observe

### The Four Pillars of LLM Observability

**1. Input/Output Logging** — Every prompt sent and response received. This is your ground truth for debugging.

**2. Latency and Performance** — Time to first token (TTFT), total generation time, tokens per second. Users notice latency.

**3. Cost Tracking** — Input tokens, output tokens, model used, cost per request. LLM costs can spike unexpectedly.

**4. Quality Signals** — User feedback, automated evaluations, error rates. The hardest to measure, the most important.

## Tracing LLM Calls

A single user interaction often involves multiple LLM calls — retrieval, generation, tool use, validation. Tracing connects these into a coherent story.

### Trace Structure

```
Trace: "User asks about refund policy"
├── Span: Query rewriting (35ms, GPT-4o-mini)
│   ├── Input: "how do i get my money back"
│   └── Output: "refund policy process timeline requirements"
├── Span: Vector search (12ms)
│   └── Retrieved: 5 chunks, scores [0.92, 0.87, 0.84, 0.71, 0.68]
├── Span: Generation (820ms, Claude Sonnet)
│   ├── Input: system prompt + 5 chunks + user query
│   ├── Output: "To request a refund, you can..."
│   └── Tokens: 1,240 in / 380 out = $0.0089
└── Span: Safety check (45ms, GPT-4o-mini)
    └── Result: PASS
```

Each span captures: operation name, model, latency, token counts, input/output, and any metadata relevant to debugging.

### Implementation with OpenTelemetry

The LLM observability ecosystem has standardized around OpenTelemetry (OTel) semantic conventions for GenAI:

```python
from opentelemetry import trace
from opentelemetry.semconv.ai import SpanAttributes

tracer = trace.get_tracer("my-ai-app")

async def generate_response(query, context):
    with tracer.start_as_current_span("llm.generate") as span:
        span.set_attribute(SpanAttributes.LLM_SYSTEM, "anthropic")
        span.set_attribute(SpanAttributes.LLM_REQUEST_MODEL, "claude-sonnet-4-20250514")
        span.set_attribute(SpanAttributes.LLM_REQUEST_MAX_TOKENS, 1024)

        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            messages=[{"role": "user", "content": f"{context}\n\n{query}"}],
            max_tokens=1024
        )

        span.set_attribute(SpanAttributes.LLM_USAGE_INPUT_TOKENS,
                          response.usage.input_tokens)
        span.set_attribute(SpanAttributes.LLM_USAGE_OUTPUT_TOKENS,
                          response.usage.output_tokens)
        span.set_attribute("llm.response.text", response.content[0].text)

        return response
```

## Observability Platforms

### Purpose-Built LLM Observability

**Langfuse** (open source) — Traces, prompt management, evaluations, cost tracking. Self-hostable. The most popular open-source option.

**LangSmith** — LangChain's observability platform. Deep integration with LangChain/LangGraph. Good for teams already in the LangChain ecosystem.

**Braintrust** — Combines logging with evaluation. Strong eval framework that integrates directly with traces.

**Arize Phoenix** (open source) — Focuses on embeddings analysis and retrieval quality. Good for RAG debugging.

### When to Use What

- **Small team, just starting:** Langfuse (free tier, self-hostable, comprehensive)
- **LangChain-heavy stack:** LangSmith
- **Need strong evals:** Braintrust
- **RAG-focused:** Arize Phoenix + Langfuse

## Cost Tracking

LLM costs are notoriously unpredictable. Track:

```python
# Per-request cost tracking
def calculate_cost(model, input_tokens, output_tokens):
    pricing = {
        "gpt-4o": {"input": 2.50, "output": 10.00},     # per 1M tokens
        "claude-sonnet": {"input": 3.00, "output": 15.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    }
    rate = pricing.get(model, {"input": 0, "output": 0})
    return (input_tokens * rate["input"] + output_tokens * rate["output"]) / 1_000_000
```

Set up alerts for:
- Daily cost exceeds 2x normal
- Single request costs more than $X (indicates prompt injection or runaway context)
- Per-user cost exceeds threshold (abuse detection)

## Quality Monitoring

### Automated Evaluation

Run lightweight evaluations on a sample of production traffic:

```python
async def evaluate_response(query, response, context):
    """Run automated quality checks on a sample of responses."""
    checks = {
        "relevance": await check_relevance(query, response),
        "grounded": await check_grounding(response, context),
        "safety": await check_safety(response),
        "format": check_format_compliance(response),
    }
    return checks
```

**What to evaluate:**
- **Relevance:** Does the response answer the query?
- **Groundedness:** Are claims supported by the provided context? (Critical for RAG)
- **Safety:** Does the response contain harmful content?
- **Factuality:** Are verifiable claims correct?

### User Feedback Integration

Thumbs up/down is the simplest quality signal. Tie feedback to specific traces so you can see exactly what prompt, context, and model produced the bad result.

### Drift Detection

Model behavior changes — from provider-side updates, prompt changes, or data distribution shifts. Monitor:
- Average response length over time
- Distribution of output categories (for classification tasks)
- Embedding similarity between outputs over time windows
- Refusal rates (sudden increase often signals model update)

## Debugging Patterns

### "Why did it say that?"

1. Find the trace for the problematic response
2. Examine the full input (system prompt + retrieved context + user message)
3. Check: was the right context retrieved? Was the system prompt correct? Were there tool call errors?
4. Replay the exact input to the same model — is it reproducible?

### "Why is it slow?"

1. Check latency breakdown across spans
2. Common culprits: large context (high TTFT), multiple sequential LLM calls, slow retrieval
3. Compare against baseline latency for the same model and input size

### "Why did costs spike?"

1. Check for prompt injection attacks that inflate context
2. Look for retry storms (error → retry → error → retry)
3. Identify if a code change increased context size or added LLM calls
4. Check if a model routing decision changed (sending traffic to a more expensive model)

## Practical Setup

A minimal observability stack for LLM applications:

1. **Instrument every LLM call** with trace context (model, tokens, latency, cost)
2. **Log full prompts and responses** (with PII redaction) to a queryable store
3. **Set up cost alerts** — daily and per-request thresholds
4. **Sample-evaluate** 1–5% of production traffic for quality
5. **Dashboard** — latency P50/P95/P99, daily cost, error rate, quality scores

Don't wait until you have a production incident to set this up. Instrument from day one and you'll catch problems before users do.
