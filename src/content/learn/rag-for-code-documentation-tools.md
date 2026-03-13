---
title: "RAG for Code: Building Documentation-Aware Developer Tools"
depth: technical
pillar: building
topic: rag
tags: [rag, code, documentation, developer-tools, embeddings, search]
author: bee
date: "2026-03-13"
readTime: 10
description: "How to build RAG systems that understand codebases and documentation — from chunking strategies for code to embedding models that handle technical content to retrieval patterns for developer tools."
related: [rag-chunking-strategies, rag-production-architecture, rag-hybrid-search-guide]
---

Developer tools that understand your codebase and documentation are among the highest-value RAG applications. When an AI assistant can answer "how does our authentication flow work?" by pulling from actual source code and docs rather than hallucinating, it becomes genuinely useful. Here's how to build one.

## Why Code RAG Is Different

Code and documentation have characteristics that break standard RAG approaches:

**Structure matters more than in prose.** A function's meaning depends on its class, module, imports, and call chain. Chunking by token count — fine for articles — destroys code structure.

**Multiple representations of the same concept.** The authentication flow exists as code in `auth.py`, documentation in `docs/auth.md`, comments inline, types in `auth.d.ts`, and tests in `test_auth.py`. A good system retrieves across all of these.

**Versioning.** Code changes constantly. Your RAG system needs to stay synchronized with the current codebase, not serve stale context from last month's indexing.

**Technical vocabulary.** Embedding models trained on general text may not distinguish between "React hooks" and "fishing hooks" or understand that `useState` and "state management" are related concepts.

## Architecture Overview

```
Codebase + Docs
    ↓
Parser/Chunker (AST-aware)
    ↓
Embeddings (code-aware model)
    ↓
Vector Store + Metadata Index
    ↓
Retriever (hybrid: semantic + keyword + structural)
    ↓
Context Assembly
    ↓
LLM Generation
```

## Chunking Code

### AST-Based Chunking

Don't split code by lines or tokens. Parse the Abstract Syntax Tree and chunk by semantic units:

```python
import ast

def chunk_python_file(filepath):
    with open(filepath) as f:
        tree = ast.parse(f.read())
    
    chunks = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            chunks.append({
                'type': 'function',
                'name': node.name,
                'code': ast.get_source_segment(source, node),
                'docstring': ast.get_docstring(node),
                'line_start': node.lineno,
                'file': filepath
            })
        elif isinstance(node, ast.ClassDef):
            chunks.append({
                'type': 'class',
                'name': node.name,
                'code': ast.get_source_segment(source, node),
                'docstring': ast.get_docstring(node),
                'methods': [n.name for n in node.body 
                           if isinstance(n, ast.FunctionDef)],
                'file': filepath
            })
    return chunks
```

Each chunk represents a complete semantic unit — a function, class, or module — with its context preserved.

### Language-Specific Parsers

Use Tree-sitter for multi-language support. It provides fast, incremental parsing for 100+ languages:

```python
from tree_sitter_languages import get_parser

parser = get_parser('typescript')
tree = parser.parse(bytes(source_code, 'utf8'))

# Extract functions, classes, interfaces, type definitions
```

Tree-sitter handles JavaScript, TypeScript, Python, Go, Rust, Java, and most languages you'll encounter in a real codebase.

### Documentation Chunking

Markdown documentation should be chunked by section (headers), not by token count:

- Each `##` section becomes a chunk
- Preserve the header hierarchy as metadata (which `#` section does this `##` belong to?)
- Code blocks within documentation stay with their surrounding text
- API reference entries are natural chunk boundaries

### Metadata Is Critical

Every chunk needs rich metadata:

```json
{
  "content": "def authenticate(user, password): ...",
  "file_path": "src/auth/service.py",
  "language": "python",
  "type": "function",
  "name": "authenticate",
  "class": "AuthService",
  "module": "auth.service",
  "imports": ["bcrypt", "jwt", "models.User"],
  "docstring": "Verify credentials and return JWT token",
  "last_modified": "2026-03-10",
  "git_blame": "alice@company.com"
}
```

This metadata powers filtering, ranking, and context assembly.

## Embedding Models for Code

General-purpose embedding models (like `text-embedding-3-small`) work okay for code, but code-specific models perform better:

