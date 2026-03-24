---
title: "Positional Encoding in Transformers: How Models Know Where Things Are"
depth: technical
pillar: foundations
topic: deep-learning
tags: [deep-learning, transformers, positional-encoding, attention, architecture]
author: bee
date: "2026-03-24"
readTime: 10
description: "A technical walkthrough of positional encoding methods in transformers, from sinusoidal encodings to RoPE and ALiBi, with practical implications for context length."
related: [deep-learning-transformers-architecture, ai-foundations-attention-mechanisms, deep-learning-attention-mechanisms-visual-guide]
---

Transformers process all tokens in parallel. Unlike RNNs, which read sequences left-to-right and inherently know position, a transformer's self-attention treats its input as a set, not a sequence. Without positional information, the sentence "the cat sat on the mat" and "the mat sat on the cat" would produce identical representations. Positional encoding solves this by injecting position information into the model. The choice of encoding method has major consequences for context length, generalization, and performance.

## Why Position Information Is Necessary

Self-attention computes a weighted sum over all positions. The attention score between positions i and j depends only on the content at those positions — the query and key vectors. Formally, for queries Q, keys K, and values V:

    Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V

This operation is permutation-equivariant. If you shuffle the input tokens, the output tokens get shuffled in the same way, with the same values. The model literally cannot distinguish position without explicit position information.

## Sinusoidal Encoding (Vaswani et al., 2017)

The original "Attention Is All You Need" paper introduced sinusoidal positional encoding. For each position pos and each dimension i of the embedding:

    PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
    PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))

These encodings are added directly to the input embeddings before the first attention layer.

Key properties:

- **Deterministic** — no learned parameters, computed from a formula
- **Unique per position** — each position gets a distinct vector
- **Relative position through linear transformation** — for any fixed offset k, PE(pos+k) can be represented as a linear function of PE(pos), which theoretically allows the model to learn relative position reasoning
- **Bounded values** — all components are between -1 and 1 regardless of position

The sinusoidal approach works but has limitations. The model must learn to extract relative position information from absolute position encodings through the attention mechanism, which is indirect.

## Learned Positional Embeddings

BERT and GPT-2 replaced sinusoidal encodings with learned positional embeddings — a trainable embedding matrix of shape (max_length, d_model). Each position gets its own learned vector, added to the token embedding.

```python
import torch.nn as nn

class LearnedPositionalEncoding(nn.Module):
    def __init__(self, max_len, d_model):
        super().__init__()
        self.pos_embedding = nn.Embedding(max_len, d_model)

    def forward(self, x):
        positions = torch.arange(x.size(1), device=x.device)
        return x + self.pos_embedding(positions)
```

Advantages:

- Simple to implement
- The model can learn whatever positional patterns are useful for the task

Disadvantages:

- **Hard length limit** — cannot generalize beyond the maximum training length
- **No extrapolation** — position 513 has no embedding if you trained with max_len=512
- **More parameters** — though the parameter count is typically small relative to the rest of the model

## Relative Positional Encoding (Shaw et al., 2018)

Shaw et al. proposed adding learnable relative position biases directly to the attention scores. Instead of encoding absolute positions, the model learns embeddings for relative distances between tokens.

For attention between positions i and j, the relative position is clipped to a range [-k, k]:

    relative_position = clip(j - i, -k, k)

A learned bias corresponding to this relative distance is added to the attention logit. This means the model directly reasons about "how far apart are these two tokens" rather than "what absolute positions are they at."

This approach:

- Naturally captures relative position, which is what matters for most language tasks
- Generalizes better to unseen sequence lengths (within reason)
- Was adopted by Transformer-XL and T5 (with simplifications)

T5's version uses a bucketed relative position scheme where nearby positions get individual biases but distant positions share buckets (logarithmic spacing). This keeps the number of parameters manageable while covering long distances.

## Rotary Position Embedding (RoPE)

RoPE, introduced by Su et al. (2021), has become the dominant positional encoding method in modern LLMs. LLaMA, Mistral, Qwen, and most open-weight models use RoPE.

