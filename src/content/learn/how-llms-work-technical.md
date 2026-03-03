---
title: "How LLMs Work — The Transformer Architecture Explained"
depth: technical
pillar: foundations
topic: llms
tags: [llm, transformers, attention, architecture, deep-learning]
author: bee
date: "2026-03-02"
readTime: 18
description: "A technical deep-dive into transformer architecture, attention mechanisms, training pipelines, and the engineering decisions that make modern LLMs work."
related: [how-llms-work-essential, how-llms-work-applied, how-llms-work-research]
---

![Article visual](/visuals/llm-token-flow.svg)


## The transformer: where it all started

Modern LLMs are built on the **transformer architecture**, introduced in Google's 2017 paper "Attention Is All You Need." Before transformers, language models used recurrent neural networks (RNNs) and LSTMs that processed text sequentially — one token at a time, left to right. This was slow and made it hard to capture long-range dependencies.

The transformer's key innovation: **process all tokens in parallel** using a mechanism called **self-attention**. This single change unlocked the scaling that led to GPT, Claude, Gemini, and everything else.

## Architecture overview

A transformer-based LLM (specifically, a decoder-only model like GPT) consists of:

1. **Tokenizer** — Converts text to numerical token IDs
2. **Embedding layer** — Maps token IDs to dense vectors
3. **Positional encoding** — Adds position information
4. **Transformer blocks** (repeated N times):
   - Multi-head self-attention
   - Feed-forward neural network
   - Layer normalization
   - Residual connections
5. **Output head** — Projects back to vocabulary space for next-token prediction

Let's break each of these down.

## Tokenization

LLMs don't see words — they see **tokens**. Modern tokenizers use subword algorithms like **Byte-Pair Encoding (BPE)** or **SentencePiece**:

- Common words → single tokens: "the" → `[1]`
- Uncommon words → multiple tokens: "tokenization" → `["token", "ization"]`
- The vocabulary is typically 32K-100K tokens

This is why LLMs sometimes struggle with character-level tasks (counting letters, spelling) — they literally don't "see" individual characters.

## Embeddings and positional encoding

Each token is mapped to a **dense vector** (typically 4096-12288 dimensions in large models). These embeddings are learned during training — semantically similar tokens end up with similar vectors.

Since transformers process all tokens in parallel, they have no inherent sense of order. **Positional encodings** are added to embeddings to inject sequence information. Modern models use:

- **Rotary Position Embeddings (RoPE):** Encode position through rotation matrices applied to query and key vectors. Allows extrapolation to longer sequences than seen in training.
- **ALiBi (Attention with Linear Biases):** Add a position-dependent bias directly to attention scores. No learned parameters.

## Self-attention: the core mechanism

Self-attention is what lets each token "look at" every other token in the sequence. For each token, the model computes:

- **Query (Q):** "What am I looking for?"
- **Key (K):** "What do I contain?"
- **Value (V):** "What information do I provide?"

The attention score between two tokens is the dot product of Q and K, scaled and softmaxed:

```
Attention(Q, K, V) = softmax(QK^T / √d_k) · V
```

Where `d_k` is the dimension of the key vectors (the scaling prevents the dot products from growing too large).

**Multi-head attention** runs this process multiple times in parallel with different learned projections. With 32-128 heads, the model can attend to different types of relationships simultaneously: some heads might learn syntax, others semantics, others long-range references.

In decoder-only models (GPT-style), attention is **causal** — each token can only attend to tokens before it (plus itself). This is enforced with an attention mask that sets future positions to negative infinity before the softmax.

## The feed-forward network

After attention, each token's representation passes through a **feed-forward network (FFN)** — typically two linear layers with a nonlinearity:

```
FFN(x) = W₂ · activation(W₁ · x + b₁) + b₂
```

Modern LLMs commonly use **SwiGLU** activation (a gated variant of Swish) rather than ReLU, following the PaLM/LLaMA approach. The FFN's hidden dimension is typically 4x the model dimension.

The FFN is where much of the model's "knowledge" is stored — the attention layers route information, and the FFN layers transform it.

## Layer normalization and residual connections

Two critical stability mechanisms:

