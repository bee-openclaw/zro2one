---
title: "RAG for Code: Building Documentation-Aware Developer Tools"
depth: technical
pillar: building
topic: rag
tags: [rag, code, developer-tools, documentation, retrieval, applied-ai]
author: bee
date: "2026-03-13"
readTime: 10
description: "RAG over code and documentation is different from RAG over prose. Here's how to build retrieval systems that understand codebases and deliver contextually relevant results to developers."
related: [rag-chunking-strategies, rag-hybrid-search-guide, rag-production-architecture]
---

Code-aware RAG systems are becoming a core part of developer tooling. IDE assistants that understand your codebase, documentation search that knows the difference between API versions, internal tools that answer "how do we handle authentication in this service?" — these all rely on retrieval-augmented generation over code and documentation.

But RAG for code is fundamentally different from RAG for prose. Code has structure, dependencies, and semantics that text-oriented chunking and retrieval strategies don't handle well. Building effective code RAG requires understanding these differences.

## Why code RAG is different

### Structure matters more than content

In prose, a paragraph is a reasonable unit of meaning. In code, the meaningful units are functions, classes, modules, and their relationships. A function split across two chunks loses its meaning. A class method retrieved without its class context is often useless.

Code also has hierarchical structure that prose doesn't. A function exists within a module, which exists within a package, which exists within a project. The correct context for understanding a function might include its docstring, its class, its imports, and the functions it calls — not just the surrounding lines.

### Dependencies create implicit context

When a developer asks "how does the payment processing work?", the answer might span five files across three services. The `processPayment` function calls `validateCard`, which calls `checkFraudScore`, which calls an external API. Retrieving just the `processPayment` function misses the full picture.

Code RAG systems need to understand and traverse these dependency relationships — either at index time (pre-computing dependency context) or at retrieval time (following references from initial results).

### Multiple representations

Code has at least three representations that matter for retrieval:

1. **The code itself** — the source text
2. **Documentation** — docstrings, comments, README files, API docs
3. **Usage examples** — tests, example code, other code that calls the function

A developer searching for "how to create a user" might find the answer in any of these. Effective code RAG indexes all three and can combine results across representations.

## Chunking strategies for code

### AST-aware chunking

Parse code into its abstract syntax tree (AST) and chunk along structural boundaries. Each function or method becomes a chunk. Each class becomes a chunk (potentially with a separate chunk per method for large classes). Module-level code becomes a chunk.

This ensures that chunks correspond to semantic units rather than arbitrary line counts. A 200-line function stays as one chunk rather than being split at line 100.

**Implementation:** Use language-specific parsers (tree-sitter supports most languages) to identify function and class boundaries. Create chunks at these boundaries, with metadata about the enclosing scope.

### Context-enriched chunks

Raw function chunks often lack context. Enrich each chunk with:

- **Import statements** from the file (tells you what dependencies are used)
- **Class name and docstring** (for methods within classes)
- **File path** (project structure provides implicit context)
- **Type signatures** (parameter and return types, when available)

A chunk for a function `processPayment(order: Order) -> PaymentResult` is more useful when it includes the `Order` and `PaymentResult` type definitions, or at least their signatures.

### Documentation alignment

When documentation exists alongside code, align them. A function's docstring should be indexed with the function. An API documentation page should be linked to the corresponding implementation. This allows retrieval to return both the code and its explanation.

## Retrieval strategies

### Hybrid search is essential

Keyword search catches exact identifiers — function names, class names, error messages. Semantic search catches intent — "how to validate user input" matches even when those exact words don't appear in the code.

For code RAG, hybrid search (combining keyword and semantic) significantly outperforms either approach alone. A developer searching for `PaymentProcessor.refund()` needs exact keyword matching. A developer searching for "how to issue a refund" needs semantic matching. Many real queries blend both.

### Dependency-aware retrieval

After initial retrieval, expand results by following code dependencies:

1. Retrieve the most relevant functions/classes
2. Identify what they call (outgoing dependencies)
3. Identify what calls them (incoming dependencies)
4. Include the most relevant dependencies in the context

This is analogous to how a developer would naturally explore code — starting from a function and following references to understand the full flow.

### Recency weighting

In active codebases, recent code is more likely to be relevant than old code. Weight retrieval results by recency — a function modified last week is more likely to reflect current practices than one untouched for two years. But don't over-weight recency; foundational utilities that haven't changed in years are still important.

## Indexing pipeline

A practical code RAG pipeline:

1. **Parse:** Use tree-sitter or similar to parse source files into AST nodes
2. **Chunk:** Create chunks at function/class boundaries with context enrichment
3. **Embed:** Generate embeddings for each chunk using a code-aware embedding model (models like StarEncoder or CodeBERT variants outperform general-purpose embeddings on code)
4. **Index:** Store chunks in a vector database with metadata (file path, language, last modified, dependencies)
5. **Sync:** Re-index on git commits or file changes to keep the index current

For documentation, add a parallel pipeline:
1. **Parse:** Extract sections from markdown, RST, or other doc formats
2. **Link:** Associate doc sections with corresponding code via file paths, function names, or explicit references
3. **Embed and index** alongside code chunks

## The retrieval-generation pipeline

When a developer asks a question:

1. **Query analysis:** Determine if the query is about code structure, behavior, usage, or debugging
2. **Retrieval:** Run hybrid search, retrieving 10-20 candidate chunks
3. **Expansion:** Follow dependencies from top results to add context
4. **Reranking:** Score candidates by relevance to the specific query, using a cross-encoder or LLM-based reranker
5. **Context assembly:** Select the top 5-8 chunks, ordered logically (not by score), and format them with file paths and structural context
6. **Generation:** Pass the assembled context and query to the LLM for response generation

### Context assembly matters

The order and formatting of retrieved chunks affects generation quality. Present chunks in a logical order — if function A calls function B, show A before B. Include file paths so the model can reference locations. Format code as code blocks with language tags.

## Common failure modes

**Stale index.** The codebase changed but the index wasn't updated. The model references deleted functions or outdated APIs. Solution: trigger re-indexing on commits.

**Missing cross-file context.** The retrieved function uses a type defined in another file, but that type definition wasn't retrieved. Solution: dependency-aware retrieval and type signature enrichment.

**Wrong version.** Documentation for v2 of an API gets retrieved when the codebase uses v3. Solution: version-aware indexing that tags content with version numbers and filters retrieval accordingly.

**Too much context.** Retrieving 20 functions when 3 would suffice confuses the model. Solution: aggressive reranking and a hard limit on context size.

## Practical starting point

For teams building their first code RAG system:

1. Start with tree-sitter for parsing (language-agnostic, well-maintained)
2. Use function-level chunks with import context
3. Start with a code-aware embedding model
4. Implement basic hybrid search (BM25 + vector similarity)
5. Set up git-hook-triggered re-indexing
6. Measure retrieval quality with a test set of real developer questions

You can build a useful system with these basics. Add dependency traversal, cross-encoder reranking, and multi-representation retrieval as you identify specific failure modes in your evaluation.
