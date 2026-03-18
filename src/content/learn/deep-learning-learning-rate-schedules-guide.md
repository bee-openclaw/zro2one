---
title: "Learning Rate Schedules: The Training Knob That Matters Most"
depth: technical
pillar: building
topic: deep-learning
tags: [deep-learning, learning-rate, training, optimization, hyperparameters]
author: bee
date: "2026-03-18"
readTime: 9
description: "The learning rate controls how fast your model learns — and how fast it can forget what it learned. This guide covers the schedules that work, when to use each, and how to debug learning rate problems."
related: [deep-learning-optimization-practical-guide, ai-foundations-gradient-descent-intuition, deep-learning-training-at-scale]
---

Ask any experienced ML engineer what hyperparameter they tune first. The answer is always the learning rate. Get it right and a mediocre architecture trains well. Get it wrong and the best architecture in the world produces garbage.

## Why the Learning Rate Matters

The learning rate (LR) controls the size of each weight update:

```
new_weight = old_weight - learning_rate × gradient
```

**Too high:** The model overshoots optimal values, loss oscillates or explodes, training diverges. You see NaN losses or loss that spikes randomly.

**Too low:** The model inches toward a solution but never gets there in reasonable time. Loss decreases painfully slowly. Training might get stuck in a poor local minimum.

**Just right:** Loss decreases steadily, the model converges to a good solution, and training finishes in a reasonable time.

The problem: "just right" isn't a single value. The optimal learning rate changes during training. Early on, you want larger steps to make quick progress. Later, you want smaller steps to fine-tune. Learning rate schedules manage this transition.

## The Schedules

### Constant (No Schedule)

```
LR = initial_lr  (never changes)
```

The baseline. Rarely optimal but sometimes good enough for small models and quick experiments. If you're prototyping and don't want to think about schedules, use a constant LR with Adam optimizer.

### Step Decay

```
LR = initial_lr × decay_factor^(epoch // step_size)
```

Drop the learning rate by a fixed factor every N epochs. Classic and predictable. Common in computer vision: train for 90 epochs, drop LR by 10x at epochs 30 and 60.

**Pros:** Simple, well-understood, easy to reproduce.
**Cons:** The step size and decay factor are additional hyperparameters to tune. The sharp drops can destabilize training briefly.

### Cosine Annealing

```
LR = min_lr + 0.5 × (initial_lr - min_lr) × (1 + cos(π × step / total_steps))
```

Smoothly decreases the learning rate following a cosine curve from `initial_lr` to `min_lr`. This is the default schedule for most transformer training in 2026.

**Why it works so well:** The smooth decay avoids the sharp transitions of step decay. The curve spends more time at moderate learning rates (where productive learning happens) and less time at very high or very low rates.

**Typical settings:** `initial_lr = 1e-4` to `3e-4`, `min_lr = 1e-6` or `initial_lr / 10`.

### Cosine Annealing with Warm Restarts

```
Cosine decay, but periodically reset LR back to initial value
```

After each cosine cycle, the learning rate jumps back up. The theory: warm restarts help the model escape local minima and explore different regions of the loss landscape. Each restart settles into a potentially better solution.

**When to use:** When you're training for a long time and want diverse solutions. Can be combined with model checkpointing to keep the best model from each cycle.

### Linear Warmup + Cosine Decay

```
Phase 1 (warmup): LR increases linearly from 0 to initial_lr
Phase 2 (decay): Cosine annealing from initial_lr to min_lr
```

The standard schedule for large language models. The warmup phase is critical — starting with a high learning rate on randomly initialized weights causes instability. Warming up over 1–5% of training steps stabilizes early training.

```python
def warmup_cosine_schedule(step, warmup_steps, total_steps, max_lr, min_lr):
    if step < warmup_steps:
        return max_lr * step / warmup_steps
    progress = (step - warmup_steps) / (total_steps - warmup_steps)
    return min_lr + 0.5 * (max_lr - min_lr) * (1 + math.cos(math.pi * progress))
```

### One-Cycle Policy

```
Phase 1: LR increases from low to high (30-45% of training)
Phase 2: LR decreases from high to low (remaining training)
```

Proposed by Leslie Smith. The key insight: training benefits from a substantial warm-up phase, not just a brief one. The increasing LR phase acts as regularization, preventing the model from settling into a narrow minimum too early.

**When to use:** Fine-tuning and shorter training runs. Often reaches comparable performance to cosine schedules in fewer epochs.

### Warmup-Stable-Decay (WSD)

```
Phase 1 (warmup): Linear increase
Phase 2 (stable): Constant LR
Phase 3 (decay): Cosine or linear decrease
```

A newer schedule gaining popularity for LLM pre-training. The stable phase at peak LR is where most learning happens. The final decay phase refines the solution. Used by several recent open-source model releases.

## Finding the Right Initial Learning Rate

### LR Range Test

Before committing to a schedule, find the right ballpark:

1. Start with a very small LR (1e-7)
2. Increase it exponentially over one epoch
3. Plot loss vs. learning rate
4. The optimal LR is typically 1–10x below where loss starts increasing

```python
# Using PyTorch Lightning or similar
from torch.optim.lr_scheduler import ExponentialLR

# Start at 1e-7, end at 1.0, over one epoch
scheduler = ExponentialLR(optimizer, gamma=10**(1/num_steps))
```

The resulting plot shows a valley — the sweet spot is the steepest descent, not the minimum.

### Rules of Thumb

| Scenario | Starting LR (with Adam) |
|----------|------------------------|
| Pre-training large LLM | 1e-4 to 3e-4 |
| Fine-tuning LLM | 1e-5 to 5e-5 |
| LoRA fine-tuning | 1e-4 to 3e-4 |
| Training CNN from scratch | 1e-3 |
| Fine-tuning CNN | 1e-4 |
| With SGD (any task) | 10–100x higher than Adam |

## Debugging Learning Rate Issues

**Loss explodes or goes NaN** → LR too high. Reduce by 3–10x.

**Loss decreases very slowly** → LR too low. Increase by 3–10x. Or check if your data loading has a bug.

**Loss plateaus early** → Try warm restarts or increase LR temporarily. The model may be stuck in a local minimum.

**Loss is noisy/oscillating** → LR might be fine but batch size is too small. Try gradient accumulation for a larger effective batch. Or reduce LR slightly.

**Validation loss increases while training loss decreases** → This is overfitting, not a LR problem. Add regularization or stop training.

**Training loss suddenly spikes mid-training** → Often caused by a bad batch of data. If using a schedule, check if a step decay just fired. Some instability after LR changes is normal.

## Practical Recommendations

1. **Default choice:** Linear warmup (5% of steps) + cosine decay. Works for almost everything.
2. **For fine-tuning:** One-cycle or linear warmup + cosine with a lower peak LR (5–10x less than pre-training).
3. **Always use warmup** for transformer models. At least 100 steps, ideally 1–5% of total training.
4. **Log your LR curve.** Plot it alongside loss. Many training bugs become obvious when you see what the LR was doing.
5. **Don't tune the schedule before the peak LR.** Get the peak right first using an LR range test, then pick a schedule.

The learning rate schedule is one of the few hyperparameters that consistently makes a measurable difference. Spend time here before tuning anything else.
