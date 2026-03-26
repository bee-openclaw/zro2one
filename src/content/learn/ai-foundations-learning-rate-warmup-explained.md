---
title: "Learning Rate Warmup: Why Starting Slow Makes Models Learn Faster"
depth: technical
pillar: foundations
topic: ai-foundations
tags: [ai-foundations, training, learning-rate, optimization]
author: bee
date: "2026-03-26"
readTime: 7
description: "Why modern neural networks start training with a tiny learning rate and gradually increase it — the intuition, the math, and practical guidelines for warmup schedules."
related: [ai-foundations-gradient-descent-intuition, ai-foundations-optimization-algorithms, deep-learning-learning-rate-schedules-guide]
---

Every modern training recipe includes learning rate warmup — starting with a very small learning rate and gradually increasing it over the first few hundred or thousand steps. It's one of those techniques that's universally adopted but rarely explained well.

Why does starting slow help? And how do you set the right warmup schedule?

## The Problem: Early Training Is Chaotic

When training begins, the model's weights are randomly initialized. The gradients computed from these random weights are noisy and unreliable — they point in vaguely useful directions, but with enormous variance.

If you apply a large learning rate to these noisy gradients, bad things happen:

**Gradient explosion in early layers.** Large weight updates in early training can push activations into saturating regions of activation functions, causing gradients to explode or vanish in subsequent layers.

**Optimizer state pollution.** Adaptive optimizers like Adam maintain running estimates of gradient mean and variance. If the first few steps have wild gradients (because the weights are random), these estimates start with poor values that take many steps to correct.

**Catastrophic early updates.** A single large, misguided update can push the model into a region of the loss landscape that's hard to recover from. The model might spend thousands of steps undoing the damage from the first hundred.

## The Solution: Warmup

Learning rate warmup addresses all three problems by keeping early updates small:

```
warmup_steps = 1000
for step in range(total_steps):
    if step < warmup_steps:
        lr = max_lr * (step / warmup_steps)  # Linear warmup
    else:
        lr = decay_schedule(step)  # Cosine decay, etc.
```

During warmup, the learning rate increases linearly (or sometimes exponentially) from near-zero to the target learning rate. This gives the model time to:

1. **Establish reasonable weight magnitudes** before taking large steps
2. **Build accurate optimizer statistics** from less noisy gradients  
3. **Find a good region** of the loss landscape before exploring aggressively

## Why Adam Needs Warmup (The Technical Story)

The Adam optimizer divides each gradient by its estimated standard deviation (the square root of the second moment estimate). In the first few steps, this estimate is based on very few samples and is corrected by a bias correction term.

The problem: the bias correction for the second moment (variance estimate) can be significantly off in early steps, especially when gradients are large. This can cause Adam to take steps that are much larger than intended.

RAdam (Rectified Adam) was designed to fix this by analytically computing when the variance estimate becomes reliable and only turning on the adaptive learning rate at that point. In practice, RAdam with no warmup produces similar results to Adam with warmup — which tells us that warmup is largely compensating for Adam's initialization issues.

## Practical Guidelines

### How Many Warmup Steps?

**Common rule of thumb:** 1-5% of total training steps.

For a 100K step training run, 1000-5000 warmup steps is typical. For fine-tuning (which usually runs fewer steps), warmup can be shorter — 100-500 steps is often sufficient.

**What matters more than the exact number:** The warmup should be long enough that the optimizer's moment estimates stabilize, but short enough that you don't waste compute at a suboptimally low learning rate.

### Linear vs. Cosine vs. Exponential Warmup

**Linear warmup** is the default for good reason — it works well across most settings and has one parameter (warmup steps). The learning rate increases at a constant rate from 0 to `max_lr`.

**Exponential warmup** ramps up slowly at first, then accelerates. This can be gentler on very sensitive models but rarely makes a meaningful difference over linear.

**Cosine warmup** follows a cosine curve, starting slow, accelerating in the middle, and slowing as it approaches `max_lr`. Some practitioners prefer this for smoother transitions, but the empirical difference from linear is minimal.

**Recommendation:** Use linear warmup unless you have specific evidence that another schedule helps your task.

### Warmup and Batch Size

Larger batch sizes produce less noisy gradient estimates. You might expect this to reduce the need for warmup — and partially, it does. But large batches also typically use larger learning rates (following the linear scaling rule), which reintroduces the need for warmup.

The LARS and LAMB papers demonstrated that layer-wise adaptive learning rates can reduce warmup dependence for very large batch training. But for standard training setups, warmup remains essential regardless of batch size.

### Warmup for Fine-Tuning

When fine-tuning a pretrained model, warmup serves a slightly different purpose. The model weights aren't random — they're in a good region of the loss landscape. Warmup prevents the fine-tuning process from immediately destabilizing these learned representations.

For fine-tuning, warmup is typically shorter (50-200 steps) and the maximum learning rate is lower (1e-5 to 5e-5 for full fine-tuning, 1e-4 to 3e-4 for LoRA).

## The Complete Learning Rate Schedule

Warmup is usually just the first phase of a multi-phase schedule. The most common full schedule in 2026:

1. **Linear warmup** (0 → max_lr over warmup_steps)
2. **Cosine decay** (max_lr → min_lr over remaining steps)

```python
import math

def get_lr(step, warmup_steps, total_steps, max_lr, min_lr=0):
    if step < warmup_steps:
        return max_lr * step / warmup_steps
    
    progress = (step - warmup_steps) / (total_steps - warmup_steps)
    return min_lr + 0.5 * (max_lr - min_lr) * (1 + math.cos(math.pi * progress))
```

This "warmup + cosine decay" schedule is used in nearly every major language model training run (GPT, Llama, Gemini) and works well across tasks and scales.

## When Warmup Isn't Needed

A few situations where warmup provides little benefit:

- **Very small learning rates.** If your maximum learning rate is already conservative (< 1e-5), warmup doesn't help because you're never taking large steps.
- **SGD with momentum.** SGD doesn't have Adam's moment estimation issues, so the primary warmup benefit is absent. Some SGD training still uses warmup for the gradient stabilization benefit, but the effect is smaller.
- **Continued pretraining.** When resuming training from a checkpoint, the optimizer state is already initialized. Warmup from zero would actually hurt by temporarily reducing the learning rate below the checkpoint's rate.

## The Bigger Picture

Learning rate warmup is a pragmatic fix for a real problem: the mismatch between random initialization and aggressive optimization. It's not theoretically elegant — it's a hack that works. And in deep learning, hacks that work consistently across scales and architectures earn their place in the standard toolkit.

The fact that nearly every state-of-the-art model in 2026 uses some form of warmup — despite hundreds of papers proposing "warmup-free" alternatives — tells you everything about its practical value.
