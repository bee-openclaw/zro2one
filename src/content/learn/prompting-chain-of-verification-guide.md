---
title: "Chain of Verification: Making LLMs Check Their Own Work"
depth: applied
pillar: prompting
topic: prompting
tags: [prompting, verification, hallucination, accuracy, techniques]
author: bee
date: "2026-03-30"
readTime: 8
description: "Chain of Verification (CoVe) is a prompting technique that asks the model to generate verification questions about its own output, answer them independently, and revise based on findings. It significantly reduces hallucinations in factual tasks."
related: [prompting-verification-and-self-check-guide, prompting-self-consistency-guide, prompting-chain-of-thought]
---

LLMs hallucinate. They state things confidently that are partially or entirely wrong. Chain of Verification (CoVe) addresses this by adding a self-check loop: the model generates an initial response, creates questions to verify its claims, answers those questions independently, and revises the original response based on any discrepancies.

It's not perfect, but it measurably reduces factual errors — Meta's research showed 30–50% reduction in hallucinations across several benchmarks.

## How CoVe Works

### Step 1: Generate Initial Response

Ask the model your question normally. It produces a response that may contain errors.

**Prompt:** "List the 5 largest cities in Australia by population."

**Initial response:** "1. Sydney (5.3M), 2. Melbourne (5.1M), 3. Brisbane (2.6M), 4. Perth (2.1M), 5. Adelaide (1.4M)"

### Step 2: Generate Verification Questions

Ask the model to identify claims in its response that could be wrong, and formulate specific, answerable questions to check them.

**Prompt:** "Based on your previous response, generate specific verification questions for each factual claim."

**Questions generated:**
- "What is the current population of Sydney?"
- "What is the current population of Melbourne?"
- "Is Brisbane the third largest city in Australia?"
- "What is Perth's population?"
- "What is Adelaide's population?"

### Step 3: Answer Verification Questions Independently

The key: answer each verification question without looking at the original response. This prevents the model from simply confirming its initial claims. In practice, this means asking each question in a separate prompt or explicitly instructing the model to answer from its training data without referencing the previous answer.

### Step 4: Revise

Compare the verification answers to the original response. Where they disagree, revise.

## Implementation Patterns

### Single-Prompt CoVe

For simpler cases, you can run the entire chain in one prompt:

```
Answer the following question, then verify your answer.

Question: {question}

Step 1 - Initial answer:
[Generate your best answer]

Step 2 - Verification questions:
[List specific questions to check each claim in your answer]

Step 3 - Independent verification:
[Answer each verification question from scratch, without referencing Step 1]

Step 4 - Final answer:
[Revise your initial answer based on any discrepancies found]
```

This is convenient but less effective than multi-prompt CoVe because the model can still see its initial answer when doing verification.

### Multi-Prompt CoVe

More reliable. Use separate API calls:

```python
# Step 1: Initial response
initial = llm.generate(f"Answer: {question}")

# Step 2: Generate verification questions
questions = llm.generate(
    f"Given this answer: '{initial}'\n"
    f"Generate specific verification questions for each factual claim."
)

# Step 3: Answer each question independently
verifications = []
for q in parse_questions(questions):
    answer = llm.generate(f"Answer this question: {q}")
    verifications.append((q, answer))

# Step 4: Revise
revised = llm.generate(
    f"Original answer: {initial}\n"
    f"Verification results: {verifications}\n"
    f"Revise the original answer to fix any errors found."
)
```

### Factored CoVe

The most thorough variant. Instead of generating all verification questions at once, factor them by claim:

1. Extract individual claims from the response
2. For each claim, generate targeted verification questions
3. Verify each claim independently
4. Reconstruct the response using only verified claims

This catches more errors because each claim gets focused attention.

## When to Use CoVe

**Good fit:**
- Factual questions (dates, numbers, names, events)
- List generation (things that can be individually verified)
- Summarization (claims can be checked against the source)
- Biographical information
- Technical specifications

**Less useful:**
- Creative writing (no "correct" answer to verify against)
- Opinions and analysis (subjective claims resist verification)
- Very long responses (verification overhead becomes impractical)
- Real-time conversations (latency from multiple LLM calls)

## Practical Tips

### Make Verification Questions Specific

Bad: "Is the population correct?"
Good: "What was Sydney's population according to the 2021 Australian census?"

Specific questions produce specific (and checkable) answers. Vague questions get vague confirmations.

### Use Different Temperature Settings

For the initial response, use your normal temperature. For verification questions and answers, use temperature 0 (or very low). You want deterministic, factual responses during verification, not creative ones.

### Don't Over-Verify

Not every claim needs verification. Focus on:
- Numbers and dates (most commonly hallucinated)
- Proper nouns (names, places, organizations)
- Specific technical claims
- Anything the user will rely on for decisions

Skip verification on:
- General descriptions and explanations
- Well-established facts the model is very unlikely to get wrong
- Hedged statements ("approximately," "around," "roughly")

### Combine with Web Search

CoVe is most powerful when verification questions can be answered with web search:

```python
for q in verification_questions:
    search_results = web_search(q)
    verified_answer = llm.generate(
        f"Question: {q}\n"
        f"Search results: {search_results}\n"
        f"Answer based on search results."
    )
```

This grounds verification in real data rather than the model's potentially incorrect training data.

## Limitations

1. **The model verifies against itself.** If a fact is wrong in the model's training data, verification will confirm the error. CoVe reduces random hallucinations, not systematic knowledge gaps.

2. **Cost and latency.** Multi-prompt CoVe multiplies your API costs by 3–4x. For high-volume applications, this may not be feasible. Batch the verification calls where possible.

3. **Diminishing returns.** CoVe catches obvious errors well but subtle errors (wrong by a small amount, plausible but incorrect claims) often survive verification.

4. **Meta-cognitive limitations.** Models aren't always good at identifying which of their claims are uncertain. They may verify confident claims and skip uncertain ones — the opposite of what's needed.

## Beyond CoVe

CoVe is one approach in a broader family of self-verification techniques:

- **Self-consistency** — generate multiple answers and take the majority vote
- **Reflexion** — the model critiques its own response and iterates
- **Constitutional AI** — the model checks its output against a set of principles
- **Tool-augmented verification** — use calculators, databases, or search to verify specific claims

In practice, combining CoVe with tool use (especially web search) gives the best results. The model identifies what to verify; tools provide ground truth to verify against.
