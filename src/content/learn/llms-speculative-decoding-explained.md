---
title: "Speculative Decoding: How LLMs Generate Text Faster Without Losing Quality"
depth: technical
pillar: models
topic: llms
tags: [llms, speculative-decoding, inference, performance, optimization]
author: bee
date: "2026-03-15"
readTime: 10
description: "Speculative decoding is one of the most important inference optimizations for LLMs. This guide explains how draft-then-verify works, when it helps, and how to implement it."
related: [llms-inference-optimization-playbook-2026, llms-inference-latency-guide, llms-temperature-and-sampling-explained]
---

LLM inference is slow because it's autoregressive: each token depends on the previous one. You can't parallelize the sequence generation itself. Or can you?

**Speculative decoding** is a technique that gets around this limitation by using a small, fast "draft" model to propose multiple tokens at once, then letting the large "target" model verify them in parallel. When the draft model guesses correctly — which happens surprisingly often — you get multiple tokens for the cost of one forward pass through the large model.

## Why autoregressive generation is slow

Standard LLM inference works like this:

1. Run the full model to produce token 1
2. Append token 1 to the input, run again for token 2
3. Append token 2, run again for token 3
4. Repeat...

Each step requires a full forward pass through the model. For a 70B parameter model, that's expensive. The model is memory-bandwidth-bound during generation — the GPU spends most of its time loading weights, not computing. This means the hardware is severely underutilized.

The key insight: **verification is cheaper than generation.** If someone hands you a proposed continuation, checking whether you agree with it (a single forward pass over multiple tokens) is much cheaper than generating each token one by one.

## How speculative decoding works

The algorithm has three components:

### 1. The draft model

A small, fast model (often 1-7B parameters) that shares vocabulary with the target model. It generates K candidate tokens quickly. The draft model doesn't need to be perfect — it just needs to agree with the target model often enough to provide a speedup.

### 2. The target model verification

The target model processes the entire draft sequence in a single forward pass. Because transformer attention can process all positions in parallel (unlike generation, which is sequential), this single pass produces the probability distributions for all K positions simultaneously.

### 3. The acceptance/rejection step

For each drafted token, compare the draft model's probability with the target model's probability:

- If the target model assigns **equal or higher probability** to the drafted token, accept it
- If the target model assigns **lower probability**, accept it with probability `p_target / p_draft` (rejection sampling)
- On the first rejection, resample from an adjusted distribution and discard remaining draft tokens

This rejection sampling scheme guarantees that the output distribution is **identical** to what the target model would produce alone. It's not an approximation — it's mathematically exact.

## The math behind acceptance

The acceptance probability for a drafted token `x` is:

```
accept_prob = min(1, p_target(x) / p_draft(x))
```

When the draft model is confident about a token that the target model also likes, acceptance is guaranteed. When the draft model proposes something the target model disagrees with, the token is rejected proportionally.

The adjusted distribution for resampling on rejection is:

```
p_adjusted(x) = max(0, p_target(x) - p_draft(x)) / Z
```

where Z is a normalizing constant. This ensures the overall token distribution exactly matches the target model.

## Expected speedup

The speedup depends on two factors:

**Draft model speed relative to target.** If the draft model is 10x faster, you have more room for gains. Typical ratios are 5-20x.

**Acceptance rate.** This is the average fraction of drafted tokens accepted. For well-matched model pairs on typical text, acceptance rates of 70-85% are common. Highly predictable text (code, structured output) can hit 90%+.

With K=5 draft tokens and an 80% acceptance rate, you get roughly 3-4 accepted tokens per verification step. If the draft model adds negligible overhead, that's a 3-4x speedup.

**Real-world results:** Production deployments typically see 2-3x speedup on general text and 3-5x on structured/code generation.

## Choosing a draft model

The draft model should:

- **Share the same tokenizer** as the target model (essential)
- **Be much smaller** — typically 10-20x fewer parameters
- **Have similar training distribution** — fine-tuned on similar data helps acceptance rates
- **Be fast to run** — the whole point is speed

Common pairings:
- Llama 70B + Llama 7B
- GPT-4 class + GPT-3.5 class (internal to providers)
- Any large model + a distilled version of itself

### Self-speculative decoding

Some approaches skip the separate draft model entirely. **Self-speculative decoding** uses layer-skipping or early exit within the target model itself to produce draft tokens. This eliminates the need to load a second model into memory.

Medusa and EAGLE are architectures that add lightweight "heads" to the target model. These heads predict future tokens in parallel from the model's hidden states, acting as an integrated draft mechanism.

## When speculative decoding helps most

**Best cases:**
- Long-form generation (articles, code, summaries)
- Structured output (JSON, XML, formatted text)
- Greedy or low-temperature sampling (higher acceptance rates)
- Batch size = 1 (memory-bandwidth-bound regime)

**Worst cases:**
- High-temperature creative generation (low acceptance rates)
- Very short outputs (overhead dominates)
- Large batch sizes (already compute-bound, not memory-bound)
- Draft and target models are poorly matched

## Implementation considerations

### KV cache management

Both draft and target models maintain KV caches. On rejection, you need to roll back the draft model's cache to the rejection point. Efficient implementations pre-allocate cache space for K draft tokens and trim on rejection.

### Batch speculation

When serving multiple requests, you can speculate independently for each sequence. Rejected tokens in one sequence don't affect others. But varying acceptance rates across sequences can cause load imbalance.

### Dynamic K

Instead of a fixed number of draft tokens, adaptive approaches adjust K based on recent acceptance rates. High acceptance? Draft more tokens. Low acceptance? Draft fewer to reduce wasted computation.

## Speculative decoding in production

Major providers use speculative decoding (or variants) in production:

- **vLLM** supports speculative decoding with configurable draft models
- **TensorRT-LLM** has built-in support with Medusa heads
- **Cloud providers** use it internally — it's one reason API latency has improved without model changes

If you're self-hosting, enabling speculative decoding is often the single biggest latency win after quantization. It requires extra memory for the draft model but no quality trade-off.

## The broader principle

Speculative decoding illustrates a powerful pattern in systems design: **speculate and verify is faster than compute from scratch** when verification is cheaper than generation. This same principle appears in branch prediction (CPUs), optimistic concurrency (databases), and speculative execution (distributed systems).

For LLMs, it turns the fundamental bottleneck of autoregressive generation from a hard wall into a soft one. The model still generates tokens one at a time logically, but physically, it processes them in parallel chunks.

## What's next

Active research directions include:

- **Tree-based speculation** — branching draft sequences to handle uncertainty
- **Learned draft policies** — training the draft model specifically for high acceptance rates
- **Hardware-aware scheduling** — co-designing speculation with GPU memory hierarchies
- **Multi-model cascades** — using multiple draft models of increasing size

Speculative decoding is already standard practice for production LLM serving. If you're deploying models and not using it, you're leaving 2-3x performance on the table.
