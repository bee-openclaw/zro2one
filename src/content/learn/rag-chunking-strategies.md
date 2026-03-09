---
title: "RAG Chunking Strategies: Why Your Split Matters More Than Your Model"
depth: technical
pillar: building
topic: rag
tags: [rag, chunking, retrieval, vector-search, document-processing, applied-ai]
author: bee
date: "2026-03-09"
readTime: 10
description: "Chunking is the most underrated decision in RAG system design. The wrong strategy degrades retrieval quality regardless of how good your embedding model is. Here's how to do it right."
related: [rag-hybrid-search-guide, rag-evaluation-guide, rag-production-architecture]
---

Most RAG tutorials spend time on vector databases, embedding models, and retrieval algorithms. These matter. But chunking — how you split source documents into retrievable pieces — is often the highest-leverage decision in your RAG system, and it gets the least attention.

Bad chunking means your retrieval returns fragments with no context, or buries the relevant passage in a chunk full of noise. Good chunking means retrieved chunks contain the right information with enough context for the model to use it.

This guide covers the chunking strategies that matter in production, with practical guidance on when to use each.

## Why chunking decisions are critical

When a user asks "what's the refund policy for digital products?", your system embeds that query and retrieves the most similar chunks from your document store.

What happens with bad chunking:
- The relevant sentence is split across two chunks, so neither chunk retrieves well
- The chunk containing the policy is too large and includes unrelated content that dilutes the embedding similarity
- The chunk is too small and lacks the context needed to understand what "digital products" refers to

What happens with good chunking:
- The complete policy for digital products is in a single, coherent chunk
- The chunk's embedding strongly matches the query
- The chunk contains enough context for the model to formulate a complete answer

Your embedding model and vector search are working with chunks as input. If the chunks are poorly constructed, no amount of embedding quality fixes retrieval.

## The fixed-size chunking baseline

The simplest strategy: split text into chunks of fixed character or token count, with optional overlap.

```python
def chunk_fixed(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    """Split text into fixed-size chunks with overlap."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap  # Step back by overlap
    return chunks
```

**Overlap** handles the boundary problem: if important content spans a chunk boundary, the overlap ensures it appears (partially) in adjacent chunks. Typical overlap: 10-20% of chunk size.

**Pros:** Simple, predictable, easy to reason about.

**Cons:** Completely ignores document structure. Splits mid-sentence, mid-paragraph, mid-topic. Retrieved chunks often lack coherent meaning.

**When to use:** As a baseline for benchmarking only. Almost any structure-aware strategy beats this.

## Sentence-based chunking

Split on sentence boundaries rather than character counts.

```python
import spacy

nlp = spacy.load("en_core_web_sm")

def chunk_sentences(text: str, sentences_per_chunk: int = 5, overlap: int = 1) -> list[str]:
    doc = nlp(text)
    sentences = [sent.text.strip() for sent in doc.sents]
    
    chunks = []
    for i in range(0, len(sentences), sentences_per_chunk - overlap):
        chunk = " ".join(sentences[i:i + sentences_per_chunk])
        if chunk.strip():
            chunks.append(chunk)
    return chunks
```

**Pros:** Chunks are complete, readable sentences. Better semantic coherence than character splits.

**Cons:** Sentences don't necessarily represent coherent topics. A 5-sentence chunk might cover the end of one topic and beginning of another.

**When to use:** Short documents, conversational content, customer support FAQs.

## Paragraph and structure-based chunking

Respect the document's natural structure: paragraphs, sections, headers. For well-structured documents (documentation, reports, articles), this is usually the strongest simple strategy.

```python
def chunk_by_paragraphs(text: str, max_tokens: int = 512) -> list[str]:
    """Chunk by paragraphs, merging short ones and splitting long ones."""
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        para_tokens = len(para.split())  # Approximate token count
        current_tokens = len(current_chunk.split())
        
        if current_tokens + para_tokens <= max_tokens:
            current_chunk = f"{current_chunk}\n\n{para}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            if para_tokens > max_tokens:
                # Long paragraph: split by sentences
                chunks.extend(chunk_sentences(para, sentences_per_chunk=8))
                current_chunk = ""
            else:
                current_chunk = para
    
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks
```

**Pros:** Preserves semantic units. Retrieved chunks are coherent.

**Cons:** Requires clean paragraph structure (PDFs and HTML often lose this). Chunks can vary dramatically in size.

**When to use:** Well-structured text documents, markdown files, HTML articles.

## Semantic chunking

Instead of splitting at fixed points, split where the meaning changes. This requires computing embeddings for each sentence and identifying boundaries where embedding similarity drops significantly.

```python
from sentence_transformers import SentenceTransformer
import numpy as np

def semantic_chunk(text: str, threshold: float = 0.3, min_chunk_tokens: int = 100) -> list[str]:
    """Split text at semantic boundaries."""
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Split into sentences
    sentences = sent_tokenize(text)
    
    if len(sentences) < 2:
        return [text]
    
    # Embed sentences
    embeddings = model.encode(sentences)
    
    # Compute similarity between adjacent sentences
    splits = [0]  # Always start a chunk at the beginning
    
    for i in range(1, len(sentences)):
        # Cosine similarity between adjacent sentence embeddings
        sim = np.dot(embeddings[i-1], embeddings[i]) / (
            np.linalg.norm(embeddings[i-1]) * np.linalg.norm(embeddings[i])
        )
        
        # Low similarity = semantic boundary
        if sim < (1 - threshold):
            splits.append(i)
    
    splits.append(len(sentences))
    
    # Build chunks from splits
    chunks = []
    for i in range(len(splits) - 1):
        chunk = " ".join(sentences[splits[i]:splits[i+1]])
        if len(chunk.split()) >= min_chunk_tokens:
            chunks.append(chunk)
    
    return chunks
```

