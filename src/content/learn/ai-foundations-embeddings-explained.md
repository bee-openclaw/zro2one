---
title: "Embeddings Explained: The Math Behind Semantic Understanding"
depth: technical
pillar: foundations
topic: ai-foundations
tags: [embeddings, semantic-search, vector-databases, nlp, representation-learning, similarity]
author: bee
date: "2026-03-10"
readTime: 11
description: "Embeddings are the foundational technology behind semantic search, RAG, recommendation systems, and much of modern NLP. This is how they work mathematically and in practice."
related: [ai-foundations-transformers, rag-production-architecture, nlp-modern-landscape]
---

Embeddings are numbers that mean something. More precisely: they're dense vector representations of objects — words, sentences, documents, images, audio — where geometric distance in the vector space corresponds to semantic similarity.

This is a simple idea with enormous practical consequences. It's the foundation of semantic search, retrieval-augmented generation, recommendation systems, anomaly detection, and a significant fraction of modern machine learning pipelines.

## What an embedding actually is

An embedding maps an item — a word, a sentence, an image — to a point in a high-dimensional space. A typical text embedding model produces vectors of 768, 1536, or 3072 dimensions (depending on the model).

The key property: **similar things are close together in this space**. "Dog" and "puppy" have vectors that are close to each other. "Machine learning" and "deep learning" are close. "Paris" and "France" have a relationship similar to "Tokyo" and "Japan" — captured as a vector arithmetic relationship.

This proximity-preserves-meaning property emerges from training, not from hand-coded rules. The model learns what "similar" means from observing which items appear in similar contexts in a large corpus.

## Word embeddings: where it started

The modern embedding era began with word2vec (2013) and GloVe — methods for producing per-word vectors from large text corpora.

**word2vec** trains a simple neural network on one of two tasks:
- *CBOW (Continuous Bag of Words):* Predict the center word from its surrounding context words
- *Skip-gram:* Predict surrounding context words from the center word

The key insight: words that appear in similar contexts will have similar representations. After training on billions of words, the model learns that "the bank of the river" and "the bank raised interest rates" use "bank" differently — and the word vector for "bank" is pulled in multiple directions, resulting in a vector that's somewhat close to both "water" and "finance."

The famous example: **king - man + woman ≈ queen**. Vector arithmetic captures semantic relationships. This became the canonical demonstration that embeddings encode something real about meaning.

Limitations of word embeddings: a single vector per word, regardless of context. "Bank" gets one vector that's a weighted average of all its uses. This is a fundamental limitation that contextual embeddings solve.

## Contextual embeddings: transformers change everything

Transformer-based models (BERT, RoBERTa, and their descendants) produce **contextual embeddings** — vectors for a word that depend on its context in a specific sentence.

In "I went to the bank to deposit money" vs. "The boat ran aground on the bank," the word "bank" gets a different vector in each sentence — because the Transformer's attention mechanism incorporates surrounding context before producing the representation.

This is a qualitative improvement for many tasks. The embedding for a word now captures what the word means *in this specific usage*, not a smeared average across all usages.

## Sentence and document embeddings

For most practical applications — semantic search, document clustering, RAG retrieval — you need embeddings for entire sentences or passages, not individual words.

**Naive approach:** Average all the word vectors in the sentence. Works surprisingly well for some tasks but loses ordering and compositional structure.

**Better: sentence transformers.** Models trained specifically to produce meaningful sentence-level embeddings. The key training technique is contrastive learning:

1. Create pairs of similar sentences (same meaning, paraphrases) and dissimilar sentences
2. Train the model so similar pairs have close embeddings and dissimilar pairs have far embeddings
3. The loss function (e.g., contrastive loss, triplet loss) directly optimizes for this geometric property

State-of-the-art sentence embedding models like E5, BGE, and the OpenAI embedding models are trained this way on massive datasets of paraphrase pairs, NLI (natural language inference) data, and retrieval datasets.

## How similarity is measured

Once you have embeddings, measuring similarity is a geometric calculation. The two most common:

