---
title: "Few-Shot Prompting: Teaching Models with Examples"
depth: applied
pillar: practice
topic: prompting
tags: [prompting, few-shot, in-context-learning, prompt-engineering, examples, llm]
author: bee
date: "2026-03-08"
readTime: 7
description: "Few-shot prompting is one of the most reliable techniques for getting consistent, high-quality LLM outputs. Here's how to use it effectively."
related: [prompting-that-actually-works, prompting-system-prompts-explained, prompting-advanced-techniques]
---

Few-shot prompting is the practice of including examples of the task you want the model to perform — directly in the prompt — before asking it to do the actual task. It's one of the most reliable tools in prompt engineering, and one that many people underuse.

The core idea: show, don't just tell.

## Zero-shot vs. few-shot

**Zero-shot prompting** relies entirely on instructions:

```
Classify the sentiment of this customer review as positive, negative, or neutral.

Review: "The product arrived quickly but the quality was disappointing."
```

**Few-shot prompting** adds examples:

```
Classify the sentiment of this customer review as positive, negative, or neutral.

Examples:
Review: "Absolutely love this! Will buy again." → positive
Review: "Broken on arrival, terrible customer service." → negative  
Review: "It works as described. Nothing special." → neutral

Now classify:
Review: "The product arrived quickly but the quality was disappointing."
```

For most classification, extraction, and formatting tasks, few-shot beats zero-shot in both accuracy and consistency. The model learns the *pattern* from your examples rather than interpreting vague instructions.

## Why it works

LLMs are trained to be next-token predictors. When they see a pattern of input→output pairs, they recognize the pattern and extend it to new inputs. This is called **in-context learning** — the model "learns" from examples in the context without any weight updates.

The examples do several things simultaneously:
- Show the exact output *format* you want (without having to describe it)
- Demonstrate the *judgment* to apply in ambiguous cases
- Establish the *tone* and *level of detail* appropriate for the task
- Calibrate the model to your specific domain and conventions

This is more efficient than trying to describe all of these properties in instructions, because descriptions are often underspecified and examples are concrete.

## How to write good examples

### Cover the important cases, not just the easy ones

A common mistake: including only clear, unambiguous examples. Your model will be fine on those anyway. What you need is examples that demonstrate how to handle the tricky cases.

If you're classifying sentiment:
- Include clear positives and negatives (to establish the pattern)
- Include *mixed* reviews (clearly show how to handle when quality and shipping disagree)
- Include *neutral* or ambiguous cases (show the boundary)

If you're extracting information:
- Include examples where the field is clearly present
- Include examples where the field is absent or unclear (show what to output in those cases)
- Include examples with unusual formatting or wording

### Make your examples representative of real inputs

Don't use toy examples that don't resemble your actual inputs. If your customers write short, informal reviews full of abbreviations, your examples should look like that — not formal, full-sentence product descriptions.

The more your examples resemble the actual inputs the model will encounter, the better the pattern transfer.

### Keep the format consistent

Every example should have exactly the same format. If your first example uses "Input:" / "Output:", they all should. If your first example separates input from output with "→", they all should. Inconsistency in example format confuses the model about what's format and what's content.

**Consistent:**
```
Input: "Great product!"
Output: positive

Input: "Doesn't work at all."
Output: negative
```

**Inconsistent (avoid):**
```
"Great product!" → positive

Input: "Doesn't work at all."
Classification: negative
```

### Match example length to your target output

If you want a one-word classification, your examples should show one-word outputs. If you want a structured JSON object, your examples should show complete JSON objects. The model calibrates output length and format from your examples.

## How many examples?

The right number depends on the task complexity:

**Simple pattern tasks (classification, format conversion, simple extraction):** 3-5 examples usually establish the pattern clearly. More examples rarely help much after a point.

**Nuanced judgment tasks (quality assessment, complex categorization, subjective decisions):** 8-15 examples help cover more of the decision space and demonstrate edge case handling.

