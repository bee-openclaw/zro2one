---
title: "Gradient Accumulation: Training Large Models on Small GPUs"
depth: technical
pillar: foundations
topic: deep-learning
tags: [deep-learning, gradient-accumulation, training, optimization, gpu]
author: bee
date: "2026-04-02"
readTime: 8
description: "When your batch doesn't fit in GPU memory, gradient accumulation lets you simulate larger batches by accumulating gradients over multiple forward passes. Here's how and when to use it."
related: [deep-learning-normalization-layers-guide, deep-learning-transformers-architecture, ai-foundations-positional-encoding-explained]
---

Training deep learning models effectively requires large batch sizes. Large batches provide more stable gradient estimates, better GPU utilization, and often faster convergence. But large batches also require large amounts of GPU memory — and memory is usually the binding constraint.

Gradient accumulation is the standard solution: run multiple smaller forward-backward passes, accumulate the gradients, and then perform a single weight update. The mathematical result is identical to training with the larger batch size, but the memory usage is determined by the smaller per-step batch size.

## How It Works

In standard training, each step involves:

1. Forward pass with a batch of N samples.
2. Compute loss.
3. Backward pass to compute gradients.
4. Update weights using the gradients.

With gradient accumulation over K steps:

1. Forward pass with a mini-batch of N/K samples.
2. Compute loss (scaled by 1/K).
3. Backward pass to compute gradients.
4. **Accumulate** gradients (add to running total, do not update weights).
5. Repeat steps 1-4 K times.
6. Update weights using the accumulated gradients.

The accumulated gradients are mathematically equivalent to computing gradients on a batch of N samples. The model sees the same total number of samples per weight update; they are just processed in smaller chunks.

## Implementation

In PyTorch, gradient accumulation requires minimal code changes:

```python
accumulation_steps = 4
optimizer.zero_grad()

for i, (inputs, targets) in enumerate(dataloader):
    outputs = model(inputs)
    loss = criterion(outputs, targets) / accumulation_steps
    loss.backward()
    
    if (i + 1) % accumulation_steps == 0:
        optimizer.step()
        optimizer.zero_grad()
```

The key details:

- **Divide the loss by K.** Since `.backward()` accumulates gradients by default in PyTorch (gradients are summed across calls), dividing the loss by K ensures the accumulated gradients have the correct magnitude — equivalent to the mean gradient over the full effective batch.
- **Call `optimizer.step()` only every K steps.** The weight update uses the full accumulated gradient.
- **Call `optimizer.zero_grad()` after the update.** Reset the accumulated gradients for the next cycle.

## When to Use It

**You should use gradient accumulation when:**

- Your desired batch size does not fit in GPU memory. This is the primary use case. If you want to train with a batch size of 32 but can only fit 8 samples per GPU, accumulate over 4 steps.
- You are fine-tuning large models (LLMs, large vision models) where even a batch size of 1 barely fits in memory. Gradient accumulation lets you simulate larger batches without requiring more hardware.
- You are training on a single GPU and need stable training that would normally require multi-GPU data parallelism.

**You should not use gradient accumulation when:**

- Your batch already fits in memory. Running more forward passes is slower than a single larger batch due to the overhead of multiple kernel launches and reduced GPU parallelism.
- You are using batch normalization with small per-step batch sizes. Batch normalization statistics are computed per forward pass, not per accumulated batch. With very small per-step batches (e.g., 1-2 samples), the batch statistics are noisy and can hurt training. Use group normalization or layer normalization instead.

## Interaction with Learning Rate

When using gradient accumulation to simulate larger batches, the learning rate should match the effective batch size, not the per-step batch size. If you normally use a learning rate of 0.001 with a batch size of 32, and you switch to gradient accumulation with 4 steps of 8, keep the learning rate at 0.001.

The linear scaling rule (from the large-batch training literature) suggests that learning rate should scale linearly with batch size. If gradient accumulation changes your effective batch size, adjust the learning rate accordingly. However, this rule is an approximation — it works well for moderate batch sizes but can require warmup and careful tuning for very large effective batches.

## Interaction with Distributed Training

Gradient accumulation composes naturally with data-parallel distributed training. With D GPUs and K accumulation steps per GPU:

```
effective_batch_size = per_gpu_batch × K × D
```

In frameworks like PyTorch DDP, gradient synchronization across GPUs happens at each backward pass by default. For efficiency, you should skip synchronization during accumulation steps and only synchronize on the final step before the weight update. This avoids K-1 unnecessary all-reduce operations per update cycle:

```python
for i, (inputs, targets) in enumerate(dataloader):
    context = model.no_sync() if (i + 1) % K != 0 else nullcontext()
    with context:
        loss = criterion(model(inputs), targets) / K
        loss.backward()
    
    if (i + 1) % K == 0:
        optimizer.step()
        optimizer.zero_grad()
```

## Common Pitfalls

**Forgetting to scale the loss.** If you do not divide the loss by K, the accumulated gradients will be K times too large. This effectively multiplies your learning rate by K, which can cause training instability or divergence.

**Incorrect handling of the last batch.** If the dataset size is not evenly divisible by (per_step_batch × K), the last accumulation cycle may have fewer steps. Either drop the incomplete cycle, or adjust the loss scaling for the final, partial accumulation.

**Mixed precision interaction.** When using mixed precision training (FP16/BF16) with gradient accumulation, ensure that gradient scaling (used to prevent underflow in FP16) is applied correctly. The gradient scaler should only call `step()` and `update()` at the weight update step, not at each accumulation step.

Gradient accumulation is not a complex technique, but the details matter. Get the loss scaling, synchronization, and learning rate right, and it behaves exactly like training with a larger batch. Get any of them wrong, and training will silently produce worse results.
