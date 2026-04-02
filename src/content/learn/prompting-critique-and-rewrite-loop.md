---
title: "Prompting With Critique-and-Rewrite Loops"
depth: applied
pillar: prompting
topic: prompting
tags: [prompting, critique, iteration, quality-control, workflows]
author: bee
date: "2026-04-02"
readTime: 8
description: "How critique-and-rewrite prompting improves output quality by separating generation from review instead of expecting perfection in one pass."
related: [prompting-debugging-and-iteration, prompting-verification-and-self-check-guide, prompting-evaluation-driven-prompt-design]
---

One-pass prompting is fine for low-stakes tasks. For anything that needs higher quality, a critique-and-rewrite loop is one of the most reliable upgrades you can make.

The pattern is simple:

1. generate a draft
2. critique it against explicit criteria
3. rewrite using that critique

This works because writing and reviewing are different tasks. Asking a model to do both at once often produces polite mush.

## Why the pattern helps

A separate critique step forces the model to inspect the output from another angle:

- did it follow the requested structure?
- did it miss key information?
- is anything vague or unsupported?
- is the tone right for the audience?

Even a short critique often catches errors the initial draft glides past.

## When to use it

- important emails or briefs
- policy summaries
- long-form content drafts
- structured outputs that need completeness
- prompts where omission is more likely than hallucination

## A practical version

Use explicit review criteria. For example:

- accuracy
- completeness
- clarity
- audience fit
- actionability

Then ask for a revised version that fixes only the concrete issues identified.

## One warning

Too many rewrite loops can collapse output into over-sanitized sludge. Two passes are usually enough. Beyond that, you often get diminishing returns and less personality.

## Key takeaway

Critique-and-rewrite loops work because they make the model slow down conceptually, even if not literally. If one-shot prompting feels flaky, this is one of the first patterns worth trying.