**Cosine similarity:** Measures the angle between two vectors, regardless of their magnitude.
```
cos(θ) = (A · B) / (|A| × |B|)
```
Range: -1 to 1. Two vectors pointing in the same direction: 1. Perpendicular: 0. Opposite: -1.

Cosine similarity is the default for text embeddings because it's scale-invariant — a long document and a short document that cover the same topic should be considered similar even if their embedding vectors have different magnitudes.

**Dot product:** Multiply component-wise and sum.
```
A · B = Σ Aᵢ × Bᵢ
```
When vectors are normalized to unit length (which many embedding models do), dot product and cosine similarity are equivalent. Dot product is computationally cheaper and often preferred for high-throughput applications.

**Euclidean distance (L2):** The straight-line distance between two points. Less common for text embeddings because it's affected by magnitude. More common for image and audio embeddings.

## Vector search: the engineering problem

Given an embedding for a query, finding the most similar embeddings in a large collection requires **vector search** — also called approximate nearest neighbor (ANN) search.

Brute-force comparison (calculate similarity against every vector in the database) is exact but O(n). For 10 million documents, that's 10 million cosine similarity calculations per query. Manageable for small datasets; not viable at scale.

**Approximate nearest neighbor algorithms** trade a small loss of accuracy for massive speed improvements:

**HNSW (Hierarchical Navigable Small World):** Builds a multi-layer graph where each node is connected to nearby neighbors. Search navigates from the top layer (sparse, long-range connections) to the bottom layer (dense, short-range connections). Near-linear search time with high recall.

**IVF (Inverted File Index):** Clusters embeddings into partitions. At query time, only search within the most relevant clusters instead of the whole dataset.

**Product Quantization:** Compress high-dimensional vectors into shorter codes, trading some accuracy for dramatically reduced memory and faster computation.

Most production vector databases (Pinecone, Weaviate, Qdrant, pgvector) implement one or more of these. The practical tradeoff is recall vs. query latency — how accurate do you need the results to be, vs. how fast?

## Embedding models: what to use and when

**For text retrieval (RAG, semantic search):**
- OpenAI `text-embedding-3-large` (3072 dims): Strong general-purpose option; closed-source
- `e5-mistral-7b-instruct`: Top open-source option; larger, slower
- BGE-M3: Multilingual, strong at long documents
- `text-embedding-3-small` (1536 dims): Good efficiency/quality tradeoff

**For code:**
- CodeBERT, UniXcoder, or language-specific embeddings trained on code repositories

**For images:**
- CLIP embeddings: Images and text in the same space — enables text-image search
- DINO, DINOv2: Strong image representation without text alignment

**For cross-modal retrieval (text → image, audio → text):**
- CLIP and its descendants (SigLIP, OpenCLIP)

## Practical considerations

**Dimension reduction:** 3072-dimensional vectors are expensive to store and search. PCA or UMAP can reduce to 256-512 dimensions with modest quality loss. OpenAI's newer embedding models support truncation to lower dimensions with graceful degradation.

**Embeddings are model-specific.** You can't mix embeddings from different models — a vector from model A and a vector from model B live in different spaces and their similarity is meaningless. If you switch embedding models, re-embed everything.

**Chunk size matters more than most people expect.** For RAG systems, the quality of retrieval depends heavily on how text is chunked before embedding. Embedding a 5,000-word document as a single vector loses granularity — the vector is an average over all topics. Embedding 200-word chunks gives better retrieval but more vectors to search.

**Fine-tuning for domain:** General embedding models may perform poorly in specialized domains. Fine-tuning on domain-specific text with contrastive examples (pairs of similar/dissimilar documents in your domain) can significantly improve retrieval quality.

---

Embeddings are the interface between language and geometry. They convert the fuzzy, symbol-based structure of natural language into a form where mathematics can reason about similarity, clustering, and relationships. Understanding them is foundational for anyone building semantic search, retrieval pipelines, or applications that need to reason about the meaning of text at scale.
