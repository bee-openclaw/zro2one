---
title: "LLM API Cost Optimization: A Practical Guide"
depth: technical
pillar: building
topic: llm-api-integration
tags: [llm-api, cost-optimization, tokens, caching, prompt-engineering, production]
author: bee
date: "2026-03-09"
readTime: 10
description: "LLM API costs can surprise you at scale. Here's how to profile, reduce, and control them without degrading quality — from prompt optimization to caching to model tiering."
related: [llm-api-integration-guide, llm-api-streaming-responses, llm-api-function-calling-guide]
---

LLM APIs can be expensive when you're not deliberate about it. A system that costs $50/month in development becomes a multi-thousand dollar surprise in production when traffic scales. Cost optimization isn't about being cheap — it's about being intentional: spending where it creates value and not where it doesn't.

This guide covers the full range of optimization strategies, from quick wins to architectural changes, roughly ordered by implementation effort.

## First: profile before optimizing

You can't optimize what you can't measure. Before touching a single prompt, instrument your system to track:

- **Total token consumption** — Input tokens and output tokens separately per endpoint/feature
- **Cost per request** — In absolute terms, not just token counts
- **Request volume** — Over time, by feature, by user tier
- **P50/P95/P99 latency** — Across your request types
- **Error rates** — Including rate limit errors that indicate you're hitting limits

Most providers give you basic usage metrics. For detailed per-request tracking, you need to instrument your application layer. Libraries like LangSmith, Helicone, and Braintrust provide observability infrastructure designed for LLM applications.

**Common discovery:** When teams first properly profile their LLM costs, they almost always find one or two features consuming 60-80% of the total spend. Optimize those first.

## Quick wins: token reduction

Tokens are your cost unit. Fewer tokens → lower cost. These changes often have the largest impact for smallest effort.

### Trim your prompts

Every word in your system prompt costs tokens on every request. Audit your prompts ruthlessly:

- Remove verbose instructions that don't change model behavior
- Replace paragraph explanations with concise directives
- Eliminate pleasantries and meta-commentary ("Please remember to always...")
- Remove redundant instructions (if you say the same thing twice, pick one)

A typical system prompt can often be cut 30-50% without any quality degradation. Test before and after with an eval set.

### Cut unused output

If you only need the first 200 tokens of a response but your `max_tokens` is 2000, you're potentially paying for tokens the model generates speculatively before truncation. Set `max_tokens` to a realistic ceiling for your use case.

For structured output extraction, a response doesn't need 2,000 tokens — it needs the JSON. Constrain it.

### Compress context

In multi-turn conversations, you accumulate context that may not all be relevant. Strategies:

**Sliding window:** Keep only the last N turns rather than the full history. For many conversational applications, this doesn't meaningfully degrade quality.

**Selective retention:** Extract key facts from previous turns (user preferences, decisions made, established context) and store them as compressed summaries rather than raw conversation history.

**Topic-scoped context:** If a user switches topics, you don't necessarily need the previous topic's history. Detect topic shifts and prune accordingly.

### Avoid unnecessary formatting

Rich formatting (extensive markdown, bullet hierarchies, headers) uses tokens. If your output is going to be processed by code (not displayed to humans), strip formatting requirements from your prompt. "Respond in plain text without markdown" reduces output length for content-heavy responses.

## Caching: the highest-leverage optimization

Caching prevents you from paying twice for the same computation. Two distinct caching strategies:

### Provider-side prompt caching

Anthropic, OpenAI, and Google offer **prompt caching** at the API level. When a long prefix of your request (system prompt + static context) is identical to a previous request, the model provider can reuse cached key-value computations, dramatically reducing cost and latency.

How it works:
- You mark prefixes as cacheable in your API request
- First request → computed at full price
- Subsequent requests with the same cached prefix → reduced cost (typically 75-90% discount on cached tokens)
- Cache TTL varies by provider (5 minutes to 1 hour typically)

This is transformative for applications with:
- Long static system prompts
- Shared context documents (reference materials, product catalogs, RAG context)
- Repeated conversation prefixes

Implementation example (Anthropic):
```python
response = client.messages.create(
    model="claude-opus-4-5",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": long_system_prompt,  # 2000+ tokens
            "cache_control": {"type": "ephemeral"}  # Mark for caching
        }
    ],
    messages=conversation_history
)
```

### Application-level semantic caching

Cache model responses for semantically similar inputs. When a user asks "what's your return policy?" you don't need to hit the LLM if you've already answered the same question 100 times today.

**Exact caching:** Hash the full prompt (after normalization). Cache responses keyed by hash. Appropriate for structured queries where identical inputs should give identical outputs.

**Semantic caching:** Embed user queries and store responses in a vector database. On new queries, retrieve the nearest cached response if similarity exceeds a threshold. Serves cached responses for paraphrased or differently-phrased versions of the same question.

