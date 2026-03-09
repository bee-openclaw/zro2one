---
title: "The Transformer Architecture: How It Actually Works"
depth: technical
pillar: foundations
topic: deep-learning
tags: [deep-learning, transformers, architecture, attention, neural-networks, self-attention]
author: bee
date: "2026-03-09"
readTime: 14
description: "A rigorous walk through the transformer architecture — attention mechanisms, multi-head attention, positional encoding, feed-forward layers, and how it all fits together."
related: [deep-learning-rnns-and-transformers, ai-foundations-attention-mechanisms, ai-foundations-transformers]
---

The transformer architecture, introduced in the 2017 paper "Attention Is All You Need," is the foundation of essentially every large language model deployed today. Understanding it at a mechanistic level — not just conceptually — gives you a significant advantage in debugging model behavior, designing prompts, and making architectural decisions.

This guide assumes familiarity with basic neural network concepts (layers, weights, softmax, backpropagation). It builds toward a complete picture of the standard transformer encoder-decoder, with notes on decoder-only variants like GPT.

## The problem transformers solved

Before transformers, the dominant architecture for sequential data was the recurrent neural network (RNN) and its variants (LSTM, GRU). RNNs processed sequences one step at a time, maintaining a hidden state that carried information forward. This had two critical limitations:

1. **Sequential processing** — Each token must be processed after the previous one. No parallelism during training, which is slow.
2. **Limited long-range memory** — Information from early in a sequence degrades over many steps. Even LSTMs struggle with very long sequences.

Transformers solve both problems simultaneously. They process all tokens in parallel (no sequential dependency) and use attention to directly connect any two tokens regardless of distance. This enables both faster training and better long-range reasoning.

## High-level architecture

A standard transformer has an **encoder** and a **decoder**, each made of stacked layers. Modern LLMs (GPT-style) use only the decoder. BERT-style models use only the encoder. The original machine translation model used both.

**Encoder:** Takes an input sequence and produces a sequence of contextualized representations. Each position's representation is informed by all other positions.

**Decoder:** Takes the encoder output and generates an output sequence token by token (in standard attention; parallel during training). Each position attends to encoder outputs and all previous decoder positions.

For decoder-only LLMs like GPT: the entire model is a decoder that attends to previous tokens and generates the next token. No separate encoder.

## Step-by-step: encoding an input sequence

Let's trace through what happens when the encoder processes the phrase "The cat sat."

### Step 1: Tokenization

Text is first split into tokens using a learned tokenization scheme (typically BPE — byte-pair encoding). "The cat sat" → [The] [cat] [sat]. Each token maps to an integer ID.

### Step 2: Token embeddings

Each token ID is converted to a dense vector via an embedding lookup table. If your model has dimension `d_model = 512`, each token becomes a 512-dimensional vector. The embedding table is learned during training.

### Step 3: Positional encoding

Transformers have no built-in sense of order — attention sees all tokens simultaneously. To inject position information, a positional encoding is added to each token embedding.

The original transformer uses sinusoidal positional encodings:

```
PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
```

Each position gets a unique encoding pattern. Position 0 gets one vector, position 1 gets another, and so on. These are added to the token embeddings before the first layer.

Modern models often use **learned positional embeddings** (just learn a separate embedding for each position) or **rotary positional encodings (RoPE)**, which have better properties for long contexts.

### Step 4: Encoder layers (repeat N times)

Each encoder layer has two sublayers:
1. **Multi-head self-attention**
2. **Position-wise feed-forward network**

With **residual connections** and **layer normalization** around each sublayer. A typical transformer has 6-24 encoder layers.

## Self-attention: the core mechanism

This is the heart of the transformer. Conceptually: for each token, compute how much it should "attend to" every other token when forming its contextual representation.

### Computing Q, K, V

For each token embedding `x`, three vectors are computed by linear projection:
- **Query (Q):** "What am I looking for?"
- **Key (K):** "What do I have to offer?"
- **Value (V):** "What information do I carry?"

These projections use learned weight matrices `W_Q`, `W_K`, `W_V`. Typically, the projected dimension `d_k = d_model / num_heads` (e.g., 64 for a 512-dim model with 8 heads).

### Computing attention scores

For each query, compute dot products with all keys:

```
Attention(Q, K, V) = softmax(QK^T / √d_k) · V
```

The dot product `QK^T` gives a score for how well each query matches each key. Dividing by `√d_k` scales the scores to prevent large magnitudes from pushing softmax into saturation (very small gradients).

Softmax converts scores to probabilities that sum to 1 — the attention weights. Finally, the value vectors are combined as a weighted sum using these attention weights.

The result: each token's new representation is a weighted combination of all tokens' value vectors, where the weights reflect how relevant each token is to the current query.

### Example intuition

In "The cat sat on the mat," when computing the attention for "sat," the attention mechanism learns to assign high weights to "cat" (the subject) and "mat" (the object). The resulting representation of "sat" is informed by both of these relevant tokens.