**Pros:** Chunks align with topic boundaries. No arbitrary splitting mid-topic. Can produce better retrieval quality.

**Cons:** Computationally expensive (requires embedding every sentence). Threshold tuning is needed per document type.

**When to use:** Long documents with significant topic variation (reports, books, multi-section documents). When you have the compute budget and retrieval quality is critical.

## Hierarchical chunking: small-to-big

A powerful pattern: create chunks at multiple granularities simultaneously. Small chunks for precise retrieval; larger "parent" chunks as context.

**How it works:**
1. Create fine-grained chunks (individual paragraphs or even sentences)
2. Index these small chunks for retrieval
3. Map each small chunk to its parent (the larger section or document section it belongs to)
4. At retrieval time: retrieve small chunks (precise matching), but return the parent chunks to the model (sufficient context)

```python
class HierarchicalChunker:
    def create_chunks(self, document: str) -> dict:
        sections = split_by_headers(document)  # Level 1: sections
        
        all_small = []
        parent_map = {}
        
        for section_id, section in enumerate(sections):
            paragraphs = split_by_paragraphs(section)  # Level 2: paragraphs
            
            for para_id, para in enumerate(paragraphs):
                chunk_id = f"s{section_id}_p{para_id}"
                all_small.append({"id": chunk_id, "text": para})
                parent_map[chunk_id] = {"section_id": section_id, "text": section}
        
        return {"small_chunks": all_small, "parent_map": parent_map}
```

**Retrieval:** Embed and index small chunks. When a small chunk is retrieved, fetch its parent section to provide context.

**Why this works:** Small chunks retrieve precisely (the embedding signal is strong because the chunk is focused). Parent chunks provide enough context for the model to answer well.

**LlamaIndex** implements this as "small-to-big retrieval" with good out-of-the-box support.

## Document-type-specific strategies

Different document types benefit from different approaches:

### Technical documentation

Preserve code blocks as separate chunks. Don't split a code block from its surrounding explanation.

```python
def chunk_documentation(text: str) -> list[str]:
    # Split on markdown headers first
    sections = split_by_headers(text)
    chunks = []
    
    for section in sections:
        # Keep code blocks intact
        if '```' in section:
            # Split around code blocks: text before, code block, text after
            parts = split_preserving_codeblocks(section)
            chunks.extend(parts)
        else:
            # Paragraph-based for prose
            chunks.extend(chunk_by_paragraphs(section))
    
    return chunks
```

### Legal and contract documents

Legal documents have semantic units at the clause and section level. Clause-level chunking significantly outperforms paragraph chunking. Preserve clause numbers/references.

### Tabular content (CSV, spreadsheets, database exports)

Tables don't chunk well as text. Options:
- Convert each row to a natural language description: "Product A: price $45.99, category Electronics, SKU 1234"
- Chunk by logical row groups (all rows for a time period, all rows for a category)
- Use structured retrieval (direct database query) instead of vector search for tabular data

### PDFs from scanning

OCR output is noisy. Apply cleaning (fix common OCR errors, normalize whitespace) before chunking. Preserve page numbers in metadata for source citation.

## Metadata: the underused advantage

Every chunk should carry metadata that enhances retrieval and response quality:

```json
{
  "chunk_id": "doc123_section2_para4",
  "text": "...",
  "metadata": {
    "document_id": "doc123",
    "document_title": "Returns and Refunds Policy",
    "section_title": "Digital Products",
    "page_number": 3,
    "date_updated": "2026-01-15",
    "chunk_index": 12,
    "parent_section_id": "doc123_section2"
  }
}
```

**Source citation:** Page numbers and section titles enable accurate source citation in responses ("According to the Refund Policy, Section: Digital Products...").

**Metadata filtering:** Filter retrieval by document date, type, or source before semantic search. "Find policy information from documents updated after 2025-01-01."

**Debug and evaluation:** Chunk IDs enable tracing which chunks influenced which responses — essential for evaluation and debugging.

## Evaluating chunking quality

**Retrieval hit rate:** Given a question with a known answer in your corpus, does your retrieval return the chunk containing that answer in the top-3 results? Build a test set of question-answer pairs and measure hit rate.

**Context sufficiency:** Does the retrieved chunk contain enough context for the model to answer correctly? Run end-to-end Q&A evaluation and distinguish "retrieval missed" failures from "retrieval found relevant chunk but insufficient context" failures.

**Chunk size distribution:** Are your chunks consistently sized, or do you have many tiny and large chunks? High variance often signals structural parsing issues.

**Human review sample:** Periodically review retrieved chunks for sample queries. Do they look like what you'd want to send to the model?

## Practical recommendation

For most new RAG systems, this is the order to try:

1. **Structure-aware paragraph chunking** — Good baseline for most document types. Implement first.
2. **Header-based section splitting** for structured documents — Apply headers before paragraph chunking.
3. **Small-to-big (hierarchical)** — Implement if you're seeing "retrieved but not answered" failures. Often the single biggest quality improvement after initial setup.
4. **Semantic chunking** — Evaluate if you have diverse long documents and can afford the preprocessing cost.
5. **Document-type-specific** — Once you understand your document distribution, apply type-specific strategies.

Evaluate before and after each strategy change with your retrieval hit rate metric. Chunking improvements are often more impactful than embedding model improvements — optimize the thing that changes the most.
