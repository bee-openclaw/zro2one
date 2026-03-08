---
title: "From RNNs to Transformers: The Architecture Shift That Changed AI"
depth: technical
pillar: foundations
topic: deep-learning
tags: [deep-learning, rnn, lstm, transformer, sequence-modeling, attention, nlp]
author: bee
date: "2026-03-08"
readTime: 11
description: "Why did transformers replace RNNs so completely? Understanding the problems with recurrent architectures reveals exactly why attention-based transformers were such a breakthrough."
related: [ai-foundations-attention-mechanisms, ai-foundations-transformers, deep-learning-backpropagation]
---

The history of sequence modeling in deep learning is essentially a story about one problem — **how do you represent and reason over long-range dependencies in sequential data?** — and the progression of increasingly better answers.

Understanding why RNNs existed, what problems they solved, and why they ultimately couldn't scale reveals exactly why transformers were such a fundamental breakthrough rather than an incremental improvement.

## What recurrent networks were trying to do

Before deep learning, sequence modeling relied on probabilistic models (HMMs, n-gram language models) that had severe limitations: n-grams could only look back N steps; HMMs required discrete latent states that couldn't represent rich meaning.

Deep learning offered something more powerful: **learned representations**. Instead of hand-crafting features, a network could learn to represent the relevant information from data.

For sequences, the challenge is that the right interpretation of any element often depends on context that came before. The word "bank" means something different in "river bank" vs. "savings bank." Processing words independently misses this.

The recurrent neural network solution: process the sequence one element at a time, maintaining a **hidden state** that's updated at each step. The hidden state accumulates information from the sequence so far.

```
h_t = f(W_h · h_{t-1} + W_x · x_t + b)
```

At each time step t, the new hidden state h_t is computed from:
- The previous hidden state h_{t-1} (what we remember)
- The current input x_t (what we see now)
- Learned weight matrices W_h and W_x, and bias b
- A nonlinear activation function f (typically tanh)

This is recurrence: the network "recurs" over the sequence, updating its memory state at each step.

## What RNNs could actually do

RNNs were genuinely powerful for their time. They enabled:

- **Language modeling:** Predict the next word given all previous words. Trained on text, they captured surprisingly rich patterns — they "knew" that opening brackets should close, that sentences have grammatical structure, that subject-verb agreement matters.

- **Machine translation:** Encoder-decoder architectures used one RNN to read a source sentence into a fixed-size vector, then another to decode that into the target language.

- **Speech recognition:** Sequence-to-sequence mapping of audio frames to phonemes.

- **Time series prediction:** Stock prices, sensor readings, any sequential numeric data.

For moderate sequence lengths, they worked reasonably well. The hidden state compressed the relevant history, and the model could use it to condition future predictions.

## The fundamental problems

But as researchers pushed to handle longer sequences and more complex tasks, fundamental limitations appeared.

### The vanishing gradient problem

Backpropagation through time (BPTT) — the algorithm used to train RNNs — requires computing gradients through the entire sequence. For each time step back in the sequence, the gradient is multiplied by the weight matrix W_h.

If W_h has eigenvalues less than 1 (which they typically are, to prevent exploding gradients), this multiplication shrinks the gradient exponentially. By the time you're computing how the output depends on the input from 50 steps ago, the gradient has vanished to near zero.

The practical consequence: **RNNs couldn't learn long-range dependencies.** They'd forget information after roughly 20-30 steps. For a model reading a paragraph or a document, the beginning was effectively invisible to the output.

### Exploding gradients

The opposite problem: if eigenvalues are greater than 1, gradients explode exponentially. This is handled with gradient clipping (cap the gradient norm), but it's an inelegant fix to a structural problem.

### Sequential computation

RNNs compute one time step at a time. You can't compute h_10 without h_9, which requires h_8, and so on. This is inherently sequential — it can't be parallelized.

During training, this was the binding constraint on scale. GPU hardware is massively parallel; RNNs couldn't leverage it. Training on long sequences was slow, and training on very long documents was infeasible.

### The information bottleneck

In encoder-decoder translation models, the entire meaning of the source sentence had to be compressed into a single fixed-size hidden state vector. This bottleneck severely limited translation quality on long sentences — the model simply couldn't fit all relevant information.

## The LSTM: solving some problems, not others

**Long Short-Term Memory (LSTM)** networks, proposed by Hochreiter and Schmidhuber in 1997, addressed the vanishing gradient problem with a clever architectural fix: the **cell state**.