This works regardless of how far apart the tokens are in the sequence. A model with self-attention has no concept of "these tokens are 50 words apart and therefore less related."

## Multi-head attention

Running self-attention once captures one type of relationship pattern. **Multi-head attention** runs multiple attention operations in parallel, each with separate learned projections.

```
head_i = Attention(QW_Q^i, KW_K^i, VW_V^i)
MultiHead(Q, K, V) = Concat(head_1, ..., head_h) · W_O
```

Why? Different heads can learn to attend to different types of relationships simultaneously:
- One head might learn syntactic dependencies (subject-verb)
- Another might learn semantic associations
- Another might track coreference (pronouns → referents)
- Another might capture local context

The output of all heads is concatenated and projected back to `d_model` via `W_O`.

In practice, 8-16 heads is common. The total computation is the same as single-head attention with `d_k = d_model` — the cost is just reorganized.

## Masked attention (decoder)

In the decoder, self-attention must not allow tokens to attend to future positions (that would be cheating — the model shouldn't see the token it's trying to predict).

**Causal masking** solves this: before softmax, set attention scores for future positions to negative infinity. After softmax, these positions get attention weight ≈ 0. The model only attends to current and previous tokens.

This masking is what makes decoder-only models (GPT architecture) work: during training, all positions are processed in parallel but each position only sees past tokens. During inference, generation is truly sequential (one token at a time), but the masking maintains consistency.

## Cross-attention (encoder-decoder)

In encoder-decoder models, the decoder has a **cross-attention** sublayer that connects to the encoder output:
- **Queries:** come from the decoder
- **Keys and Values:** come from the encoder output

This allows each decoder position to attend to all encoder positions — directly incorporating the encoded input when generating each output token.

## Feed-forward sublayer

After attention, each position passes through a position-wise feed-forward network:

```
FFN(x) = max(0, xW_1 + b_1) · W_2 + b_2
```

Two linear transformations with a ReLU (or GeLU in modern models) in between. The intermediate dimension (`d_ff`) is typically 4× the model dimension (2048 for a 512-dim model).

Key property: "position-wise" means the same FFN is applied independently to each position. No cross-position mixing here — that's what attention is for. The FFN adds representational capacity, effectively learning to combine and transform the information gathered by attention.

## Residual connections and layer normalization

Residual connections (also called skip connections) add the sublayer's input to its output:

```
output = LayerNorm(x + Sublayer(x))
```

This prevents vanishing gradients and allows information to flow across layers. The layer normalization (applied before or after the sublayer, depending on implementation) stabilizes training.

Modern models use **Pre-LN** (normalize before the sublayer) rather than the original **Post-LN** (normalize after), as Pre-LN is more stable for very deep models.

## Putting it all together: one forward pass

For a decoder-only LLM generating the next token:

1. Input tokens → tokenization → token IDs
2. Embedding lookup → token vectors
3. Add positional encodings → positioned token vectors
4. For each layer (L times):
   a. Masked multi-head self-attention (attending only to previous tokens)
   b. Residual + layer norm
   c. Feed-forward network
   d. Residual + layer norm
5. Final layer norm
6. Linear projection to vocabulary size → logits
7. Softmax → probability distribution over next tokens
8. Sample or argmax → next token ID

The next token is appended to the sequence and the process repeats for each subsequent token.

## Scaling the transformer

The transformer architecture scales remarkably well. The key insight from "Scaling Laws for Neural Language Models" (Kaplan et al., 2020): model performance improves predictably with more parameters, more data, and more compute. This predictability enabled labs to plan model training runs with confidence.

The main dimensions of scale:
- **Depth (L):** More layers → more composition of representations. GPT-3 has 96 layers.
- **Width (d_model):** Larger hidden dimension → richer representations. GPT-3 has d_model = 12,288.
- **Heads (h):** More attention heads per layer.
- **Context length:** More tokens the model can attend to simultaneously.

Modern 100B+ parameter models push all these dimensions. The computational cost scales as roughly O(L · d_model² + L · T · d_model) where T is sequence length — attention computation scales quadratically with sequence length, which is why long contexts are expensive.

## Why this matters for practitioners

Understanding transformer architecture helps you reason about:

- **Why position matters:** Token position in the prompt affects attention patterns. Important context at the beginning or end of a long prompt is attended to differently than middle context.
- **Why token count matters:** Every token is a potential attention source and target. Verbose prompts aren't just more expensive — they add noise that competes for attention.
- **Why structured prompts work:** Clear section markers help the model learn which parts of the context to attend to for different sub-tasks.
- **Why some reasoning tasks require more steps:** Complex multi-step reasoning may need multiple forward passes or chain-of-thought to work through intermediate steps that don't fit in a single attention computation.

The transformer isn't magic — it's a specific computation with specific properties. Knowing the computation helps you work with it effectively.
