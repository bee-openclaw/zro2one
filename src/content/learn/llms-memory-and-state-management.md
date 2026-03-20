---
title: "LLM Memory and State: How Models Remember (and Forget) Across Conversations"
depth: technical
pillar: foundations
topic: llms
tags: [llms, memory, state-management, context-window, conversation, architecture]
author: bee
date: "2026-03-20"
readTime: 10
description: "LLMs don't actually remember anything between conversations. Understanding how statelessness, context windows, and external memory systems interact is essential for building reliable AI applications."
related: [llms-long-context-retrieval-patterns, llms-constitutional-ai-and-alignment, rag-production-architecture]
---

Every time you start a new conversation with ChatGPT or Claude, the model has zero memory of your previous interactions. This surprises people who've spent months "building a relationship" with their AI assistant. The model isn't being rude — it's stateless by design.

Understanding how LLMs handle (and don't handle) memory is one of the most important concepts for anyone building AI products.

## The Statelessness Problem

An LLM is a function: text in, text out. It has no persistent state between API calls. What feels like memory during a conversation is actually the entire conversation history being re-sent with every message.

```
Turn 1: [System prompt] + [User message 1]
Turn 2: [System prompt] + [User message 1] + [Assistant reply 1] + [User message 2]
Turn 3: [System prompt] + [User message 1] + [Assistant reply 1] + [User message 2] + [Assistant reply 2] + [User message 3]
```

Each turn, the context window grows. The model processes the entire sequence from scratch. There's no incremental learning, no updating of weights, no actual memory formation happening.

## Why This Matters for Applications

If you're building a chatbot and your user has a 50-message conversation, by message 50 you're sending all 49 previous exchanges plus the new message. This creates three problems:

1. **Cost scales linearly** — every token in the history is processed every turn
2. **Latency increases** — more tokens means slower time-to-first-token
3. **Context limits are real** — even with 128K+ token windows, long conversations eventually overflow

## Conversation Memory Strategies

### Sliding Window

The simplest approach: keep only the last N messages. You lose early context but maintain a fixed cost per turn.

```python
def sliding_window(messages: list, max_messages: int = 20) -> list:
    system = [m for m in messages if m["role"] == "system"]
    conversation = [m for m in messages if m["role"] != "system"]
    return system + conversation[-max_messages:]
```

Works well for task-oriented conversations. Falls apart when users reference something from 30 messages ago.

### Summarization

Periodically compress older messages into a summary that gets prepended to the context.

```python
async def summarize_and_compress(messages: list, threshold: int = 30) -> list:
    if len(messages) < threshold:
        return messages
    
    old_messages = messages[:threshold - 10]
    recent_messages = messages[threshold - 10:]
    
    summary = await llm.summarize(old_messages)
    
    return [
        {"role": "system", "content": f"Previous conversation summary: {summary}"},
        *recent_messages
    ]
```

Better than sliding window for maintaining context, but summaries are lossy. Important details get dropped, and the model can't distinguish between what it "remembers" and what it's been told.

### Retrieval-Augmented Memory

Store conversation turns in a vector database. When a new message arrives, retrieve relevant past exchanges and inject them into context.

```python
async def retrieve_relevant_history(
    current_message: str,
    user_id: str,
    top_k: int = 5
) -> list:
    # Embed the current message
    embedding = await embed(current_message)
    
    # Search past conversations for this user
    results = await vector_db.search(
        embedding=embedding,
        filter={"user_id": user_id},
        top_k=top_k
    )
    
    return [format_as_context(r) for r in results]
```

This is what products like ChatGPT's memory feature do under the hood (with additional extraction and structuring layers on top). It's powerful but introduces retrieval quality as a failure mode.

## Explicit Memory Systems

Some applications extract and store structured facts from conversations:

```python
async def extract_user_facts(conversation: list) -> list[dict]:
    prompt = """Extract any personal facts, preferences, or important 
    information the user has shared. Return as JSON array."""
    
    facts = await llm.extract(prompt, conversation)
    return facts

# Stored facts might look like:
# {"fact": "User prefers Python over JavaScript", "confidence": 0.9}
# {"fact": "User works at a healthcare startup", "confidence": 0.95}
# {"fact": "User's name is Alex", "confidence": 1.0}
```

These facts get injected into the system prompt for future conversations. It's crude but effective for personalization.

## KV Cache: The Hardware-Level "Memory"

During a single inference call, there is a form of memory: the key-value (KV) cache. As the model processes each token, it stores intermediate attention computations so it doesn't have to recompute them for subsequent tokens.

This is why:
- **First token is slow** (processing the full prompt)
- **Subsequent tokens are fast** (only computing attention for the new token against cached KV pairs)
- **Prompt caching works** (some providers cache the KV state for identical prompt prefixes)

But the KV cache is ephemeral. It exists only during a single API call and is discarded afterward.

## Session State vs. Persistent Memory

It helps to think about two distinct layers:

| Layer | Lifetime | Mechanism |
|-------|----------|-----------|
| **Session state** | One conversation | Context window (message history) |
| **Persistent memory** | Across conversations | External storage (vector DB, structured facts, user profiles) |

Most chatbot failures come from confusing these two. Users expect persistent memory. Developers implement only session state. The gap creates uncanny experiences where the AI "forgets" things it should know.

## The Architecture Decision

When building an application, you're choosing from a spectrum:

**No memory** — Each conversation is independent. Fine for one-shot tools (code generation, translation, analysis).

**Session memory only** — Conversation history within a session. Standard for most chatbots.

**Summarized memory** — Compressed history across sessions. Good for ongoing assistants.

**Retrieval memory** — Semantic search over past interactions. Best for knowledge-heavy applications.

**Structured memory** — Extracted facts and preferences. Best for personalization.

Most production systems combine these. A personal assistant might use session memory for the current conversation, structured memory for user preferences, and retrieval memory for past project context.

## What's Changing

Several architectural shifts are making memory more capable:

**Longer context windows** reduce the pressure to compress. With 1M+ token windows, some applications can simply keep more raw history.

**Memory-augmented architectures** (like Titans from Google Research) are exploring how to give transformers persistent state that survives across forward passes.

**Prompt caching** at the provider level (Anthropic's cached system prompts, OpenAI's prefix caching) reduces the cost penalty of long context.

**Better retrieval** — as embedding models improve and hybrid search matures, retrieval-augmented memory becomes more reliable.

## Practical Recommendations

1. **Be explicit about what you remember.** Don't pretend the model has persistent memory if it doesn't. Users prefer honesty to uncanny failures.

2. **Separate memory extraction from generation.** Use a dedicated pass to extract facts, don't rely on the model to implicitly maintain state.

3. **Test memory failures, not just successes.** What happens when retrieved context is wrong? When a summary loses a critical detail? Build graceful degradation.

4. **Cost-model your memory strategy.** Every token of injected memory costs money and latency. The cheapest approach that works is the right one.

5. **Give users control.** Let users see what the model "remembers" about them and correct it. This is both good UX and increasingly a regulatory requirement.

Memory is the gap between what users expect from AI and what it actually does. Closing that gap — reliably, affordably, and transparently — is one of the most impactful problems in applied AI right now.
