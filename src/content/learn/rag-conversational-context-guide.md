---
title: "RAG for Conversational AI: Managing Multi-Turn Context in Retrieval Systems"
depth: technical
pillar: building
topic: rag
tags: [rag, conversational-ai, multi-turn, context-management, retrieval]
author: bee
date: "2026-03-24"
readTime: 10
description: "How to build RAG systems that handle multi-turn conversations where user queries reference previous turns and context must be managed across retrieval and generation."
related: [rag-query-understanding-guide, rag-query-rewriting-guide, rag-production-architecture]
---

## The Core Problem

In single-turn RAG, the pipeline is straightforward: take a user query, retrieve relevant documents, generate an answer. But conversations are not single turns.

Consider this exchange:

> **User:** What is your return policy for electronics?
> **Assistant:** Electronics can be returned within 30 days with original packaging...
> **User:** What about the restocking fee?
> **User:** And does that apply to refurbished items too?

The third message, taken alone, is nearly meaningless for retrieval. "That" refers to the restocking fee. "Refurbished items" needs to be scoped to electronics. A naive RAG system that embeds only the latest query will retrieve irrelevant documents or nothing useful at all.

This is the fundamental challenge of conversational RAG: user queries in context-dependent conversations cannot be used directly as retrieval queries.

## Query Rewriting for Multi-Turn Context

The most effective approach is to rewrite the user's query into a self-contained search query before retrieval. This step resolves references and incorporates context from previous turns.

```python
REWRITE_PROMPT = """Given the conversation history and the latest user message,
rewrite the user message as a standalone search query that captures the full intent.

Conversation:
{history}

Latest message: {current_message}

Rewritten query:"""

def rewrite_query(history: list[dict], current_message: str, llm) -> str:
    formatted_history = "\n".join(
        f"{turn['role']}: {turn['content']}" for turn in history[-6:]
    )
    response = llm.generate(
        REWRITE_PROMPT.format(
            history=formatted_history,
            current_message=current_message
        )
    )
    return response.strip()
```

For the example above, the rewriter should produce something like: "Does the restocking fee for electronics returns apply to refurbished electronics items?"

This rewritten query retrieves relevant documents far more effectively than the raw user message.

**Key implementation detail:** The rewriter should be fast and cheap. Use a smaller, faster model for this step rather than your primary generation model. The rewrite does not need to be eloquent. It needs to capture intent and resolve references.

## Context Window Budget Allocation

In conversational RAG, you are stuffing three things into the context window: conversation history, retrieved documents, and system instructions. The window is finite, so allocation matters.

A practical budget framework for a 128K-token context window:

| Component | Budget | Reasoning |
|-----------|--------|-----------|
| System prompt | 500-2000 tokens | Fixed instructions, persona, guardrails |
| Conversation history | 2000-8000 tokens | Last 4-8 turns verbatim, older turns summarized |
| Retrieved documents | 4000-16000 tokens | 3-8 chunks depending on complexity |
| Generation headroom | 1000-4000 tokens | Space for the response |

The tension is between conversation history and retrieved content. More history means better conversational coherence but fewer retrieved documents. More retrieved content means better grounding but potential loss of conversational thread.

```python
def allocate_context(
    system_prompt: str,
    history: list[dict],
    retrieved_chunks: list[str],
    max_tokens: int = 16000,
    min_chunks: int = 2,
    max_history_turns: int = 8
) -> dict:
    system_tokens = count_tokens(system_prompt)
    generation_buffer = 2000
    available = max_tokens - system_tokens - generation_buffer

    # Prioritize recent history, then fill with chunks
    history_text = ""
    included_turns = 0
    for turn in reversed(history[-max_history_turns:]):
        turn_text = f"{turn['role']}: {turn['content']}\n"
        if count_tokens(history_text + turn_text) > available * 0.4:
            break
        history_text = turn_text + history_text
        included_turns += 1

    remaining = available - count_tokens(history_text)

    # Fill remaining space with retrieved chunks
    included_chunks = []
    for chunk in retrieved_chunks:
        if count_tokens("\n".join(included_chunks + [chunk])) > remaining:
            break
        included_chunks.append(chunk)

    if len(included_chunks) < min_chunks and len(retrieved_chunks) >= min_chunks:
        # Truncate history to make room for minimum chunks
        included_chunks = retrieved_chunks[:min_chunks]

    return {
        "system": system_prompt,
        "history": history_text,
        "context": "\n\n".join(included_chunks)
    }
```

