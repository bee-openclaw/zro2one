---
title: "Knowledge Distillation: Making Large Models Small Without Losing What They Know"
depth: technical
pillar: foundations
topic: deep-learning
tags: [deep-learning, distillation, compression, deployment, optimization]
author: bee
date: "2026-03-15"
readTime: 10
description: "Knowledge distillation trains a small 'student' model to mimic a large 'teacher' model. This guide covers why it works, modern techniques, and practical implementation."
related: [deep-learning-training-at-scale, deep-learning-mixture-of-experts-explained, llms-speculative-decoding-explained]
---

You've trained a massive model that performs brilliantly. Now you need to deploy it on a phone, a microcontroller, or serve it at 10x lower cost. You can't shrink the model directly without losing performance — but you can train a smaller model to behave like the big one.

That's **knowledge distillation**: the large "teacher" model transfers its knowledge to a small "student" model. The student learns not just the right answers but the teacher's way of thinking about problems.

## Why distillation works better than training from scratch

When you train a model normally, the labels are "hard" — a cat image has label [1, 0, 0] for [cat, dog, bird]. The model gets no information about relative similarities.

When a teacher model processes the same image, it produces "soft" outputs: [0.85, 0.12, 0.03]. Those soft labels carry rich information: "this is probably a cat, but it looks somewhat like a dog, and almost nothing like a bird." The dog score of 0.12 encodes visual similarity between cats and dogs that the hard label completely discards.

This is the key insight from Hinton et al.'s 2015 paper: **soft labels from a teacher model contain more information per training example than hard labels.** The student learns from the teacher's uncertainty, not just its decisions.

## The standard approach

The student model trains on a weighted combination of two losses:

```
L = α × L_hard + (1-α) × L_soft

L_hard = CrossEntropy(student_output, true_labels)
L_soft = KL_Divergence(student_soft_output, teacher_soft_output)
```

The **temperature** parameter T controls how soft the teacher's outputs are:

```
soft_output = softmax(logits / T)
```

Higher T produces softer distributions, spreading probability mass more evenly and exposing inter-class relationships. T=1 is the model's normal output. T=3-5 is typical for distillation. T=20 makes everything nearly uniform (too much).

Both student and teacher use the same temperature T for the soft loss, then the student uses T=1 for the hard loss.

## Modern distillation techniques

### Feature-based distillation

Instead of only matching final outputs, the student also learns to match the teacher's intermediate representations. Key layers in the teacher produce feature maps that the student tries to replicate.

This requires a **projection layer** when teacher and student have different hidden dimensions. The student's 256-dim features are projected to match the teacher's 1024-dim features for comparison.

Feature-based distillation often outperforms output-only distillation because intermediate features encode richer, more transferable representations.

### Attention transfer

For transformer-based models, the student learns to match the teacher's attention patterns. The idea: attention maps encode what the model "looks at" to make decisions. If the student attends to the same things as the teacher, its outputs naturally align.

This is particularly effective for vision transformers and multimodal models where attention patterns are semantically meaningful.

### Self-distillation

A model distills knowledge from itself — typically from a larger version or an ensemble of checkpoints. Train a large model, then distill into the same architecture. Surprisingly, this often improves the student beyond what the teacher achieves, because the softer training signal acts as a regularizer.

Born-Again Networks showed that iteratively distilling from the previous generation's best checkpoint can produce models that outperform the original teacher.

### Online distillation

Instead of a pre-trained teacher, the teacher and student train simultaneously. They share gradients or predictions, and both improve together. This eliminates the need to train and store a large teacher model separately.

Deep Mutual Learning is the canonical approach: two models train in parallel, each serving as the other's teacher.

## Distillation for LLMs

LLM distillation has become one of the most important techniques in the field. The goal: capture a 70B or 400B model's capabilities in a 7B or even 1B student.

### Output distillation

Generate a large dataset of (prompt, teacher_response) pairs. Fine-tune the student model on these pairs. This is how many small capable models are created — Alpaca was distilled from GPT-3.5's outputs, and the pattern has been refined enormously since.

**Key considerations:**
- **Data diversity** matters more than volume. 50K diverse, high-quality examples often beat 500K repetitive ones.
- **Response quality** is the ceiling. If the teacher produces mediocre responses, the student will too.
- **Task coverage** — the student only learns what you show it. Gaps in the distillation dataset become gaps in capability.

### Chain-of-thought distillation

For reasoning tasks, distill not just the answer but the reasoning process. The teacher generates step-by-step reasoning traces, and the student learns to produce similar traces. This transfers reasoning capabilities more effectively than answer-only distillation.

Recent work (like the Qwen3-8B-Reasoning model) shows that reasoning traces can even be compressed — the student learns to reason internally without producing visible chain-of-thought tokens, maintaining quality while reducing output length.

### Progressive distillation

Distill in stages rather than all at once. Start with a 70B teacher distilling to a 30B student, then distill the 30B to a 13B, then 13B to 7B. Each step preserves more knowledge than jumping directly from 70B to 7B.

## Practical implementation

### Step 1: Generate teacher outputs

```python
# For classification
teacher_logits = teacher_model(inputs)
teacher_soft = F.softmax(teacher_logits / temperature, dim=-1)

# For LLMs
teacher_responses = []
for prompt in dataset:
    response = teacher_model.generate(prompt, temperature=0.7)
    teacher_responses.append((prompt, response))
```

### Step 2: Train the student

```python
# Classification distillation
student_logits = student_model(inputs)
student_soft = F.log_softmax(student_logits / temperature, dim=-1)

loss_soft = F.kl_div(student_soft, teacher_soft, reduction='batchmean')
loss_hard = F.cross_entropy(student_logits, labels)
loss = alpha * loss_hard + (1 - alpha) * (temperature ** 2) * loss_soft
```

Note the `temperature ** 2` scaling — this compensates for the reduced gradient magnitude when using high temperatures.

### Step 3: Evaluate honestly

Compare the student against:
1. The teacher (upper bound)
2. A student-sized model trained from scratch (baseline)
3. The student evaluated on held-out data the teacher never saw (generalization test)

If the distilled student doesn't clearly beat training from scratch, your distillation setup needs debugging — usually the issue is insufficient data diversity or poor temperature selection.

## When distillation falls short

**Capacity gap too large.** A 1B student can't replicate a 400B teacher on complex reasoning. There's a minimum capacity threshold below which distillation returns diminish sharply.

**Out-of-distribution.** The student only learns from examples it sees during distillation. If the deployment distribution differs significantly, the student may revert to its own (weaker) capabilities.

**Emergent capabilities.** Some capabilities emerge only at scale and may not transfer through distillation. A 7B model may not learn to do multi-step mathematical reasoning regardless of the teacher's quality, simply because the architecture lacks the depth to represent the necessary computation.

## The practical bottom line

Distillation is the standard technique for model compression in 2026. Every production-deployed small model — on your phone, in your car, in your smart speaker — was likely distilled from something larger.

The recipe: train the biggest model you can afford, distill it to the size you need to deploy, validate that the student meets your quality bar, and ship it.
