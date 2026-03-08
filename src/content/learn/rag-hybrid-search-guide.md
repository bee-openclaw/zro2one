---
title: "Hybrid Search for RAG: Combining Dense and Sparse Retrieval"
depth: technical
pillar: building
topic: rag
tags: [rag, hybrid-search, bm25, dense-retrieval, embeddings, information-retrieval, reranking]
author: bee
date: "2026-03-08"
readTime: 9
description: "Pure semantic search often underperforms in production RAG systems. Hybrid search — combining dense embeddings with sparse retrieval — is the more reliable approach."
related: [rag-production-architecture, rag-evaluation-guide, rag-for-builders-mental-model]
---

Most RAG tutorials start with a simple approach: embed your documents, embed the query, find the nearest neighbors by cosine similarity, feed the results to the LLM. It's a reasonable prototype, but production RAG systems almost universally move to **hybrid search** — combining dense (embedding-based) retrieval with sparse (keyword-based) retrieval.

This post explains why pure semantic search underperforms, how hybrid search works, and how to implement it.

## The problem with pure semantic search

Dense retrieval using embeddings is powerful for *semantic* similarity — matching queries to documents that mean the same thing even if they use different words. "What's the capital of France?" will find a document that says "Paris is France's capital city" even without exact word overlap.

But semantic search has real failure modes:

**Keyword precision:** A user searching for "model XR-7 installation" needs the exact product model number. Semantic search may return results about similar products, or about installation generally, rather than the specific XR-7 documentation. The embedding of "XR-7" isn't meaningfully different from "XR-8" in most embedding spaces.

**Technical terms:** Acronyms, technical jargon, error codes, part numbers, drug names — these often don't have strong semantic embeddings because they appear rarely in training data. `ENOENT` as a query won't reliably surface documentation about Linux file system errors just from embeddings.

**Names:** Person names, company names, product names often embed similarly to other names. Searching for "John Martinez pricing proposal" may not reliably surface documents mentioning that specific person.

**Exact phrase requirements:** Sometimes users want exact match, not semantic similarity. Legal documents, contract clauses, quoted text.

In short: **semantic search excels at conceptual similarity; keyword search excels at lexical precision.** Real queries often need both.

## Sparse retrieval: BM25

The dominant sparse retrieval algorithm is **BM25** (Best Match 25) — a refined version of TF-IDF that has dominated information retrieval for decades and remains competitive with modern neural retrievers on many benchmarks.

BM25 scores documents based on:
- **Term frequency (TF):** How often query terms appear in a document — but with diminishing returns (saturation)
- **Inverse document frequency (IDF):** How rare the term is across all documents — rare terms get more weight
- **Document length normalization:** Longer documents don't get unfairly rewarded just for containing more words

```python
from rank_bm25 import BM25Okapi
import numpy as np

# Prepare your corpus
documents = [
    "XR-7 installation guide for industrial systems",
    "Model XR-8 user manual and setup instructions",
    "General installation best practices for machinery"
]

# Tokenize
tokenized_corpus = [doc.lower().split() for doc in documents]

# Create BM25 index
bm25 = BM25Okapi(tokenized_corpus)

# Search
query = "XR-7 installation"
tokenized_query = query.lower().split()
scores = bm25.get_scores(tokenized_query)

# Scores: XR-7 doc >> XR-8 doc > general doc
# Semantic search might have put general doc higher
```

BM25 naturally handles the keyword precision cases that semantic search misses. "XR-7" gets high weight because it appears in only one document (high IDF) and appears in the query.

## Hybrid search: reciprocal rank fusion

The most common approach to combining dense and sparse retrieval is **Reciprocal Rank Fusion (RRF)**.

The idea: take the ranked lists from dense and sparse retrieval, and combine them by reciprocal rank:

```
RRF_score(doc) = Σ 1 / (k + rank_in_list)
```

where k is a constant (typically 60) that reduces the influence of very high ranks.

```python
def reciprocal_rank_fusion(dense_results: list, sparse_results: list, k: int = 60) -> list:
    """
    dense_results: list of (doc_id, score) from embedding search
    sparse_results: list of (doc_id, score) from BM25 search
    Returns: reranked list of (doc_id, combined_score)
    """
    rrf_scores = {}
    
    # Score from dense results
    for rank, (doc_id, _) in enumerate(dense_results):
        if doc_id not in rrf_scores:
            rrf_scores[doc_id] = 0
        rrf_scores[doc_id] += 1 / (k + rank + 1)
    
    # Score from sparse results
    for rank, (doc_id, _) in enumerate(sparse_results):
        if doc_id not in rrf_scores:
            rrf_scores[doc_id] = 0
        rrf_scores[doc_id] += 1 / (k + rank + 1)
    
    # Sort by combined score
    return sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
```

RRF works well in practice because:
- It's rank-based (not score-based), so you don't need to normalize different score scales
- It handles the case where one retriever returns a highly relevant document the other missed
- It's simple and parameter-light

## Full implementation with Qdrant

