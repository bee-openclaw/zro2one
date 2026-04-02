---
title: "AI Glossary: Model Serving Edition"
depth: essential
pillar: foundations
topic: ai-glossary
tags: [ai-glossary, model-serving, inference, deployment, infrastructure]
author: bee
date: "2026-04-02"
readTime: 7
description: "The essential vocabulary for deploying and serving AI models in production — from batching to quantization to autoscaling."
related: [ai-glossary-context-windows-and-retrieval-edition, ai-glossary-context-engineering-edition, llms-kv-cache-management-guide]
---

Model serving is where trained models meet the real world. This glossary covers the terms you will encounter when deploying models to production.

## Core Concepts

**Inference.** The process of running a trained model on new input to produce a prediction. Training teaches the model; inference uses it. In LLMs, inference is the process of generating tokens from a prompt.

**Serving.** The infrastructure and software that handles inference requests in production. A serving system accepts requests, routes them to models, manages compute resources, and returns responses. Think of it as the web server for your model.

**Latency.** The time between sending a request and receiving a response. Measured in milliseconds. For interactive applications (chatbots, autocomplete), latency under 200ms is typically required. For batch processing, latency matters less.

**Throughput.** The number of requests a serving system can handle per unit time. Measured in requests per second (RPS) or tokens per second (TPS) for LLMs. Throughput and latency are often in tension — batching improves throughput but increases latency.

**Time to First Token (TTFT).** Specific to LLMs — the time between sending a prompt and receiving the first generated token. This determines how long the user waits before seeing any response. Affected primarily by prompt processing time.

**Tokens Per Second (TPS).** The speed at which an LLM generates output tokens after the first token. This determines how fast the response streams to the user. Limited by memory bandwidth in most serving configurations.

## Optimization Techniques

**Batching.** Processing multiple requests together in a single forward pass. GPUs are most efficient when processing many inputs simultaneously, so batching improves throughput. Static batching waits to collect a fixed batch; dynamic batching forms batches from whatever requests are waiting.

**Continuous Batching.** An improvement over static batching for LLMs. Instead of waiting for all sequences in a batch to finish before starting new ones, continuous batching inserts new requests into the batch as soon as a slot opens. This prevents short requests from being blocked by long ones and significantly improves GPU utilization.

**Quantization.** Reducing the numerical precision of model weights and activations — typically from 16-bit floating point (FP16) to 8-bit integers (INT8) or 4-bit integers (INT4). This reduces memory usage and increases speed, with a small (sometimes negligible) quality tradeoff. GPTQ, AWQ, and GGUF are common quantization formats.

**Speculative Decoding.** Using a small, fast model to draft multiple tokens that a larger model then verifies in parallel. The output is identical to what the large model would produce alone, but generation is faster because verification is cheaper than generation. See our dedicated article for details.

**KV Cache.** The stored key and value tensors from previous tokens that an LLM reuses during generation. Without the KV cache, every new token would require reprocessing all previous tokens. The cache trades memory for speed. Managing KV cache memory is a central challenge of LLM serving.

**Paged Attention.** A memory management technique that allocates KV cache memory in fixed-size pages rather than contiguous blocks, similar to virtual memory in operating systems. Reduces memory waste from pre-allocation and enables serving more concurrent requests.

**Prefix Caching.** Storing and reusing the KV cache computed for common prompt prefixes (like system prompts). When multiple requests share the same prefix, the computation for that prefix is done once and shared, reducing latency and compute cost.

## Model Formats and Runtimes

**ONNX (Open Neural Network Exchange).** A standard format for representing ML models that enables interoperability between frameworks. Export a model from PyTorch, run it with ONNX Runtime — often with speed improvements from graph optimizations.

**GGUF.** A file format for quantized models, commonly used with llama.cpp. Designed for efficient CPU and GPU inference of LLMs on consumer hardware.

**TensorRT.** NVIDIA's inference optimization toolkit. Takes a trained model and produces an optimized execution plan for specific GPU hardware. Delivers significant speedups but requires NVIDIA GPUs and compilation for each target GPU architecture.

**vLLM.** An open-source LLM serving engine that implements paged attention, continuous batching, and other serving optimizations. The de facto standard for self-hosted LLM serving.

## Infrastructure Concepts

**Model Registry.** A versioned store for trained models and their metadata. Tracks which model version is deployed where, what data it was trained on, and its evaluation metrics. MLflow, Weights & Biases, and cloud-specific registries are common options.

**Autoscaling.** Automatically adjusting the number of serving replicas based on demand. Scale up when traffic increases, scale down when it decreases. For GPU-based serving, autoscaling is complicated by long startup times (loading large models into GPU memory) and high per-instance costs.

**Model Sharding.** Splitting a model across multiple GPUs when it is too large to fit in a single GPU's memory. Tensor parallelism splits individual layers across GPUs; pipeline parallelism assigns different layers to different GPUs. Both add communication overhead but enable serving models that would otherwise be too large.

**Canary Deployment.** Routing a small percentage of traffic to a new model version while the majority continues to hit the current version. This lets you validate the new version on real traffic before full rollout, catching quality regressions before they affect all users.

**A/B Testing.** Running two model versions simultaneously and comparing their performance on real traffic. Unlike canary deployments (which are about safety), A/B tests are about measurement — determining which version is better on the metrics you care about.

**Shadow Deployment.** Running a new model on production traffic without returning its responses to users. The new model's outputs are logged for evaluation while the existing model continues to serve. This is the safest way to evaluate a new model on production data.
