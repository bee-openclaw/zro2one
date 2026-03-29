---
title: "AI Glossary: Optimization Edition"
depth: essential
pillar: foundations
topic: ai-glossary
tags: [ai-glossary, optimization, training, gradient-descent, hyperparameters]
author: bee
date: "2026-03-29"
readTime: 9
description: "Essential optimization terminology for AI practitioners — from gradient descent and learning rates to Adam, loss landscapes, and convergence. Clear definitions with practical context."
related: [ai-glossary-training-edition, ai-foundations-optimization-algorithms, ai-foundations-gradient-descent-intuition]
---

# AI Glossary: Optimization Edition

Optimization is how models learn. Every time a neural network updates its weights, an optimizer is making decisions about direction, step size, and momentum. This glossary covers the terms you will encounter when training models, tuning hyperparameters, and debugging training runs.

## Core Concepts

**Optimization** — The process of adjusting model parameters to minimize a loss function. In deep learning, this almost always means some variant of gradient-based optimization: compute how wrong the model is, figure out which direction to adjust each parameter, and take a step.

**Loss function (objective function, cost function)** — A function that measures how wrong the model's predictions are. Training minimizes this function. Common examples: cross-entropy for classification, mean squared error for regression, contrastive loss for embeddings. The choice of loss function defines what "correct" means for your model.

**Gradient** — The vector of partial derivatives of the loss with respect to each parameter. Points in the direction of steepest increase of the loss. We move in the opposite direction (gradient descent) to reduce the loss.

**Learning rate** — How large a step to take in the gradient direction. Too high: training diverges or oscillates. Too low: training is painfully slow. The single most important hyperparameter in deep learning.

**Epoch** — One complete pass through the entire training dataset. Models typically train for many epochs, with the optimizer seeing each example multiple times.

**Batch size** — The number of training examples used to compute one gradient update. Larger batches give more accurate gradient estimates but use more memory. Smaller batches add noise that can help escape local minima.

## Gradient Descent Variants

**Stochastic Gradient Descent (SGD)** — Update parameters using the gradient computed from a single example (or small mini-batch). The "stochastic" comes from the randomness of sampling — each update uses a different subset of data. Simple, well-understood, and still competitive for many problems.

**Mini-batch gradient descent** — The practical middle ground: compute gradients on a batch of examples (typically 32-512). This is what most people mean when they say "SGD" in practice.

**Momentum** — Accumulate a running average of past gradients and use that to inform the current step. Like a ball rolling downhill — it builds speed in consistent directions and dampens oscillation in inconsistent directions. Standard momentum uses a decay factor (typically 0.9).

**Nesterov momentum** — A variant that computes the gradient at the "lookahead" position (where momentum would take you) rather than the current position. Slightly better convergence in practice.

## Adaptive Optimizers

**Adam (Adaptive Moment Estimation)** — Maintains per-parameter learning rates based on first moment (mean) and second moment (variance) of gradients. Parameters with consistently large gradients get smaller effective learning rates; parameters with small or sparse gradients get larger ones. The default optimizer for most deep learning tasks.

**AdamW** — Adam with decoupled weight decay. Standard Adam applies weight decay through the gradient, which interacts poorly with the adaptive learning rates. AdamW applies weight decay directly to the parameters, which is more principled and generally performs better.

**Adagrad** — Adapts learning rates based on accumulated squared gradients. Parameters that receive large gradients over time get progressively smaller learning rates. Good for sparse features but learning rates can decay to zero too quickly.

**RMSprop** — Fixes Adagrad's decaying learning rate problem by using a moving average of squared gradients instead of an accumulation. Conceptually the second-moment part of Adam without the first-moment component.

**LAMB (Layer-wise Adaptive Moments)** — Extends Adam with layer-wise learning rate scaling, designed for large-batch training. Used in training BERT and other large models where batch sizes reach tens of thousands.

**Lion** — A simpler optimizer that only tracks momentum (no second moment). Uses the sign of the update rather than its magnitude. Competitive with AdamW while using less memory.

## Learning Rate Schedules

**Learning rate warmup** — Start with a very small learning rate and linearly increase it over the first few hundred to few thousand steps. Prevents early training instability when the model parameters are still random and gradients are unreliable.

**Cosine annealing** — Decrease the learning rate following a cosine curve from the initial value to near zero. Provides a smooth decay that works well in practice. Often combined with warmup.

**Step decay** — Reduce the learning rate by a fixed factor at predetermined epochs. Simple and effective but requires knowing when to decay.

**Cyclical learning rates** — Oscillate the learning rate between a minimum and maximum value. Can help escape local minima and explore the loss landscape more broadly.

**One-cycle policy** — A single cycle of warmup followed by cosine decay. Often achieves good results in fewer epochs than constant or step-decay schedules.

## Loss Landscape Concepts

**Local minimum** — A point where the loss is lower than all nearby points but not necessarily the lowest overall. In high-dimensional neural network loss landscapes, local minima are less problematic than once feared — most are approximately as good as the global minimum.

**Saddle point** — A point where the gradient is zero but it is not a minimum — the loss increases in some directions and decreases in others. In high dimensions, saddle points are far more common than local minima and are the primary obstacle for optimization.

**Loss landscape** — The surface defined by the loss function over all possible parameter values. Visualizations typically show 2D slices through this high-dimensional space.

**Flat minimum vs. sharp minimum** — Flat minima (broad basins in the loss landscape) tend to generalize better than sharp minima (narrow basins). The intuition: parameters at flat minima are less sensitive to small perturbations, suggesting they capture robust patterns rather than noise.

## Regularization-Adjacent Terms

**Weight decay** — Add a penalty proportional to the magnitude of weights to the loss function. Encourages smaller weights, which acts as regularization. In AdamW, this is applied directly to parameters rather than through the gradient.

**Gradient clipping** — Cap the gradient magnitude to prevent exploding gradients. If the gradient norm exceeds a threshold, scale it down. Essential for training RNNs and often used in transformer training.

**Gradient accumulation** — Compute gradients over multiple mini-batches before performing an update. Simulates larger batch sizes when GPU memory is limited.

## Training Diagnostics

**Convergence** — When the loss stops meaningfully decreasing. A model has converged when additional training yields negligible improvement.

**Divergence** — When the loss increases without bound. Usually caused by a learning rate that is too high. Often manifests as NaN values in the loss.

**Overfitting** — Training loss decreases but validation loss increases. The model is memorizing training data rather than learning general patterns.

**Underfitting** — Both training and validation loss remain high. The model lacks capacity or has not trained long enough.

**Loss spike** — A sudden, temporary increase in loss during training. Can be caused by a bad batch of data, learning rate issues, or numerical instability. Usually recoverable if the learning rate is appropriate.

---

*Optimization terms are the vocabulary of model training. Understanding them helps you diagnose training problems, communicate with teammates, and make informed decisions about training configurations.*