**Novel or unusual formats:** More examples help because the model needs more signal to recognize and extend an unfamiliar pattern.

**Practical constraint:** Each example uses tokens. For high-volume applications, there's a cost to many examples. Find the minimum number that achieves your quality threshold.

## Choosing which examples to show

Not all examples are equal. For the best results:

**Select for diversity:** Don't show 5 positive examples and 1 negative. Represent the distribution of real inputs, with emphasis on hard cases.

**Order from simple to complex:** Start with clear examples, then edge cases. This helps the model build up an understanding progressively.

**Dynamic example selection:** For applications where you have a large example bank, use embedding-based retrieval to select the most relevant examples for each specific input. A review about shipping is better served by examples involving shipping than examples about product quality.

Example selection is an area where thoughtful engineering pays off. Building a curated example library and selecting from it per-query is a pattern used by many production systems.

## Chain-of-thought in examples

For reasoning tasks, including the *reasoning process* in your examples (not just the final answer) can dramatically improve accuracy. This is the chain-of-thought prompting pattern applied to few-shot examples.

**Without chain-of-thought:**
```
Question: If a train leaves Chicago at 2pm going 80mph, and arrives in Detroit (280 miles away) at what time?
Answer: 5:30pm
```

**With chain-of-thought:**
```
Question: If a train leaves Chicago at 2pm going 80mph, and arrives in Detroit (280 miles away) at what time?
Reasoning: Distance = 280 miles, Speed = 80 mph. Time = 280/80 = 3.5 hours. 2:00pm + 3.5 hours = 5:30pm.
Answer: 5:30pm
```

When the examples show the reasoning, the model tends to perform similar reasoning on new problems — even when you don't explicitly tell it to reason step by step.

## Few-shot for output format control

One of the most reliable uses of few-shot prompting is establishing complex output formats. Rather than describing your desired JSON schema in prose (which often leads to inconsistent output), show examples of exactly what you want:

```
Extract structured data from customer feedback. Return JSON.

Example 1:
Feedback: "Shipping was super fast but the box was damaged. Product inside was fine though."
Output: {
  "shipping_speed": "positive",
  "packaging": "negative",
  "product_quality": "positive",
  "overall_sentiment": "mixed"
}

Example 2:
Feedback: "Love it! Perfect for my needs. Will recommend."
Output: {
  "shipping_speed": null,
  "packaging": null,
  "product_quality": "positive",
  "overall_sentiment": "positive"
}

Now extract from:
Feedback: "Arrived in 2 days which was great. The color was slightly off from the photos."
```

The model learns the exact schema from examples — including how to handle fields where information isn't present (null, not an empty string or "unknown"). This is more reliable than a prose description.

## When few-shot isn't the answer

Few-shot prompting doesn't help when:
- **The model fundamentally lacks the knowledge.** Examples can't teach a model facts it wasn't trained on. Use RAG for knowledge injection.
- **The task requires specific tool capabilities** (browsing, calculation). Examples of reasoning don't substitute for actual tools.
- **You have 500+ labeled examples.** At that scale, fine-tuning is worth evaluating — it's more efficient and can produce better results than cramming examples into every prompt.
- **You need very long context.** Many examples consume significant context budget. On very long inputs, you may need to choose between context length and examples.

## Combining few-shot with other techniques

Few-shot works well in combination:
- **Few-shot + system prompt:** Use the system prompt for persona and constraints; use few-shot examples for task pattern
- **Few-shot + chain-of-thought:** Show reasoning in examples for complex tasks
- **Few-shot + output format enforcement:** Use structured outputs API on top of examples for maximum format reliability
- **Few-shot + dynamic retrieval:** Select examples per query based on semantic similarity

The combination of a clear system prompt + 5-10 carefully chosen examples + structured output constraints is one of the most reliable patterns for production LLM tasks. It covers instruction, demonstration, and format enforcement — addressing the three main ways prompt outputs go wrong.
