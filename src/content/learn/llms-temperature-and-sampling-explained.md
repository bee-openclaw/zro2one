---
title: "Temperature, Top-P, and Sampling: The Knobs That Control LLM Creativity"
depth: applied
pillar: foundations
topic: llms
tags: [llm, temperature, sampling, inference, parameters]
author: bee
date: "2026-03-06"
readTime: 8
description: "Temperature and sampling parameters control how creative or predictable your LLM's outputs are. Here's what they actually do and how to use them."
related: [how-llms-work-essential, how-llms-work-applied, prompting-that-actually-works]
---

When you use ChatGPT, Claude, or any LLM API, there's a setting called **temperature** that most people either ignore or misunderstand. It's one of the most practically useful controls you have over model behavior — and once you understand it, you'll know exactly when to turn it up, when to turn it down, and why.

## The prediction problem

Let's back up for a second. When an LLM generates a response, it doesn't just pick one word — it calculates a probability distribution over its entire vocabulary. For every possible next token, it assigns a likelihood.

If you've asked it to complete "The capital of France is," the distribution might look something like:

- "Paris" → 98.7%
- "Lyon" → 0.6%
- "London" → 0.3%
- everything else → 0.4%

That's a very confident prediction. But if you've asked it to finish "The best way to handle this situation is," the distribution is much flatter — dozens of plausible continuations with meaningful probability mass.

**Temperature controls how much you spread or sharpen that distribution before sampling.**

## What temperature actually does

Temperature is a number, usually between 0 and 2. Here's the intuition:

**Temperature = 0:** Always pick the highest-probability token. Completely deterministic — same input, same output, every time. Maximum predictability.

**Temperature = 1.0:** Sample from the raw probability distribution. Some randomness, but the model's learned preferences are honored.

**Temperature > 1.0:** Flatten the distribution — make lower-probability tokens more likely. More creative, more surprising, sometimes incoherent.

**Temperature between 0 and 1:** Sharpen the distribution — amplify the model's confidence. More predictable, more "safe."

Think of it like the difference between asking a friend to recommend a restaurant (temperature 0.5 — they'll give you their actual top pick) versus asking them to brainstorm restaurants (temperature 1.5 — anything plausible might come out, including options they wouldn't normally lead with).

## When to turn temperature down

Use low temperature (0–0.4) when:

- **Accuracy matters more than creativity.** Answering factual questions, extracting structured data, classifying text. You want the model to be confident and consistent, not exploratory.
- **You're running the same prompt multiple times.** Code generation in CI pipelines, batch data processing. Consistent outputs are easier to debug and validate.
- **Following a specific format is critical.** JSON extraction, SQL generation, structured summaries. The model should commit to the format it knows is right, not experiment.

**Example:** If you're using an LLM to extract dates and amounts from invoices, run it at temperature 0 or 0.1. The right answer isn't creative — it's correct.

## When to turn temperature up

Use higher temperature (0.7–1.2) when:

- **You want varied outputs.** Brainstorming, idea generation, marketing copy options. Multiple runs at higher temperature will give you genuinely different results.
- **Creative writing needs to feel alive.** Lower temperature writing tends to feel "safe" and predictable. Slightly higher temperature lets more surprising word choices and metaphors through.
- **Exploring the space of possibilities.** If you're trying to see what a model can do with a prompt, run it several times at higher temperature.

**The ceiling:** Above 1.2–1.4, most models start to produce noticeably incoherent output — unusual word choices, strange topic transitions, broken logic. The "creative" outputs become surreal rather than interesting. Test before you commit.

## Top-P (nucleus sampling): the other dial

Temperature isn't the only control. **Top-P** (also called nucleus sampling) is the other major parameter.

Where temperature reshapes the entire probability distribution, Top-P cuts it off. Specifically: it considers only the smallest set of tokens whose cumulative probability exceeds P.

If Top-P = 0.9, the model samples only from the tokens that together account for 90% of the probability mass. All the low-probability tokens (the weird choices) are excluded.

**Why this matters:** At high temperature, a flattened distribution might give small probabilities to genuinely incoherent tokens. Top-P is a safety net — it keeps the model from wandering into nonsense even when temperature is high.

**In practice:** Most practitioners use temperature *or* Top-P, not both simultaneously. Anthropic recommends against using both at the same time; the interactions can be unpredictable. OpenAI's API docs suggest the same.

A common sensible default: Temperature = 1.0, Top-P = 0.9. This gives you creative outputs while cutting off the long tail of incoherence.

## Top-K: the blunter cousin

**Top-K** is a simpler version of Top-P: it samples only from the K highest-probability tokens, regardless of their actual probability values.

Top-K = 50 means: at each step, only consider the 50 most likely next tokens.

Top-K is less principled than Top-P because it ignores how concentrated or spread the probability mass is. When the distribution is very confident (like "Paris"), K = 50 still considers 49 bad options. When the distribution is flat, K = 50 might cut off legitimately good options.

Most modern LLM APIs have moved toward Top-P as the recommended alternative to Top-K, though Top-K is still used in some inference frameworks.

## Practical defaults that work

Here's a cheat sheet based on common use cases:

| Use Case | Temperature | Top-P | Notes |
|---|---|---|---|
| Factual Q&A | 0 – 0.2 | 1.0 | Maximum accuracy |
| Code generation | 0 – 0.3 | 1.0 | Correctness over creativity |
| Data extraction | 0 | 1.0 | Deterministic output |
| Summarization | 0.3 – 0.5 | 1.0 | Faithful but readable |
| Email drafting | 0.5 – 0.7 | 0.9 | Polished, varied |
| Creative writing | 0.8 – 1.1 | 0.9 | Room to explore |
| Brainstorming | 1.0 – 1.2 | 0.9 | Genuinely different options |

These are starting points, not rules. The right settings depend on your specific model, your prompt, and what "good" looks like for your use case. Always test.

## The thing temperature can't fix

Temperature controls variety, not quality. A poorly written prompt at any temperature will produce poorly reasoned outputs. A great prompt at the wrong temperature will produce valid reasoning in an unhelpful form (too predictable, or too scattered).

Temperature is a finishing touch, not a foundation. Get your prompt right first. Then tune the sampling parameters.

## The bottom line

Temperature controls how much the model sticks to its most-confident predictions versus explores lower-probability options. Lower = more predictable, higher = more creative. Top-P limits how far into the probability tail the model can sample.

For most applications: start at temperature 0.7 with Top-P 0.9, then adjust from there based on whether your outputs feel too samey or too wild. For anything involving accuracy or consistency, go to 0.2 or below.

That's the practical version. Want to go technical? See the 🟣 Technical series on LLM inference for how sampling is implemented at the code level.
