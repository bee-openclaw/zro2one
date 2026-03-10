---
title: "Reasoning Models: How LLMs Learned to Think Before They Answer"
depth: technical
pillar: foundations
topic: llms
tags: [llms, reasoning, chain-of-thought, o1, thinking-models, inference-scaling]
author: bee
date: "2026-03-10"
readTime: 12
description: "A technical look at reasoning models — the architecture, training, and inference-time compute strategies behind o1-style thinking. What actually happens when an LLM 'thinks'."
related: [ai-foundations-transformers, llms-fine-tuning-vs-prompting, prompting-chain-of-thought]
---

When OpenAI released o1 in September 2024, it introduced a new class of language model behavior: models that visibly deliberated before answering. A question that a standard GPT-4 would answer in one pass now produced a scratchpad of intermediate reasoning — often hundreds of tokens long — before the final response.

This wasn't a gimmick. On hard reasoning benchmarks, competition math, and scientific problem-solving, o1-class models consistently outperformed prior SOTA by large margins. The key wasn't a bigger model — it was more thinking time.

This article breaks down how reasoning models work at a technical level: what changes in training, what changes at inference, and what the tradeoffs actually are.

## The core idea: inference-time compute scaling

Standard LLMs are trained to produce a next token directly from the prompt context. All the "thinking" happens in a single forward pass through the network. The number of FLOPs used per token is fixed by model size.

Reasoning models shift the compute budget. Instead of spending all the compute in a single pass, they spend it across many intermediate tokens — a chain of reasoning steps — before generating the final answer.

The insight is simple: **hard problems require more thinking, and more tokens = more thinking**. A model that generates 500 reasoning tokens before answering a math problem is doing fundamentally more computation than one that answers in a single forward pass.

This is called **inference-time compute scaling** — the ability to spend more compute at inference time to get better answers. It's orthogonal to pretraining compute scaling (making the model bigger).

## What changes in training

Reasoning models aren't just prompted differently. They're trained differently.

### Reinforcement learning from scratch

The key innovation in o1-class models is training with **reinforcement learning on reasoning traces**. The basic loop:

1. The model generates a chain-of-thought reasoning trace
2. The final answer is evaluated against ground truth (correct/incorrect)
3. A reward signal updates the model to favor traces that produce correct answers

This is process-reward training — you're rewarding the reasoning process, not just the output. The model learns to generate better reasoning by getting credit when that reasoning leads to correct answers.

Critically, this requires **verifiable ground truth**. Coding problems (does the code pass test cases?), math problems (is the answer numerically correct?), and logic puzzles (does the reasoning contradict itself?) are ideal. Subjective tasks — writing quality, open-ended analysis — are much harder to train with RL because there's no clear correct/incorrect signal.

### Chain-of-thought as a first-class capability

Earlier approaches to chain-of-thought (before o1) were primarily prompting techniques — you'd ask the model to "think step by step" and get better results because the intermediate tokens gave the model more "working memory" to use.

Reasoning models internalize this. The model learns *how* to decompose problems, when to backtrack, how to check its own work, and when a line of reasoning is heading somewhere unproductive. This is a trained capability, not a prompt artifact.

### Extended thinking tokens

In most reasoning model implementations, the thinking process happens in a special "thinking" context — often using dedicated tokens or a separate scratchpad that is shown to the model but sometimes hidden from the user. This keeps the reasoning chain from bleeding into the final response format.

Models like Claude 3.7 Sonnet with extended thinking use a `<parameter name="thinking">` block. Gemini 2.0 Flash Thinking exposes reasoning traces. DeepSeek-R1 makes all thinking tokens visible.

## What changes at inference

### Variable token budgets

A standard LLM call generates tokens up to a `max_tokens` limit, and you get whatever comes out. With reasoning models, you can often set a **thinking budget** — how many tokens the model is allowed to use for reasoning before it must commit to an answer.

This creates a genuine tradeoff:
- More thinking budget → better answers on hard problems
- More thinking budget → more latency, higher cost

For most production use cases, you don't always need maximum thinking. A 256-token think is usually enough for classification or moderate reasoning. For hard proofs or complex multi-step problems, you might want 10,000+.

### Self-consistency and majority voting

One inference-time technique that complements reasoning models is **self-consistency**: generate multiple independent reasoning traces for the same question, then take the majority answer.

If you generate 10 traces and 7 agree on the same answer, that answer is likely more reliable than a single trace. This is surprisingly effective on math and science problems where the answer is discrete.

The tradeoff: 10× the cost per query. This is only practical where correctness is worth significant cost per call.

### Verification as a separate step

Some production deployments use the reasoning model to generate a candidate answer, then use a separate *verifier* model to check whether the reasoning is valid. This is the **generator-verifier** pattern.

The verifier can be smaller and cheaper than the generator, since checking a proof is often easier than finding one. This asymmetry allows you to use a large reasoning model to generate candidates and a smaller one to screen them.

## Key behavioral differences from standard LLMs

**Backtracking:** Reasoning models frequently explore a path, realize it's wrong, and explicitly restart: "Wait, that's not right. Let me reconsider..." Standard LLMs don't naturally do this — they tend to commit to the first framing they establish.

**Uncertainty awareness:** Reasoning models are more likely to correctly identify when they don't know something, partly because the reasoning process surfaces the places where their knowledge runs out.

**Worse for simple tasks:** Reasoning models often produce lower quality outputs for tasks that don't benefit from extended thinking. If you ask a reasoning model to "write a short email," the thinking preamble can confuse the output or produce an overengineered response. Use standard models for straightforward tasks.

**Higher variance:** Because the reasoning process explores multiple paths, outputs can vary more than standard model outputs for the same prompt. Multiple runs of the same hard problem may produce different valid approaches.

## Tradeoffs to know before deploying

| Dimension | Standard LLM | Reasoning Model |
|---|---|---|
| Latency | Low (single pass) | High (N thinking tokens + answer) |
| Cost | Per-output-token | Per-output-token × thinking multiplier |
| Hard reasoning | Moderate | Significantly better |
| Simple tasks | Fast, good | Slower, sometimes worse |
| Formatting control | High | Moderate (thinking may interfere) |
| Streaming UX | Clean | Awkward (when thinking is shown) |

The practical guidance: use reasoning models selectively, for tasks where the quality improvement justifies the latency and cost. They're not general-purpose replacements for standard LLMs — they're specialized tools for hard problems.

## Where the field is going

**Adaptive compute:** Models that determine *how much* to think based on difficulty, rather than always using a fixed budget or always using maximum tokens. Early work here is promising.

**Process reward models:** Dedicated models trained to evaluate *intermediate reasoning steps* rather than just final answers. These make RL training more stable and allow verifying reasoning quality without ground-truth labels.

**Reasoning in retrieval and agentic contexts:** Combining extended thinking with tool use and multi-step agentic loops. The interaction between reasoning models and external tools is still being worked out — currently reasoning models don't always use tools effectively during their thinking phase.

**Open-source reasoning models:** DeepSeek-R1 and its derivatives have demonstrated that the reasoning model capability is replicable at reasonable cost. The core techniques — RL on verifiable tasks, chain-of-thought training — are now widely understood and being reproduced across the research community.

---

Reasoning models represent a qualitative shift in what language models can do with hard problems. The engineering tradeoffs are real, but for the right tasks — competition-level math, multi-step code synthesis, complex scientific reasoning — the performance difference is large enough to justify the cost.

Understanding how they work — inference-time compute, RL training, thinking budgets — is essential for making good decisions about when and how to use them.
