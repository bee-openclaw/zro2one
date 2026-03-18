---
title: "Debugging Prompts: A Systematic Approach to Fixing Bad AI Outputs"
depth: applied
pillar: using
topic: prompting
tags: [prompting, debugging, iteration, troubleshooting, prompt-engineering]
author: bee
date: "2026-03-18"
readTime: 8
description: "Your prompt produces garbage. Now what? This guide provides a systematic approach to diagnosing and fixing prompt problems, from vague outputs to hallucinations to format failures."
related: [prompting-that-actually-works, prompting-evaluation-rubrics-guide, prompting-chain-of-thought]
---

You spent 30 minutes crafting a prompt. You run it. The output is wrong, or weird, or almost-right-but-not-quite. So you randomly tweak words and try again. And again. And again. This is prompt engineering by lottery, and it's how most people work.

There's a better way. Prompt debugging is a skill, and like software debugging, it benefits from a systematic approach.

## The Diagnostic Framework

When a prompt produces bad output, the problem falls into one of five categories:

### 1. The Model Doesn't Understand What You Want

**Symptoms:** Output is on a completely wrong topic, addresses a different task, or seems to answer a different question.

**Diagnosis:** Your instructions are ambiguous. Read your prompt as if you've never seen the task before — could it be interpreted differently than you intend?

**Fix:** Add specificity. Replace "Analyze this data" with "Calculate the month-over-month growth rate for each product line and identify which product had the highest growth in Q3."

### 2. The Model Understands But Produces the Wrong Format

**Symptoms:** Content is correct but format is wrong — JSON instead of markdown, a paragraph instead of a list, missing required fields.

**Fix:** Provide an explicit example of the desired output. Models are much better at matching a template than interpreting format descriptions.

```
Bad:  "Return the data as structured JSON"
Good: "Return the data as JSON matching this exact structure:
      {"name": "...", "score": 0.0, "category": "..."}"
```

### 3. The Model Gets Some Parts Right and Others Wrong

**Symptoms:** The first part of the output is great, but quality degrades. Or some fields are correct while others are hallucinated.

**Diagnosis:** The task is too complex for a single prompt. The model runs out of "attention budget" and starts guessing on later parts.

**Fix:** Break the prompt into steps. Process the easy parts first, then use those results to inform the harder parts.

### 4. The Model Hallucinates

**Symptoms:** The output contains plausible but false information — fake citations, invented statistics, non-existent features.

**Fix:** 
- Add "Only use information from the provided context. If the answer isn't in the context, say so."
- Ask the model to quote its sources: "For each claim, cite the specific passage from the provided text."
- Use chain-of-thought: "First, find the relevant information in the text. Quote it. Then answer based only on what you quoted."

### 5. The Output Is Generic / Low Quality

**Symptoms:** Technically correct but bland, generic, or surface-level. Reads like it was written by a committee.

**Fix:** Add constraints that force specificity:
- "Include at least 3 specific examples"
- "Avoid generic advice — every recommendation should be actionable within one week"
- "Write as if the reader already understands the basics — skip introductory definitions"
- Provide a persona: "Write as a senior engineer explaining this to a junior colleague"

## The Debugging Process

### Step 1: Identify Which Category

Run the prompt 3 times. Look at all outputs. Which category of failure are you seeing? Is it consistent or random?

**Consistent failures** → Prompt problem. The instructions are wrong or ambiguous.
**Random failures** → Reliability problem. The prompt works sometimes but not always. Need guardrails or examples.

### Step 2: Isolate the Problem

If the prompt has multiple parts, test each in isolation:

```
Full prompt: "Read this document, extract key metrics, compare to last 
quarter, and write an executive summary."

Test separately:
1. "Read this document and extract all metrics mentioned."
2. [Given extracted metrics] "Compare these to last quarter's metrics."
3. [Given comparison] "Write a 3-sentence executive summary."
```

Find which step fails. Fix that step. Then recombine.

### Step 3: Add Constraints

The most common fix for bad outputs is adding constraints:

```
Before: "Summarize this article."

After: "Summarize this article in exactly 3 bullet points.
Each bullet should be one sentence.
Focus on findings that would affect our product roadmap.
Do not include background information the team already knows."
```

More constraints = less room for the model to go wrong.

### Step 4: Add Examples

If constraints aren't enough, show don't tell:

```
Classify these customer messages into categories.

Example 1:
Message: "My order arrived with a broken screen"
Category: Product Damage
Reasoning: Physical damage to received product

Example 2:
Message: "I can't figure out how to connect to WiFi"
Category: Setup Help
Reasoning: User needs assistance with product configuration

Now classify:
Message: "The battery only lasts 2 hours"
```

Two good examples communicate more than a paragraph of instructions.

### Step 5: Test at Scale

A prompt that works on 3 examples might fail on the 4th. Test on at least 20 representative inputs before declaring victory. Track:
- Accuracy (% correct outputs)
- Consistency (do reruns produce similar results?)
- Edge cases (does it handle unusual inputs gracefully?)

## Common Fixes Quick Reference

| Problem | Fix |
|---------|-----|
| Wrong topic | More specific task description |
| Wrong format | Provide output example |
| Hallucination | "Only use provided context" + quote requirements |
| Too generic | Add specificity constraints, persona |
| Too verbose | "Maximum 3 sentences" or "Be concise" |
| Inconsistent | Add examples (few-shot), lower temperature |
| Drops instructions | Move critical instructions to the end (recency bias) |
| Refuses valid request | Reframe the task, provide context for why it's legitimate |

## The Iteration Log

Keep a log of what you tried and what happened. Prompt engineering is empirical — you need data to make progress.

```
Attempt 1: Basic instruction → Too generic
Attempt 2: Added persona → Better tone, still hallucinating stats
Attempt 3: Added "cite sources" → Fixed hallucination, format broke
Attempt 4: Added output example → Format fixed, working well
Attempt 5: Tested on 20 inputs → 17/20 correct, edge case with...
```

This log prevents circular debugging (trying the same fix twice) and helps you build intuition over time.

## When to Stop Debugging

A prompt doesn't need to be perfect. It needs to be good enough for your use case:

- **One-off use:** 80% good enough → done
- **Internal tool:** 90% accuracy with human review → done
- **Customer-facing:** 95%+ with fallback handling → keep iterating
- **Automated pipeline:** 98%+ with monitoring → keep iterating, add evals

If you can't get above your threshold after 10 iterations, the problem might be the model (try a different one), the task (too hard for current models), or the data (insufficient context to answer correctly).
