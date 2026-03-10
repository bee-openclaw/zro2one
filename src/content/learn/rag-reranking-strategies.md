---
title: "RAG Reranking: Getting the Right Chunks into the Context Window"
depth: technical
pillar: building
topic: rag
tags: [rag, reranking, retrieval, cross-encoder, cohere-rerank, information-retrieval, production]
author: bee
date: "2026-03-10"
readTime: 10
description: "First-pass retrieval is fast but imprecise. Reranking adds a second stage that dramatically improves which chunks actually reach the LLM. This is the technical guide to reranking strategies in production RAG."
related: [rag-production-architecture, rag-hybrid-search-guide, rag-evaluation-guide]
---

Most RAG tutorials describe a simple two-step pipeline: retrieve top-K chunks using vector similarity, then generate with those chunks in context. This works reasonably well for demos. In production, the retrieval quality is almost always the binding constraint — and a two-stage retrieval strategy with reranking consistently delivers the most meaningful quality improvement.

## Why first-pass retrieval is imprecise

Vector similarity search (approximate nearest neighbor over embeddings) retrieves documents that are *semantically related* to the query. But semantic relatedness is a weak proxy for *what actually answers the question*.

Consider the query: "What is the refund policy for international orders?"

First-pass retrieval might return chunks about:
- The general refund policy (close in embedding space)
- International shipping options (mentions "international")
- Domestic order refund policy (mentions "refund policy")
- Customer service contact info (appears in the policy section)

Some of these are relevant; others are thematically adjacent but don't answer the question. Vector similarity can't easily distinguish "mentions the same keywords" from "actually answers this specific question."

Reranking adds a second pass that's slower but much more precise.

## The cross-encoder architecture

The key insight of reranking: the same embedding model that makes retrieval fast also makes it imprecise, because it embeds queries and documents independently. A model that sees the query and document *together* can make much more nuanced relevance judgments.

**Bi-encoder (used in first-pass retrieval):**
- Embed query → vector q
- Embed each document chunk → vector d
- Compute similarity: cosine(q, d)
- Each query and document is encoded independently
- Fast: precompute document embeddings at index time

**Cross-encoder (used in reranking):**
- Input: [query, document chunk] concatenated
- Output: relevance score (0-1)
- Query and document are processed together — full attention across both
- Slow: must run inference for each (query, chunk) pair at query time
- Much more accurate: can reason about how the document specifically addresses the query

The cross-encoder is slower because it can't precompute anything at index time — it must score each (query, chunk) pair fresh for each query. This is why it's only used as a second pass on a manageable number of candidates (typically 20-50) rather than the full corpus (millions).

## The two-stage pipeline

```
Query
  ↓
First stage: Fast ANN search (bi-encoder embeddings + HNSW/IVF index)
  → Retrieve top 50-100 candidates
  ↓
Second stage: Reranking (cross-encoder)
  → Score each candidate against query
  → Sort by relevance score
  → Select top K (typically 5-15) for context
  ↓
LLM generation with top-K chunks in context
```

The first stage casts a wide net efficiently. The second stage precisely selects from that net.

## Reranking models

**Cohere Rerank:** API-based reranker, widely used in production. Simple interface: send query + list of documents, receive relevance scores. Strong performance across domains. Current version (Rerank 3) supports multilingual reranking and long documents.

```python
import cohere

co = cohere.Client(api_key)

results = co.rerank(
    query="What is the refund policy for international orders?",
    documents=retrieved_chunks,
    top_n=10,
    model="rerank-english-v3.0"
)

reranked_chunks = [r.document for r in results.results]
```

**Jina Reranker:** Open-source rerankers from Jina AI. Can be self-hosted. Competitive with Cohere on many benchmarks. Supports long contexts (8192 tokens) which is important for chunk sizes > 512 tokens.

```python
from sentence_transformers import CrossEncoder

model = CrossEncoder("jinaai/jina-reranker-v2-base-multilingual")
scores = model.predict([(query, chunk) for chunk in retrieved_chunks])
ranked_indices = scores.argsort()[::-1][:10]
reranked_chunks = [retrieved_chunks[i] for i in ranked_indices]
```

**BGE Reranker:** From the BAAI group, same team behind BGE embeddings. Strong cross-lingual performance. Freely available.

**LLM-as-reranker:** Use a frontier LLM to score relevance directly:

