---
title: "Graph-Based Retrieval for RAG: When Embeddings Aren't Enough"
depth: technical
pillar: building
topic: rag
tags: [rag, graph-retrieval, knowledge-graphs, retrieval, advanced]
author: bee
date: "2026-04-02"
readTime: 10
description: "Vector similarity retrieval misses relationships between concepts. Graph-based retrieval follows connections — citations, dependencies, hierarchies — to find context that embedding search cannot."
related: [rag-freshness-and-reindexing-guide, rag-access-control-design-guide, rag-hybrid-search-guide]
---

Standard RAG retrieves chunks of text that are semantically similar to the query. This works well for factual questions with self-contained answers: "what is the return policy?" matches a chunk that describes the return policy. Done.

But many questions require context that is related not by semantic similarity but by structural relationships. "What are the implications of changing the pricing tier?" requires understanding how pricing connects to contracts, which connect to customer segments, which connect to revenue models. These connections are invisible to embedding-based search but explicit in a graph.

Graph-based retrieval augments or replaces vector similarity with relationship traversal, following links between entities to find contextually relevant information that embedding search would miss.

## When Vector Search Fails

Embedding-based retrieval fails in predictable ways:

**Multi-hop questions.** "Which team members have worked on projects that use the same database as the billing service?" requires traversing: billing service → database → other projects → team members. No single chunk contains this answer, and the intermediate concepts (the specific database) may not appear in the query at all.

**Hierarchical context.** "What permissions does this user have?" might require traversing: user → role → role permissions → inherited organization permissions → group overrides. The answer is distributed across multiple documents at different levels of a hierarchy.

**Temporal chains.** "What changes led to the production incident last Tuesday?" requires following a sequence of events: deploy → config change → error spike → alert → incident. Each event is in a different document, and their relevance is defined by temporal and causal relationships, not semantic similarity.

**Entity-centric questions.** "Tell me everything about Project Aurora" requires gathering information from many sources — meeting notes, design docs, tickets, code comments — connected by the entity "Project Aurora." Embedding search may find some of these, but it will miss documents that mention the project indirectly or by a different name.

## Graph Retrieval Architectures

### Knowledge Graph + Vector Store

The most common pattern. Maintain both a knowledge graph (entities and relationships) and a vector store (chunked text with embeddings).

1. Parse incoming documents to extract entities and relationships. Store these in a graph database (Neo4j, Amazon Neptune, or even a relational database with graph query support).
2. Chunk and embed the same documents into a vector store.
3. At query time, use both retrieval methods:
   - Vector search finds semantically similar chunks.
   - Graph traversal finds structurally related entities and their associated text.
4. Merge and deduplicate the results before passing to the LLM.

This hybrid approach covers both similarity-based and relationship-based retrieval.

### Graph-Only Retrieval

For highly structured domains (legal codes, technical documentation with explicit cross-references, organizational hierarchies), the graph alone may be sufficient.

1. Build a graph from the document structure — sections reference other sections, terms are defined in glossaries, regulations cite other regulations.
2. At query time, identify the relevant entry point in the graph (which section, which term, which regulation).
3. Traverse related nodes to gather context: definitions, related clauses, exceptions, examples.
4. Pass the traversed context to the LLM.

This works well when relationships are explicit and well-defined. It struggles when relationships are implicit or the graph is incomplete.

### LLM-Guided Graph Traversal

Use the LLM itself to decide which graph edges to follow. The process:

1. Present the query and the initial graph neighborhood to the LLM.
2. Ask the LLM which relationships are relevant and which nodes to explore further.
3. Retrieve the content from those nodes.
4. Repeat if needed — let the LLM request additional traversal steps.
5. Generate the final answer from the accumulated context.

This is more flexible but slower and more expensive. Each traversal step requires an LLM call. Use it for complex, exploratory queries where the retrieval path is not predictable.

## Building the Graph

### Entity and Relationship Extraction

The quality of graph retrieval depends on the quality of the graph. Extraction approaches:

**LLM-based extraction.** Prompt an LLM to extract entities and relationships from each document. "Extract all people, organizations, products, and projects mentioned in this text, along with the relationships between them." This is flexible but expensive for large document sets and requires validation.

**Rule-based extraction.** For structured documents (code, APIs, databases), extract entities and relationships from the structure itself. Class definitions, function calls, database foreign keys, and import statements all define explicit relationships.

**Hybrid.** Use rules for structure-derived relationships and LLMs for text-derived relationships. This is the most practical approach for mixed document sets.

### Graph Schema Design

Define what entity types and relationship types your graph supports. A typical knowledge graph for a software organization might include:

- **Entities:** Person, Team, Project, Service, Database, Document, API, Ticket
- **Relationships:** owns, depends_on, authored, references, deployed_to, assigned_to, blocks

Keep the schema focused. A graph with 50 relationship types is harder to query and maintain than one with 10 well-defined types. You can always add types later as needs emerge.

### Incremental Updates

Documents change. The graph must change with them. Design your extraction pipeline to handle updates:

- When a document is updated, re-extract entities and relationships, then diff against the existing graph.
- Remove relationships derived from the old version that no longer exist.
- Add new relationships from the updated version.
- Preserve relationships derived from other sources.

## Query Processing

### Entity Linking

Before traversing the graph, the query must be connected to graph entities. "What does the payments team own?" requires linking "payments team" to the corresponding Team entity in the graph. This is an entity linking problem — matching natural language references to canonical graph entities.

LLMs handle this well. Present the query along with candidate entities from the graph and ask the LLM to identify which entities are referenced. For performance, pre-filter candidates using string matching or embedding similarity before sending to the LLM.

### Traversal Depth

How many hops from the starting entities should you traverse? Too few and you miss relevant context. Too many and you include noise.

Practical guidelines:
- **1 hop:** Direct relationships. Usually sufficient for simple questions. "Who owns this service?" "What does this API depend on?"
- **2 hops:** Indirect relationships. Necessary for questions about second-order connections. "What other services might be affected if this database goes down?"
- **3+ hops:** Exploratory queries. Use LLM-guided traversal rather than exhaustive expansion, as the number of nodes grows exponentially with depth.

## Evaluation

Graph retrieval is harder to evaluate than vector retrieval because the "correct" retrieved context is less obvious. Establish evaluation by:

1. **Creating multi-hop test questions** that specifically require graph traversal to answer correctly.
2. **Measuring answer quality** with and without graph retrieval to demonstrate the incremental value.
3. **Tracking retrieval precision** — what fraction of the retrieved graph nodes actually contributed to the answer?

Graph-based retrieval adds complexity to your RAG pipeline. Use it when your questions genuinely require relationship-aware context. For simple factual questions, vector search remains simpler, faster, and sufficient.
