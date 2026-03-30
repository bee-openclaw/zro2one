---
title: "Query Decomposition for RAG: Breaking Complex Questions into Retrievable Pieces"
depth: technical
pillar: rag
topic: rag
tags: [rag, query-decomposition, retrieval, search, advanced-rag]
author: bee
date: "2026-03-30"
readTime: 9
description: "Complex questions often can't be answered by a single retrieval step. Query decomposition breaks them into sub-questions, retrieves information for each, and synthesizes a complete answer. This guide covers strategies, implementation, and when decomposition helps vs. hurts."
related: [rag-query-rewriting-guide, rag-query-understanding-guide, rag-agentic-rag-patterns]
---

A user asks: "How does our company's employee retention rate compare to the industry average, and what are the top three factors driving attrition in our engineering department?"

A single vector search won't find a document that answers this. The question requires:
1. Your company's retention rate
2. Industry average retention rate
3. Attrition factors specific to engineering

Query decomposition splits this into retrievable sub-questions, fetches relevant documents for each, and combines the results into a coherent answer.

## Why Single-Query Retrieval Fails

Complex questions fail with simple retrieval for several reasons:

**Multi-hop reasoning.** "What technologies does our biggest client use?" requires finding (1) who the biggest client is and (2) what technologies they use. The answer to the first sub-question is needed to formulate the second.

**Comparison questions.** "How does X compare to Y?" needs information about both X and Y, which likely live in different documents.

**Aggregation questions.** "What are the common themes in customer complaints this quarter?" requires retrieving multiple complaint documents and synthesizing across them.

**Implicit sub-questions.** "Should we switch from PostgreSQL to MongoDB for our analytics pipeline?" implicitly asks about PostgreSQL's analytics capabilities, MongoDB's analytics capabilities, your current pipeline's requirements, and migration costs.

## Decomposition Strategies

### Simple Decomposition

Use an LLM to break the question into independent sub-questions:

```python
def decompose_query(question: str) -> list[str]:
    prompt = f"""Break this question into independent sub-questions 
    that can each be answered by searching a knowledge base.
    
    Question: {question}
    
    Return a JSON array of sub-questions."""
    
    response = llm.generate(prompt)
    return json.loads(response)
```

For "How does our retention compare to industry, and what drives engineering attrition?":
- "What is our company's employee retention rate?"
- "What is the industry average employee retention rate?"
- "What are the main factors causing attrition in the engineering department?"

Each sub-question gets its own retrieval step.

### Sequential Decomposition

When sub-questions depend on each other:

```python
def sequential_decompose(question: str) -> list[dict]:
    prompt = f"""Break this question into sequential steps.
    Some steps may depend on answers from previous steps.
    
    Question: {question}
    
    Return steps with dependencies noted."""
    
    # Returns something like:
    # [
    #   {"step": 1, "question": "Who is our largest client?", "depends_on": []},
    #   {"step": 2, "question": "What technologies does [step 1 answer] use?", "depends_on": [1]}
    # ]
```

Execute steps in order, filling in answers from previous steps before retrieving for dependent steps.

### Tree Decomposition

For deeply nested questions, build a tree:

```
Original: "Compare the ROI of our AI projects vs competitors"
├── "What AI projects do we have and their ROI?"
│   ├── "List our AI projects"
│   └── "What is the ROI of each project?"
├── "What AI projects do competitors have?"
│   ├── "Who are our main competitors?"
│   └── "What AI initiatives have they announced?"
└── "How do we define ROI for AI projects?"
```

Process leaves first, then combine results as you move up the tree.

## Implementation

### The Full Pipeline

```python
class DecomposedRAG:
    def __init__(self, retriever, llm):
        self.retriever = retriever
        self.llm = llm
    
    def answer(self, question: str) -> str:
        # Step 1: Decompose
        sub_questions = self.decompose(question)
        
        # Step 2: Retrieve for each sub-question
        all_contexts = {}
        for sq in sub_questions:
            docs = self.retriever.search(sq, top_k=3)
            all_contexts[sq] = docs
        
        # Step 3: Answer each sub-question
        sub_answers = {}
        for sq, docs in all_contexts.items():
            context = "\n".join([d.text for d in docs])
            answer = self.llm.generate(
                f"Context: {context}\n\nQuestion: {sq}\n\nAnswer:"
            )
            sub_answers[sq] = answer
        
        # Step 4: Synthesize
        synthesis_prompt = f"""Original question: {question}
        
Sub-questions and answers:
{self._format_sub_answers(sub_answers)}

Provide a comprehensive answer to the original question, 
synthesizing the information from all sub-answers."""
        
        return self.llm.generate(synthesis_prompt)
```

### Handling Dependencies

For sequential decomposition, process in dependency order:

```python
def execute_with_dependencies(self, steps: list[dict]) -> dict:
    results = {}
    
    for step in sorted(steps, key=lambda s: s["step"]):
        question = step["question"]
        
        # Fill in results from dependencies
        for dep in step["depends_on"]:
            question = question.replace(
                f"[step {dep} answer]", 
                results[dep]
            )
        
        docs = self.retriever.search(question, top_k=3)
        results[step["step"]] = self.llm.generate(
            f"Context: {docs}\nQuestion: {question}"
        )
    
    return results
```

## When Decomposition Helps

**Do decompose when:**
- The question involves multiple distinct topics
- A single retrieval returns irrelevant results
- The question requires comparison or aggregation
- The answer isn't in any single document

**Don't decompose when:**
- The question is simple and specific ("What is our vacation policy?")
- You're optimizing for latency (decomposition adds LLM calls)
- The knowledge base is small enough that retrieval already works well
- The question is conversational/contextual rather than factual

## Optimizations

### Parallel Retrieval

Independent sub-questions can be retrieved in parallel:

```python
import asyncio

async def parallel_retrieve(sub_questions: list[str]):
    tasks = [retriever.async_search(sq) for sq in sub_questions]
    return await asyncio.gather(*tasks)
```

This reduces latency from O(n) sequential searches to O(1) parallel searches.

### Adaptive Decomposition

Not every question needs decomposition. Use a classifier or simple heuristic:

```python
def needs_decomposition(question: str) -> bool:
    # Simple heuristic: multiple question marks, 
    # comparison words, or conjunction patterns
    indicators = ["compare", "versus", "and also", "additionally",
                  "what about", "as well as"]
    return (question.count("?") > 1 or 
            any(ind in question.lower() for ind in indicators))
```

Or use an LLM to decide: "Does this question require multiple separate searches to answer? Reply yes or no."

### Deduplication

Decomposed sub-questions often retrieve overlapping documents. Deduplicate before synthesis to avoid redundancy in the context window:

```python
def deduplicate_docs(all_docs: dict) -> list:
    seen_ids = set()
    unique = []
    for docs in all_docs.values():
        for doc in docs:
            if doc.id not in seen_ids:
                seen_ids.add(doc.id)
                unique.append(doc)
    return unique
```

## Evaluation

Compare decomposed RAG against standard RAG on:

- **Answer completeness** — does the answer address all aspects of the question?
- **Answer accuracy** — are the individual claims correct?
- **Retrieval recall** — are the relevant documents found?
- **Latency** — how much overhead does decomposition add?
- **Cost** — additional LLM calls for decomposition and sub-question answering

In practice, decomposition consistently improves completeness and accuracy for complex questions while adding 2–4x latency and cost. For simple questions, it adds overhead without improving quality. Adaptive decomposition gives the best of both worlds.
