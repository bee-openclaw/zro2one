---
title: "Data Parallelism vs Model Parallelism: Distributing Deep Learning Training"
depth: technical
pillar: models
topic: deep-learning
tags: [deep-learning, distributed-training, data-parallelism, model-parallelism, scaling]
author: bee
date: "2026-03-28"
readTime: 11
description: "Clear explanations of how data parallelism, model parallelism, tensor parallelism, and pipeline parallelism work — when to use each, and how modern training combines them."
related: [deep-learning-training-at-scale, ai-foundations-distributed-training-explained, deep-learning-optimization-practical-guide]
---

# Data Parallelism vs Model Parallelism: Distributing Deep Learning Training

Training a large neural network on a single GPU is either slow or impossible. Slow if the model fits in memory but training takes weeks. Impossible if the model does not fit in a single GPU's memory at all — which is the case for any model above roughly 10 billion parameters on current hardware.

Distributed training solves this by spreading work across multiple GPUs. But there are fundamentally different strategies for how to split the work, and choosing the wrong one wastes money and time. This guide explains each strategy, when it applies, and how they combine for large-scale training.

## Data Parallelism

Data parallelism is the simplest and most common strategy. Every GPU has a complete copy of the model. The training batch is split across GPUs — each GPU processes a different subset of data, computes gradients, and then all GPUs synchronize their gradients before updating weights.

**How it works step by step:**

1. Each GPU loads the full model (identical weights)
2. A batch of 1024 samples is split into 8 chunks of 128 across 8 GPUs
3. Each GPU runs forward pass and backward pass on its chunk
4. Gradients are aggregated across all GPUs (typically via all-reduce)
5. Each GPU applies the same update, keeping weights synchronized

**Why it works:** Since every GPU processes different data with the same model, the aggregated gradient is mathematically equivalent to processing the full batch on a single (very fast) GPU. No approximation, no quality loss.

**When to use it:** Data parallelism is the default choice whenever the model fits in a single GPU's memory. It scales training speed nearly linearly with the number of GPUs — 8 GPUs train roughly 7.5x faster than one (the 0.5x overhead is gradient synchronization).

**Limitations:** Every GPU must hold the full model, full optimizer states, and activations for its data chunk. For a 7B parameter model in FP16, the weights alone are 14 GB. Add optimizer states (Adam stores 2 extra copies) and activations, and you need 40–60 GB per GPU. This fits on an A100-80GB, but a 70B model does not.

### ZeRO and FSDP

ZeRO (Zero Redundancy Optimizer) and its implementation in PyTorch as FSDP (Fully Sharded Data Parallelism) address the memory limitation of data parallelism. Instead of every GPU holding the full model and optimizer state, these states are sharded (split) across GPUs.

- **ZeRO Stage 1:** Shard optimizer states. Each GPU stores optimizer state for only 1/N of the parameters. Memory savings: ~4x for Adam.
- **ZeRO Stage 2:** Also shard gradients. Each GPU stores gradients for only its shard of parameters.
- **ZeRO Stage 3 / FSDP:** Also shard model parameters. Each GPU stores only 1/N of the model weights. When a layer is needed, its parameters are gathered from all GPUs, used, and released.

ZeRO-3/FSDP makes data parallelism viable for models that would not otherwise fit — a 70B model can be trained on 8 GPUs where none individually could hold it. The trade-off is increased communication: parameters must be gathered before each forward/backward step and scattered after.

## Model Parallelism (Tensor Parallelism)

Tensor parallelism splits individual layers across GPUs. Instead of each GPU having the full model, each GPU has a slice of each layer.

**Example:** A linear layer with a 4096×4096 weight matrix can be split column-wise across 4 GPUs, each holding a 4096×1024 slice. Each GPU computes its portion of the output, and results are combined via all-reduce.

**When to use it:** When individual layers are too large for a single GPU, or when you want to minimize memory per GPU for very large models. Tensor parallelism is standard for models above 30B parameters.

