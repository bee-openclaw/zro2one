---
title: "LLM API Token Management: Counting, Budgeting, and Optimizing Token Usage"
depth: applied
pillar: building
topic: llm-api-integration
tags: [llm-api-integration, tokens, cost-management, optimization, budgeting]
author: bee
date: "2026-03-24"
readTime: 9
description: "Practical strategies for counting, budgeting, and optimizing token usage across LLM APIs, with Python code examples for cost control."
related: [llm-api-cost-optimization-guide, llm-api-caching-strategies-guide, llm-api-prompt-caching-guide]
---

Tokens are the billing unit for LLM APIs. Every character of your prompt, every word in the response, and every piece of context you include costs money. At small scale, this doesn't matter. At production scale — thousands or millions of requests per day — token management becomes a core operational concern. This guide covers how tokenization works, how to count tokens accurately, and practical strategies for keeping costs under control.

## How Tokenization Affects Cost

Different models use different tokenizers, which means the same text produces different token counts across providers.

A rough comparison for the sentence "The patient presented with acute respiratory distress":

| Model Family | Tokenizer | Approximate Tokens |
|---|---|---|
| GPT-4o | o200k_base | 7 |
| Claude 3.5+ | Custom BPE | 8 |
| LLaMA 3 | SentencePiece BPE | 8 |
| Gemini | SentencePiece | 8 |

These differences compound over millions of requests. A 10% difference in tokenization efficiency across providers translates directly to a 10% cost difference for the same content.

Key tokenization behaviors that affect cost:

- **Whitespace handling.** Some tokenizers treat spaces as part of the following token; others treat them separately.
- **Non-English text.** Most tokenizers are optimized for English. Chinese, Japanese, Korean, and other scripts often require 2-4x more tokens per semantic unit.
- **Code.** Indentation, brackets, and boilerplate inflate token counts. A Python function that reads as 50 words might tokenize to 150+ tokens.
- **Numbers.** Large numbers and decimals are tokenized digit-by-digit in many tokenizers. "123456789" might be 3-5 tokens.

## Counting Tokens Before Sending

Never guess token counts. Count them.

For OpenAI models, use tiktoken:

```python
import tiktoken

def count_tokens(text, model="gpt-4o"):
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

# Count tokens for a full message list
def count_message_tokens(messages, model="gpt-4o"):
    encoding = tiktoken.encoding_for_model(model)
    total = 0
    for message in messages:
        total += 4  # message overhead (role, content markers)
        total += len(encoding.encode(message["content"]))
    total += 2  # reply priming
    return total
```

For Anthropic models, use the token counting API:

```python
import anthropic

client = anthropic.Anthropic()

# Count tokens before sending the full request
token_count = client.messages.count_tokens(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Your prompt here"}],
    system="Your system prompt here",
)
print(f"Input tokens: {token_count.input_tokens}")
```

For local models or when exact counts aren't available, estimate conservatively: 1 token per 3.5 characters for English text, 1 token per 2 characters for code.

## Budget Allocation

At production scale, you need token budgets per feature, per user, and per time period.

### Per-Feature Budgets

Different features have different token profiles:

| Feature | Typical Input Tokens | Typical Output Tokens | Requests/Day |
|---------|--------------------|--------------------|-------------|
| Chat response | 500-2000 | 200-800 | High |
| Document summary | 5000-50000 | 200-500 | Medium |
| Code generation | 1000-5000 | 500-2000 | Medium |
| RAG query | 2000-8000 | 300-600 | High |
| Classification | 200-500 | 10-50 | Very high |

Use these profiles to forecast monthly spend:

```python
def estimate_monthly_cost(
    input_tokens_per_request,
    output_tokens_per_request,
    requests_per_day,
    input_price_per_million,
    output_price_per_million,
):
    monthly_requests = requests_per_day * 30
    input_cost = (input_tokens_per_request * monthly_requests / 1_000_000) * input_price_per_million
    output_cost = (output_tokens_per_request * monthly_requests / 1_000_000) * output_price_per_million
    return input_cost + output_cost

# Example: RAG feature with Claude Sonnet
monthly = estimate_monthly_cost(
    input_tokens_per_request=4000,
    output_tokens_per_request=400,
    requests_per_day=5000,
    input_price_per_million=3.0,
    output_price_per_million=15.0,
)
print(f"Estimated monthly cost: ${monthly:.2f}")
```