The LSTM introduces a cell state c_t — a "conveyor belt" that runs through the sequence with relatively few, mostly additive operations. Information can be added to or removed from the cell state, but the cell state itself doesn't get squished through repeated nonlinear transformations.

Three learned gates control information flow:

**Forget gate:** "What fraction of the previous cell state should I forget?"
```
f_t = σ(W_f · [h_{t-1}, x_t] + b_f)
```

**Input gate:** "What new information should I add to the cell state?"
```
i_t = σ(W_i · [h_{t-1}, x_t] + b_i)
c̃_t = tanh(W_c · [h_{t-1}, x_t] + b_c)
c_t = f_t ⊙ c_{t-1} + i_t ⊙ c̃_t
```

**Output gate:** "What should I output based on the cell state?"
```
o_t = σ(W_o · [h_{t-1}, x_t] + b_o)
h_t = o_t ⊙ tanh(c_t)
```

The additive cell state update means gradients can flow backward more easily — they're not squeezed through repeated multiplicative operations.

LSTMs were a real improvement: they could handle dependencies of hundreds of steps rather than tens. They dominated NLP benchmarks for years. GRUs (Gated Recurrent Units) offered a simplified version with similar performance and fewer parameters.

But LSTMs still had the sequential computation problem — they were still recurrent, still one-step-at-a-time. And for very long documents, even LSTMs struggled.

## Attention: the key insight

The breakthrough that eventually displaced RNNs didn't come from better recurrence. It came from questioning whether recurrence was necessary at all.

**The attention mechanism** (Bahdanau et al., 2015, originally applied to encoder-decoder translation) attacked the information bottleneck problem differently. Instead of compressing the entire source sentence into one vector, let the decoder directly access all encoder hidden states, with learned relevance weights.

At each decoding step, compute a weighted average of all encoder states:
- High weight on states most relevant to generating the current output word
- Near-zero weight on less relevant states

This immediately improved translation quality: the decoder could "look at" the relevant part of the source sentence at each step, rather than hoping it survived compression into a single vector.

More importantly, it introduced a key idea: **direct connections between any two positions, with learned relevance weights.** No information bottleneck. No sequential dependency for accessing information.

## The transformer: attention without recurrence

The 2017 paper "Attention Is All You Need" (Vaswani et al.) made the radical move: **remove recurrence entirely.** Build a model entirely on attention.

Self-attention lets every position in a sequence attend to every other position directly. Process all positions in parallel. No sequential dependency. No hidden state to maintain.

This solved the remaining problems:
- **Vanishing gradients:** Direct connections mean gradients can flow from output directly to any input position
- **Parallelization:** All positions computed simultaneously — perfect for GPU/TPU acceleration
- **Long-range dependencies:** Position 1 and position 512 have a direct connection of the same "distance" as positions 1 and 2

The transformer also introduced positional encoding (since without recurrence there's no inherent sense of order) and multi-head attention (multiple attention patterns learned simultaneously).

## Why the switch was so complete

When transformers arrived, researchers expected them to improve on RNNs — to be better. What nobody expected was how completely they would displace the previous paradigm.

This happened for three reasons:

**Scaling:** Transformers could be scaled to vastly more parameters and data because of parallel computation. RNNs couldn't use the GPU compute available; transformers could. This meant transformer improvements from scale were available in ways that LSTM improvements were not.

**Pre-training:** Self-supervised pre-training on massive text corpora (BERT, GPT) was enabled by transformers. The parallel processing made training on billions of tokens feasible. This pre-training + fine-tuning paradigm defined modern NLP.

**Generality:** Attention is a general mechanism. The same architecture works for text, images (ViT), audio, protein sequences, graphs. RNNs were inherently sequence-linear; transformers are inherently relational.

## What RNNs are still used for

RNNs and LSTMs haven't entirely disappeared. They still appear in:
- **Edge/embedded systems** where transformer inference costs are too high
- **Streaming applications** requiring true online, step-by-step processing
- **Certain time series tasks** where the sequential inductive bias is helpful
- **Legacy systems** where the cost of migration outweighs the benefit

But for any task where scale and compute are available, transformers have won. BERT was the first to clearly demonstrate it in NLP (2018); GPT-2 (2019) and GPT-3 (2020) scaled it to language modeling; ViT (2020) proved the same for vision.

## The lesson

The RNN-to-transformer transition is a case study in how architectural constraints limit what's possible. RNNs weren't bad; they were limited by recurrence in ways that prevented them from scaling. Removing that constraint — not just optimizing it — unlocked the current era of AI.

When you see fundamental limitations in current architectures, that's often where the next breakthrough will come from: not optimization, but redesign.
