---
title: "Query Understanding for RAG: What Happens Before Retrieval"
depth: technical
pillar: building
topic: rag
tags: [rag, query-understanding, retrieval, search, nlp]
author: bee
date: "2026-03-20"
readTime: 9
description: "The quality of RAG output depends more on understanding the query than on the retrieval algorithm. Query classification, expansion, decomposition, and routing determine whether the right documents ever reach the LLM."
related: [rag-query-rewriting-guide, rag-hybrid-search-guide, rag-reranking-strategies]
---

Most RAG tutorials focus on the retrieval and generation steps. But the silent failure mode of production RAG systems is upstream: the system doesn't understand what the user is actually asking for.

A user types "How do I fix the connection timeout issue?" In your knowledge base, the answer lives in a document titled "Database Connection Pool Configuration." Without query understanding, the embedding search might prioritize documents about network timeouts, HTTP timeouts, or connection troubleshooting — all semantically similar but not what the user needs.

Query understanding is the preprocessing layer that bridges the gap between what users say and what they mean.

## The Query Understanding Pipeline

```
User Query → Classification → Expansion → Decomposition → Routing → Retrieval
```

Each stage can dramatically improve retrieval quality. Most production systems implement at least two of these.

### Query Classification

Not all queries need the same retrieval strategy. Classify the query type first:

```python
from enum import Enum

class QueryType(Enum):
    FACTUAL = "factual"         # "What is the default timeout?"
    PROCEDURAL = "procedural"   # "How do I configure SSL?"
    TROUBLESHOOTING = "troubleshooting"  # "Why is my connection failing?"
    COMPARATIVE = "comparative"  # "Difference between v2 and v3?"
    CONVERSATIONAL = "conversational"    # "Thanks" / "Can you explain more?"

async def classify_query(query: str, history: list = None) -> QueryType:
    prompt = f"""Classify this query into one of: factual, procedural, 
    troubleshooting, comparative, conversational.
    
    Query: {query}
    Recent context: {history[-3:] if history else 'None'}
    
    Return only the classification."""
    
    result = await llm.generate(prompt)
    return QueryType(result.strip().lower())
```

Different query types benefit from different retrieval strategies:
- **Factual** → Dense retrieval, narrow top-k
- **Procedural** → Retrieve step-by-step guides, prefer structured documents
- **Troubleshooting** → Retrieve error docs, known issues, wider top-k
- **Comparative** → Retrieve both items being compared, merge context
- **Conversational** → May not need retrieval at all

### Query Expansion

The user's query may use different terminology than your documents. Query expansion adds synonyms, related terms, and contextual clarification.

```python
async def expand_query(query: str, domain_context: str = "") -> list[str]:
    prompt = f"""Given this user query and domain context, generate 3 
    alternative phrasings that might match relevant documents.
    
    Query: {query}
    Domain: {domain_context}
    
    Include:
    - Technical synonyms (e.g., "timeout" → "connection pool exhaustion")
    - Related concepts that might be in the same document
    - More specific versions of vague terms
    
    Return as JSON array of strings."""
    
    expansions = await llm.generate(prompt)
    return [query] + json.loads(expansions)
```

Example:
- Original: "fix connection timeout"
- Expanded: ["fix connection timeout", "database connection pool configuration", "connection refused troubleshooting", "timeout settings and retry policy"]

Search with all expanded queries and merge results.

### Query Decomposition

Complex queries often contain multiple sub-questions. Decomposing them ensures each part gets answered.

```python
async def decompose_query(query: str) -> list[str]:
    prompt = f"""Does this query contain multiple distinct questions or 
    information needs? If so, break it into independent sub-queries.
    If it's already a single, clear question, return it unchanged.
    
    Query: {query}
    
    Return as JSON array of strings."""
    
    result = await llm.generate(prompt)
    return json.loads(result)
```

Example:
- Input: "What's the difference between connection pooling and connection multiplexing, and which should I use for our PostgreSQL setup?"
- Decomposed: ["What is connection pooling?", "What is connection multiplexing?", "Connection pooling vs multiplexing comparison", "PostgreSQL connection management best practices"]

Each sub-query is retrieved independently, and the results are combined for generation.

### Query Routing

Different queries should search different indexes or knowledge bases.

```python
class QueryRouter:
    def __init__(self):
        self.indexes = {
            "docs": documentation_index,
            "api": api_reference_index,
            "issues": issue_tracker_index,
            "changelog": changelog_index,
        }
    
    async def route(self, query: str, query_type: QueryType) -> list[str]:
        if query_type == QueryType.TROUBLESHOOTING:
            return ["issues", "docs"]
        elif query_type == QueryType.FACTUAL:
            return ["docs", "api"]
        elif query_type == QueryType.PROCEDURAL:
            return ["docs"]
        elif query_type == QueryType.COMPARATIVE:
            return ["docs", "changelog"]
        return ["docs"]
```

