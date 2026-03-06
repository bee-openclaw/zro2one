---
title: "RAG in Production: Architecture Decisions That Actually Matter"
depth: technical
pillar: building
topic: rag
tags: [rag, retrieval-augmented-generation, vector-databases, embeddings, technical, production]
author: bee
date: "2026-03-05"
readTime: 13
description: "Building a RAG system that works in production is harder than the demos suggest. A deep dive into the architecture decisions, failure modes, and engineering tradeoffs that determine whether your RAG actually works."
related: [rag-for-builders-mental-model, llm-api-integration-guide, api-integration-patterns-for-llms]
---

## Why demos lie about RAG

Every RAG demo shows the same thing: beautiful PDF or webpage → embeddings → semantic search → LLM answers a question perfectly.

Then you build it and it breaks. The chunks are wrong. The retrieval finds irrelevant content. The model ignores the context and makes things up anyway. Users complain that it doesn't know things that are clearly in the documents.

RAG is more engineering than demos suggest. This guide covers the decisions that determine whether your RAG system works in production — not the ones that make demos look good.

---

## The baseline architecture

Before going deep, the standard RAG pipeline:

```
INDEXING (offline):
Documents → Chunking → Embedding → Vector Store

RETRIEVAL (online):
Query → Embedding → Vector Search → Top-K Chunks

GENERATION:
Prompt + Chunks → LLM → Response
```

Each step has significant design choices. Getting them right for your specific data and use case is the actual work.

---

## 1. Document ingestion and preprocessing

### Why preprocessing is 60% of the work

The quality of your RAG system is bounded by the quality of what's in your index. Bad documents produce bad retrieval. Here's what bad looks like:

- PDFs extracted to text with scrambled column order (common in multi-column layouts)
- Tables converted to unstructured text that loses relational meaning
- Images, charts, and diagrams with no textual representation
- Headers and footers repeated on every page appearing as content
- Footnotes and endnotes mixed into body text

**Production preprocessing pipeline:**

```python
from pathlib import Path
import re

def preprocess_document(raw_text: str, doc_metadata: dict) -> str:
    """Clean document text before chunking."""
    
    # Remove repeated headers/footers (detect by finding strings 
    # appearing in same position across many pages)
    text = remove_repeated_boilerplate(raw_text)
    
    # Normalize whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)  # Max 2 consecutive newlines
    text = re.sub(r' {2,}', ' ', text)       # Remove double spaces
    
    # Handle table extraction
    # Option A: Convert tables to structured prose
    # Option B: Skip tables (if they're not important for your use case)
    # Option C: Handle tables separately with specialized chunking
    text = convert_tables_to_prose(text)
    
    # Remove likely noise
    text = re.sub(r'Page \d+ of \d+', '', text)  # Page numbers
    text = re.sub(r'www\.[^\s]+', '[URL]', text)  # Replace URLs with placeholder
    
    return text.strip()
```

**For PDFs specifically:** Don't use pypdf2/pdfplumber for complex layouts. Use a parser that understands document structure:

- **Unstructured** (open source): Handles complex PDFs, preserves structure elements
- **Azure Document Intelligence**: Production-grade, handles tables and forms well
- **LlamaParse** (LlamaIndex): Specifically designed for RAG preprocessing, handles images via vision models

---

## 2. Chunking strategy

Chunking is where most RAG systems make critical errors. The right chunking strategy depends entirely on your document types and query patterns.

### Fixed-size chunking (simple but usually wrong)

```python
def fixed_size_chunks(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split by character count. Fast, but breaks context arbitrarily."""
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap  # Overlap helps with boundary queries
    
    return chunks
```

**When it works:** Uniformly structured text without strong semantic units (e.g., continuous prose documents where any arbitrary passage is as good as another).

**When it fails:** Any document with logical structure (chapters, sections, procedures, Q&A format). Splits mid-sentence, mid-paragraph, mid-thought.

### Sentence/paragraph chunking (better for most cases)

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". ", " ", ""]  # Try these in order
)