## Coreference Resolution in Queries

Beyond simple pronoun resolution ("it," "that," "those"), conversational queries contain subtler reference patterns.

**Ellipsis.** "And for the enterprise plan?" is missing the verb and object. The system must infer from context: "What is the pricing for the enterprise plan?" or "What are the features of the enterprise plan?" depending on the conversation.

**Comparative references.** "Is there a cheaper option?" requires knowing what was previously discussed and its price point.

**Implicit scope.** "What about security?" inherits the topic scope from earlier turns. If the conversation was about a specific product, security means that product's security, not security in general.

LLM-based query rewriting handles most of these cases well. The failure mode is when the relevant context is many turns back and has been truncated from the history window. For long conversations, maintain a running topic summary that captures key entities and their attributes even as individual turns are dropped.

## Session-Based Retrieval Strategies

Not every retrieval in a conversation needs to start from scratch.

**Cached retrieval.** If the user's follow-up question is about the same topic, the documents retrieved in previous turns are likely still relevant. Cache retrieved documents per session and include them as candidates alongside fresh retrieval results.

```python
class ConversationalRetriever:
    def __init__(self, retriever, reranker):
        self.retriever = retriever
        self.reranker = reranker
        self.session_cache = []

    def retrieve(self, rewritten_query: str, top_k: int = 5) -> list[str]:
        # Fresh retrieval
        new_results = self.retriever.search(rewritten_query, top_k=top_k)

        # Combine with cached results from previous turns
        candidates = new_results + self.session_cache[-10:]

        # Deduplicate by document ID
        seen = set()
        unique = []
        for doc in candidates:
            if doc.id not in seen:
                seen.add(doc.id)
                unique.append(doc)

        # Rerank combined set against current query
        ranked = self.reranker.rank(rewritten_query, unique)[:top_k]

        # Update cache
        self.session_cache.extend(new_results)

        return ranked
```

**Progressive refinement.** In some conversations, each turn narrows the scope. The first query retrieves broad information, and subsequent queries should filter within that set. Implementing this as a filter on previously retrieved document clusters can be more efficient than re-searching the entire corpus each turn.

**Topic-segmented retrieval.** When a conversation shifts topics, reset the retrieval context. Use a lightweight topic change detector (even a simple embedding similarity check between consecutive rewritten queries) to decide when to clear the session cache.

## Memory Architectures for Long Conversations

Short conversations (under 10 turns) are manageable by including the full history in the prompt. Long conversations need memory management.

**Sliding window with summary.** Keep the last N turns verbatim and maintain a running summary of older content. The summary is updated every few turns. This is the most common production approach.

**Entity-based memory.** Extract key entities and facts from the conversation into a structured store. When generating responses, query this store for relevant facts rather than scanning the full history. This scales better for very long conversations but requires reliable entity extraction.

**Hierarchical memory.** Maintain multiple levels: full recent turns, summarized older turns, and a session-level topic/intent summary. Each level is consulted depending on the query type. Factual follow-ups need detailed recent context; topic shifts need the broad session summary.

The choice depends on conversation length. For support conversations averaging 8-12 turns, the sliding window with summary is sufficient. For long advisory sessions or ongoing project conversations, entity-based or hierarchical approaches are worth the complexity.

## Evaluation Challenges

Evaluating conversational RAG is harder than single-turn RAG because:

1. **Turn-level metrics are insufficient.** A system might answer each turn correctly in isolation but lose coherence across the conversation.
2. **Context dependence makes test sets harder to build.** Each test case is an entire conversation, not a single question-answer pair.
3. **The rewrite step introduces a new failure mode.** Bad rewrites cause bad retrieval, which causes bad answers, but the root cause is not visible in the final output.

A practical evaluation framework:

- **Rewrite quality.** Evaluate query rewrites independently. Does the rewritten query capture the full intent? Human evaluation on 100-200 rewrites calibrates this.
- **Retrieval relevance per turn.** For each turn in a test conversation, check whether the retrieved documents contain the information needed to answer correctly.
- **Answer correctness.** Standard RAG evaluation (faithfulness, relevance, completeness) applied per turn.
- **Conversational coherence.** Does the system maintain consistent facts and context across turns? Detect contradictions between responses in the same conversation.

Log rewritten queries, retrieved documents, and generated responses for every turn in production. When users report bad answers, trace back through the pipeline to identify whether the failure was in rewriting, retrieval, or generation. This decomposition is essential for targeted improvement.