## Context-Aware Query Understanding

Queries don't exist in isolation. In a conversation, "what about the timeout setting?" only makes sense given previous context.

```python
async def contextualize_query(
    query: str, 
    conversation_history: list[dict]
) -> str:
    """Rewrite query to be self-contained using conversation context."""
    if not conversation_history:
        return query
    
    prompt = f"""Given this conversation history and new query, rewrite 
    the query to be fully self-contained (understandable without the 
    conversation history).
    
    History:
    {format_history(conversation_history[-5:])}
    
    New query: {query}
    
    If the query is already self-contained, return it unchanged.
    Return only the rewritten query."""
    
    return await llm.generate(prompt)
```

Example:
- History: "How do I configure the Redis cache?" / "Set REDIS_URL in your environment..."
- New query: "What about the timeout setting?"
- Contextualized: "What is the timeout setting for the Redis cache configuration?"

This step is essential for any conversational RAG system and is often the single highest-impact improvement.

## Intent Detection for RAG

Not every query needs retrieval. Detecting intent saves retrieval costs and avoids polluting the context with irrelevant documents.

```python
class RAGIntent(Enum):
    RETRIEVE_AND_ANSWER = "retrieve"    # Needs knowledge base
    DIRECT_ANSWER = "direct"            # Model can answer from training data
    CLARIFY = "clarify"                 # Need more info from user
    OUT_OF_SCOPE = "out_of_scope"       # Not answerable from this knowledge base

async def detect_intent(query: str, domain: str) -> RAGIntent:
    prompt = f"""Given a query about {domain}, classify the intent:
    - retrieve: Needs specific information from the knowledge base
    - direct: Can be answered with general knowledge (greetings, basic concepts)
    - clarify: Too vague or ambiguous, need to ask the user for more details
    - out_of_scope: Not related to {domain}
    
    Query: {query}
    Return only the intent."""
    
    result = await llm.generate(prompt)
    return RAGIntent(result.strip())
```

Skipping retrieval for "thanks!" or "hello" improves response time and avoids the model trying to cite sources for a greeting.

## Measuring Query Understanding Quality

```python
def evaluate_query_understanding(test_cases):
    metrics = {
        "classification_accuracy": 0,
        "expansion_recall": 0,      # Do expanded queries find the right docs?
        "decomposition_coverage": 0, # Are all sub-questions addressed?
        "routing_precision": 0,      # Did we search the right indexes?
    }
    
    for case in test_cases:
        # Compare predicted classification to gold label
        predicted = classify_query(case.query)
        metrics["classification_accuracy"] += (predicted == case.gold_type)
        
        # Check if expansion finds the target document
        expanded = expand_query(case.query)
        found = any(retrieve(q, top_k=5).contains(case.gold_doc) for q in expanded)
        metrics["expansion_recall"] += found
    
    # Normalize
    n = len(test_cases)
    return {k: v / n for k, v in metrics.items()}
```

## Common Mistakes

1. **Treating query understanding as optional.** It's not. The gap between user language and document language is the primary failure mode of RAG systems.

2. **Using LLM for every query understanding step.** For high-throughput systems, train lightweight classifiers for query type and routing. Use LLMs only for expansion and decomposition.

3. **Ignoring conversation context.** In multi-turn systems, the current query is almost never self-contained. Always contextualize.

4. **Over-expanding queries.** More retrieval queries means more noise. Limit expansion to 3-4 variants and rely on reranking to filter.

5. **Not measuring query understanding separately.** When RAG quality is poor, teams blame retrieval or generation. Often the problem is upstream — the system didn't understand the query.

## The Architecture

```
User Input
    ↓
[Contextualize] → Self-contained query
    ↓
[Classify] → Query type
    ↓
[Detect Intent] → Retrieve / Direct / Clarify / OOS
    ↓ (if retrieve)
[Expand] → Multiple query variants
    ↓
[Decompose] → Sub-queries (if complex)
    ↓
[Route] → Target indexes
    ↓
[Retrieve] → Documents per sub-query
    ↓
[Rerank + Merge] → Final context
    ↓
[Generate] → Answer
```

Every step before retrieval is query understanding. In a well-built system, this pipeline adds 200-500ms of latency but dramatically improves answer quality. It's the highest-ROI investment in any RAG system.