chunks = splitter.split_text(text)
```

The recursive splitter tries to split on paragraph breaks, then sentence breaks, then word breaks — preserving semantic units when possible.

### Semantic chunking (for heterogeneous documents)

```python
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from sentence_transformers import SentenceTransformer

def semantic_chunker(sentences: list[str], threshold: float = 0.8) -> list[str]:
    """Chunk by semantic similarity between consecutive sentences."""
    
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(sentences)
    
    chunks = []
    current_chunk = [sentences[0]]
    
    for i in range(1, len(sentences)):
        similarity = cosine_similarity(
            embeddings[i-1].reshape(1, -1),
            embeddings[i].reshape(1, -1)
        )[0][0]
        
        if similarity < threshold:  # Topic shift detected
            chunks.append(' '.join(current_chunk))
            current_chunk = [sentences[i]]
        else:
            current_chunk.append(sentences[i])
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks
```

### Document-structure-aware chunking (best for structured documents)

For documents with explicit structure (contracts with numbered sections, technical manuals with chapters, policy documents), chunk along the document's own structure:

```python
def structure_aware_chunks(text: str) -> list[dict]:
    """Extract chunks preserving document hierarchy."""
    
    import re
    
    # Match heading patterns (adapt regex to your document format)
    heading_pattern = re.compile(r'^(#{1,4}|\d+\.(?:\d+\.)*)\s+(.+)$', re.MULTILINE)
    
    sections = []
    last_end = 0
    current_path = []  # Track heading hierarchy
    
    for match in heading_pattern.finditer(text):
        # Save previous section
        if last_end < match.start():
            sections.append({
                "content": text[last_end:match.start()].strip(),
                "hierarchy": current_path.copy(),
                "heading": current_path[-1] if current_path else "Document Start"
            })
        
        # Update current path based on heading level
        heading_level = len(match.group(1).rstrip('.'))
        heading_text = match.group(2)
        
        if len(current_path) >= heading_level:
            current_path = current_path[:heading_level-1]
        current_path.append(heading_text)
        
        last_end = match.end()
    
    return [s for s in sections if s["content"]]
```

The hierarchy metadata is crucial — it tells the retriever that "Section 3.2.1" is a subsection of "Section 3.2" which is a subsection of "Section 3."

---

## 3. Metadata enrichment

Every chunk should carry metadata. This is underutilized by most RAG implementations.

```python
def create_chunk_with_metadata(
    content: str,
    source_doc: str,
    section_path: list[str],
    page_number: int | None = None,
    date: str | None = None,
    doc_type: str | None = None
) -> dict:
    return {
        "content": content,
        "metadata": {
            "source": source_doc,
            "section_path": " > ".join(section_path),
            "page": page_number,
            "date": date,
            "doc_type": doc_type,
            "char_count": len(content),
            "created_at": datetime.now().isoformat()
        }
    }
```

**Why metadata matters:**

1. **Filtered retrieval:** "Find relevant content only from documents dated after 2024"
2. **Citation generation:** "According to [source], page [N]..."
3. **Debugging:** When retrieval fails, inspect what metadata the retrieved chunks have
4. **Recency weighting:** Score newer documents higher for time-sensitive queries

---

## 4. Embedding model selection

The embedding model determines the quality of semantic retrieval. Key considerations:

**Dimensionality vs. quality tradeoff:**
- `text-embedding-3-small` (OpenAI): 1536 dims, cheap, very fast, good quality
- `text-embedding-3-large` (OpenAI): 3072 dims, more expensive, highest quality
- `all-MiniLM-L6-v2` (open source): 384 dims, local, fast, adequate for most cases
- `bge-large-en-v1.5` (open source): 1024 dims, strong performance, local

**For most production use cases:** `text-embedding-3-small` is the right starting point — the quality/cost ratio is excellent.

**Domain-specific considerations:**
- Medical, legal, or technical domains benefit from domain-specific embedding models
- Code search benefits from models trained on code (e.g., `code-search-ada-002` or specialized code embedding models)

**Consistency requirement:** You MUST use the same model for indexing and retrieval. Embeddings from different models are incompatible.

---

## 5. Vector database selection

| Database | Best for | Notes |
|---|---|---|
| **pgvector** | PostgreSQL-native, existing Postgres users | Low operational overhead, good for < 1M vectors |
| **Pinecone** | Managed service, simple ops | Easiest to start with, costs scale with usage |
| **Weaviate** | Multi-tenancy, hybrid search | Good for products serving multiple customers |
| **Qdrant** | Open source, self-hosted | Excellent performance, Docker deployment simple |
| **Chroma** | Local development | In-memory or persistent, great for prototyping |
| **Milvus** | Large scale (100M+ vectors) | Complex ops, strongest at scale |

**For most applications < 1M chunks:** pgvector (if you're already on Postgres) or Pinecone. Don't over-engineer this.

```python
import chromadb

