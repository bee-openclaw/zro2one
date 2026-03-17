---
title: "Multi-Index RAG: Searching Across Different Knowledge Bases"
depth: technical
pillar: building
topic: rag
tags: [rag, multi-index, retrieval, architecture, knowledge-management]
author: bee
date: "2026-03-17"
readTime: 9
description: "Real-world RAG systems rarely have one monolithic index. This guide covers architectures for searching across multiple knowledge bases, merging results, and routing queries to the right index."
related: [rag-hybrid-search-guide, rag-query-rewriting-guide, rag-metadata-filtering-guide]
---

Your company has product documentation in Confluence, customer tickets in Zendesk, engineering specs in Google Docs, and code in GitHub. A user asks: "What's the current rate limit for the /users endpoint and have there been complaints about it?" The answer requires information from at least two of these sources.

Single-index RAG can't handle this well. Multi-index RAG can.

## Why multiple indexes?

Several practical reasons drive multi-index architectures:

**Different data types require different chunking.** Code files, markdown docs, and support tickets have different optimal chunk sizes and strategies. A single chunking approach compromises on all of them.

**Different update frequencies.** Documentation might update weekly. Support tickets arrive hourly. Code changes with every merge. Separate indexes let you update each on its own schedule.

**Access control.** Not every user should see every source. Separate indexes make it easier to enforce permissions — query only the indexes the user has access to.

**Source-specific embedding models.** Code search works better with code-specialized embeddings. Natural language docs work better with general-purpose embeddings. Separate indexes let you use the best model for each.

## Architecture patterns

### Query routing

A router examines the incoming query and directs it to the most relevant index(es):

```python
def route_query(query: str) -> list[str]:
    """Determine which indexes to search."""
    router_prompt = f"""Given this query, which knowledge bases should be searched?
    Available: [documentation, support_tickets, code, engineering_specs]
    Query: {query}
    Return a JSON list of relevant sources."""
    
    sources = llm.generate(router_prompt)
    return json.loads(sources)

# Search only relevant indexes
indexes_to_search = route_query(user_query)
results = []
for index_name in indexes_to_search:
    results.extend(indexes[index_name].search(user_query, top_k=5))
```

**Pros:** Reduces unnecessary searches, lower latency, lower cost.
**Cons:** Routing errors mean missing relevant results. Conservative routing (search everything) is safer but slower.

### Fan-out and merge

Search all indexes simultaneously, then merge and re-rank the combined results:

```python
async def fan_out_search(query: str, top_k: int = 5) -> list:
    # Search all indexes in parallel
    tasks = [
        index.search(query, top_k=top_k * 2)
        for index in all_indexes
    ]
    all_results = await asyncio.gather(*tasks)
    
    # Flatten and deduplicate
    merged = deduplicate(flatten(all_results))
    
    # Re-rank with a cross-encoder
    reranked = reranker.rank(query, merged)
    
    return reranked[:top_k]
```

**Pros:** Never misses relevant results due to routing errors.
**Cons:** Higher latency and cost (every query hits every index). Re-ranking is essential — without it, results from different indexes have incomparable scores.

### Hierarchical search

First search a lightweight summary index to identify relevant source documents, then search the detailed indexes for those specific documents:

1. **Level 1:** Summary index (one entry per document, containing title + summary)
2. **Level 2:** Full-text chunk indexes (detailed chunks from relevant documents)

This is especially effective when you have many sources but each query is relevant to only a few.

## Score normalization

Different indexes produce scores on different scales. A score of 0.85 from one index doesn't mean the same as 0.85 from another. Before merging results, normalize:

**Min-max normalization:** Scale each index's scores to [0, 1] based on the result set.

**Z-score normalization:** Normalize to zero mean, unit variance.

**Reciprocal rank fusion (RRF):** Ignore absolute scores entirely. Rank results within each index, then combine ranks:

```python
def reciprocal_rank_fusion(result_lists: list[list], k: int = 60) -> list:
    scores = {}
    for result_list in result_lists:
        for rank, result in enumerate(result_list):
            doc_id = result.id
            scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

RRF is simple, robust, and doesn't require score calibration. It's often the best default for multi-index merging.

## Source attribution

When answers draw from multiple indexes, users need to know which source contributed what:

```python
response_template = """Based on the retrieved information:

{answer}

Sources:
- [Documentation] {doc_source}: {doc_excerpt}
- [Support Tickets] Ticket #{ticket_id}: {ticket_excerpt}
"""
```

Clear attribution builds trust and lets users verify information against the original source.

## Keeping indexes in sync

Stale indexes are a common failure mode. Each index needs:

- **Ingestion pipeline** with appropriate frequency (real-time for tickets, daily for docs)
- **Deletion handling** — when source content is removed, the index entry must go too
- **Staleness monitoring** — alert when an index hasn't been updated in longer than expected
- **Version tracking** — know which version of each source document is currently indexed

## When to consolidate

Multi-index adds complexity. Consider a single index when:
- All sources are the same type (all markdown docs, for example)
- Update frequencies are similar
- No access control differentiation needed
- Volume is manageable for one index

The right number of indexes is the fewest that let you meet your requirements. Don't split for the sake of splitting.
