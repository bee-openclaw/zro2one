---
title: "LLM Scaling Laws Explained: Why Bigger Models Aren't Always Better"
depth: technical
pillar: foundations
topic: llms
tags: [llms, scaling-laws, chinchilla, compute, training, efficiency]
author: bee
date: "2026-03-13"
readTime: 9
description: "Scaling laws govern how model performance improves with more data, compute, and parameters. Understanding them explains why the biggest model isn't always the smartest choice."
related: [how-llms-work-technical, llms-inference-optimization-playbook-2026, deep-learning-training-at-scale]
---

For years, the AI industry operated on a simple assumption: make the model bigger, get better results. Then scaling laws showed up and made things more interesting.

## What Are Scaling Laws?

Scaling laws are empirical relationships that describe how a model's performance changes as you increase three variables: the number of parameters, the amount of training data, and the compute budget used for training.

The original work by Kaplan et al. at OpenAI in 2020 established that language model loss follows predictable power-law curves across all three axes. Increase any of them, and loss decreases — but at different rates depending on which one you scale.

This was a big deal. It meant you could predict, before training a model, roughly how well it would perform at a given scale. No more guessing. No more training a massive model only to discover it underperforms expectations.

## The Chinchilla Insight

In 2022, DeepMind's Chinchilla paper changed the conversation. The key finding: most large language models were dramatically undertrained relative to their size.

The prevailing approach had been to scale parameters aggressively while keeping training data relatively modest. Chinchilla showed that for a fixed compute budget, you get better performance by using a smaller model trained on more data than a larger model trained on less data.

The optimal ratio, according to their analysis, was roughly 20 tokens of training data per parameter. That meant a 70 billion parameter model should see about 1.4 trillion tokens during training.

This single insight reshaped how labs allocate compute. It's why you saw a wave of "smaller but better" models in 2023 and 2024 — Llama 2 70B outperforming earlier models with more parameters, Mistral 7B punching above its weight class.

## The Three Axes of Scaling

### Parameters

More parameters give the model more capacity to represent complex patterns. But parameters alone don't guarantee performance. An undertrained large model can be worse than a well-trained smaller one.

There are also practical limits. More parameters mean more memory, slower inference, higher serving costs. A 400B parameter model that's 5% better than a 70B model might cost 8x more to run.

### Training Data

More diverse, high-quality training data consistently improves model capability. But data has its own scaling challenges:

- Quality matters more than quantity past a certain point
- Deduplication has outsized impact
- Domain coverage affects downstream performance on specific tasks
- Synthetic data can extend the curve but introduces its own failure modes

### Compute

Compute is the budget that connects parameters and data. Given a fixed compute budget, scaling laws tell you the optimal split between model size and training duration.

The relationship is roughly: doubling compute yields a predictable reduction in loss, but the gains diminish. Going from $1M to $2M in compute buys more improvement than going from $100M to $200M.

## Why Size Isn't Everything

Scaling laws explain several things that seem counterintuitive:

**Smaller models can beat larger ones.** If the smaller model was trained with more data, better data, or more compute-efficient methods, it can outperform a model with 10x the parameters.

**Efficiency innovations shift the curves.** Techniques like mixture-of-experts, better tokenizers, improved attention mechanisms, and distillation effectively give you more capability per parameter. Flash Attention doesn't change the scaling law itself, but it changes how much compute you can practically apply.

**Post-training matters enormously.** Scaling laws primarily describe pre-training loss. But downstream task performance depends heavily on instruction tuning, RLHF, and other alignment techniques. A well-tuned 8B model can be more useful than a raw 70B base model for most practical applications.

**Inference cost scales with parameters, not with training compute.** You pay the training cost once. You pay inference costs forever. This is why the industry has shifted toward training smaller models harder — the ongoing cost of serving a 7B model versus a 70B model is dramatic.

## Scaling Laws in 2026

The original scaling laws assumed dense transformer architectures and standard training approaches. Several developments have complicated the picture:

### Mixture of Experts

MoE architectures like Mixtral activate only a fraction of total parameters per token. This breaks the simple relationship between parameter count and compute cost. A 140B parameter MoE model might use only 12B parameters per forward pass, giving you the capacity of a large model at the inference cost of a small one.

### Data Quality Over Quantity

As models have consumed most of the easily available internet text, the focus has shifted from "more data" to "better data." Careful curation, deduplication, and domain balancing now matter more than raw token count for many applications.

### Synthetic Data and Self-Improvement

Models generating their own training data creates feedback loops that scaling laws didn't originally model. When done carefully, synthetic data extends the effective training set. When done carelessly, it leads to model collapse.

### Test-Time Compute

Reasoning models like o1 and o3 introduced a new axis: compute spent at inference time. Spending more time "thinking" can improve performance without changing the model's parameters at all. This is a fundamentally different kind of scaling that the original laws don't capture.

## Practical Implications

If you're choosing models for production use, scaling laws give you useful intuitions:

1. **Don't default to the biggest model.** Match model size to task complexity. Many production tasks work fine with 7-13B parameter models that are fast and cheap to serve.

2. **Fine-tuned small beats generic large.** A 7B model fine-tuned on your domain will often outperform a 70B general model on your specific tasks.

3. **Watch for efficiency breakthroughs.** When a new architecture or training technique drops, it can shift the performance-per-dollar curve significantly. The best model today might not be the best value in six months.

4. **Training data quality is leverage.** If you're training or fine-tuning, investing in data quality yields better returns than scaling parameters.

5. **Consider the full cost.** Training cost is one-time. Inference cost is ongoing. Optimization of the serving pipeline often matters more than choosing the largest available model.

## The Frontier Keeps Moving

Scaling laws aren't a ceiling — they're a description of how things scale under current approaches. Every major efficiency breakthrough effectively shifts the curves, giving more capability per unit of compute.

The labs that win aren't necessarily the ones spending the most on compute. They're the ones who understand the scaling relationships well enough to spend their compute wisely.

## What to Read Next

- **[How LLMs Work (Technical)](/learn/how-llms-work-technical)** — the architecture underneath
- **[Deep Learning Training at Scale](/learn/deep-learning-training-at-scale)** — practical distributed training
- **[LLM Inference Optimization Playbook](/learn/llms-inference-optimization-playbook-2026)** — making models fast in production