# Initialize (in-memory for dev, persistent for production)
client = chromadb.PersistentClient(path="./chroma_db")

collection = client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"}
)

# Add chunks
collection.add(
    documents=[chunk["content"] for chunk in chunks],
    metadatas=[chunk["metadata"] for chunk in chunks],
    ids=[f"chunk_{i}" for i in range(len(chunks))]
)

# Query
results = collection.query(
    query_texts=["What is the refund policy?"],
    n_results=5,
    where={"doc_type": "policy"}  # Metadata filter
)
```

---

## 6. Retrieval quality: the real challenge

Vector similarity is not semantic relevance. This is where RAG systems most often fail.

**The core problem:** Embedding similarity captures "similar words" better than "answering this question." A query about "cancellation policy" might retrieve chunks about "policy for cancellations" (good) AND "company history and founding" (bad, just happens to use some similar words) with similar cosine similarity scores.

### Hybrid search: vector + BM25

Combining dense (vector) and sparse (BM25/keyword) retrieval significantly improves recall:

```python
from rank_bm25 import BM25Okapi

class HybridRetriever:
    def __init__(self, chunks: list[str], embeddings, dense_retriever):
        # BM25 for keyword search
        tokenized = [chunk.lower().split() for chunk in chunks]
        self.bm25 = BM25Okapi(tokenized)
        self.chunks = chunks
        
        # Dense retriever (your vector DB)
        self.dense = dense_retriever
        self.embeddings = embeddings
    
    def retrieve(self, query: str, k: int = 10) -> list[dict]:
        # Sparse retrieval
        bm25_scores = self.bm25.get_scores(query.lower().split())
        
        # Dense retrieval
        dense_results = self.dense.query(query, n_results=k)
        dense_ids = {r["id"]: r["score"] for r in dense_results}
        
        # Reciprocal Rank Fusion (RRF)
        # Combines rankings from both methods
        bm25_ranked = np.argsort(bm25_scores)[::-1][:k]
        
        scores = {}
        for rank, idx in enumerate(bm25_ranked):
            scores[idx] = scores.get(idx, 0) + 1 / (rank + 60)
        
        for rank, (id, _) in enumerate(sorted(dense_ids.items(), key=lambda x: x[1], reverse=True)):
            scores[int(id)] = scores.get(int(id), 0) + 1 / (rank + 60)
        
        ranked_ids = sorted(scores, key=scores.get, reverse=True)[:k]
        return [{"content": self.chunks[i], "score": scores[i]} for i in ranked_ids]
```

Hybrid search with RRF consistently outperforms either sparse or dense retrieval alone, especially for queries containing specific terms (model names, product IDs, exact phrases).

### Reranking

After initial retrieval, apply a cross-encoder reranker to rescore the top-K results:

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

def rerank(query: str, candidate_chunks: list[str], top_n: int = 3) -> list[str]:
    pairs = [(query, chunk) for chunk in candidate_chunks]
    scores = reranker.predict(pairs)
    
    ranked = sorted(zip(candidate_chunks, scores), key=lambda x: x[1], reverse=True)
    return [chunk for chunk, _ in ranked[:top_n]]
```