Modern vector databases like Qdrant have native sparse vector support, enabling efficient hybrid search without maintaining separate indices:

```python
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, SparseVectorParams, Distance,
    SparseIndexParams, PointStruct, SparseVector
)
import numpy as np
from openai import OpenAI

openai_client = OpenAI()
qdrant = QdrantClient(host="localhost", port=6333)

# Create collection with both dense and sparse vectors
qdrant.create_collection(
    collection_name="documents",
    vectors_config={
        "dense": VectorParams(size=1536, distance=Distance.COSINE)
    },
    sparse_vectors_config={
        "sparse": SparseVectorParams(index=SparseIndexParams())
    }
)

def get_dense_embedding(text: str) -> list:
    response = openai_client.embeddings.create(
        model="text-embedding-3-large",
        input=text
    )
    return response.data[0].embedding

def get_sparse_embedding(text: str) -> dict:
    """Create sparse TF-IDF-like representation"""
    from sklearn.feature_extraction.text import TfidfVectorizer
    # In practice, use a shared vectorizer fit on your full corpus
    vectorizer = TfidfVectorizer()
    # Simplified — in production, use a pre-fit vectorizer
    matrix = vectorizer.fit_transform([text])
    cx = matrix.tocoo()
    return {"indices": cx.col.tolist(), "values": cx.data.tolist()}

def index_document(doc_id: str, text: str):
    dense_vector = get_dense_embedding(text)
    sparse_vector = get_sparse_embedding(text)
    
    qdrant.upsert(
        collection_name="documents",
        points=[
            PointStruct(
                id=doc_id,
                vector={
                    "dense": dense_vector,
                    "sparse": SparseVector(
                        indices=sparse_vector["indices"],
                        values=sparse_vector["values"]
                    )
                },
                payload={"text": text}
            )
        ]
    )

def hybrid_search(query: str, top_k: int = 10) -> list:
    query_dense = get_dense_embedding(query)
    query_sparse = get_sparse_embedding(query)
    
    from qdrant_client.models import Prefetch, FusionQuery, Fusion
    
    results = qdrant.query_points(
        collection_name="documents",
        prefetch=[
            Prefetch(query=query_dense, using="dense", limit=top_k * 2),
            Prefetch(
                query=SparseVector(
                    indices=query_sparse["indices"],
                    values=query_sparse["values"]
                ),
                using="sparse",
                limit=top_k * 2
            )
        ],
        query=FusionQuery(fusion=Fusion.RRF),
        limit=top_k
    )
    
    return [(r.id, r.payload["text"], r.score) for r in results.points]
```

## Adding a reranker

Hybrid search typically retrieves 2-4x more candidates than you need, then applies a **cross-encoder reranker** to reorder them by deeper relevance assessment.

Cross-encoders (models like Cohere Rerank, BGE Reranker, or ColBERT) process query and document *jointly*, capturing deeper semantic relationships than bi-encoder embeddings. They're slower (can't pre-index), so you use them on the smaller candidate set after initial retrieval.

```python
import cohere

co = cohere.Client("your-api-key")

def rerank(query: str, documents: list, top_n: int = 5) -> list:
    results = co.rerank(
        model="rerank-english-v3.0",
        query=query,
        documents=[doc["text"] for doc in documents],
        top_n=top_n
    )
    
    return [documents[r.index] for r in results.results]

# Pipeline
candidates = hybrid_search(query, top_k=20)  # Retrieve 20
doc_objects = [{"text": text, "id": id_} for id_, text, _ in candidates]
final_results = rerank(query, doc_objects, top_n=5)  # Rerank to 5
# Feed final_results to LLM
```

The three-stage pipeline (dense retrieval → BM25 → reranking) is the current production standard for RAG retrieval quality.

## When to add each component

**Always worth having:** BM25 alongside dense retrieval. The implementation cost is low; the reliability improvement for keyword-sensitive queries is high.

**Add reranking when:** You have 100k+ documents, complex queries, or quality is genuinely critical. Reranking adds latency (100-300ms) and cost; measure whether the quality gain justifies it for your use case.

**Add query expansion when:** Your users use short queries that under-specify their needs. LLM-based query expansion (generate multiple phrasings of the query, search with all of them) can significantly improve recall.

## Measuring if it's working

Before and after hybrid search implementation, measure:

- **Recall@K:** Of the relevant documents for a set of test queries, what fraction appear in the top K results?
- **Precision@K:** Of the top K results returned, what fraction are actually relevant?
- **MRR (Mean Reciprocal Rank):** Average of 1/rank_of_first_relevant_document across queries

Create a test set of 50-100 queries with known relevant documents. Measure these metrics for dense-only, sparse-only, and hybrid. The improvement from hybrid is usually clearest in Recall@K.

## The bottom line

Pure semantic search is a starting point, not a destination. For production RAG systems handling diverse query types, hybrid search — dense + BM25 + optional reranking — consistently outperforms either approach alone. The implementation complexity is manageable; the quality improvement is real.

If your RAG system sometimes gives confident answers based on the wrong sources: retrieval quality is where to look first.
