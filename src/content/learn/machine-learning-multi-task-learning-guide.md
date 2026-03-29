---
title: "Multi-Task Learning: Training One Model to Do Many Things"
depth: technical
pillar: foundations
topic: machine-learning
tags: [machine-learning, multi-task-learning, transfer-learning, model-efficiency, shared-representations]
author: bee
date: "2026-03-29"
readTime: 11
description: "How multi-task learning works, when to use it, and practical strategies for training models that share representations across related tasks — from hard parameter sharing to task-specific heads."
related: [machine-learning-transfer-learning-guide, machine-learning-feature-engineering, deep-learning-knowledge-distillation-guide]
---

# Multi-Task Learning: Training One Model to Do Many Things

Most machine learning systems are trained to do exactly one thing: classify images, predict churn, detect spam. Multi-task learning (MTL) flips this by training a single model on multiple related tasks simultaneously. The model learns shared representations that transfer across tasks, often outperforming single-task models while using fewer total parameters.

This is not just an academic curiosity. Every modern LLM is a multi-task learner — it predicts next tokens, follows instructions, writes code, summarizes documents, and reasons about math, all from one set of weights. Understanding MTL helps you design better systems and decide when one model can replace many.

## Why Multi-Task Learning Works

The core insight is that related tasks share underlying structure. A model that learns to detect edges for object recognition has also learned something useful for depth estimation, segmentation, and pose detection. By training on all these tasks together, the model discovers shared features it might miss when trained on any single task.

**Inductive bias through auxiliary tasks.** Even if you only care about Task A, training jointly on Task B can regularize the model and improve Task A performance — as long as the tasks are genuinely related. The auxiliary task acts as a form of implicit regularization, preventing overfitting to idiosyncratic patterns in Task A's data.

**Data efficiency.** Each task provides additional training signal. If Task A has limited labeled data but related Task B has abundant labels, joint training lets the model leverage Task B's data to learn representations useful for Task A.

**Reduced infrastructure.** One model serving five tasks is simpler to deploy, monitor, and update than five separate models.

## Architectures for Multi-Task Learning

### Hard Parameter Sharing

The most common approach: a shared encoder (backbone) with task-specific output heads.

```
Input → [Shared Encoder] → Branch → [Task A Head] → Output A
                         → Branch → [Task B Head] → Output B
                         → Branch → [Task C Head] → Output C
```

The shared encoder learns features useful across all tasks. Each head specializes in mapping shared features to task-specific outputs. This is simple, parameter-efficient, and works well when tasks are closely related.

### Soft Parameter Sharing

Each task has its own encoder, but the encoders are encouraged to be similar through regularization. Cross-stitch networks, for example, learn linear combinations of features from each task's encoder at every layer.

This is more flexible than hard sharing — each task can learn somewhat different representations — but uses more parameters and is harder to train.

### Mixture of Experts

A shared backbone with expert sub-networks that are selectively activated per task (or per input). This allows the model to allocate capacity dynamically: shared experts handle common features while task-specific experts handle unique requirements.

## When Multi-Task Learning Helps (and When It Hurts)

**MTL tends to help when:**
- Tasks share input domains (same images, same text format)
- Tasks are at different levels of abstraction (low-level features → high-level predictions)
- One task has limited data but a related task has abundant data
- You need to reduce total model count in production

**MTL tends to hurt when:**
- Tasks compete for model capacity (negative transfer)
- Task distributions are fundamentally different
- One task dominates training and other tasks are undertrained
- Task labels come from different annotation processes with inconsistent quality

The risk of **negative transfer** is real. If tasks pull the shared representation in conflicting directions, performance on all tasks degrades. Detecting negative transfer early requires monitoring per-task metrics during training, not just aggregate loss.

## Practical Training Strategies

### Loss Weighting

With multiple task losses, you need to combine them: `L_total = w_A * L_A + w_B * L_B + ...`. The weights matter enormously. Common approaches:

- **Equal weighting** — simple but rarely optimal; tasks with larger loss magnitudes dominate
- **Uncertainty weighting** — learn task weights based on homoscedastic uncertainty (Kendall et al., 2018)
- **Dynamic weight averaging** — adjust weights based on each task's learning rate over recent epochs
- **GradNorm** — normalize gradient magnitudes across tasks to balance learning speed

### Task Sampling

When training with mini-batches, you decide how to sample across tasks:

- **Proportional sampling** — sample each task proportional to its dataset size
- **Equal sampling** — give each task equal representation regardless of dataset size
- **Temperature-based sampling** — use a temperature parameter to interpolate between proportional and equal
- **Curriculum strategies** — start with easier tasks and gradually introduce harder ones

### Gradient Surgery

When gradients from different tasks conflict (point in opposing directions in parameter space), you can:

- **PCGrad** — project conflicting gradients to remove the conflicting component
- **CAGrad** — find a gradient direction that improves all tasks simultaneously
- **Simply detect and skip** — when task gradients conflict beyond a threshold, skip the conflicting task for that step

## Multi-Task Learning in Practice

### NLP: Shared Encoders

BERT-style models are natural multi-task learners. Fine-tune a shared encoder with heads for sentiment analysis, named entity recognition, and question answering. The shared encoder learns general language understanding; each head specializes.

### Computer Vision: Scene Understanding

Autonomous driving systems predict depth, segmentation, object detection, and lane detection from shared visual features. Training jointly improves all tasks because understanding scene geometry helps with every prediction.

### Recommendation Systems

User embedding models trained jointly on click prediction, purchase prediction, and engagement duration learn richer user representations than models trained on any single signal.

## When to Use Multi-Task vs. Separate Models

Choose MTL when tasks are related and you benefit from shared computation or improved generalization. Choose separate models when tasks are unrelated, when you need to update one task's model without affecting others, or when one task has very different data characteristics.

A practical middle ground: **pre-train a shared backbone, then fine-tune separate copies for each task.** This captures shared representation benefits during pre-training while allowing task-specific specialization during fine-tuning.

## Key Takeaways

Multi-task learning is not about cramming unrelated tasks into one model. It is about recognizing when tasks share structure and exploiting that sharing for better performance, efficiency, and simplicity. The challenge is engineering: balancing loss weights, detecting negative transfer, and designing architectures that share enough to help but not so much that tasks interfere. When it works — and it often does — one well-designed multi-task model beats a collection of specialists.
