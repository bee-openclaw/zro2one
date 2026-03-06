---
title: "Evaluating RAG Systems: How to Know If Your Pipeline Is Actually Working"
depth: technical
pillar: building
topic: rag
tags: [rag, evaluation, retrieval, generation, metrics, ragas, testing]
author: bee
date: "2026-03-06"
readTime: 11
description: "Building a RAG pipeline is straightforward. Knowing if it's actually working is hard. Here's a systematic approach to evaluating retrieval quality, generation quality, and end-to-end RAG performance."
related: [rag-for-builders-mental-model, rag-production-architecture, llm-api-integration-guide]
---

RAG pipelines are easy to build badly and hard to evaluate well. Most teams ship a RAG system, do some informal testing, decide it "seems good," and then discover months later that it's confidently answering questions with wrong information because retrieval is silently failing.

Systematic evaluation of RAG systems isn't glamorous — but it's the difference between a system you trust and one you're afraid to watch in production.

## The two failure modes of RAG

Every RAG quality problem falls into one of two categories:

**Retrieval failure:** The right documents aren't making it into the context.
- Retriever returns irrelevant documents
- Correct documents exist in the index but aren't retrieved
- Documents are retrieved but truncated in ways that lose key information
- Semantic meaning is lost in the embedding

**Generation failure:** The right documents are there but the model produces a bad answer.
- Model ignores retrieved context and uses training knowledge instead
- Model misattributes information between multiple retrieved documents
- Model synthesizes contradictory information incorrectly
- Model hallucinates details not present in the retrieved context

Measuring these separately is critical — a retrieval problem requires a different fix than a generation problem. Many teams treat RAG as a black box and tune the whole thing, making it impossible to isolate the failure.

## The RAG evaluation framework

A complete RAG evaluation has three components:

1. **Retrieval evaluation:** Is the right context being retrieved?
2. **Generation evaluation:** Is the answer correct given the retrieved context?
3. **End-to-end evaluation:** Is the final answer what the user needed?

### Retrieval evaluation

**The dataset you need:** A test set of (question, ground truth document) pairs — questions with known "correct" source documents.

**Key metrics:**

**Recall@K:** Of the relevant documents that exist in your corpus, what fraction appear in the top-K retrieved results?

Recall@K = |relevant docs in top-K| / |total relevant docs|

If your corpus has 3 relevant documents for a question and your retriever returns all 3 in the top-5 results: Recall@5 = 3/3 = 1.0.

Why recall matters: if the right document isn't retrieved, the generator can't use it. Recall@K tells you how often you're even giving the generator a chance to answer correctly.

**MRR (Mean Reciprocal Rank):** For each query, what's the rank of the first relevant document? Average this across queries.

MRR = (1/N) × Σ (1/rank_of_first_relevant_doc)

If the first relevant document appears at position 3 for a query, that query contributes 1/3 to the MRR. Higher MRR means relevant docs appear earlier, which matters when you only send top-K to the generator.

**Precision@K:** Of the K retrieved documents, what fraction are relevant?

Precision@K = |relevant docs in top-K| / K

A retriever might have high recall (finds all relevant docs) but low precision (also returns many irrelevant ones). Both matter: high recall but low precision means irrelevant context pollutes the generator's input.

**Practical retrieval evaluation setup:**

```python
def evaluate_retrieval(retriever, test_set, k=5):
    """
    test_set: list of {"query": str, "relevant_doc_ids": list[str]}
    """
    recall_scores = []
    mrr_scores = []
    
    for example in test_set:
        query = example["query"]
        relevant_ids = set(example["relevant_doc_ids"])
        
        retrieved = retriever.retrieve(query, top_k=k)
        retrieved_ids = [doc.id for doc in retrieved]
        
        # Recall@K
        retrieved_relevant = len(relevant_ids.intersection(set(retrieved_ids)))
        recall = retrieved_relevant / len(relevant_ids)
        recall_scores.append(recall)
        
        # MRR
        mrr = 0
        for rank, doc_id in enumerate(retrieved_ids, 1):
            if doc_id in relevant_ids:
                mrr = 1 / rank
                break
        mrr_scores.append(mrr)
    
    return {
        "recall@k": sum(recall_scores) / len(recall_scores),
        "mrr": sum(mrr_scores) / len(mrr_scores),
    }
```

### Generation evaluation

Given the retrieved context and the question, did the model generate a good answer?

**Faithfulness:** Does the answer contain only claims that are supported by the retrieved context? High faithfulness means the model isn't hallucinating beyond the sources.

**Answer relevance:** Does the answer actually address the question? A faithful-but-irrelevant answer is technically accurate but useless.

**Context relevance:** Of the retrieved context, how much of it was actually useful for generating the answer? Low context relevance means your retriever is returning noisy results.

**LLM-as-judge approach:**

For faithfulness evaluation, use an LLM to evaluate whether each statement in the answer is supported by the context:

