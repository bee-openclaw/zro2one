---
title: "LLM Quantization Methods Explained"
depth: technical
pillar: foundations
topic: llms
tags: [llms, quantization, optimization, inference, deployment]
author: bee
date: "2026-03-16"
readTime: 10
description: "A practical guide to quantization methods for large language models — from theory to choosing the right approach for your use case."
related: [llms-inference-optimization-playbook-2026, llms-inference-latency-guide, llms-scaling-laws-explained]
---

# LLM Quantization Methods Explained

Running large language models at full precision is expensive. A 70B parameter model in FP16 needs roughly 140GB of GPU memory — that's multiple high-end GPUs just for inference. Quantization compresses model weights to lower precision formats, dramatically reducing memory and compute requirements while preserving most of the model's capability.

This guide covers the major quantization approaches, when to use each, and the real-world tradeoffs you'll encounter.

## What Quantization Actually Does

Neural network weights are typically stored as 16-bit or 32-bit floating point numbers. Quantization maps these values to lower-precision representations — usually 8-bit, 4-bit, or even 2-bit integers.

The core idea is straightforward: most weight values cluster in a narrow range. You can represent them with fewer bits if you choose the right mapping. The challenge is doing this without destroying the model's ability to generate coherent, accurate outputs.

### Precision Formats at a Glance

- **FP32** (32-bit float): Full precision. Baseline for training. ~4 bytes per parameter.
- **FP16 / BF16** (16-bit): Standard for inference. ~2 bytes per parameter. Minimal quality loss.
- **INT8** (8-bit integer): First major compression step. ~1 byte per parameter.
- **INT4** (4-bit integer): Aggressive compression. ~0.5 bytes per parameter.
- **INT2-3** (2-3 bit): Experimental. Significant quality tradeoffs.

## Post-Training Quantization (PTQ)

PTQ applies quantization after the model has been trained. No additional training is needed — you take an existing model and convert it. This is the most common approach for deploying open-weight models.

### Round-to-Nearest (RTN)

The simplest method. Map each weight to the nearest quantized value. Works reasonably well for 8-bit but degrades significantly at 4-bit for larger models. Not recommended as a primary approach for production use.

### GPTQ

GPTQ uses a small calibration dataset to minimize the quantization error layer by layer. It solves an optimization problem: given the quantization constraint, find the rounding decisions that minimize output error.

**Strengths:**
- Well-established with broad tooling support
- Good quality at 4-bit for most models
- One-time cost: quantize once, use forever

**Weaknesses:**
- Requires a calibration dataset (usually 128-256 samples)
- Quantization process can take hours for large models
- Quality depends on calibration data choice

### AWQ (Activation-Aware Weight Quantization)

AWQ observes that not all weights are equally important. It identifies "salient" weight channels — those that produce large activations — and protects them during quantization by scaling them up before quantizing, then scaling activations down to compensate.

```python
# Conceptual AWQ flow
# 1. Run calibration data through the model
# 2. Identify channels with large activations
# 3. Apply per-channel scaling to protect salient weights
# 4. Quantize the scaled weights
# 5. Adjust activation scaling to compensate
```

AWQ typically outperforms GPTQ at 4-bit, especially on reasoning-heavy benchmarks.

### GGUF / llama.cpp Quantization

The GGUF format (used by llama.cpp and its ecosystem) offers a range of quantization types optimized for CPU inference. These use mixed-precision block quantization — different blocks of weights can use different bit widths.

Common GGUF quantization types:
- **Q8_0**: 8-bit, near-lossless. Good baseline.
- **Q5_K_M**: 5-bit with k-quant optimization. Excellent quality-to-size ratio.
- **Q4_K_M**: 4-bit k-quant. The sweet spot for most users.
- **Q3_K_M**: 3-bit. Noticeable quality drop but usable.
- **Q2_K**: 2-bit. Research territory. Significant degradation.

The "K" variants use importance-based mixed precision within the quantization scheme — more important layers get more bits.