### Per-User Rate Limiting

Prevent individual users from consuming disproportionate resources:

```python
class TokenBudget:
    def __init__(self, daily_limit, redis_client):
        self.daily_limit = daily_limit
        self.redis = redis_client

    def check_and_deduct(self, user_id, token_count):
        key = f"token_budget:{user_id}:{date.today()}"
        current = int(self.redis.get(key) or 0)
        if current + token_count > self.daily_limit:
            return False
        self.redis.incrby(key, token_count)
        self.redis.expire(key, 86400)
        return True
```

## Token Optimization Strategies

### Prompt Compression

System prompts and instructions often contain redundant language. Compress them without losing meaning.

Before (87 tokens):
> "You are a helpful AI assistant that specializes in answering questions about our product catalog. When a user asks a question, you should search through the available product information and provide a clear, concise, and accurate answer. If you don't know the answer, say so honestly."

After (42 tokens):
> "Answer product catalog questions. Be concise and accurate. Say when you don't know."

For few-shot examples, use the shortest examples that demonstrate the pattern. Three well-chosen examples often outperform ten verbose ones.

### Context Window Management

When using RAG or long-context applications, manage what goes into the context:

- **Chunk relevance scoring.** Only include the top-k most relevant chunks, not everything above a threshold.
- **Progressive detail.** Start with summaries of all documents, then include full text only for the most relevant ones.
- **Sliding window.** For conversations, keep recent messages in full and summarize older ones.

```python
def manage_context(messages, max_context_tokens=4000):
    """Keep recent messages, summarize old ones."""
    total = 0
    kept = []
    for msg in reversed(messages):
        msg_tokens = count_tokens(msg["content"])
        if total + msg_tokens > max_context_tokens:
            # Summarize remaining older messages
            older = messages[:len(messages) - len(kept)]
            summary = summarize_messages(older)
            kept.append({"role": "system", "content": f"Earlier conversation summary: {summary}"})
            break
        kept.append(msg)
        total += msg_tokens
    return list(reversed(kept))
```

### Response Length Control

Output tokens are typically 3-5x more expensive than input tokens. Control response length:

- Set `max_tokens` to a reasonable ceiling for each use case
- Include length instructions in the prompt: "Respond in 2-3 sentences" or "Keep your response under 100 words"
- For classification tasks, constrain output to labels only — no explanations unless needed

### Model Selection by Task

Not every request needs your most capable (and expensive) model. Route requests by complexity:

- **Classification, extraction, formatting** — use a smaller, cheaper model
- **Complex reasoning, nuanced writing** — use a larger model
- **High-volume, low-stakes** — use the cheapest model that meets quality requirements

## Monitoring and Alerting

Track token usage in real time. At minimum, log:

- Input and output tokens per request
- Cost per request (calculated from token counts and current pricing)
- Daily and weekly aggregates per feature and per user
- P95 and P99 token counts (catch outlier requests)

Set alerts for:

- **Daily spend exceeding 120% of expected budget** — catches runaway loops or abuse
- **Single request exceeding 2x normal token count** — catches prompt injection or unexpected input
- **Sustained increase in average tokens per request** — catches gradual prompt bloat

```python
import logging

def log_token_usage(feature, user_id, input_tokens, output_tokens, model, price_per_m_in, price_per_m_out):
    cost = (input_tokens / 1e6) * price_per_m_in + (output_tokens / 1e6) * price_per_m_out
    logging.info(
        "token_usage",
        extra={
            "feature": feature,
            "user_id": user_id,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "model": model,
            "cost_usd": round(cost, 6),
        },
    )
```

Token management isn't glamorous, but it's the difference between an LLM feature that scales sustainably and one that generates a surprising cloud bill. Count tokens before sending, set budgets per feature and user, optimize prompts aggressively, and monitor everything. The tools are straightforward — the discipline of using them consistently is what matters.
