---
title: "Agentic RAG: When Retrieval Needs Reasoning"
depth: technical
pillar: building
topic: rag
tags: [rag, agents, reasoning, retrieval, architecture]
author: bee
date: "2026-03-18"
readTime: 10
description: "Standard RAG retrieves and generates. Agentic RAG reasons about what to retrieve, evaluates results, and iterates — handling complex queries that single-shot retrieval can't answer."
related: [rag-query-rewriting-guide, rag-multi-index-strategies, llms-routing-and-model-selection]
---

A user asks: "Compare our Q4 revenue growth to our top 3 competitors and explain why we underperformed in the enterprise segment."

Standard RAG retrieves a few chunks, generates an answer, and hopes for the best. Agentic RAG recognizes this requires multiple retrieval steps, plans them, executes them, evaluates whether it has enough information, and iterates until it can actually answer the question.

## Why Standard RAG Isn't Enough

Standard RAG follows a fixed pipeline: embed query → retrieve chunks → generate response. This works well for simple factual questions ("What is our refund policy?") but fails on:

**Multi-hop questions** — Answers that require combining information from multiple sources. "Which customers churned last quarter who had previously escalated a support ticket?" requires retrieving churn data and support data separately, then joining them.

**Ambiguous queries** — "Tell me about the project" could mean anything. An agent can ask clarifying questions or try multiple interpretations.

**Insufficient retrieval** — Sometimes the first retrieval doesn't return useful results. An agent can recognize this and try different queries.

**Comparative questions** — "How does X compare to Y?" requires retrieving information about both X and Y, then synthesizing.

## The Agentic RAG Architecture

```
User Query
    ↓
[Query Analyzer] → Plan retrieval strategy
    ↓
[Retrieval Loop]
    ├── Select data source
    ├── Formulate sub-query
    ├── Retrieve and evaluate results
    ├── Enough information? → No → reformulate and retry
    └── Yes → proceed
    ↓
[Synthesis] → Generate answer from all retrieved context
    ↓
[Self-Check] → Does the answer actually address the query?
    ↓
Response
```

The key difference: the LLM is in the loop at every stage, making decisions about what to retrieve, whether results are useful, and when it has enough information to answer.

## Implementation Patterns

### Pattern 1: Planning Agent

The LLM decomposes the question into sub-questions, each answered independently.

```python
async def agentic_rag(query):
    # Step 1: Decompose the question
    plan = await llm.generate(f"""
    Break this question into sub-questions that can each be answered
    independently through document retrieval:
    Question: {query}
    Return as a JSON list of sub-questions.
    """)

    # Step 2: Answer each sub-question
    sub_answers = []
    for sub_q in plan.sub_questions:
        chunks = await retriever.search(sub_q)

        # Evaluate retrieval quality
        quality = await llm.generate(f"""
        Do these passages contain enough information to answer: {sub_q}
        Passages: {chunks}
        Answer YES or NO with explanation.
        """)

        if "NO" in quality:
            # Reformulate and retry
            alt_query = await llm.generate(
                f"Rephrase this to find better results: {sub_q}"
            )
            chunks = await retriever.search(alt_query)

        answer = await llm.generate(
            f"Answer based on these passages: {chunks}\nQuestion: {sub_q}"
        )
        sub_answers.append({"question": sub_q, "answer": answer})

    # Step 3: Synthesize
    final = await llm.generate(f"""
    Original question: {query}
    Sub-answers: {sub_answers}
    Synthesize a comprehensive answer.
    """)
    return final
```

### Pattern 2: ReAct-Style Retrieval

The LLM decides at each step whether to retrieve, use a tool, or generate a final answer.

