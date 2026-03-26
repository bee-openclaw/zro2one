---
title: "LLM API Gateway Patterns: Routing, Metering, and Guardrails in One Layer"
depth: technical
pillar: applied
topic: llm-api-integration
tags: [llm-api-integration, gateway, routing, guardrails, architecture]
author: bee
date: "2026-03-26"
readTime: 8
description: "How to build an LLM API gateway that handles model routing, cost metering, content guardrails, and failover — the missing infrastructure layer between your app and model providers."
related: [llm-api-fallbacks-and-failover-guide, llm-api-rate-limiting-and-quotas-guide, llm-api-cost-optimization-guide]
---

Most production LLM applications start by calling a model API directly. Then requirements accumulate: you need fallback when OpenAI is down, cost tracking per customer, content filtering on outputs, model routing based on task complexity. Suddenly you're maintaining a tangled web of middleware scattered across your codebase.

An LLM API gateway consolidates these cross-cutting concerns into a single layer. Every request flows through it. Every response flows back through it. The gateway handles the infrastructure; your application handles the logic.

## Why a Gateway

Without a gateway, each application endpoint independently handles:
- API key management and rotation
- Rate limiting and retry logic
- Model selection and failover
- Cost tracking and attribution
- Content safety filtering
- Logging and observability

With a gateway, these concerns are configured once and applied uniformly. Your application code becomes a simple call to your gateway endpoint with a model preference and prompt — everything else is handled.

## Core Gateway Functions

### Model Routing

The gateway decides which model serves each request based on configurable rules:

**Cost-based routing.** Route simple classification tasks to smaller, cheaper models. Route complex reasoning to frontier models. The routing decision can be based on prompt length, task type (from a header or metadata), or even a lightweight classifier that estimates task complexity.

```yaml
routes:
  - match: { task: "classification", max_tokens: 100 }
    model: gpt-4o-mini
  - match: { task: "code_generation" }
    model: claude-sonnet-4-20250514
  - match: { task: "complex_reasoning" }
    model: claude-opus-4-20250514
  - default:
    model: gpt-4o
```

**Latency-based routing.** For real-time applications, route to whichever provider currently has the lowest latency. The gateway maintains a running average of response times per provider and routes accordingly.

**A/B testing.** Split traffic between models to compare quality. Route 90% to the production model and 10% to a candidate model. Collect quality metrics on both to inform migration decisions.

### Failover and Retry

When a provider returns an error or times out, the gateway automatically retries or fails over:

**Retry policy.** 429 (rate limit) → retry with exponential backoff. 500/503 → retry once after 1 second. 400 (bad request) → don't retry, return error to caller.

**Failover chain.** Primary: OpenAI GPT-4o → Fallback 1: Anthropic Claude Sonnet → Fallback 2: Google Gemini Pro. The gateway handles the API translation between providers transparently.

**Circuit breaker.** If a provider returns errors on >50% of requests over a 5-minute window, stop routing to it for 10 minutes. This prevents cascading failures and wasted latency on a degraded provider.

### Cost Metering

The gateway counts tokens on every request and response, calculates cost by model and provider, and attributes it:

- **Per customer:** Know exactly how much each customer costs you in API spend
- **Per feature:** Understand which product features drive the most cost
- **Per model:** Compare cost efficiency across providers for equivalent tasks
- **Budget enforcement:** Set spending limits per customer, per team, or per application. When a limit is approached, the gateway can alert, throttle, or block.

Token counting happens at the gateway level, not in application code. This ensures consistent measurement regardless of which team or service makes the request.

### Content Guardrails

Apply input and output filtering at the gateway layer:

**Input filtering.** Block or modify requests containing PII, prohibited content, or prompt injection attempts before they reach the model provider. This protects against both accidental data leakage and intentional misuse.

**Output filtering.** Scan model responses for hallucinated PII, harmful content, or policy violations before returning them to the caller. Flag or block responses that fail checks.

**Custom rules.** Industry-specific guardrails — healthcare applications might block responses that sound like medical diagnoses; financial applications might flag responses that resemble investment advice.

The key advantage of gateway-level guardrails: they apply uniformly across all applications, can be updated without code deployments, and provide a single audit point for compliance.

### Observability

Every request through the gateway generates structured logs:

```json
{
  "request_id": "req_abc123",
  "timestamp": "2026-03-26T14:30:00Z",
  "model": "gpt-4o",
  "provider": "openai",
  "customer_id": "cust_xyz",
  "input_tokens": 1247,
  "output_tokens": 389,
  "latency_ms": 2340,
  "cost_usd": 0.0182,
  "cache_hit": false,
  "guardrail_flags": [],
  "status": "success"
}
```

This data feeds dashboards, alerts, and analytics. When something goes wrong — costs spike, latency increases, quality drops — the gateway logs tell you exactly what changed.

## Build vs. Buy

### Open-Source Options

**LiteLLM.** A Python library that provides a unified interface to 100+ LLM providers. Not a full gateway but handles the API translation and fallback logic. Good starting point for teams that want to build incrementally.

**Portkey, Helicone, and similar.** Managed gateway services that provide routing, caching, logging, and guardrails out of the box. Quick to set up, but you're adding another vendor dependency.

**Kong/Envoy + custom plugins.** If you already run an API gateway, adding LLM-specific plugins (token counting, model routing, content filtering) lets you consolidate infrastructure.

### When to Build Custom

Build your own gateway when:
- Your routing logic is complex and business-specific
- You need deep integration with your cost attribution system
- Compliance requires that all data stays within your infrastructure
- You need custom guardrails that off-the-shelf solutions don't support

### When to Use a Managed Service

Use a managed gateway when:
- You're a small team and infrastructure isn't your competitive advantage
- You need to support many providers and don't want to maintain API adapters
- You want observability and cost tracking immediately, not in three months

## Implementation Patterns

### The Proxy Pattern

Simplest approach: the gateway is a reverse proxy that intercepts requests, applies policies, and forwards to the appropriate provider.

```
App → Gateway (proxy) → Provider API
                ↓
         Logging / Metering
```

Works well for synchronous request-response. Adds 10-50ms of latency depending on guardrail complexity.

### The Queue Pattern

For high-throughput or latency-tolerant workloads, the gateway accepts requests into a queue and processes them asynchronously:

```
App → Gateway (enqueue) → Queue → Worker → Provider API
  ↑                                              ↓
  └──────────── Callback/Webhook ────────────────┘
```

Enables better rate limit management (smooth out bursts), priority queuing (premium customers first), and batch optimization.

### The Sidecar Pattern

In Kubernetes environments, deploy the gateway as a sidecar container alongside each application pod. Each sidecar handles routing, caching, and guardrails locally, reporting metrics to a central collector.

Eliminates the single-point-of-failure risk of a centralized gateway while maintaining consistent policy enforcement.

## Getting Started

1. **Start with LiteLLM or a similar library** to abstract provider differences
2. **Add structured logging** for every LLM call (model, tokens, latency, cost)
3. **Implement basic failover** (one primary, one fallback provider)
4. **Add cost tracking** per customer or feature
5. **Layer in guardrails** as compliance requirements demand
6. **Consider a dedicated gateway** once you're making >10K LLM calls/day

The gateway pattern isn't glamorous, but it's the infrastructure that makes everything else — cost optimization, reliability, safety, observability — systematically manageable rather than ad hoc.