```python
prompt = f"""
Rate the relevance of the following document to the query on a scale of 1-10.
Query: {query}
Document: {chunk}
Respond with only a single integer.
"""
score = int(llm.complete(prompt).text.strip())
```

LLM-as-reranker is expensive (multiple LLM calls per query) but can achieve very high precision by leveraging the full understanding of a frontier model. Best reserved for high-stakes applications where quality justifies cost.

## Reciprocal Rank Fusion (RRF)

RRF is a reranking technique that merges multiple ranked lists without needing a cross-encoder model.

The algorithm:
1. Retrieve independently from multiple sources: dense retrieval, BM25 sparse retrieval, metadata filters
2. For each chunk, compute its RRF score: Σ 1/(k + rank_i) where k is a constant (typically 60) and rank_i is the rank in each list
3. Sort by RRF score

RRF is valuable when:
- You have multiple retrieval methods that each capture different aspects of relevance
- You want the simplicity of not running a separate reranking model
- You're doing hybrid search and need to merge results cleanly

It doesn't need any trained model, just ranked lists. The tradeoff: it's less precise than a cross-encoder, but significantly more precise than taking results from a single retriever.

## Contextual compression

Reranking selects the most relevant chunks; contextual compression takes this further — extracting only the relevant portion of each chunk.

A retrieved chunk might be 300 tokens of which 50 tokens directly answer the question. Including the full 300 tokens dilutes the context and may confuse the generator.

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor

compressor = LLMChainExtractor.from_llm(llm)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=retriever
)

compressed_docs = compression_retriever.get_relevant_documents(query)
```

The compressor sends each chunk to an LLM with the instruction to extract only the relevant parts. This is expensive (another LLM call per chunk) but can significantly improve generation quality for long or diffuse chunks.

## Reranking for specific query types

Different query types benefit from different reranking approaches:

**Factoid queries ("What is X?"):** Standard cross-encoder reranking works well. The answer is typically in one chunk.

**Comparative queries ("How does A differ from B?"):** May need to retrieve and rerank from sections mentioning A and sections mentioning B separately, then merge. Single-pass reranking may not handle "both A and B must be covered" queries well.

**Temporal queries ("What happened in Q3?"):** Metadata filtering before retrieval (filter by date range) combined with reranking is more reliable than leaving temporal disambiguation to the reranker.

**Multi-hop queries ("Who is the CEO of the company that acquired Z?"):** Reranking a single retrieval pass doesn't solve multi-hop. Need iterative retrieval — retrieve for the first hop, extract intermediate answer, retrieve for the second hop, rerank at each stage.

## Evaluating reranking impact

The key metric: **normalized discounted cumulative gain (NDCG)** measures whether the most relevant chunks appear at the top of the reranked list. Compare NDCG@5 and NDCG@10 for first-pass retrieval vs. after reranking.

Practical evaluation approach:
1. Create a test set of (query, relevant_chunks) pairs
2. For each query, retrieve top 50 first-pass candidates
3. Compute NDCG@10 for first-pass vs. reranked order
4. Track answer quality from the LLM generator on the same test set

The improvement from reranking is typically most visible on:
- Queries with ambiguous keywords (terms that appear in many contexts)
- Specific factoid queries where precision matters
- Queries where the most relevant chunk isn't the most semantically similar to the query

## Production considerations

**Latency:** Cross-encoder reranking adds 50-200ms per query depending on the number of candidates, model size, and whether it's API-based or self-hosted. For interactive applications, this matters. Solutions: smaller reranking models, limiting candidates to top 20, or async reranking with speculative first-pass results shown immediately.

**Cost:** API-based rerankers (Cohere) charge per call. At scale, reranking costs can become significant. Evaluate whether the quality improvement justifies the cost for your application.

**Cold start:** Reranking only helps if the first-pass retrieval includes the relevant chunk in its candidates. If the first pass misses the relevant document entirely (due to low embedding quality or index gaps), reranking can't help. Monitor first-pass recall separately.

---

Reranking is one of the highest-ROI optimizations in production RAG pipelines. The combination of fast bi-encoder retrieval with precise cross-encoder reranking outperforms either approach alone, and the implementation complexity is low relative to the quality improvement. For any RAG system where retrieval quality matters, this should be the first optimization to add.
