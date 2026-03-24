---
title: "Prompting for Classification: Designing Reliable Categorization with LLMs"
depth: applied
pillar: practice
topic: prompting
tags: [prompting, classification, categorization, labeling, structured-output]
author: bee
date: "2026-03-24"
readTime: 9
description: "How to design prompts that turn LLMs into reliable classifiers for sentiment, topic, intent, and priority labeling tasks."
related: [prompting-output-formatting-guide, prompting-few-shot-guide, prompting-evaluation-rubrics-guide]
---

## Why Use LLMs for Classification

Traditional classification required training a model from scratch with labeled data. LLMs change the economics: you can build a working classifier in hours with zero training data, then iterate based on results.

This works well for tasks where labels are defined by natural language descriptions that a human could apply without special training. Sentiment analysis, topic categorization, intent routing, content moderation, priority assignment. If you can explain the categories to an intern and they could do a reasonable job, an LLM can likely do it too.

Where it does not work well: highly domain-specific classifications where the labels require deep expertise, or tasks where the distinction between categories is statistical rather than semantic.

## Prompt Structure for Classification

A reliable classification prompt has four components.

**Task definition.** State exactly what the model should do and what output to produce.

**Label definitions.** Do not just list the labels. Define each one with criteria and boundary conditions. The more explicit, the fewer edge case failures.

**Examples.** Include 3-5 examples per label, deliberately choosing cases near category boundaries, not just obvious ones.

**Output format.** Constrain the output to valid labels only.

```python
CLASSIFICATION_PROMPT = """Classify the following customer message into exactly one category.

Categories:
- billing: Questions about charges, invoices, payment methods, refunds, or pricing
- technical: Problems with product functionality, bugs, errors, or setup issues
- account: Login issues, password resets, profile changes, account deletion
- feedback: Compliments, complaints about experience, feature requests, suggestions
- other: Messages that do not fit any above category

Rules:
- If a message spans multiple categories, choose the primary intent
- "I can't log in to pay my bill" is account (login is the blocker), not billing
- Feature requests are feedback, even if phrased as questions

Examples:
Message: "I was charged twice this month"
Category: billing

Message: "The app crashes when I try to upload photos"
Category: technical

Message: "I forgot my password and the reset email never arrives"
Category: account

Message: "It would be great if you added dark mode"
Category: feedback

Message: "{input_text}"
Category:"""
```

## Single-Label vs Multi-Label Classification

Single-label is simpler and more reliable with LLMs. When each item gets exactly one label, the model picks the best fit.

Multi-label classification (an article tagged with multiple topics, a support ticket with multiple issues) is harder because:

1. The model must decide independently for each label whether it applies
2. Output format must accommodate variable-length responses
3. The model tends to either over-assign labels (everything gets 3-4 tags) or under-assign (defaults to 1-2)

For multi-label tasks, decompose into binary decisions:

```python
def multi_label_classify(text: str, labels: list[str], llm) -> list[str]:
    applied = []
    for label in labels:
        prompt = f"""Does the following text belong to the category "{label}"?
Answer only YES or NO.

Text: {text}
Answer:"""
        response = llm.generate(prompt).strip().upper()
        if response == "YES":
            applied.append(label)
    return applied
```

This costs more API calls but produces significantly more reliable multi-label results than asking the model to output all applicable labels at once.

## Calibration and Label Bias

LLMs have systematic biases in classification. Common patterns:

**Positional bias.** Labels listed first or last in the prompt get selected more often. Mitigate by randomizing label order across requests, or by testing with rotated orderings and checking for inconsistency.

**Verbosity bias.** Labels with longer, more detailed descriptions get selected more frequently. Keep descriptions roughly equal in length.

**Frequency bias.** Labels corresponding to common concepts (the model saw more examples during pretraining) get over-predicted. Rare or domain-specific categories are under-predicted.

**Sycophancy in context.** If the input text uses emotional language, the model may classify more sympathetically rather than objectively.

To measure calibration, run your classifier on a balanced test set and check the confusion matrix. If you see systematic skew toward certain labels, adjust prompt descriptions or add corrective instructions.

## Techniques for Difficult Cases

**Chain-of-thought for ambiguous inputs.** For borderline cases, asking the model to reason before classifying improves accuracy.

```python
COT_PROMPT = """Classify this customer message.

Message: "{text}"

Step 1: Identify what the customer is asking for or reporting.
Step 2: Determine which category best matches their primary intent.
Step 3: Output the category.

Categories: billing, technical, account, feedback, other

Reasoning:"""
```

This adds latency and cost but improves accuracy on ambiguous inputs by 5-15% in typical benchmarks.

**Self-consistency voting.** Run the same classification 3-5 times (with temperature > 0) and take the majority vote. This smooths out randomness and catches cases where the model is uncertain.

```python
from collections import Counter

def classify_with_voting(text: str, prompt_template: str, llm, n: int = 5) -> str:
    votes = []
    for _ in range(n):
        result = llm.generate(
            prompt_template.format(text=text),
            temperature=0.7
        ).strip().lower()
        votes.append(result)

    vote_counts = Counter(votes)
    winner, count = vote_counts.most_common(1)[0]

    confidence = count / n
    return winner, confidence
```

If voting confidence is below a threshold (say 60%), flag the item for human review rather than accepting the noisy label.

**Structured output for clean labels.** Use JSON mode or function calling to constrain output to valid labels. This eliminates parsing failures where the model returns "I would classify this as billing" instead of just "billing."

## Evaluation: Comparing Against Human Annotators

The right baseline for LLM classification is not perfection. It is human inter-annotator agreement.

If human annotators agree 85% of the time on a task, an LLM achieving 82% is performing near human level. Expecting 95% from the LLM on a task where humans disagree 15% of the time is unrealistic.

Evaluation workflow:

1. Label 200-500 examples with two independent human annotators
2. Compute inter-annotator agreement (Cohen's kappa)
3. Run the LLM classifier on the same examples
4. Compare LLM accuracy against each annotator and against the consensus label
5. Examine disagreements qualitatively. Are the LLM's "errors" actually defensible alternative interpretations?

| Metric | What It Tells You |
|--------|-------------------|
| Accuracy | Overall correctness (misleading with imbalanced classes) |
| Per-class F1 | Performance on each category separately |
| Cohen's kappa | Agreement adjusted for chance |
| Confusion matrix | Where specific errors cluster |

## When to Fine-Tune a Small Model Instead

LLM-based classification via prompting is the right starting point. But at scale, the economics shift.

**Cost crossover.** If you are classifying 100K+ items per day, a fine-tuned small model (BERT-class, running on a single GPU) costs 10-100x less per prediction than LLM API calls.

**Latency requirements.** A fine-tuned model returns predictions in single-digit milliseconds. LLM API calls take 200-2000ms.

**Stability requirements.** Prompt-based classification depends on the LLM provider's model version. When they update the model, your classifier's behavior may shift. A fine-tuned model you control is frozen until you explicitly retrain it.

The practical path: use LLM prompting to bootstrap labels on your real data. Use those labels (after human review of a sample) as training data for a fine-tuned small model. Deploy the small model for production, keep the LLM approach as a development and evaluation tool.

This gives you the best of both worlds: fast iteration with LLMs, cheap and stable production inference with a dedicated model.
