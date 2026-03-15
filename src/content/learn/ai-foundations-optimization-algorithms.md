---
title: "Optimization Algorithms: SGD, Adam, and Modern Variants"
depth: technical
pillar: foundations
topic: ai-foundations
tags: [ai-foundations, optimization, sgd, adam, training]
author: "bee"
date: "2026-03-14"
readTime: 12
description: "A deep dive into the optimization algorithms that power neural network training—from vanilla SGD through Adam to modern variants like AdaFactor, LION, and schedule-free optimizers."
related: [ai-foundations-loss-functions-explained, ai-foundations-neural-networks, deep-learning-backpropagation]
---

## The Role of Optimization in Deep Learning

Training a neural network means finding parameters that minimize a loss function. The loss landscape is high-dimensional, non-convex, and riddled with saddle points, plateaus, and sharp minima. Optimization algorithms navigate this landscape, and the choice of optimizer profoundly affects training speed, stability, and final model quality.

This isn't just academic. The difference between SGD and Adam can mean the difference between a model that converges in hours and one that takes days—or doesn't converge at all.

## Gradient Descent Fundamentals

All optimizers in deep learning are variations on gradient descent: compute the gradient of the loss with respect to each parameter, then update parameters in the direction that reduces the loss.

### Vanilla Gradient Descent

```
θ_{t+1} = θ_t - η · ∇L(θ_t)
```

Where θ are the parameters, η is the learning rate, and ∇L is the gradient of the loss.

**Problem:** Computing the gradient over the entire dataset is expensive. For a dataset with millions of examples, this is impractical.

### Stochastic Gradient Descent (SGD)

Instead of computing gradients over the full dataset, SGD estimates the gradient from a single example (or a mini-batch):

```
θ_{t+1} = θ_t - η · ∇L(θ_t; x_i, y_i)
```

The gradient estimate is noisy, but this noise is actually beneficial—it helps escape sharp minima and find flatter, more generalizable solutions.

### Mini-Batch SGD

In practice, everyone uses mini-batches (32–4096 examples). This balances the noise benefits of SGD with the computational efficiency of vectorized operations on GPUs.

## SGD with Momentum

Plain SGD oscillates in directions with high curvature and moves slowly in directions with low curvature. Momentum fixes this by maintaining a running average of past gradients:

```
v_t = β · v_{t-1} + ∇L(θ_t)
θ_{t+1} = θ_t - η · v_t
```

Where β (typically 0.9) controls how much history to retain.

**Intuition:** Think of a ball rolling down a hill. Momentum lets it build speed in consistent directions and dampen oscillations in inconsistent ones.

### Nesterov Momentum

A subtle but important variant: instead of computing the gradient at the current position, compute it at the "look-ahead" position where momentum would take you:

```
v_t = β · v_{t-1} + ∇L(θ_t - η · β · v_{t-1})
θ_{t+1} = θ_t - η · v_t
```

This gives a corrective signal that reduces overshooting. Nesterov momentum consistently outperforms classical momentum in practice.

## Adaptive Learning Rate Methods

The fundamental insight behind adaptive methods: different parameters need different learning rates. A parameter that rarely gets large gradients (like an embedding for a rare word) should take larger steps when it does get a gradient.

### AdaGrad

Accumulates squared gradients and scales the learning rate inversely:

```
G_t = G_{t-1} + (∇L(θ_t))²
θ_{t+1} = θ_t - η / (√G_t + ε) · ∇L(θ_t)
```

**Problem:** The accumulated squared gradients grow monotonically, so the learning rate eventually shrinks to near zero. Training stalls.

### RMSProp

Fixes AdaGrad's decay problem by using an exponential moving average of squared gradients instead of a sum:

```
E[g²]_t = ρ · E[g²]_{t-1} + (1-ρ) · (∇L(θ_t))²
θ_{t+1} = θ_t - η / (√E[g²]_t + ε) · ∇L(θ_t)
```

This forgets old gradients, keeping the learning rate from collapsing.

### Adam (Adaptive Moment Estimation)

Adam combines momentum (first moment) with RMSProp (second moment), plus bias correction:

```
m_t = β₁ · m_{t-1} + (1-β₁) · ∇L(θ_t)     # First moment
v_t = β₂ · v_{t-1} + (1-β₂) · (∇L(θ_t))²   # Second moment
m̂_t = m_t / (1 - β₁ᵗ)                        # Bias correction
v̂_t = v_t / (1 - β₂ᵗ)                        # Bias correction
θ_{t+1} = θ_t - η · m̂_t / (√v̂_t + ε)
```

Default hyperparameters: β₁=0.9, β₂=0.999, ε=1e-8.

**Why Adam dominates:** It works well out of the box across a wide range of problems. It's less sensitive to learning rate choice than SGD. It converges faster in the early stages of training.