- **CodeBERT / GraphCodeBERT** — trained on code with awareness of data flow
- **StarCoder embeddings** — derived from code-trained LLMs
- **Voyage Code** — embedding model specifically optimized for code retrieval
- **Jina Code** — code-aware embeddings with good multilingual support

Key consideration: your embedding model should handle both natural language queries ("how does auth work?") and code queries (`authenticate function`). Models trained on both code and natural language handle this cross-modal retrieval best.

## Retrieval Strategy

### Hybrid Search

Pure semantic search misses exact matches. Pure keyword search misses semantic similarity. Use both:

```python
def retrieve(query, top_k=10):
    # Semantic search
    semantic_results = vector_store.search(
        embed(query), top_k=top_k * 2
    )
    
    # Keyword search (BM25)
    keyword_results = bm25_index.search(
        query, top_k=top_k * 2
    )
    
    # Reciprocal rank fusion
    combined = reciprocal_rank_fusion(
        semantic_results, keyword_results
    )
    
    return combined[:top_k]
```

Keyword search is especially important for code because developers search for exact identifiers: `AuthService`, `handleLogin`, `JWT_SECRET`.

### Structural Expansion

When a function is retrieved, also pull:
- Its class definition (for method context)
- Called functions (one level deep)
- Type definitions it references
- Associated tests
- Related documentation sections

This "expand the context" step transforms a single function retrieval into a meaningful code context.

### Query Understanding

Developer queries come in different forms:

- **Conceptual:** "How does authentication work?" → search docs and high-level code
- **Specific:** "Where is the JWT token validated?" → search for specific function names and patterns
- **Debugging:** "Why does login fail with error 403?" → search error handling code and error messages
- **How-to:** "How do I add a new API endpoint?" → search for patterns and documentation

Classify the query type and adjust retrieval accordingly. Conceptual queries should weight documentation higher; specific queries should weight code higher.

## Keeping It Fresh

### Git-Based Incremental Indexing

Don't re-index the entire codebase on every change. Use git diffs:

```bash
# Get changed files since last index
git diff --name-only $LAST_INDEXED_COMMIT HEAD
```

Re-parse and re-embed only changed files. Delete embeddings for removed files. Update metadata for renamed files.

### CI/CD Integration

Trigger re-indexing on merge to main:

```yaml
# .github/workflows/index.yml
on:
  push:
    branches: [main]
jobs:
  index:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: python scripts/index_codebase.py --incremental
```

### Staleness Detection

Track when each chunk was last verified against the source. Flag chunks from files that have changed since indexing. Show recency information in retrieval results so the LLM can caveat potentially stale information.

## Context Assembly

Retrieved chunks need assembly into a coherent context for the LLM:

```python
def assemble_context(retrieved_chunks, max_tokens=8000):
    # Group by file
    by_file = group_by(retrieved_chunks, 'file_path')
    
    context_parts = []
    for file_path, chunks in by_file.items():
        # Sort chunks by position in file
        chunks.sort(key=lambda c: c['line_start'])
        
        context_parts.append(f"## {file_path}\n")
        for chunk in chunks:
            context_parts.append(chunk['content'])
    
    # Add documentation chunks separately
    doc_chunks = [c for c in retrieved_chunks if c['type'] == 'doc']
    if doc_chunks:
        context_parts.append("\n## Documentation\n")
        for chunk in doc_chunks:
            context_parts.append(chunk['content'])
    
    return truncate_to_tokens('\n'.join(context_parts), max_tokens)
```

## Production Considerations

- **Permissions:** Respect code access controls. Not everyone should see every file. Filter retrieval results by the querying user's permissions.
- **Monorepo support:** Large monorepos need scoped search. A frontend developer querying about components shouldn't get backend infrastructure code as top results.
- **Multi-language:** Real codebases use multiple languages. Your parser and embedder need to handle all of them.
- **Binary and generated files:** Exclude build artifacts, node_modules, generated code from indexing.

## What to Read Next

- **[RAG Chunking Strategies](/learn/rag-chunking-strategies)** — general chunking approaches
- **[RAG Production Architecture](/learn/rag-production-architecture)** — scaling RAG systems
- **[RAG Hybrid Search Guide](/learn/rag-hybrid-search-guide)** — combining search methods