**Trade-offs:** Tensor parallelism requires very fast inter-GPU communication because every layer needs synchronization. It works well within a single node (NVLink provides 600+ GB/s between GPUs) but poorly across nodes (network bandwidth is 10–100x lower). Typical tensor parallelism degree: 2–8 GPUs within a node.

## Pipeline Parallelism

Pipeline parallelism assigns different layers to different GPUs. GPU 0 runs layers 1–10, GPU 1 runs layers 11–20, and so on.

**The naive problem:** If GPU 0 processes a batch through its layers and sends results to GPU 1, GPU 0 sits idle while GPU 1 processes — and GPU 2 is idle while both work. This creates a "pipeline bubble" where most GPUs are idle most of the time.

**The solution: micro-batching.** Split each batch into many micro-batches. GPU 0 processes micro-batch 1, sends it to GPU 1, then immediately starts micro-batch 2. This keeps the pipeline full, with each GPU working on a different micro-batch simultaneously.

**When to use it:** Pipeline parallelism is useful when the model has too many layers for a single GPU's memory, but you also want to distribute across multiple nodes (where tensor parallelism's communication overhead is too high). It requires only point-to-point communication between adjacent pipeline stages, not all-to-all communication.

**Trade-offs:** Pipeline bubbles at the start and end of each batch waste some compute. With enough micro-batches (typically 4x the pipeline depth), bubble overhead is under 10%. Pipeline parallelism also complicates gradient accumulation and can introduce memory imbalances if layers are not evenly sized.

## Expert Parallelism

For Mixture of Experts (MoE) models, expert parallelism places different experts on different GPUs. Since only a subset of experts activates for each token, this approach keeps communication manageable — each token is routed to the GPUs holding its selected experts.

**When to use it:** Only for MoE architectures. Expert parallelism is essential for training models like Mixtral where the total parameter count is huge (47B for Mixtral 8x7B) but each token only activates a fraction (13B).

## Combining Strategies: 3D Parallelism

Real large-scale training combines multiple strategies simultaneously:

**Within a node (8 GPUs):** Tensor parallelism splits layers across all 8 GPUs connected by fast NVLink.

**Across nodes:** Pipeline parallelism assigns different groups of layers to different nodes, requiring only sequential communication between adjacent stages.

**Across replicas:** Data parallelism replicates the entire pipeline across multiple copies, each processing different data.

This "3D parallelism" (data × tensor × pipeline) is how GPT-4-class models are trained on thousands of GPUs. The configuration — how many dimensions of each type — depends on model size, cluster topology, and communication bandwidth.

**Example configuration for a 70B model on 64 GPUs (8 nodes of 8):**
- Tensor parallelism: 8 (within each node)
- Pipeline parallelism: 4 (across 4 nodes per replica)
- Data parallelism: 2 (2 pipeline replicas processing different data)

## Practical Decision Guide

**Model fits on one GPU:** Use data parallelism (DDP). Simple, efficient, well-supported.

**Model fits on one GPU but training is memory-tight:** Use FSDP/ZeRO to shard optimizer states and gradients.

**Model does not fit on one GPU:** Use FSDP (ZeRO-3) for models up to ~30B on a single 8-GPU node. Beyond that, add tensor parallelism.

**Model requires multiple nodes:** Combine tensor parallelism within nodes, pipeline parallelism across nodes, and data parallelism across replica groups.

**Using MoE architecture:** Add expert parallelism to the mix.

**Start simple.** Data parallelism with FSDP handles a surprising range of model sizes. Add tensor and pipeline parallelism only when FSDP alone cannot fit the model or when you are optimizing throughput at scale.

The field moves fast — frameworks like Megatron-LM, DeepSpeed, and PyTorch's native distributed tools handle much of the complexity automatically. But understanding what they do under the hood helps you make the right configuration choices and debug the inevitable issues that arise at scale.
