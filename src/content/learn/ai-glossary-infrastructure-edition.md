---
title: "AI Glossary: Infrastructure Edition"
depth: applied
pillar: practice
topic: ai-glossary
tags: [ai-glossary, infrastructure, mlops, gpu, deployment]
author: bee
date: "2026-03-19"
readTime: 7
description: "The essential vocabulary for AI infrastructure — from GPUs and TPUs to inference servers and model registries. Know the terms behind the systems that make AI run."
related: [ai-glossary-deployment-mlops-edition, ai-glossary-training-edition, llm-api-integration-guide]
---

AI infrastructure has its own language. Whether you're evaluating cloud providers, reading architecture docs, or talking to your platform team, these are the terms you need.

## Compute

**GPU (Graphics Processing Unit)**: Hardware originally designed for rendering graphics, now the primary accelerator for AI workloads. GPUs excel at parallel matrix operations — the core computation in neural networks. NVIDIA dominates with the H100, H200, and B200 series.

**TPU (Tensor Processing Unit)**: Google's custom AI accelerator, designed specifically for tensor operations. Available through Google Cloud. TPUs excel at large-scale training and inference, particularly for transformer models.

**NPU (Neural Processing Unit)**: Specialized AI chips built into consumer devices (phones, laptops). Apple's Neural Engine, Qualcomm's Hexagon, and Intel's NPU handle on-device AI tasks like image recognition and voice processing.

**VRAM (Video RAM)**: The memory on a GPU. Model size is often limited by VRAM — a 7B parameter model needs ~14GB in float16, which won't fit on an 8GB GPU without quantization.

**FLOPS (Floating Point Operations Per Second)**: A measure of compute speed. AI hardware is rated in TFLOPS (trillion) or PFLOPS (quadrillion). Useful for comparing chips, but real-world performance depends on memory bandwidth too.

**Memory Bandwidth**: How fast data moves between memory and compute cores. Often the actual bottleneck for inference — the GPU can compute faster than it can read weights from memory.

## Model Serving

**Inference Server**: Software that loads a model and serves predictions via API. Examples: vLLM, TensorRT-LLM, Triton Inference Server, Ollama. The choice of inference server dramatically affects latency and throughput.

**Batching**: Grouping multiple inference requests together to process simultaneously. Increases throughput (requests per second) at the cost of latency (time per request). **Dynamic batching** collects requests within a time window.

**Continuous Batching**: A technique specific to LLMs where new requests are added to an in-progress batch as earlier requests complete. Dramatically improves GPU utilization compared to static batching.

**KV Cache**: During LLM inference, previously computed attention key-value pairs are cached to avoid recomputation. The KV cache can consume significant memory — a major constraint for long contexts and high concurrency.

**Quantization**: Reducing model precision (e.g., float16 → int8 → int4) to decrease memory usage and increase speed. Typical quality loss is minimal for 8-bit, noticeable but acceptable for 4-bit.

**Model Registry**: A versioned store for trained models and their metadata. Examples: MLflow Model Registry, Weights & Biases, HuggingFace Hub. Essential for tracking which model version is deployed where.

## Orchestration

**Kubernetes (k8s)**: Container orchestration platform widely used for deploying AI services. Manages scaling, health checks, and resource allocation. GPU scheduling on k8s requires the NVIDIA device plugin.

**Ray**: A distributed computing framework popular for AI workloads. Ray Serve handles model serving; Ray Train handles distributed training. Often used as the layer between your code and Kubernetes.

**Model Mesh**: A pattern for serving many models efficiently by loading/unloading them from GPU memory on demand. Useful when you have hundreds of models but limited GPUs.

**Autoscaling**: Automatically adjusting the number of serving replicas based on traffic. For AI workloads, this typically scales based on GPU utilization, request queue depth, or latency metrics.

## Storage & Data

**Feature Store**: A centralized repository for computed features used in ML models. Stores both historical features (for training) and real-time features (for serving). Examples: Feast, Tecton, Hopsworks.

**Vector Database**: A database optimized for storing and querying high-dimensional vectors (embeddings). Used in RAG systems, recommendation engines, and similarity search. Examples: Pinecone, Weaviate, Qdrant, pgvector.

**Object Storage**: Cloud storage for large files — training data, model weights, checkpoints. S3, GCS, and Azure Blob Storage are the standards. AI workloads generate and consume enormous amounts of object storage.

**Data Lake**: A storage system that holds raw data in its native format. AI teams pull training data from data lakes, often using tools like Spark or DuckDB to process it.

## Networking

**NCCL (NVIDIA Collective Communications Library)**: The communication library GPUs use to talk to each other during distributed training. Performance depends heavily on network topology.

**InfiniBand**: High-speed networking fabric used in GPU clusters. Provides much lower latency and higher bandwidth than Ethernet, critical for distributed training where GPUs exchange gradients constantly.

**Model Parallelism**: Splitting a model across multiple GPUs because it doesn't fit in one GPU's memory. **Tensor parallelism** splits individual layers; **pipeline parallelism** splits sequential layers across devices.

**Data Parallelism**: Each GPU holds a complete model copy and processes different data batches. Gradients are averaged across GPUs. The simplest form of distributed training.

## Monitoring

**GPU Utilization**: Percentage of time the GPU is actively computing. Low utilization (under 50%) usually means your bottleneck is elsewhere — data loading, preprocessing, or network I/O.

**Time to First Token (TTFT)**: For LLMs, the latency from request to the first generated token. Driven by prompt processing (prefill) speed. Critical for user experience.

**Tokens Per Second (TPS)**: The generation speed of an LLM. Depends on model size, quantization, batch size, and hardware. Users typically need >30 TPS for a smooth streaming experience.

**Tail Latency (P99)**: The latency experienced by the slowest 1% of requests. Often 3-10x the median latency. More important than average latency for user experience and SLA compliance.
