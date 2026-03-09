---
title: "Chain of Thought Prompting: A Practical Guide"
depth: applied
pillar: practice
topic: prompting
tags: [prompting, chain-of-thought, reasoning, prompt-engineering, applied-ai]
author: bee
date: "2026-03-09"
readTime: 9
description: "Chain of thought prompting reliably improves reasoning quality in LLMs. Here's how it works, the different variants to know, and when to use each one."
related: [prompting-few-shot-guide, prompting-system-prompts-explained, prompting-that-actually-works]
---

Chain of thought (CoT) prompting is one of the most reliably useful techniques in prompt engineering. It's also one of the most misunderstood. This isn't just about adding "think step by step" to your prompt — it's about understanding *why* explicit reasoning improves outputs and how to design prompts that leverage this effect well.

## What chain of thought actually does

When you ask a model to answer a question directly, it generates the answer in a single forward pass. The final token is sampled from a probability distribution conditioned only on the input — no intermediate reasoning has occurred.

When you ask the model to reason step by step first, the intermediate reasoning tokens become additional context that influences subsequent token predictions. Each step conditions the next. A model that writes "John had 5 apples. He gave 2 to Mary. So John has 5-2=3 apples." is not reasoning the same way as one that directly outputs "3." The intermediate text is computationally relevant — it's part of the context that produces the final answer.

This is why CoT helps: the model's final answer is generated from a richer context that includes explicit intermediate steps, making errors in those steps visible and catchable (by the model itself, as it generates subsequent tokens).

The empirical result: CoT consistently improves performance on tasks requiring multiple reasoning steps, arithmetic, logical deduction, and knowledge composition. The improvement is especially strong on harder problems — easy problems don't benefit much.

## The three main CoT variants

### Zero-shot CoT: "Think step by step"

The simplest form. Add "Let's think step by step" (or similar) to your prompt.

```
Prompt: A store has 48 items. They sold 1/3 of them in the morning and 
then 50% of the remaining items in the afternoon. How many items are left?
Let's think step by step.

Model: 
Step 1: Items sold in the morning: 48 × (1/3) = 16 items
Step 2: Items remaining after morning: 48 - 16 = 32 items
Step 3: Items sold in the afternoon: 32 × 50% = 16 items
Step 4: Items remaining after afternoon: 32 - 16 = 16 items
Answer: 16 items remain.
```

Without the CoT trigger, models often compute multi-step arithmetic incorrectly by trying to leap to the answer. With it, intermediate steps make the calculation traceable and self-correcting.

**When to use:** Quick win for any task that requires multi-step reasoning. Low effort, meaningful improvement for complex problems.

**Limitation:** The quality of the chain depends on the model's ability to reason through your specific problem type. Some problem types benefit less than others; test empirically.

### Few-shot CoT: Demonstrate the reasoning pattern

Instead of just saying "think step by step," show the model what good reasoning looks like for your specific task type.

```
Classify the sentiment of customer reviews, explaining your reasoning.

Example 1:
Review: "The product arrived quickly and works as described. Very happy!"
Reasoning: The customer explicitly states they are "very happy." Positive indicators: "arrived quickly," "works as described," "very happy." No negative indicators.
Sentiment: POSITIVE

Example 2:
Review: "Delivered on time but the quality is much lower than the photos suggested."
Reasoning: Mixed review. Positive: "delivered on time." Negative: "quality is much lower than photos suggested" — clear disappointment. The negative component is about core product quality, which outweighs the delivery positive.
Sentiment: NEGATIVE

Now classify:
Review: "It took forever to arrive and the packaging was damaged, but the 
product itself seems fine so far."
```

Few-shot CoT is more powerful than zero-shot CoT for domain-specific reasoning because you're teaching the model the *shape* of good reasoning for your task, not just asking it to reason generically.

**When to use:** When you have a consistent reasoning pattern that applies across many examples. When the task requires a specific analytical framework.

**Tip:** Your few-shot CoT examples don't need to be exhaustive — 2-4 good examples usually capture the pattern. Prioritize diversity (different sub-cases of your task) over quantity.

### Self-consistency: multiple reasoning paths

A more expensive but more reliable technique: generate multiple independent reasoning chains and take a majority vote on the final answer.

```python
answers = []
for _ in range(5):
    response = model.complete(
        prompt=question + "\nLet's think step by step.",
        temperature=0.7  # Some temperature for diversity
    )
    answers.append(extract_answer(response))

# Take majority vote
final_answer = most_common(answers)
```

Self-consistency works because different reasoning paths surface different errors. If 4 out of 5 reasoning chains arrive at the same answer, that answer is likely correct even if one chain makes a mistake.

