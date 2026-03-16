---
title: "Evaluation Metrics for RAG Systems"
depth: technical
pillar: applied
topic: rag
tags: [rag, evaluation, metrics, testing, quality]
author: bee
date: "2026-03-16"
readTime: 10
description: "How to measure whether your RAG system actually works — retrieval metrics, generation metrics, and end-to-end evaluation frameworks."
related: [rag-evaluation-and-guardrails-guide, rag-evaluation-guide, rag-chunking-strategies]
---

# Evaluation Metrics for RAG Systems

Building a RAG system is easy. Building one that works well is hard. The difference is evaluation — knowing what to measure, how to measure it, and what the numbers actually mean.

RAG has two stages (retrieval and generation), and you need to evaluate both independently and together.

## Retrieval Metrics

The retrieval stage finds relevant documents. If it fails here, no amount of generation quality saves you.

### Recall@K

**What it measures:** Of all relevant documents in your corpus, what fraction did the retriever return in the top K results?

```
Recall@5 = (relevant documents in top 5) / (total relevant documents)
```

**Why it matters:** If the relevant passage isn't retrieved, the LLM can't use it. Recall is the most important retrieval metric for RAG.

**Target:** Recall@10 > 0.9 for most applications. If you're below 0.8, fix retrieval before touching anything else.

### Precision@K

**What it measures:** Of the K documents returned, what fraction are actually relevant?

```
Precision@5 = (relevant documents in top 5) / 5
```

**Why it matters:** Low precision means the LLM's context is filled with irrelevant documents, which can confuse generation and increase cost.

### Mean Reciprocal Rank (MRR)

**What it measures:** How high does the first relevant document appear in the results?

```
MRR = 1 / rank_of_first_relevant_document
```

If the first relevant document is at position 1, MRR = 1.0. At position 3, MRR = 0.33.

**Why it matters:** For single-answer questions, you mainly care about the top result. MRR captures this.

### Normalized Discounted Cumulative Gain (nDCG)

**What it measures:** Are the most relevant documents ranked highest? Accounts for graded relevance (some documents are more relevant than others).

**When to use:** When documents have varying degrees of relevance, not just relevant/irrelevant.

## Generation Metrics

The generation stage synthesizes a response from retrieved documents.

### Faithfulness (Groundedness)

**What it measures:** Is the generated answer actually supported by the retrieved documents?

This is the most critical generation metric for RAG. An unfaithful answer is a hallucination — the model generates plausible-sounding information not present in the context.

**How to measure:**

```python
def evaluate_faithfulness(answer, context, evaluator_model):
    """Use an LLM to judge if the answer is supported by context."""
    prompt = f"""Given the following context and answer, determine if 
    every claim in the answer is supported by the context.
    
    Context: {context}
    Answer: {answer}
    
    For each claim in the answer:
    1. State the claim
    2. Quote the supporting evidence from context (or say "not found")
    3. Rate: supported / partially supported / not supported
    
    Overall faithfulness score (0.0 to 1.0):"""
    
    return evaluator_model.evaluate(prompt)
```

**Target:** Faithfulness > 0.95. Below this, users will encounter hallucinations regularly.

### Answer Relevance

**What it measures:** Does the answer actually address the question?

A faithful answer can still be irrelevant — it might accurately quote context that doesn't address the user's question.

### Answer Completeness

**What it measures:** Does the answer cover all aspects of the question?

If a user asks "What are the pricing tiers and how does billing work?" and the answer only covers pricing tiers, it's incomplete.

### Answer Correctness

**What it measures:** Is the answer factually correct?

This requires ground-truth answers for comparison. Measured via:
- Exact match (strict, for factoid questions)
- F1 overlap (token-level overlap between predicted and ground-truth)
- Semantic similarity (embedding distance between predicted and ground-truth)
- LLM-as-judge (most flexible, most expensive)

## End-to-End Metrics

### Context Relevance

**What it measures:** Are the retrieved documents relevant to the question?

Different from retrieval recall — this specifically measures whether the context provided to the LLM is useful for answering the specific question.

### Context Utilization

**What it measures:** How much of the retrieved context did the model actually use?

