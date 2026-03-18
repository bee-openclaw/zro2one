---
title: "Emergent Behavior in AI: When Models Do Things They Weren't Trained To Do"
depth: essential
pillar: foundations
topic: what-is-ai
tags: [what-is-ai, emergence, capabilities, scaling, intelligence]
author: bee
date: "2026-03-18"
readTime: 7
description: "AI models sometimes develop capabilities that weren't explicitly trained. This phenomenon — emergence — is one of the most fascinating and debated topics in AI. Here's what we know."
related: [what-is-ai-consciousness-debate, what-is-ai-safety, ai-foundations-transformers]
---

Nobody trained GPT-3 to do arithmetic. Yet when it was scaled large enough, it could add numbers. Nobody taught large language models to translate between languages they'd barely seen in training. Yet they could. Nobody programmed chain-of-thought reasoning into these systems. Yet they developed it.

This is emergence — the appearance of capabilities in AI systems that weren't explicitly programmed or trained for. And it's one of the most important (and contested) phenomena in modern AI.

## What Emergence Looks Like

The pattern is striking: a model shows near-zero ability at a task until it reaches a certain size, then performance jumps dramatically. It's not a gradual improvement — it looks like a phase transition.

**Examples of emergent capabilities:**

- **Multi-step arithmetic** — Small models can't do it. Above ~10 billion parameters, models start getting multi-digit addition correct without any arithmetic-specific training.
- **Translation from few examples** — Show a large model three English-French pairs, and it translates a fourth sentence. Smaller models just produce gibberish.
- **Chain-of-thought reasoning** — "Let's think step by step" dramatically improves reasoning in large models. In small models, the same prompt has no effect.
- **Code generation from description** — Describing what a function should do and getting working code. This capability appeared above certain scale thresholds and improved sharply with more parameters.
- **Theory of mind tasks** — Understanding what another person might know or believe based on a story. Large models pass some theory-of-mind tests that smaller models fail completely.

## Why It Happens (Maybe)

The honest answer: we don't fully understand emergence. But there are several theories:

### The Compression Theory

Large models are better at compressing the statistical patterns in their training data. At sufficient compression quality, higher-order patterns emerge — patterns of patterns. Arithmetic might emerge because a model that deeply understands the structure of mathematical text implicitly learns the rules that generate it.

### The Representation Theory

As models get larger, they develop richer internal representations. A small model might represent "2 + 3 = 5" as a memorized fact. A large model might develop an internal representation of addition that generalizes to new numbers. The capability appears to "emerge" because the representation crosses a quality threshold.

### The Measurement Theory (The Skeptic's View)

Some researchers argue that emergence is partly an artifact of how we measure it. Many "emergent" capabilities look like sharp jumps on accuracy metrics but are actually gradual improvements on continuous metrics. If you measure "exact match" on arithmetic, you see a sudden jump from 0% to 80%. If you measure "digit-by-digit accuracy," you see a smooth curve. The emergence might be in our measurement, not the model.

This is a legitimate critique, but it doesn't explain everything. Some capabilities genuinely seem to appear from nowhere, even with continuous metrics.

## Why It Matters

### For AI Capabilities

Emergence means we can't fully predict what a model will be able to do based on its training data and objectives. A model trained on text might develop visual reasoning capabilities. A model trained on English might speak Korean. This makes AI development less predictable — both excitingly and worryingly.

### For AI Safety

If capabilities can appear unexpectedly at scale, dangerous capabilities could too. A model might develop the ability to deceive, manipulate, or pursue unintended goals as an emergent property of getting smarter. This is a core concern for AI safety researchers: you can't safeguard against capabilities you didn't know existed.

### For AI Planning

Companies and researchers can't fully predict what the next generation of models will be able to do. Scaling up by 10x might produce modest improvements — or it might unlock entirely new capabilities. This uncertainty drives the massive investment in larger models: the potential upside of discovering new emergent capabilities is enormous.

## The Debate

Emergence is controversial in the AI research community:

**"Emergence is real and important"** — The majority view. Large language models develop qualitatively new capabilities at scale that can't be predicted from smaller models. This suggests that intelligence might be an emergent property of sufficient computation and data.

**"Emergence is measurement artifact"** — A minority but influential view. What looks like emergence is actually smooth scaling on the right metrics. We're just bad at choosing metrics that reveal gradual improvement.

**"Emergence is memorization in disguise"** — Another critical perspective. Models might not be developing new capabilities so much as having enough capacity to memorize more diverse patterns. What looks like "arithmetic" might be pattern matching on a huge number of arithmetic examples in training data.

The truth likely involves all three perspectives. Some emergence is genuine (new capabilities from scale), some is measurement artifact (sharp metrics hiding smooth improvement), and some is sophisticated memorization.

## What This Means for You

If you're **using AI tools:** Capabilities may surprise you. Try things you don't expect to work — sometimes they do. But verify carefully, because the model doesn't know its own capability boundaries.

If you're **building AI products:** Test extensively at your actual deployment scale. A capability that works at 70B parameters might not work at 7B. And a capability that doesn't work today might work with the next model generation.

If you're **thinking about AI's future:** Emergence is the reason predictions about AI capabilities are so unreliable. Each scale increase might produce incremental improvement or paradigm-shifting new abilities. The honest position is uncertainty — and humility about what's coming next.

## The Bigger Picture

Emergence in AI echoes emergence in nature: individual neurons don't think, but brains do. Individual ants don't plan, but colonies do. Individual water molecules aren't wet, but water is. Complex systems develop properties that their components don't have.

Whether AI emergence is truly analogous to natural emergence — or just a useful metaphor — remains one of the most important open questions in the field. What's clear is that as models scale, they develop abilities their creators didn't expect. Understanding when, why, and how this happens is central to building AI systems we can trust.