## Quantization-Aware Training (QAT)

QAT simulates quantization during training, allowing the model to adapt its weights to the lower precision. This generally produces better results than PTQ at the same bit width, but requires access to training infrastructure and data.

### When QAT Makes Sense

- You're the model provider or have significant compute budget
- You need the absolute best quality at a given bit width
- The model will be deployed at massive scale (amortizing training cost)
- You're targeting very low precision (2-3 bit)

Google's approach with Gemma and Meta's with Llama have both included QAT variants alongside their base releases, recognizing that many users will run quantized versions.

## Choosing the Right Method

### For Local / Consumer Hardware

If you're running models on a desktop or laptop:

| Model Size | RAM Available | Recommended |
|-----------|-------------|-------------|
| 7-8B | 8GB | Q4_K_M GGUF |
| 7-8B | 16GB | Q5_K_M or Q8_0 GGUF |
| 13-14B | 16GB | Q4_K_M GGUF |
| 70B | 64GB | Q4_K_M GGUF |

### For Server / GPU Deployment

If you're serving models on GPU infrastructure:

- **Single GPU (24GB)**: AWQ 4-bit for models up to ~30B parameters
- **Single GPU (48-80GB)**: FP16 for smaller models, AWQ/GPTQ 4-bit for 70B+
- **Multi-GPU**: Consider whether the cost savings from quantization justify the quality tradeoff

### Quality vs. Compression Tradeoffs

As a general rule:
- **8-bit**: <1% quality loss on most benchmarks. Safe default.
- **4-bit (good method)**: 1-3% quality loss. Acceptable for most applications.
- **4-bit (naive method)**: 3-8% quality loss. Noticeable in complex reasoning.
- **3-bit**: 5-15% quality loss. Use only when memory-constrained.
- **2-bit**: 15-30%+ quality loss. Not recommended for production.

These numbers vary significantly by model architecture, quantization method, and evaluation task.

## Practical Tips

### Measure Quality for Your Use Case

Benchmark numbers don't tell the whole story. A model that scores well on MMLU might perform poorly on your specific task after quantization. Always evaluate on representative examples from your actual workload.

### Perplexity Is Your Friend

Perplexity on a held-out text corpus is a quick, reliable proxy for quantization quality. Compute it before and after quantization. If perplexity increases by more than 0.5-1.0 points, you might be losing meaningful capability.

```bash
# Example with llama.cpp
./llama-perplexity -m model-q4_k_m.gguf -f wiki.test.raw
```

### Watch for Outlier Sensitivity

Some models have weight outliers that cause disproportionate quantization error. If you see unexpected quality drops, try methods that handle outliers explicitly (like AWQ or SmoothQuant).

### Consider the Full Stack

Quantization doesn't exist in isolation. Your inference engine matters:
- **llama.cpp**: Excellent GGUF support, CPU and GPU
- **vLLM**: Good AWQ/GPTQ support, optimized GPU serving
- **TensorRT-LLM**: NVIDIA-optimized, supports multiple formats
- **ExLlamaV2**: Specialized in GPTQ/EXL2, very fast

## The State of Quantization in 2026

The field has matured significantly. Key trends:

1. **Model providers ship quantized variants.** You rarely need to quantize yourself for popular models.
2. **4-bit is the practical floor** for general-purpose use. Below 4-bit, quality losses become application-specific.
3. **Speculative decoding + quantization** is an increasingly powerful combination — use a small quantized model for draft tokens and a larger model for verification.
4. **Hardware is catching up.** New GPU architectures include native support for low-precision integer operations, making quantized inference even faster.

## Bottom Line

Quantization is no longer optional knowledge for anyone deploying LLMs. The difference between running a model in FP16 and 4-bit AWQ can mean the difference between needing 4 GPUs and needing 1 — a 4x cost reduction with minimal quality impact.

Start with 4-bit AWQ or Q4_K_M GGUF depending on your deployment target. Measure quality on your specific use case. Only go lower if you must, and only go higher if quality demands it.