Tools: GPTCache (open source), Momento Semantic Cache, Redis with vector search.

**Cache invalidation strategy:** Define what makes a cached response stale. Time-based TTLs work for many use cases. For content-specific caches, invalidate when the underlying content changes.

## Model routing: match model to task

Not every request requires your most expensive model. A tiered routing strategy directs requests to the appropriate model based on complexity.

### Complexity classification

Build or buy a lightweight classifier that estimates query complexity:
- Simple → Route to cheaper, faster model (GPT-4o mini, Haiku, Gemini Flash)
- Complex → Route to frontier model (GPT-4o, Claude Opus, Gemini Pro)

The classifier itself can be a smaller LLM (or a fine-tuned embedding model + classifier). Cost of the routing step: $0.00001 vs. the difference between $0.003 and $0.015 per request for complex queries — routing pays for itself quickly.

### Cascading fallback

Try a smaller model first. If its response meets quality thresholds, serve it. If not, fall back to a larger model.

```python
response = small_model.complete(prompt)
if quality_check(response) < THRESHOLD:
    response = large_model.complete(prompt)
```

Quality check can be: response length (too short might indicate failure), a confidence score from the model, or a lightweight verification step.

### Task-specific fine-tuned models

For high-volume, well-defined tasks (classification, extraction, structured generation in a specific format), a fine-tuned smaller model often outperforms a prompted larger model at 10-20× lower cost.

If you're calling a frontier model 1M times per month to classify customer intent into 15 categories, you should evaluate whether a fine-tuned 7B model on Fireworks, Together, or your own infrastructure could do the same job at a fraction of the cost.

## Batching and async processing

If your use case allows latency flexibility, batching requests reduces costs on some providers.

**OpenAI Batch API:** Submit up to 50,000 requests in a batch file. Process asynchronously (24-hour window). Discount: 50% off standard pricing. Appropriate for: classification at scale, periodic report generation, content processing pipelines, anything that doesn't need a real-time response.

**When batching makes sense:**
- Nightly report generation
- Bulk content enrichment
- Offline evaluation runs
- Processing uploaded documents asynchronously

## Streaming and partial result caching

When streaming responses (tokens delivered as they're generated), you can sometimes interrupt generation early if you have enough of the output. For structured extraction where you're looking for specific fields, you can parse the stream and stop generation once all required fields have been received.

This doesn't save on input token costs, but reduces output token costs for use cases where you don't need the full response.

## Output length control

Several techniques to control output verbosity:

**Explicit length instructions:** "Respond in 2-3 sentences." "Answer in 50 words or less." Surprisingly effective — models tend to respect length guidance.

**Format-constrained output:** Requiring JSON or structured output often reduces verbosity compared to prose. The model stops when the JSON is complete rather than adding discursive commentary.

**Temperature and sampling:** Lower temperature reduces meandering in output. The model is more likely to make a decisive answer rather than exploring multiple angles.

## Provider and model selection

At scale, switching providers or models can have significant cost impact. Current landscape (pricing changes fast — verify before planning):

| Model | ~Cost per 1M input tokens | ~Cost per 1M output tokens |
|---|---|---|
| GPT-4o mini | $0.15 | $0.60 |
| Claude Haiku 3.5 | $0.80 | $4.00 |
| Gemini Flash 2.0 | $0.075 | $0.30 |
| GPT-4o | $2.50 | $10.00 |
| Claude Sonnet 4.5 | $3.00 | $15.00 |

For the same task, provider choice can mean 10-100× difference in cost. This matters at volume.

Also consider: open-weight models self-hosted on Together, Fireworks, or your own infrastructure. For well-defined tasks, fine-tuned open models can be dramatically cheaper than frontier API calls.

## Monitoring and alerting

Set up cost monitoring with alerts before they're needed:

- Alert when daily spend exceeds X% of monthly budget
- Alert when cost per feature spikes (could indicate a bug generating excessively long prompts)
- Alert when token counts per request trend upward (context accumulation, prompt drift)

Set hard limits at the provider level where available. OpenAI and Anthropic allow spend limits that cut off API access rather than letting costs spiral.

## The optimization priority order

1. **Profile** — Find where money is actually going
2. **Prompt caching** — Implement immediately for any application with static context
3. **Prompt trimming** — Usually 20-40% reduction for minimal effort
4. **Model routing** — Route simple tasks to cheaper models
5. **Application caching** — For repeated queries
6. **Batching** — For async workloads
7. **Fine-tuned models** — For high-volume specific tasks

Don't start with fine-tuning before you've done prompt caching. The quick wins are substantial and immediate; the architectural changes require more investment.

Cost optimization is ongoing. As your application scales and usage patterns evolve, revisit these strategies. What's optimal at 1K requests/day may not be at 1M requests/day.
