---
title: "Transformers: The Architecture Behind Modern AI"
depth: technical
pillar: foundations
topic: ai-foundations
tags: [transformers, attention, architecture, llm, deep-learning, self-attention]
author: bee
date: "2026-03-06"
readTime: 13
description: "Transformers are the architecture behind GPT, BERT, Gemini, and essentially every modern AI system. Here's how they actually work — the attention mechanism, positional encoding, and training."
related: [ai-foundations-neural-networks, how-llms-work-technical, deep-learning-backpropagation]
---

In 2017, a team at Google published a paper called "Attention Is All You Need." Its central contribution — the Transformer architecture — now underlies GPT-4, Claude, Gemini, DALL-E, Whisper, AlphaFold 2, and most other modern AI systems.

Understanding Transformers is understanding modern AI at a technical level. This article covers the architecture in depth: what problem it solves, how the key components work, and why the design choices matter.

## The problem Transformers solved

Before Transformers, sequence modeling was dominated by Recurrent Neural Networks (RNNs) and their variants (LSTMs, GRUs). These architectures processed sequences token by token, maintaining a "hidden state" that theoretically captured all prior context.

In practice, RNNs had three critical problems:

**Long-range dependency failure:** Information from early in a sequence degraded across many timesteps. An RNN reading a 500-word document often "forgot" content from the opening paragraphs by the time it reached the end.

**Sequential computation:** Processing token 500 required first processing tokens 1–499. This prevented parallelism — training was inherently sequential and therefore slow.

**Gradient flow problems:** Backpropagating gradients through hundreds of sequential steps caused vanishing or exploding gradients, making training unstable.

The Transformer's key insight: instead of processing sequences one token at a time, **allow every position to attend to every other position simultaneously** — in parallel, in a single operation.

## The Transformer architecture overview

A standard Transformer (the original encoder-decoder version) consists of:

**Encoder:** Takes the input sequence (e.g., a sentence) and produces a rich contextual representation.
**Decoder:** Generates the output sequence (e.g., a translation) token by token, attending to both prior decoder outputs and the encoder's representation.

Modern language models like GPT use decoder-only Transformers (no encoder). BERT uses encoder-only. The original architecture used both.

The core building block is the **Transformer layer**, which appears N times stacked in both encoder and decoder.

Each Transformer layer has two sub-layers:
1. **Multi-head self-attention**
2. **Position-wise feed-forward network**

Both sub-layers are wrapped with residual connections and layer normalization.

## Self-attention: the key mechanism

Self-attention is the mechanism that allows each token to "look at" all other tokens and decide which ones are relevant to its own representation.

For each token, self-attention produces three vectors from its embedding:
- **Query (Q):** "What am I looking for?"
- **Key (K):** "What do I contain that others might want?"
- **Value (V):** "What information do I carry?"

These are produced by multiplying the token embedding by three learned weight matrices W_Q, W_K, W_V.

**Computing attention:**

1. For each query token, compute dot products with all key vectors: Q × K^T
2. Scale by √d_k (the dimension of the key vectors) to prevent magnitude issues
3. Apply softmax to get attention weights — a probability distribution over all positions
4. Multiply attention weights by value vectors and sum: Attention(Q, K, V) = softmax(QK^T / √d_k)V

The result: each token position outputs a weighted combination of all value vectors, where the weights reflect how much attention it paid to each position.

**Intuition:** For the word "it" in the sentence "The animal didn't cross the street because it was too tired," self-attention lets the model figure out that "it" refers to "animal" by computing high attention weights between "it" and "animal."

## Why this works in parallel

Unlike RNNs, all attention computations happen simultaneously. For a sequence of length n, all n × n attention scores are computed in a single matrix operation. This is why Transformers could leverage GPUs so effectively — matrix multiplication is exactly what they're optimized for.

The trade-off: self-attention requires O(n²) memory and computation in sequence length. For very long sequences, this becomes expensive. Most of the architectural innovations in the years since the original Transformer (Flash Attention, sparse attention, linear attention, Mamba/SSM alternatives) are attempts to escape or approximate this quadratic bottleneck.

## Multi-head attention

Instead of running self-attention once, Transformers run it h times in parallel with different learned weight matrices — this is **multi-head attention**.

Each "head" attends to different aspects of the relationships between tokens. In practice:
- Some heads learn syntactic relationships (subject-verb agreement)
- Some heads learn semantic relationships (word meaning)
- Some heads learn positional relationships (nearby tokens)
- Some heads capture domain-specific patterns (code structure, factual associations)

The outputs from all h heads are concatenated and projected back to the model dimension:

MultiHead(Q, K, V) = Concat(head_1, ..., head_h) × W_O

where head_i = Attention(QW_i^Q, KW_i^K, VW_i^V)

Typical modern LLMs use 32–128 attention heads. GPT-3 used 96 heads. Larger models tend to use more heads, though the relationship isn't simple.

## Positional encoding: solving the order problem