Cross-encoders are slower but more accurate than bi-encoder embedding models for relevance scoring. The typical pattern: retrieve 20-50 candidates with fast vector search, rerank to top 5 with cross-encoder.

---

## 7. Generation quality

### Context placement matters

Research shows models perform better when relevant context is at the **beginning** of the context window, not the middle (the "lost in the middle" problem). Sort your retrieved chunks by relevance, put highest-ranked first.

### Grounding prompt design

```python
def build_rag_prompt(query: str, chunks: list[dict]) -> str:
    context = "\n\n---\n\n".join([
        f"Source: {c['metadata']['source']}, Section: {c['metadata']['section_path']}\n{c['content']}"
        for c in chunks
    ])
    
    return f"""Answer the following question using ONLY the provided context. 

If the answer is not in the context, say "I don't have information about this in my knowledge base" — 
do NOT speculate or use outside knowledge.

If you use information from the context, cite the source (Source name, Section).

Context:
{context}

Question: {query}

Answer:"""
```

The explicit instruction to say "I don't know" is critical — without it, models will hallucinate answers when the context is insufficient.

### Handling insufficient context

```python
def check_context_sufficiency(query: str, chunks: list[str], model_client) -> bool:
    """Determine if retrieved chunks are sufficient to answer the query."""
    
    response = model_client.complete(f"""
    Query: {query}
    
    Context chunks:
    {chr(10).join(chunks[:3])}
    
    Can the above context sufficiently answer the query? 
    Answer with only "YES" or "NO".
    """)
    
    return response.strip().upper() == "YES"
```

Use this as a filter before calling your expensive generation model. If context is insufficient, return a controlled "I don't have this information" response rather than a potentially hallucinated one.

---

## 8. Evaluation and iteration

The only way to know if your RAG works is to measure it.

```python
def evaluate_rag(
    test_questions: list[dict],  # [{"question": "...", "expected_answer": "..."}]
    retriever,
    generator
) -> dict:
    """Basic RAG evaluation metrics."""
    
    results = []
    for test in test_questions:
        # Retrieval: did we retrieve the right chunks?
        retrieved = retriever.retrieve(test["question"])
        retrieval_relevant = any(
            test["relevant_chunk_id"] in c["id"] 
            for c in retrieved
        ) if "relevant_chunk_id" in test else None
        
        # Generation: is the answer correct/grounded?
        answer = generator.answer(test["question"], retrieved)
        
        results.append({
            "question": test["question"],
            "answer": answer,
            "expected": test["expected_answer"],
            "retrieval_hit": retrieval_relevant
        })
    
    retrieval_accuracy = sum(1 for r in results if r["retrieval_hit"]) / len(results)
    
    return {
        "retrieval_accuracy": retrieval_accuracy,
        "answers": results,
        "n_evaluated": len(results)
    }
```

**What to measure:**
- **Retrieval recall:** For questions with known relevant chunks, are those chunks in the top-K?
- **Answer faithfulness:** Does the generated answer actually come from the retrieved context? (RAGAS framework helps here)
- **Answer correctness:** Is the answer actually right? (Requires human evaluation or an eval model)
- **Refusal accuracy:** When context doesn't contain the answer, does the system correctly say so?

---

## The production checklist

Before shipping:

- [ ] Document preprocessing tested on all document types you'll encounter
- [ ] Chunk size tuned for your average query complexity
- [ ] Embedding model selected and consistent between indexing and retrieval
- [ ] Hybrid search (vector + BM25) implemented
- [ ] Reranking implemented for final selection
- [ ] Metadata filtering available for relevant dimensions
- [ ] Generation prompt instructs the model to cite sources and refuse uncertain answers
- [ ] Evaluation set of 50+ question-answer pairs with known expected answers
- [ ] Logging in place for queries, retrieved chunks, and answers (for debugging)
- [ ] Monitoring for retrieval quality over time (new documents may degrade retrieval)
- [ ] Human review process for flagged low-confidence answers

RAG that works in production is 20% architecture and 80% careful engineering of each step. The checklist above is the 80%.