```python
tools = [
    {"name": "search_docs", "desc": "Search internal documentation"},
    {"name": "search_tickets", "desc": "Search support tickets"},
    {"name": "query_database", "desc": "Run a SQL query"},
    {"name": "answer", "desc": "Provide final answer with gathered info"},
]

async def react_rag(query, max_steps=5):
    context = []
    for step in range(max_steps):
        action = await llm.generate(f"""
        Question: {query}
        Information gathered so far: {context}
        Available tools: {tools}

        What should I do next? Choose a tool and provide its input.
        If you have enough information, use 'answer'.
        """)

        if action.tool == "answer":
            return action.input

        result = await execute_tool(action.tool, action.input)
        context.append({
            "tool": action.tool,
            "query": action.input,
            "result": result
        })

    # Fallback: answer with whatever we have
    return await llm.generate(
        f"Answer as best you can: {query}\nContext: {context}"
    )
```

### Pattern 3: Corrective RAG (CRAG)

After initial retrieval, the LLM evaluates whether the retrieved documents are relevant and takes corrective action if not.

```python
async def corrective_rag(query):
    # Initial retrieval
    docs = await retriever.search(query, top_k=5)

    # Grade each document
    graded_docs = []
    for doc in docs:
        grade = await llm.generate(f"""
        Is this document relevant to: {query}
        Document: {doc.text}
        Grade as RELEVANT or IRRELEVANT.
        """)
        if "RELEVANT" in grade:
            graded_docs.append(doc)

    # Decision based on grading
    if len(graded_docs) >= 2:
        # Enough relevant docs — generate answer
        return await generate_answer(query, graded_docs)

    elif len(graded_docs) == 1:
        # Marginal — supplement with web search
        web_results = await web_search(query)
        all_context = graded_docs + web_results
        return await generate_answer(query, all_context)

    else:
        # No relevant docs — fall back entirely
        web_results = await web_search(query)
        return await generate_answer(query, web_results)
```

## Routing Across Multiple Sources

Real organizations have data in many places. Agentic RAG can route to the right source:

```python
sources = {
    "product_docs": {"desc": "Product documentation and guides"},
    "engineering_wiki": {"desc": "Engineering specs and architecture"},
    "support_tickets": {"desc": "Customer support history"},
    "sales_crm": {"desc": "Sales data and customer info"},
}

async def route_query(query):
    routing = await llm.generate(f"""
    Given this query: {query}
    Which data sources should I search? Select 1-3.
    Sources: {sources}
    Return as JSON list of source names.
    """)
    return routing.sources
```

## Cost and Latency Considerations

Agentic RAG is more expensive and slower than standard RAG:

| Approach | LLM Calls | Typical Latency | Cost per Query |
|----------|-----------|-----------------|----------------|
| Standard RAG | 1 | 1–3s | $0.01–0.05 |
| Planning Agent | 3–8 | 5–15s | $0.05–0.30 |
| ReAct | 3–10 | 5–20s | $0.05–0.50 |
| CRAG | 2–4 | 3–8s | $0.03–0.15 |

**Optimization strategies:**
- Use a cheap model (GPT-4o-mini) for routing, grading, and decomposition
- Use an expensive model (GPT-4o, Claude Sonnet) only for final synthesis
- Cache sub-question results — many queries share common sub-questions
- Set strict step limits to prevent runaway agent loops

## When to Use Agentic RAG

**Use standard RAG when:**
- Questions are simple and factual
- One retrieval step is sufficient
- Latency under 2 seconds is required
- Cost per query matters (high volume)

**Use agentic RAG when:**
- Questions require multiple information sources
- Users ask complex, multi-part questions
- Retrieval quality is inconsistent (need retry logic)
- Accuracy matters more than latency

## Practical Advice

1. **Start with standard RAG.** Add agency only when standard RAG demonstrably fails on your actual queries.
2. **Log everything.** Each agent step should be traced so you can debug why it retrieved what it did.
3. **Set guardrails.** Maximum steps, maximum cost per query, timeout limits. Agents without guardrails will loop forever on hard questions.
4. **Test on hard queries.** Your test set should include the queries that standard RAG fails on — that's the whole point.
5. **Monitor in production.** Track how many steps the agent takes per query. If most queries resolve in 1 step, standard RAG is probably fine. If most take 3+ steps, the agent is earning its keep.
