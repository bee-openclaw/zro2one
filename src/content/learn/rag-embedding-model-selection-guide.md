---
title: "Choosing an Embedding Model for RAG: A Practical Comparison"
depth: technical
pillar: practice
topic: rag
tags: [rag, embeddings, vector-search, model-selection, retrieval]
author: bee
date: "2026-03-25"
readTime: 10
description: "How to choose the right embedding model for your RAG system — covering open-source vs. commercial options, benchmark interpretation, dimension trade-offs, and practical evaluation strategies."
related: [rag-hybrid-search-guide, rag-chunking-strategies, rag-evaluation-metrics-guide]
---

# Choosing an Embedding Model for RAG: A Practical Comparison

The embedding model is the most consequential technical decision in a RAG system. It determines what "relevant" means — which documents get retrieved and which get missed. A weak embedding model limits your system's ceiling regardless of how good your chunking, reranking, or generation model is.

The good news: embedding models have improved dramatically. The bad news: there are dozens of options and the benchmarks do not always tell you what you need to know.

## What an Embedding Model Does in RAG

Quick refresher: the embedding model converts text (queries and documents) into numerical vectors. Documents with similar meanings get similar vectors. At query time, the system finds document vectors closest to the query vector. The embedding model defines the meaning of "closest."

Two critical roles:
1. **Indexing**: Converting every document chunk into a vector (done once, or when documents change)
2. **Query encoding**: Converting the user's query into a vector (done on every query)

Some models use the same encoder for both (symmetric). Others use separate encoders optimized for queries vs. documents (asymmetric). Asymmetric models often perform better for RAG because queries and documents have different characteristics.

## The Landscape in 2026

### Commercial APIs

**OpenAI text-embedding-3-small / large**: The workhorse. Good quality, simple API, reasonable cost. The small variant (1536 dimensions) handles most use cases; the large variant (3072 dimensions) provides marginal improvement for demanding applications. Supports Matryoshka representations — you can truncate dimensions to trade quality for efficiency.

**Cohere Embed v3**: Strong multilingual performance. Supports different input types (search_query, search_document) for asymmetric encoding. Compression-friendly with built-in quantization support.

**Voyage AI**: High performance on technical and code content. Multiple model sizes. Often tops domain-specific benchmarks.

**Google Gecko / text-embedding**: Competitive quality, well-integrated with Google Cloud infrastructure.

### Open Source

**BGE (BAAI General Embedding)**: One of the strongest open-source families. BGE-large-en-v1.5 and BGE-M3 (multilingual) are widely used. Good balance of quality and efficiency.

**E5 (Microsoft)**: Strong general-purpose embeddings. E5-mistral-7b-instruct is notable — a 7B parameter model that produces excellent embeddings but is much larger (and slower) than typical embedding models.

**Nomic Embed**: Designed for long contexts (up to 8192 tokens). Good for use cases where chunks are large.

**GTE (Alibaba)**: Competitive performance, especially the larger variants. Strong multilingual coverage.

**Jina Embeddings v3**: Good multilingual support with flexible dimension sizes.

## Benchmarks: What They Tell You and What They Don't

MTEB (Massive Text Embedding Benchmark) is the standard benchmark suite. It evaluates models across multiple tasks: retrieval, classification, clustering, semantic similarity, and more.

**What MTEB tells you:**
- General capability ranking across diverse tasks
- Relative performance between models
- How well a model handles different text types

**What MTEB does not tell you:**
- How the model performs on your specific domain
- How it handles your query patterns (short questions? long queries? keyword-style?)
- How embedding quality interacts with your chunking strategy
- Whether the improvement from model A to model B matters for your end-to-end system

**The practical rule**: Use MTEB to create a shortlist of 3-5 candidates. Then evaluate those candidates on your own data.

## Dimensions: More is Not Always Better

Embedding dimensions range from 384 to 4096+. The trade-offs:

| Dimensions | Storage per Vector | Search Speed | Quality |
|---|---|---|---|
| 384 | 1.5 KB | Fast | Good for simple tasks |
| 768 | 3 KB | Good | Strong baseline |
| 1024 | 4 KB | Good | Marginal improvement |
| 1536 | 6 KB | Moderate | Diminishing returns |
| 3072+ | 12+ KB | Slower | Marginal over 1536 |

At 1 million documents, the difference between 768 and 3072 dimensions is ~9 GB of additional storage and measurably slower search. The quality difference is often 1-3% on benchmarks — which may or may not matter for your application.

**Recommendation**: Start with 768-1024 dimensions. Only go higher if evaluation shows meaningful improvement on your data. Matryoshka-capable models let you experiment with dimension reduction after indexing.

## Evaluation on Your Own Data

The most important step, and the one most teams skip.

### Build an evaluation set

1. Collect 100-200 real user queries from your application (or realistic synthetic queries)
2. For each query, identify the correct documents (or passages) that should be retrieved
3. This is your ground truth

### Run retrieval evaluation

For each candidate model:
1. Embed all document chunks
2. For each evaluation query, retrieve the top-k results
3. Measure Recall@5, Recall@10, MRR, and NDCG

### Compare end-to-end

Retrieval metrics matter, but what ultimately matters is the quality of the generated answer. For your top 2-3 embedding models, run end-to-end evaluation:
1. Retrieve → Generate → Evaluate answer quality
2. A model with slightly worse retrieval metrics might produce better end-to-end results if it retrieves more diverse or complementary documents

### Test edge cases

- **Short queries** (1-3 words): "pricing model" — does the model retrieve relevant content?
- **Long queries** (full questions): "How do I configure SSO with SAML for our enterprise account?" 
- **Ambiguous queries**: "Python" — programming language or snake?
- **Domain-specific terminology**: Jargon, acronyms, product names
- **Negation**: "Not working" vs. "working" — does the model distinguish?

## Practical Decision Framework

**Choose a commercial API when:**
- You want minimal operational overhead
- Your volume is moderate (under 10M embeddings)
- You are already using that provider's LLM
- You need the highest quality without model management

**Choose open source when:**
- Data privacy requires on-premise processing
- Volume makes API costs prohibitive
- You need to fine-tune for your domain
- Latency requirements favor local inference

**Choose a small model (384-768d) when:**
- Storage and search speed matter more than marginal quality
- Your retrieval task is relatively simple (short queries, well-structured documents)
- You are building a prototype or MVP

**Choose a large model (1024-3072d) when:**
- Retrieval quality is the bottleneck in your system
- Your domain is complex (legal, medical, technical)
- You have demanding multilingual requirements

## Fine-Tuning: When and How

Fine-tuning an embedding model on your domain data can improve retrieval quality by 5-15%. Worth it when:

- General models underperform on your domain-specific terminology
- You have query-document pairs from user behavior (clicks, ratings)
- Your domain has unique semantic relationships (medical terms, legal concepts)

The simplest approach: contrastive fine-tuning with (query, positive_document, negative_document) triplets. 1,000-5,000 triplets are usually sufficient for meaningful improvement.

## Migration and Reindexing

Changing embedding models requires reindexing all documents — generating new vectors for everything. Plan for this:

- **Index versioning**: Run old and new indexes in parallel during migration
- **Incremental testing**: Test the new model on a subset before full reindexing
- **Rollback plan**: Keep the old index until the new one is validated

Reindexing cost (time and compute) is the practical reason to choose carefully upfront. Switching embedding models is not like switching LLMs — it requires significant operational effort.

Choose thoughtfully, evaluate on your data, and do not over-optimize. A solid embedding model with good chunking beats a perfect embedding model with bad chunking every time.
