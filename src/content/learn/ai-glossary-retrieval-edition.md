---
title: "AI Glossary: Retrieval Edition"
depth: essential
pillar: foundations
topic: ai-glossary
tags: [ai-glossary, retrieval, rag, search, embeddings, vector-databases]
author: bee
date: "2026-03-25"
readTime: 8
description: "Key terms and concepts for understanding retrieval in AI systems — from vector databases and embedding models to reranking, chunking strategies, and hybrid search."
related: [ai-glossary-builders-edition, rag-for-builders-mental-model, rag-chunking-strategies]
---

# AI Glossary: Retrieval Edition

Retrieval is how AI systems find relevant information before generating a response. It underpins RAG, search, recommendation systems, and increasingly, agentic workflows. This glossary covers the terms you need to understand retrieval systems — whether you are building one or evaluating one.

## Core Concepts

**Retrieval-Augmented Generation (RAG):** A pattern where an AI system retrieves relevant documents from an external knowledge base and includes them in the prompt before generating a response. Reduces hallucination and keeps responses grounded in source material.

**Knowledge Base:** The collection of documents, records, or data that a retrieval system searches over. Can be anything from a folder of PDFs to a database of customer support tickets.

**Corpus:** The full set of documents available for retrieval. "Corpus" and "knowledge base" are often used interchangeably, though corpus is more common in academic contexts.

**Index:** A data structure optimized for fast search over a corpus. Instead of scanning every document for every query, an index allows efficient lookup. Vector indexes, inverted indexes, and graph indexes are common types.

## Embeddings and Vector Search

**Embedding:** A numerical representation (vector) of text, images, or other data in a high-dimensional space. Similar items have similar embeddings — their vectors are close together. An embedding model converts raw data into these vectors.

**Embedding Model:** A neural network trained to produce embeddings. For text, models like OpenAI's text-embedding-3, Cohere Embed, and open-source options like BGE and E5 are common. The choice of embedding model significantly affects retrieval quality.

**Vector Database:** A database optimized for storing and searching embeddings. Examples include Pinecone, Weaviate, Qdrant, Milvus, and Chroma. They support approximate nearest neighbor search at scale.

**Approximate Nearest Neighbor (ANN):** An algorithm that finds vectors close to a query vector without exhaustively comparing every vector. Trades a small amount of accuracy for massive speed gains. HNSW and IVF are common ANN algorithms.

**HNSW (Hierarchical Navigable Small World):** A popular ANN algorithm that builds a multi-layer graph of vectors. Navigates from coarse to fine layers to find neighbors quickly. Good balance of speed, accuracy, and memory use.

**Cosine Similarity:** A measure of how similar two vectors are, based on the angle between them. Ranges from -1 (opposite) to 1 (identical direction). The most common similarity metric for text embeddings.

**Dot Product:** Another similarity metric. For normalized vectors, equivalent to cosine similarity. Some systems use dot product because it is slightly faster to compute.

## Chunking and Document Processing

**Chunking:** Splitting documents into smaller pieces before embedding and indexing. Necessary because embedding models have token limits and because smaller, focused chunks often retrieve better than entire documents.

**Chunk Size:** The length of each chunk, typically measured in tokens. Common sizes range from 256 to 1024 tokens. Smaller chunks are more precise but lose context; larger chunks retain context but may dilute relevance.

**Chunk Overlap:** The number of tokens shared between adjacent chunks. Overlap (e.g., 50-100 tokens) prevents information at chunk boundaries from being lost.

**Recursive Chunking:** A strategy that splits text at natural boundaries (sections, paragraphs, sentences) rather than at fixed token counts. Produces more semantically coherent chunks.

**Parent Document Retrieval:** A technique where small chunks are used for matching, but the full parent document (or a larger surrounding chunk) is returned to the LLM. Gets the precision of small chunks with the context of large ones.

## Search Strategies

**Semantic Search:** Finding documents based on meaning rather than keyword matching. Uses embeddings to find conceptually similar content even when exact words differ. "How to fix a flat tire" matches "tire puncture repair guide."

**Keyword Search (Lexical Search):** Traditional search based on matching exact terms. Uses inverted indexes (like BM25). Fast, interpretable, and still effective for exact matches, proper nouns, and technical terms.

**Hybrid Search:** Combining semantic search and keyword search, typically by running both and merging results. Captures the strengths of both — semantic understanding plus exact term matching.

**BM25:** A ranking function for keyword search that considers term frequency, document length, and corpus statistics. The standard baseline for lexical retrieval. Often surprisingly competitive with semantic search.

**Reciprocal Rank Fusion (RRF):** A method for combining results from multiple search strategies. Ranks items by the reciprocal of their position in each result list. Simple and effective for hybrid search.

## Reranking and Refinement

**Reranker:** A model that takes a query and a set of candidate documents and re-scores them for relevance. More accurate than initial retrieval but more expensive — applied to a small set of candidates (e.g., top 20-50) rather than the full corpus.

**Cross-Encoder:** A type of reranker that processes the query and document together (as a single input), enabling deep interaction between them. More accurate than bi-encoders for relevance scoring but too slow for initial retrieval.

**Bi-Encoder:** A model that encodes query and document independently into separate embeddings. Fast (embeddings can be precomputed) but less accurate than cross-encoders because query and document do not interact during encoding.

**Query Rewriting:** Transforming the user's query before retrieval to improve results. An LLM might expand "RAG latency" into "how to reduce retrieval-augmented generation response time" to match more documents.

**HyDE (Hypothetical Document Embeddings):** A technique where the LLM generates a hypothetical answer to the query, and that answer is used as the search query. The idea: a hypothetical answer is more similar to real answers than the original question is.

## Evaluation

**Recall@k:** The fraction of relevant documents found in the top k results. High recall means the system is not missing important documents.

**Precision@k:** The fraction of the top k results that are actually relevant. High precision means the system is not returning junk.

**MRR (Mean Reciprocal Rank):** The average of 1/rank for the first relevant result across queries. Measures how quickly the system surfaces a relevant document.

**NDCG (Normalized Discounted Cumulative Gain):** A metric that accounts for both relevance and position — relevant documents ranked higher score better than relevant documents ranked lower. The standard metric for search quality.

**Faithfulness:** In RAG evaluation, whether the generated answer is supported by the retrieved documents. A retrieval system can find the right documents, but the generator might still hallucinate.

## Infrastructure

**Embedding Pipeline:** The system that processes new documents — chunking, embedding, and indexing them. Must handle updates, deletions, and incremental additions.

**Metadata Filtering:** Narrowing search to documents matching specific metadata (date range, author, category) before or during vector search. Essential for multi-tenant systems and scoped queries.

**Multi-tenancy:** Supporting multiple users or organizations in a single retrieval system while keeping their data isolated. Implemented through metadata filtering or separate indexes.

Understanding these terms is the foundation for building, evaluating, and debugging retrieval systems. The field moves fast, but the core concepts are stable.