Self-attention is position-agnostic by design — "The dog bit the man" and "The man bit the dog" would produce the same attention patterns if word order were ignored. This is a problem, since word order carries meaning.

Transformers inject positional information via **positional encodings** — vectors added to the token embeddings that represent each position in the sequence.

The original Transformer used fixed sinusoidal encodings:

PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))

This cleverly encodes position in a way that generalizes to sequences longer than those seen during training, since sine/cosine functions can be extrapolated.

Modern LLMs have moved to **Rotary Position Embeddings (RoPE)** or **Alibi** — learned or semi-learned positional schemes that better handle long-context generalization and longer context windows. GPT-NeoX, LLaMA, and most recent open-weight models use RoPE.

## The feed-forward network

After attention, each position passes through a position-wise feed-forward network — two linear transformations with a non-linearity in between:

FFN(x) = max(0, xW_1 + b_1)W_2 + b_2

This is applied independently to each position. It looks like a simple MLP, but it serves a crucial function: it stores "factual knowledge" about associations between concepts. Research has shown that specific factual associations (Paris is the capital of France, Python uses indentation for blocks) are encoded primarily in the FFN weights rather than the attention weights.

The FFN layer is typically 4× wider than the model dimension. In a model with d_model = 4096 (e.g., LLaMA 7B), the FFN has an intermediate dimension of ~16,384.

## Layer normalization and residual connections

Every sub-layer (attention and FFN) is wrapped with:

**Residual connections:** The input to each sub-layer is added to its output: output = sublayer(x) + x. This enables gradients to flow directly through the network without degradation, allowing very deep stacks (96+ layers in GPT-3).

**Layer normalization:** Normalizes the activations across the feature dimension at each position. Applied either before or after the sub-layer (pre-norm vs. post-norm — modern models use pre-norm for training stability).

## Training Transformers

Transformers are trained with standard backpropagation, but at enormous scale.

**Language modeling objective (for decoder-only models):** At each position, predict the probability of the next token. The loss is cross-entropy summed over all positions:

L = -Σ log P(token_t | token_1, ..., token_{t-1})

This is called "next token prediction" — the same task described at a high level in the Essential guide. The Transformer is trained to minimize this loss over billions of examples.

**Masked language modeling (for encoder-only models like BERT):** Randomly mask some tokens and train the model to predict the masked tokens from context on both sides.

**Compute requirements:** Training a model like GPT-4 is estimated to require tens of thousands of A100 GPUs running for months. The compute is dominated by matrix multiplications in the attention and FFN layers. This is why algorithmic efficiency improvements (better attention mechanisms, mixture-of-experts architectures) are so commercially valuable — a 2× efficiency improvement translates directly into roughly 2× training compute savings or a 2× larger model for the same cost.

## Key architectural variants

The core Transformer has spawned many variants optimized for different use cases:

**Decoder-only (GPT family):** Autoregressive text generation. Each token can only attend to previous tokens (causal masking). Used by GPT-4, Claude, LLaMA, Mistral.

**Encoder-only (BERT family):** Bidirectional attention — each token sees the full context. Used for classification, named entity recognition, retrieval. Not generative.

**Encoder-decoder (original Transformer, T5, mBART):** Encoder processes the full input; decoder generates the output while attending to encoder representations. Used for translation, summarization, QA.

**Mixture of Experts (MoE):** Instead of a single FFN, each layer has multiple "expert" FFNs, and a gating mechanism routes each token to a subset of experts. This allows massive parameter counts while keeping compute costs manageable. Used by Mixtral, GPT-4 (rumored), and many research models.

**Vision Transformers (ViT):** Apply the Transformer to image patches instead of tokens. Replaced CNNs as the dominant image architecture for many tasks.

## Why this architecture dominated

The Transformer's dominance isn't accidental. A few design choices were crucial:

**Parallel computation:** Training is orders of magnitude faster than sequential RNNs. This made scaling practical.

**Universal architecture:** The same architecture works for text, images, audio, code, protein sequences, video, and multimodal combinations. This enables transfer and sharing of architectural knowledge across domains.

**Emergent capabilities with scale:** Transformers exhibit emergent capabilities at scale — abilities that appear suddenly as model size increases — that weren't observed in prior architectures to the same degree. The reasons are still not fully understood but are believed to be related to the global attention mechanism.

**Attention as a relational bias:** The attention mechanism is a flexible relational operation — it can learn any kind of relationship between positions. This generality allows the same architecture to learn grammar, facts, reasoning patterns, and code structure from the same training procedure.

---

The Transformer is simple in principle and complex in practice. The math is tractable; the engineering at scale is brutal. Understanding it gives you a foundation to evaluate claims about new architectures, interpret benchmarks more intelligently, and reason about what capabilities are likely or unlikely to emerge from scaling.

For the research-level treatment of attention mechanisms, mixture-of-experts, and recent architectural alternatives (Mamba, RWKV), see the 🔴 Research articles in the AI Foundations and Deep Learning topics.