```python
def evaluate_faithfulness(answer, contexts, evaluator_llm):
    prompt = f"""
You are evaluating whether an AI-generated answer is faithful to the provided source context.

CONTEXT:
{contexts}

ANSWER:
{answer}

For each factual claim in the answer, determine whether it is:
1. Directly supported by the context
2. Implied by the context  
3. Not present in the context (potential hallucination)

List all claims in the answer and categorize each. Then calculate:
Faithfulness score = supported claims / total claims

Return JSON: {{"claims": [{{"claim": str, "support": "direct"|"implied"|"none"}}], "faithfulness_score": float}}
"""
    return evaluator_llm.generate(prompt)
```

**Using RAGAS:** The RAGAS library (Retrieval-Augmented Generation Assessment) implements these metrics with a standard interface:

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_recall,
    context_precision
)
from datasets import Dataset

# Prepare your evaluation dataset
eval_data = {
    "question": questions,
    "answer": generated_answers,
    "contexts": retrieved_contexts,  # list of lists
    "ground_truth": reference_answers  # optional
}

dataset = Dataset.from_dict(eval_data)

result = evaluate(
    dataset,
    metrics=[faithfulness, answer_relevancy, context_recall, context_precision]
)

print(result)
```

RAGAS uses LLM-based evaluation internally — it requires an OpenAI (or compatible) API key. The evaluations cost money but are significantly faster and more consistent than human evaluation at scale.

### End-to-end evaluation

Even if retrieval and generation look good in isolation, the combined system might still fail. End-to-end evaluation measures: given a question, does the final answer match the expected correct answer?

**For questions with clear ground-truth answers:**

**Exact match:** Does the generated answer contain the exact correct answer? (Too strict for most natural language answers, useful for structured extractions.)

**Semantic similarity:** Embed the generated answer and the ground truth, measure cosine similarity. Useful when answers can be phrased multiple ways.

**LLM-based correctness scoring:** Ask an LLM to judge whether the generated answer is correct given the ground truth:

```python
def evaluate_correctness(question, answer, ground_truth, judge_llm):
    prompt = f"""
Evaluate whether the following answer correctly addresses the question.

Question: {question}
Reference Answer: {ground_truth}
Generated Answer: {answer}

Rate the generated answer:
- 1: Correct and complete
- 0.5: Partially correct or partially complete
- 0: Incorrect or missing key information

Respond with JSON: {{"score": float, "reasoning": str}}
"""
    return judge_llm.generate(prompt)
```

## Building your test set

Evaluation is only as good as your test set. Building a good RAG test set:

**Manual curation:** Have domain experts write 50-200 question/answer pairs from your actual documents. Time-consuming but high quality.

**Synthetic generation:** Use an LLM to generate questions from your document corpus:

```python
def generate_test_questions(document, llm, n=5):
    prompt = f"""
Based on this document, generate {n} questions that:
1. Can only be answered using information in the document
2. Represent realistic user queries
3. Vary in complexity (some factual, some requiring synthesis)

Document:
{document}

Return JSON array: [{{"question": str, "answer": str}}]
"""
    return llm.generate(prompt)
```

Synthetic test sets are faster to build and can scale to thousands of examples. Quality is lower than manual curation but sufficient for directional evaluation. Mix synthetic and manual for best results.

**Target distribution:** Include:
- Questions with clear single-document answers
- Questions that require synthesis across multiple documents
- Questions that test for hallucination resistance (where no relevant document exists)
- Questions at the retrieval boundary (where relevant docs are deeply embedded)

## Establishing baselines and tracking improvement

Before optimizing anything:

1. Run your evaluation suite and record all metrics
2. Keep this as your baseline
3. For every change (chunk size, embedding model, top-K, reranker, prompt) — re-run and compare

A regression in faithfulness after increasing top-K (more context) is a real signal: more context is confusing the generator. A retrieval recall improvement after reducing chunk size tells you something specific about how your content is structured.

Maintain an evaluation log. A spreadsheet with columns for: change made, retrieval recall@5, MRR, faithfulness, answer relevance, end-to-end correctness, and notes is enough. Without this, you're optimizing blind.

## Common failure modes and their fixes

| Problem | Symptom | Fix |
|---|---|---|
| Chunking too large | Low precision, noisy context | Reduce chunk size, try sentence-level chunking |
| Chunking too small | Low recall, incomplete context | Increase chunk size or add overlap |
| Wrong embedding model | Low retrieval recall for domain content | Fine-tune embedding model or use domain-specific model |
| Top-K too low | Missing relevant docs | Increase K, add reranker |
| Top-K too high | Faithful score drops (noise) | Add reranker to filter, reduce K |
| Prompt doesn't ground model | Low faithfulness | Add explicit grounding instruction: "Answer based only on the provided context" |
| No fallback for missing info | Hallucinations on unanswerable questions | Add explicit handling: "If the context doesn't contain the answer, say so" |

## The evaluation cadence

Don't evaluate only before launch. Set a cadence:
- **Before any significant change:** Always
- **After content corpus updates:** Check recall (new content may be indexed differently)
- **Monthly:** Full eval suite run to catch drift
- **When users report issues:** Targeted eval on the failure cases

RAG quality degrades silently. Your corpus changes, your users' questions evolve, your embedding model might need updating. Evaluation is how you catch this before it becomes a user-visible problem.

---

For the architectural patterns behind production RAG systems — indexing strategies, chunking approaches, reranking pipelines — see the 🔵 Applied guide: RAG for Builders.