**When to use:** High-stakes decisions where accuracy matters more than cost/latency. Good complement to other CoT variants.

**Cost consideration:** 5× the inference cost. Worth it for difficult problems where single-chain CoT is unreliable.

## Advanced CoT patterns

### Least-to-most prompting

Break complex problems into subproblems, solve them in order from simplest to most complex, and use earlier answers in later steps.

```
Prompt: Can I reach [destination] by 3pm if I leave at [time]?

Step 1: Calculate travel time from home to first stop.
Step 2: Calculate remaining travel time.
Step 3: Add any transfer time.
Step 4: Compute arrival time and compare to 3pm.
```

Useful when: the problem decomposes into clear stages where each stage's output feeds the next.

### Chain of thought with explicit uncertainty

Ask the model to flag uncertain steps:

```
Solve this problem step by step. After each step, note if you are confident 
in that step (HIGH/MEDIUM/LOW confidence). If any step is LOW confidence, 
state why and what additional information would help.
```

This surfaces where the reasoning is shaky — valuable for debugging and for identifying where you need better grounding.

### Verification step

After a chain of thought, add a verification prompt:

```
You've reasoned through this problem and concluded [X]. 
Now verify your answer: work backwards from [X] and check whether your 
conclusion is consistent with all the constraints in the problem.
```

Verification catches logical errors that weren't caught forward. It's especially useful for constraint satisfaction problems.

### Tree of thought

A generalization of self-consistency: generate multiple candidate reasoning paths at each step (not just at the beginning), evaluate each path, and explore the most promising branches. Think of it as beam search for reasoning.

In practice: generate 3 initial approaches to a problem, evaluate which seems most promising, develop that approach into 3 next-step options, and so on. More computationally expensive than self-consistency but appropriate for very complex problems where the search space of reasoning approaches is large.

Most teams won't implement tree of thought from scratch — it's primarily relevant if you're building evaluation infrastructure or working on research problems where the added complexity is justified.

## When CoT helps most

CoT is not universally beneficial. It helps most for:

- **Multi-step arithmetic or algebra** — Dramatic improvement
- **Logical deduction** — Following chains of implication reliably
- **Complex question answering** — Questions requiring synthesis across multiple facts
- **Planning tasks** — Breaking down complex plans step by step
- **Code debugging** — "Walk through this code step by step and identify the bug"

CoT helps less for:
- **Simple factual retrieval** — "What's the capital of France?" doesn't benefit from step-by-step reasoning
- **Pattern matching classification** — Well-defined categories with clear signals
- **Short, unambiguous tasks** — Adding CoT overhead slows things down without improving accuracy

**Rule of thumb:** If a smart human could answer the question correctly without working through intermediate steps, CoT probably doesn't help much. If a smart human would want to show their work, CoT likely helps.

## CoT and reasoning models

Dedicated reasoning models (like o3, QwQ, DeepSeek-R1) perform chain-of-thought reasoning internally before generating their visible response. For these models, you often don't need to explicitly prompt for CoT — the reasoning happens in a hidden "thinking" trace before the final response.

For reasoning models:
- Don't prompt "think step by step" — they already do this
- Do prompt clearly about the problem structure and what you need in the output
- Do use them for problems that genuinely require deep reasoning (complex math, logic, multi-step analysis) — their CoT comes at significant token and latency cost
- Don't use them for simple tasks where a standard model with an explicit CoT prompt would suffice

## Practical implementation tips

**Extract the answer separately.** When using CoT, the model's reasoning and final answer are mixed in the output. Parse the final answer explicitly:

```
After your reasoning, on a new line write:
FINAL ANSWER: [your answer here]
```

This makes extracting the answer reliable without parsing free-form text.

**Temperature for CoT.** Standard CoT with temperature 0 (or near 0) produces consistent reasoning. For self-consistency, use temperature 0.5-0.7 to generate diverse reasoning paths. Don't use high temperature for reasoning-critical tasks.

**Length considerations.** CoT outputs are substantially longer than direct answer outputs. Factor this into your output token budget and latency estimates. For high-volume applications where you're collecting the final answer (not displaying the reasoning to users), you may want to extract just the answer in a second call to minimize output token cost.

**Test across models.** CoT effectiveness varies by model. A pattern that dramatically improves GPT-4o performance may have less effect on Claude and vice versa. Test your specific CoT prompts on your target model.

Chain of thought is one of the few prompting techniques with consistent empirical support across tasks and models. When you're working on any task that requires reasoning — and most real-world tasks do — it should be part of your standard toolkit.