The core idea: encode position by rotating the query and key vectors in 2D subspaces. For a d-dimensional embedding, split it into d/2 pairs. Each pair (x_2i, x_(2i+1)) is rotated by an angle proportional to the position:

    theta_i = pos / 10000^(2i/d)

    [q_2i']      [cos(theta_i)  -sin(theta_i)] [q_2i]
    [q_(2i+1)'] = [sin(theta_i)   cos(theta_i)] [q_(2i+1)]

The same rotation is applied to keys. When computing the dot product q_m^T * k_n, the rotation angles subtract, so the attention score depends only on the relative position (m - n).

Why RoPE dominates:

| Property | Sinusoidal | Learned | Relative | RoPE |
|----------|-----------|---------|----------|------|
| Encodes relative position | Indirectly | No | Yes | Yes |
| No extra parameters | Yes | No | No | Yes |
| Works in attention directly | No | No | Yes | Yes |
| Theoretically unbounded length | Yes | No | Partially | Yes |
| Decays with distance | No | N/A | Optional | Yes |

RoPE naturally produces a decay in attention scores as relative distance increases — distant tokens contribute less. This is a useful inductive bias for language.

```python
import torch

def apply_rope(x, positions, dim):
    """Apply Rotary Position Embedding to queries or keys."""
    freqs = 1.0 / (10000 ** (torch.arange(0, dim, 2, device=x.device).float() / dim))
    angles = positions.unsqueeze(-1) * freqs.unsqueeze(0)  # (seq_len, dim/2)
    cos_vals = angles.cos()
    sin_vals = angles.sin()
    x_pairs = x.view(*x.shape[:-1], -1, 2)  # (..., dim/2, 2)
    x_rot = torch.stack([
        x_pairs[..., 0] * cos_vals - x_pairs[..., 1] * sin_vals,
        x_pairs[..., 0] * sin_vals + x_pairs[..., 1] * cos_vals
    ], dim=-1)
    return x_rot.flatten(-2)
```

## ALiBi (Attention with Linear Biases)

Press et al. (2022) proposed ALiBi as a simpler alternative. Instead of modifying embeddings, ALiBi adds a static linear bias to attention scores:

    attention_score(i, j) = q_i^T * k_j - m * |i - j|

Where m is a head-specific slope (fixed, not learned). Different attention heads get different slopes, geometrically spaced. Heads with steep slopes focus locally; heads with shallow slopes attend more broadly.

ALiBi's key claim: strong length extrapolation. A model trained on 1024 tokens can perform reasonably at 2048 or beyond, because the linear penalty on distance is a simple, predictable inductive bias.

In practice, ALiBi has seen less adoption than RoPE. BLOOM used ALiBi, but most subsequent models chose RoPE. The reasons are debated, but RoPE's flexibility with context extension techniques (see below) likely played a role.

## Context Length Extrapolation

Position encoding choice directly affects whether a model can handle sequences longer than it was trained on. This matters because training on very long sequences is expensive, so models are often trained on shorter contexts and then extended.

**RoPE + NTK-aware scaling** — rescale the frequency base in RoPE to spread the same angular range over a longer sequence. This lets models trained on 4K context work at 32K or 128K with minimal quality loss and some continued training.

**YaRN (Yet another RoPE extensioN)** — combines NTK scaling with temperature adjustments across frequency bands. High-frequency components (which encode local position) are left alone; low-frequency components (which encode distant position) are rescaled more aggressively.

**Dynamic NTK** — adjusts the scaling factor based on the actual sequence length at inference time, rather than using a fixed scaling ratio.

These techniques have enabled the jump from 2K-4K context windows in early LLMs to 128K-1M+ context windows in current models. The positional encoding is the mechanism that makes or breaks long-context performance.

## Practical Takeaways

If you're building a transformer from scratch, use RoPE. It's the well-tested default with the best ecosystem of context extension techniques.

If you're fine-tuning an existing model for longer contexts, understand which positional encoding it uses and apply the appropriate scaling method. Applying YaRN to a non-RoPE model won't work.

If you're evaluating model quality at long contexts, be aware that positional encoding extrapolation is lossy. A model claiming 128K context that was trained on 8K with RoPE scaling will perform worse at 128K than a model trained natively at that length. Test at your actual use-case length, not just the advertised maximum.

Position encoding is one of the few architectural choices in transformers where the method genuinely matters for downstream capability. It's worth understanding what's under the hood.
