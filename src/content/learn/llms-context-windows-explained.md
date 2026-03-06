---
title: "Context Windows Explained: Why LLMs Forget — And What to Do About It"
depth: applied
pillar: practice
topic: llms
tags: [llms, context-window, memory, prompting, applied]
author: bee
date: "2026-03-05"
readTime: 8
description: "Everything you send to an LLM fits inside a context window. Learn what that means, why it matters, and practical strategies for working within — and around — these limits."
related: [how-llms-work-essential, how-llms-work-applied, prompting-that-actually-works]
---

## The box every LLM lives in

Every large language model operates inside something called a **context window** — the total amount of text it can "see" at one time. Think of it as the model's working memory. What's in the window is what the model can reason about. What's outside the window simply doesn't exist to it.

This single concept explains dozens of behaviors that confuse people:

- Why ChatGPT "forgets" things you said earlier in a long conversation
- Why pasting in a huge document and asking questions about it works sometimes but not others
- Why very long conversations with AI assistants tend to get worse over time
- Why developers building AI apps obsess over context management

Understanding context windows makes you a dramatically better AI user and builder.

---

## How big are context windows?

Context window size is measured in **tokens**, not words. A token is roughly 0.75 words in English — so 1,000 tokens ≈ 750 words, or about 1.5 pages of text.

Here's where leading models stood as of early 2026:

| Model | Context Window |
|---|---|
| GPT-5 | 128K tokens (~96,000 words) |
| Claude 3.7 Sonnet | 200K tokens (~150,000 words) |
| Gemini 1.5 Pro | 1M tokens (~750,000 words) |
| Gemini 2.0 Ultra | 2M tokens (~1.5M words) |

That looks enormous — and in some ways it is. A 200K token window can hold the entire text of *Harry Potter and the Deathly Hallows* with room to spare.

But there's a catch.

---

## The "lost in the middle" problem

A bigger context window doesn't mean better performance across that entire window. Research has consistently shown that LLMs perform best when relevant information is at the **beginning or end** of the context — not buried in the middle.

This is called the **lost in the middle** problem. If you paste a 100-page document into a model with a huge context window and your answer is on page 52, the model may struggle more than if that same information were on page 1 or page 100.

Practical implication: **don't assume bigger = better.** Strategic information placement matters.

---

## What counts toward your context window?

Everything visible to the model counts:

- The **system prompt** (instructions, persona, rules)
- The **entire conversation history** (every message, both directions)
- Any **documents or data** you paste in
- **Tool outputs** (search results, code execution output, etc.)
- The model's own **response** (as it's generating)

In an agentic system — where an AI is calling tools, running code, and taking multi-step actions — context can fill up fast.

---

## Why conversations degrade over time

Here's a specific pattern worth understanding:

Most chat applications handle context limits by **silently truncating** the conversation. When you hit the limit, the oldest messages get dropped. The model doesn't know they existed.

This creates a conversation that feels continuous to you but is effectively amnesiac to the model. You might reference "what we discussed earlier" and get a confused or hallucinated response — the model is doing its best without that context.

**Signs your context is being truncated:**
- The model stops referencing earlier details
- It "forgets" preferences or constraints you established
- Responses feel disconnected from the conversation's history
- You see repeated suggestions it already made

---

## Practical strategies for working with context limits

### 1. Front-load your most important instructions

Put critical context, constraints, and goals at the **start** of your conversation or system prompt. That information is less likely to be truncated and benefits from the primacy effect.

### 2. Summarize and reset long conversations

Instead of letting a 50-message thread degrade, ask the model to summarize the key decisions, facts, and constraints from your conversation — then start a new thread with that summary as the opening context. Cleaner than a degraded long thread.

### 3. Use documents strategically

If you're asking about a specific section of a long document, paste only that section — not the entire document. "Here's section 4 of the contract. What are the termination conditions?" is more reliable than dumping 80 pages and hoping the model finds section 4.

### 4. Chunk long documents with RAG

For applications that need to work with large knowledge bases, don't stuff everything into context. Use **retrieval-augmented generation (RAG)**: retrieve only the relevant chunks for each query, then put those in context. This is how most production AI systems handle large document sets.

### 5. Track token usage

If you're building with LLM APIs, monitor token usage per request. Most providers return token counts in API responses. Set soft limits and build truncation or summarization into your application before the user hits a wall.

---

## The technical picture: why context windows have limits

Context windows are limited by the **self-attention mechanism** in transformer models. Self-attention requires every token to "attend to" every other token — computationally, this is O(n²) in complexity. Double the context length, quadruple the compute required.

Larger context windows are possible but expensive. Models with million-token windows (like Gemini 1.5) use architectural tricks like **ring attention** and **grouped query attention** to make this tractable, but there are still tradeoffs in speed, cost, and consistency of performance.

This is an active research area. Expect context windows to continue expanding — and expect the "lost in the middle" problem to remain a challenge even as they do.

---

## Context windows and the future of AI memory

Context windows are a technical limitation of current transformer architectures, not a fundamental property of AI. Several approaches are being developed to address the memory problem:

- **External memory systems** — Models that can read/write to an external vector database, effectively giving them unlimited long-term memory
- **Memory-augmented architectures** — Research models that maintain persistent state across conversations
- **Agentic memory** — AI systems that automatically summarize, tag, and store information from past interactions

Products like ChatGPT's "memory" feature are early implementations of this — the model writes key facts to an external store and retrieves them in future conversations. It's not true memory, but it's a useful approximation.

The fully stateful AI assistant — one that genuinely remembers everything across every conversation — is coming. But for now, context windows are the operative constraint, and understanding them is one of the highest-leverage things you can do as an AI user.

---

## Key takeaways

- Context windows are the working memory of LLMs — everything the model can see in one interaction
- Bigger windows don't guarantee better performance; information placement matters
- Long conversations degrade because old messages get truncated
- Front-load important context, summarize when conversations get long, and don't paste more than you need
- For large document sets, RAG is more reliable than brute-force context stuffing
- The memory problem is being actively solved — expect significant improvements in the next 12-24 months