**Why Adam isn't perfect:** Models trained with Adam sometimes generalize worse than those trained with well-tuned SGD with momentum. This "generalization gap" has been extensively studied and is attributed to Adam finding sharper minima.

### AdamW (Adam with Decoupled Weight Decay)

The original Adam implementation applied weight decay incorrectly—it was applied to the gradient before adaptive scaling, which meant heavily-updated parameters got less regularization. AdamW fixes this by decoupling weight decay from the gradient update:

```
θ_{t+1} = (1 - λ) · θ_t - η · m̂_t / (√v̂_t + ε)
```

AdamW is now the default for transformer training. If you're using "Adam" for language models, you should almost certainly be using AdamW.

## Modern Optimizers

### LAMB and LARS (Large Batch Training)

Standard optimizers struggle with very large batch sizes (32K+). LAMB (Layer-wise Adaptive Moments for Batch training) and LARS (Layer-wise Adaptive Rate Scaling) address this by normalizing updates per-layer based on the ratio of parameter norms to gradient norms.

This enables training with batch sizes in the tens of thousands, which is essential for distributed training across many GPUs.

### AdaFactor

Designed specifically for transformer training, AdaFactor reduces memory usage by factorizing the second-moment matrix:

- Instead of storing a full second-moment estimate per parameter, it maintains row and column statistics
- Reduces optimizer memory from O(mn) to O(m+n) for weight matrices
- Includes built-in learning rate scheduling

AdaFactor was used to train T5 and is popular for large model training where memory is the bottleneck.

### LION (EvoLved Sign Momentum)

Discovered through program search by Google Brain, LION uses only the sign of the momentum update:

```
θ_{t+1} = θ_t - η · sign(β₁ · m_{t-1} + (1-β₁) · ∇L(θ_t))
```

This means every parameter update has the same magnitude (η). LION uses less memory than Adam (no second moment), is simpler to implement, and has shown competitive or better performance on vision and language tasks.

### Sophia

A second-order optimizer that approximates the diagonal of the Hessian to scale updates. The key insight: the Hessian tells you about curvature, which helps you take larger steps in flat directions and smaller steps in steep ones. Sophia clips updates based on estimated curvature, preventing the catastrophic large updates that plague second-order methods.

Early results show Sophia converging 2x faster than Adam for LLM pre-training, though adoption is still limited.

### Schedule-Free Optimizers

A 2024 development that eliminates the need for learning rate schedules entirely. Schedule-free Adam maintains two parameter sequences and interpolates between them, automatically providing the benefits of warmup and decay without explicit scheduling.

This simplifies hyperparameter tuning significantly—you only need to set the base learning rate, not the warmup steps, decay schedule, and minimum learning rate.

## Learning Rate Schedules

Even with adaptive optimizers, the learning rate schedule matters enormously:

### Common Schedules

- **Constant**: Simple but rarely optimal
- **Step decay**: Reduce by a factor at fixed intervals
- **Cosine annealing**: Smooth decay following a cosine curve—the most popular for transformer training
- **Linear warmup + cosine decay**: Standard for large model training. Warm up for 1-5% of training, then cosine decay to ~10% of peak
- **Cosine with warm restarts**: Periodic cosine cycles that help escape local minima
- **Inverse square root**: Common for attention models, decays as 1/√t after warmup

### The Warmup Mystery

Large models need learning rate warmup. Without it, early training is unstable and can diverge. The exact reason is debated, but the leading theory is that early gradient estimates are unreliable (the model hasn't "organized" its representations yet), so large updates are destructive.

## Practical Guidance

### Choosing an Optimizer

- **Transformers / LLMs**: AdamW with linear warmup + cosine decay. This is the default for a reason.
- **Computer vision (from scratch)**: SGD with momentum + step decay still wins on many benchmarks
- **Fine-tuning**: AdamW with low learning rate (1e-5 to 5e-5) and linear decay
- **Memory-constrained**: AdaFactor or LION
- **Want simplicity**: Schedule-free Adam (fewer hyperparameters)

### Common Mistakes

1. **Using Adam when you mean AdamW** for transformer training
2. **Skipping warmup** for large models
3. **Learning rate too high** — if loss spikes or diverges, reduce it
4. **Learning rate too low** — if loss decreases very slowly and never plateaus, increase it
5. **Ignoring gradient clipping** — for transformers, clip gradient norms to 1.0
6. **Not tuning the learning rate** — it's the single most important hyperparameter

### Debugging Training

When training goes wrong:

- **Loss spikes**: Reduce learning rate or increase gradient clipping
- **Loss plateaus early**: Learning rate too low, or model too small for the task
- **Loss decreases then increases**: Overfitting—add regularization or reduce training time
- **NaN loss**: Numerical instability—reduce learning rate, check for data issues, ensure proper initialization

The optimizer is the engine of neural network training. Understanding it isn't optional if you want to train models effectively. Start with AdamW, learn why it works, and branch out when you hit its limits.
