---
title: "Positional Encoding: How Transformers Know Word Order"
depth: technical
pillar: foundations
topic: ai-foundations
tags: [ai-foundations, positional-encoding, transformers, architecture, attention]
author: bee
date: "2026-04-02"
readTime: 10
description: "Transformers process all tokens simultaneously, so they have no inherent sense of order. Positional encoding injects sequence information. Here's how it works and why it matters."
related: [ai-foundations-transformers, ai-foundations-attention-mechanisms, ai-foundations-tokenization-explained]
---

Transformers have a fundamental problem: they process all input tokens in parallel. Unlike recurrent neural networks, which read tokens one at a time and naturally encode position through their sequential processing, a transformer's self-attention mechanism treats its input as an unordered set. Without intervention, "the cat sat on the mat" and "the mat sat on the cat" would produce identical representations.

Positional encoding solves this by injecting information about each token's position into its representation before attention is computed.

## Why Position Matters

Consider the sentences "the dog bit the man" and "the man bit the dog." The words are identical. The meaning is completely different. Position — which word comes where — is what distinguishes them. Any model that ignores position cannot understand language.

In a transformer, self-attention computes relationships between all pairs of tokens. Without positional information, the attention pattern for token A attending to token B would be identical regardless of whether B is adjacent to A or 500 tokens away. The model would have no concept of locality, adjacency, or ordering.

## Sinusoidal Positional Encoding

The original transformer paper introduced positional encoding using sine and cosine functions of different frequencies. For each position `pos` and each dimension `i` of the embedding:

```
PE(pos, 2i)   = sin(pos / 10000^(2i/d))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d))
```

Where `d` is the embedding dimension.

Each position gets a unique pattern of values across dimensions. Low-frequency dimensions change slowly across positions (capturing coarse position), while high-frequency dimensions change rapidly (capturing fine position). Together, they create a unique fingerprint for each position.

A key property: the encoding for position `pos + k` can be expressed as a linear function of the encoding for position `pos`, regardless of `k`. This means the model can learn to attend to relative positions (e.g., "two tokens back") through linear operations — the mathematical structure supports relational reasoning about position.

Sinusoidal encoding is fixed and requires no training. It can also extrapolate to positions longer than those seen during training, although in practice this extrapolation degrades for positions far beyond the training range.

## Learned Positional Embeddings

An alternative approach: treat positions like vocabulary items and learn an embedding vector for each position. Position 0 gets one learned vector, position 1 gets another, and so on.

This is simple and often works as well as or better than sinusoidal encoding for sequences within the trained length. The tradeoff is that it cannot extrapolate — position 513 has no embedding if the model was trained with a maximum sequence length of 512.

BERT and early GPT models used learned positional embeddings with fixed maximum sequence lengths. This was acceptable when context windows were 512 or 1024 tokens, but becomes a hard limitation when scaling to longer sequences.

## Rotary Position Embeddings (RoPE)

RoPE, used in LLaMA, Mistral, and most modern LLMs, encodes position by rotating the query and key vectors in attention. For each pair of dimensions, the vectors are rotated by an angle proportional to the position:

```
q_rotated = rotate(q, pos × θ)
k_rotated = rotate(k, pos × θ)
```

When computing attention between a query at position `m` and a key at position `n`, the rotation angles combine such that the attention score depends only on the relative position `m - n`, not the absolute positions.

This gives RoPE several advantages:

- **Relative position awareness.** The model naturally learns to attend based on distance rather than absolute position.
- **Decaying influence.** Due to the rotation mechanism, tokens further apart have less influence on each other's attention, which matches linguistic intuition — nearby words are usually more relevant than distant ones.
- **Length extension.** RoPE can be modified to support sequences longer than the training length. Techniques like NTK-aware scaling, YaRN, and position interpolation adjust the rotation frequencies to accommodate longer contexts without full retraining.

## ALiBi (Attention with Linear Biases)

ALiBi takes a different approach entirely: instead of modifying token representations, it adds a bias to the attention scores that penalizes distant token pairs. The bias is linear in distance — attention to a token 10 positions away is penalized 10x more than attention to an adjacent token.

Different attention heads use different penalty slopes, allowing some heads to focus locally and others to maintain longer-range attention. This diversity of attention ranges across heads is a strength — the model can use local context for syntax and distant context for semantics through different heads.

ALiBi requires no additional parameters and extrapolates well to longer sequences than seen during training. It was introduced in the BLOOM model and has been adopted by several subsequent architectures.

## Why This Matters in Practice

The choice of positional encoding directly affects:

**Maximum context length.** Learned embeddings have a hard cap. Sinusoidal encodings degrade gradually. RoPE with scaling techniques can extend to significantly longer contexts. ALiBi extrapolates well. If you need long-context models, the positional encoding scheme determines what is possible.

**Fine-tuning for longer contexts.** When extending a pre-trained model to handle longer sequences, the positional encoding determines how much additional training is needed and how well the extension works. RoPE-based models can often be extended with relatively little additional training. Learned embedding models require training new position embeddings from scratch.

**Attention patterns.** Different positional encodings produce different attention patterns. RoPE and ALiBi both bias toward local attention, which is useful for most language tasks. Sinusoidal and learned encodings do not have this bias, requiring the model to learn locality from data.

The modern consensus has converged on RoPE for most new LLMs, with ongoing research into better scaling techniques for extreme context lengths. But understanding the alternatives helps explain why different models behave differently on long-context tasks and why extending a model's context window is not as simple as changing a configuration parameter.
