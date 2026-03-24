---
title: "Weight Decay: The Regularization Trick Behind Modern Deep Learning"
depth: technical
pillar: foundations
topic: ai-foundations
tags: [ai-foundations, regularization, weight-decay, optimization, training]
author: bee
date: "2026-03-24"
readTime: 9
description: "Weight decay and L2 regularization are not the same thing when you're using Adam. Here's what weight decay actually does and how to tune it."
related: [ai-foundations-regularization-explained, ai-foundations-optimization-algorithms, ai-foundations-gradient-descent-intuition]
---

Weight decay is one of those techniques that every deep learning practitioner uses but few think carefully about. It's often conflated with L2 regularization, and in the context of SGD, that conflation is harmless. But with Adam and other adaptive optimizers -- which is what most people actually use -- the distinction matters significantly.

## L2 regularization: the textbook version

L2 regularization adds a penalty term to the loss function proportional to the squared magnitude of the weights:

L_regularized = L_original + (lambda / 2) * sum(w_i^2)

The gradient of this regularized loss with respect to any weight w becomes:

dL/dw = dL_original/dw + lambda * w

During a gradient descent update, this means:

w_new = w - lr * (dL_original/dw + lambda * w)
w_new = w * (1 - lr * lambda) - lr * dL_original/dw

The weight gets multiplied by (1 - lr * lambda) at each step, shrinking it toward zero. This is why it's called "weight decay" -- the weights decay by a fraction at each update.

## Why L2 regularization and weight decay diverge with Adam

With vanilla SGD, L2 regularization and weight decay are mathematically equivalent. You get the same result whether you add the penalty to the loss or directly shrink the weights. This equivalence breaks with adaptive optimizers like Adam.

Adam maintains per-parameter learning rates based on the history of gradients. When you add L2 regularization to the loss, the regularization gradient (lambda * w) gets fed through Adam's adaptive scaling. This means:

- Parameters with large historical gradients get less regularization (because Adam's denominator is large)
- Parameters with small historical gradients get more regularization (because Adam's denominator is small)

This is not what you want. The regularization strength becomes entangled with the optimization dynamics. A parameter that happens to have noisy gradients (large second moment) gets less regularized, regardless of whether it needs regularization.

## Decoupled weight decay: AdamW

Loshchilov and Hutter (2019) proposed a simple fix: apply weight decay directly to the weights, outside of Adam's adaptive gradient scaling. This is "decoupled weight decay," implemented as AdamW.

The update rule becomes:

1. Compute Adam's adaptive gradient step as normal: step = lr * m_hat / (sqrt(v_hat) + epsilon)
2. Apply weight decay separately: w_new = w * (1 - lr * wd) - step

The critical difference: the weight decay term (1 - lr * wd) is applied uniformly to all parameters, independent of Adam's per-parameter learning rate adaptation. Every weight decays by the same fraction, regardless of its gradient history.

```python
# PyTorch: Using AdamW (decoupled weight decay)
import torch

model = MyModel()

# AdamW applies decoupled weight decay -- this is what you want
optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=1e-3,
    weight_decay=0.01  # This is the decay rate, not the L2 lambda
)

# Compare with Adam + L2 (NOT equivalent to AdamW)
# optimizer = torch.optim.Adam(
#     model.parameters(),
#     lr=1e-3,
#     weight_decay=0.01  # This is L2 regularization, coupled with Adam
# )
```

## How weight decay prevents overfitting

Weight decay works by keeping weights small. But why does that help?

**Smaller weights mean smoother functions.** A neural network with large weights can represent sharp, complex decision boundaries that fit training noise. Smaller weights produce smoother functions that generalize better. This is the Occam's razor principle applied to parameter space.

**It reduces co-adaptation.** When weights are large, individual neurons can develop strong, brittle dependencies on specific input patterns. Weight decay encourages distributed representations where information is spread across neurons rather than concentrated in a few high-weight connections.

**It creates implicit regularization pressure.** For a weight to stay large, it must provide enough gradient signal to counteract the decay. Weights that contribute meaningfully to reducing the loss survive; weights that don't are gradually pushed toward zero.

## Choosing the decay rate

The weight decay rate (commonly called `wd` or `weight_decay`) controls how aggressively weights are shrunk. Common values:

| Context | Typical weight decay | Notes |
|---|---|---|
| Transformer pretraining | 0.01 - 0.1 | GPT-style models often use 0.1 |
| Fine-tuning LLMs | 0.001 - 0.01 | Lower to preserve pretrained knowledge |
| CNNs (image tasks) | 1e-4 - 1e-3 | Classic computer vision range |
| Small models / small data | 1e-3 - 0.01 | More regularization needed |
| Large models / large data | 0.01 - 0.1 | Large models can tolerate more decay |

A useful heuristic: if your model is overfitting, increase weight decay. If your model is underfitting or training loss is stuck, decrease it. Weight decay that's too high starves the model of capacity.

## Interaction with learning rate schedules

Weight decay and learning rate interact more than most people realize. The effective weight decay per step is proportional to `lr * wd`. When you use a learning rate warmup and cosine decay schedule (standard for transformer training), the effective regularization changes throughout training:

- During warmup: low effective decay (lr is small)
- At peak lr: maximum effective decay
- During cooldown: decreasing effective decay

This is actually desirable behavior. Early in training, you want the model to explore freely (less regularization). During the main training phase, you want full regularization. During cooldown, you're fine-tuning and want less aggressive shrinkage.

Some practitioners use a fixed weight decay schedule independent of learning rate. This can work but requires more careful tuning, and the interaction between lr schedule and weight decay schedule adds complexity.

## What not to decay

Not all parameters should be weight-decayed. Standard practice:

**Decay:** Linear layer weights, convolutional filter weights, embedding weights (sometimes).

**Don't decay:** Bias terms, layer normalization parameters, batch normalization parameters.

The reasoning: bias terms and normalization parameters have different roles than weights. Decaying biases toward zero can hurt performance because biases need to be free to capture data offsets. Normalization parameters control scale and shift, and decaying them interferes with normalization behavior.

```python
# PyTorch: Separate parameter groups for weight decay
def get_parameter_groups(model, wd=0.01):
    decay_params = []
    no_decay_params = []

    for name, param in model.named_parameters():
        if not param.requires_grad:
            continue
        if "bias" in name or "norm" in name or "layernorm" in name:
            no_decay_params.append(param)
        else:
            decay_params.append(param)

    return [
        {"params": decay_params, "weight_decay": wd},
        {"params": no_decay_params, "weight_decay": 0.0},
    ]

optimizer = torch.optim.AdamW(get_parameter_groups(model, wd=0.01), lr=1e-3)
```

## Practical tuning tips

1. **Always use AdamW, not Adam with weight_decay.** If you're using an adaptive optimizer, decoupled weight decay is strictly better. PyTorch's `Adam` with `weight_decay > 0` applies L2 regularization, not true weight decay.

2. **Start with 0.01 for transformers.** This is the community default for a reason. Adjust from there based on overfitting/underfitting behavior.

3. **Scale weight decay with batch size.** If you increase batch size, you may need to increase weight decay proportionally to maintain the same regularization effect per epoch.

4. **Monitor weight norms during training.** If weights are growing unboundedly, your decay is too low. If they collapse to near-zero early in training, your decay is too high. Healthy training shows weight norms stabilizing after an initial growth phase.

5. **Don't tune weight decay and learning rate independently.** They interact. If you change one, re-evaluate the other. Grid searching over both is more reliable than tuning them sequentially.

Weight decay is simple in concept but subtle in practice. The key insight to carry forward: with adaptive optimizers, weight decay and L2 regularization are different things, and AdamW's decoupled approach is what you should use by default.