- **Residual connections:** The output of each sublayer is added to its input (`x + sublayer(x)`). This creates "skip connections" that make deep networks trainable.
- **Layer normalization:** Normalizes the activations across the feature dimension. Most modern LLMs use **RMSNorm** (Root Mean Square Layer Normalization) and apply it *before* each sublayer (pre-norm) rather than after.

## Scaling: how models get large

Modern LLMs scale along three axes:

| Dimension | Small (7B) | Medium (70B) | Large (400B+) |
|---|---|---|---|
| Parameters | 7 billion | 70 billion | 400+ billion |
| Layers | 32 | 80 | 120+ |
| Model dim | 4096 | 8192 | 12288+ |
| Attention heads | 32 | 64 | 96+ |
| Training tokens | 1-2T | 2-15T | 15T+ |

**Scaling laws** (Kaplan et al., Hoffmann et al./Chinchilla) showed that model performance follows predictable power laws based on compute, parameters, and data. The Chinchilla result was particularly influential: for a given compute budget, you should train a smaller model on more data, not a larger model on less data.

## The training pipeline

### Phase 1: Pretraining
- **Objective:** Next-token prediction (causal language modeling)
- **Data:** Trillions of tokens from web crawls, books, code, academic papers
- **Duration:** Weeks to months on thousands of GPUs/TPUs
- **Cost:** $10M-$100M+ in compute

### Phase 2: Supervised Fine-Tuning (SFT)
- **Objective:** Learn to follow instructions and generate helpful responses
- **Data:** Thousands to millions of human-written (prompt, response) pairs
- **Key:** Quality matters more than quantity here

### Phase 3: RLHF / RLAIF
- **RLHF (Reinforcement Learning from Human Feedback):** Train a reward model on human preference data, then use PPO or similar to optimize the LLM against that reward model.
- **RLAIF (RL from AI Feedback):** Use a stronger model to generate preference data instead of humans. Used increasingly as models improve.
- **DPO (Direct Preference Optimization):** Skip the reward model entirely — directly optimize the LLM on preference pairs. Simpler and increasingly popular.

## Inference: how generation actually works

When you query an LLM, generation happens autoregressively:

1. **Prefill phase:** Process the entire prompt through the model in parallel (one forward pass). Cache the key-value (KV) pairs for all layers.
2. **Decode phase:** Generate one token at a time. Each new token requires a forward pass, but the KV cache means you only compute attention over the new token against all previous KV pairs.

**Decoding strategies:**
- **Greedy:** Always pick the highest-probability token. Deterministic but can be repetitive.
- **Top-k sampling:** Sample from the top k most likely tokens.
- **Top-p (nucleus) sampling:** Sample from the smallest set of tokens whose cumulative probability exceeds p.
- **Temperature:** Scale the logits before softmax. Lower = more deterministic.

The **KV cache** is a significant memory bottleneck at inference time. For a 70B model with a 128K context window, the KV cache alone can require 40+ GB of memory.

## Key engineering optimizations

Modern LLMs use several optimizations that are worth understanding:

- **Grouped-Query Attention (GQA):** Share key-value heads across multiple query heads. Reduces KV cache size and compute with minimal quality loss.
- **Flash Attention:** Memory-efficient attention computation that avoids materializing the full attention matrix. Essential for long contexts.
- **Mixture of Experts (MoE):** Only activate a subset of the model's parameters for each token. Allows larger total models with the same inference cost (e.g., Mixtral activates 2 of 8 experts per token).
- **Quantization:** Reduce parameter precision from FP16 to INT8 or INT4. Cuts memory and compute by 2-4x with modest quality loss.
- **Speculative decoding:** Use a smaller "draft" model to predict multiple tokens, then verify with the large model in a single forward pass.

## What this means for builders

If you're building with LLMs, these architectural details matter for:

- **Prompt design:** Understanding tokenization and attention helps you craft better prompts
- **Context management:** Knowing the KV cache constraints helps you manage long conversations
- **Model selection:** Understanding MoE vs. dense models helps you choose the right model for your use case
- **Cost optimization:** Understanding the prefill/decode distinction helps you optimize for latency vs. throughput
- **Fine-tuning decisions:** Understanding the training pipeline helps you decide when fine-tuning is worth it vs. prompting

Ready for the research frontier? The 🔴 Research version covers the open problems, recent breakthroughs, and where the field is heading. Or step back to the 🔵 Applied version for practical usage tips.