Low utilization suggests you're retrieving too many documents or the wrong ones. The LLM ignores irrelevant context, wasting tokens and money.

## Evaluation Frameworks

### RAGAS

The most popular RAG evaluation framework. Provides automated metrics using LLM-as-judge:

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)

results = evaluate(
    dataset=eval_dataset,  # questions, contexts, answers, ground_truths
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
)

print(results)
# {'faithfulness': 0.92, 'answer_relevancy': 0.88, 
#  'context_precision': 0.85, 'context_recall': 0.91}
```

### DeepEval

Alternative framework with more metrics and customization:

```python
from deepeval import evaluate
from deepeval.metrics import FaithfulnessMetric, AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase

test_case = LLMTestCase(
    input="What is the refund policy?",
    actual_output="Refunds are available within 30 days of purchase.",
    retrieval_context=["Our refund policy allows returns within 30 days..."],
    expected_output="Customers can request refunds within 30 days."
)

faithfulness = FaithfulnessMetric(threshold=0.9)
relevancy = AnswerRelevancyMetric(threshold=0.8)

evaluate([test_case], [faithfulness, relevancy])
```

### Custom LLM-as-Judge

For domain-specific evaluation, build your own judge:

```python
JUDGE_PROMPT = """You are evaluating a RAG system for medical documentation.

Question: {question}
Retrieved Context: {context}
Generated Answer: {answer}
Reference Answer: {reference}

Evaluate on these criteria (1-5 scale):
1. Medical Accuracy: Are all medical facts correct?
2. Completeness: Does it cover all relevant aspects?
3. Safety: Does it include appropriate caveats and disclaimers?
4. Clarity: Would a patient understand this?
5. Groundedness: Is every claim supported by the context?

Provide scores and brief justification for each."""
```

## Building an Evaluation Dataset

Your evaluation is only as good as your data.

### Minimum Viable Evaluation Set

- **50-100 question-answer pairs** covering your main use cases
- **Include difficulty levels**: easy (directly stated in docs), medium (requires combining info), hard (requires inference)
- **Include edge cases**: questions about missing information, ambiguous queries, multi-hop questions
- **Include adversarial examples**: questions designed to elicit hallucinations

### Generating Evaluation Data

```python
# Use an LLM to generate questions from your documents
def generate_eval_questions(document_chunk):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "system",
            "content": "Generate 5 questions that could be answered using this document. Include: 1 factoid question, 1 comparison question, 1 'how to' question, 1 question requiring synthesis, 1 question whose answer is NOT in the document."
        }, {
            "role": "user", 
            "content": document_chunk
        }]
    )
    return response.choices[0].message.content
```

Always have humans review and validate generated evaluation data.

## Interpreting Results

### What Good Looks Like

| Metric | Minimum | Good | Excellent |
|--------|---------|------|-----------|
| Retrieval Recall@10 | 0.80 | 0.90 | 0.95+ |
| Context Precision@5 | 0.60 | 0.75 | 0.85+ |
| Faithfulness | 0.85 | 0.93 | 0.97+ |
| Answer Relevance | 0.75 | 0.85 | 0.92+ |

### Debugging with Metrics

- **High recall, low faithfulness** → Retrieval is fine, but the LLM is hallucinating. Improve your generation prompt or add guardrails.
- **Low recall, high faithfulness** → Retrieval is the bottleneck. Improve chunking, embeddings, or add hybrid search.
- **High precision, low recall** → Retriever is too conservative. Lower similarity thresholds or retrieve more documents.
- **Low relevance, high faithfulness** → The model is accurate but not answering the question. Improve your prompt to focus on the question.

## Continuous Evaluation

Don't evaluate once and ship. Build evaluation into your pipeline:

1. **Pre-deployment**: Full evaluation on test set before any change
2. **A/B testing**: Compare new retrieval/generation approaches on live traffic
3. **Production sampling**: Evaluate a random sample of production queries weekly
4. **User feedback**: Track thumbs up/down, corrections, and escalations
5. **Regression testing**: Run the full test suite before every change

The RAG systems that work well in production are the ones that are measured continuously. Metrics tell you what's broken before your users do.
