---
title: "Tokenizer Design and Vocabulary: How LLMs See Your Text"
depth: technical
pillar: foundations
topic: llms
tags: [llms, tokenization, bpe, vocabulary, text-processing, embeddings]
author: bee
date: "2026-03-29"
readTime: 12
description: "A deep dive into how tokenizers work — from byte-pair encoding to SentencePiece to tiktoken — and why tokenizer design choices have outsized effects on model behavior, cost, and multilingual performance."
related: [ai-foundations-tokenization-explained, llms-context-windows-explained, llms-scaling-laws-explained]
---

# Tokenizer Design and Vocabulary: How LLMs See Your Text

Before a language model processes a single word, a tokenizer has already made hundreds of decisions about how to represent your text. These decisions — which character sequences become single tokens, how large the vocabulary is, how unknown words are handled — shape everything from inference cost to multilingual capability to the model's ability to reason about code.

Tokenizers are the least glamorous component of the LLM stack and arguably the most consequential per engineering hour spent on them.

## Why Tokenization Matters More Than You Think

A language model never sees characters or words. It sees token IDs — integers that index into an embedding table. The tokenizer defines the mapping between human-readable text and these integers.

This mapping affects:

- **Cost.** API pricing is per token. A tokenizer that represents "authentication" as one token versus three tokens changes your bill by 3x for that word.
- **Context utilization.** A 128K context window means 128K tokens, not characters. Inefficient tokenization wastes context on encoding overhead.
- **Multilingual fairness.** English-centric tokenizers might encode a Chinese sentence in 3x more tokens than the equivalent English sentence, making non-English use disproportionately expensive and context-limited.
- **Code handling.** Whether whitespace-heavy Python code bloats your token count depends entirely on tokenizer design.

## Byte-Pair Encoding: The Dominant Algorithm

Most modern LLMs use some variant of Byte-Pair Encoding (BPE). The algorithm is elegantly simple:

1. Start with a base vocabulary of individual characters (or bytes).
2. Count all adjacent pairs in the training corpus.
3. Merge the most frequent pair into a new token.
4. Repeat until you reach your target vocabulary size.

After training, the tokenizer applies these merges in the learned order to new text. The word "tokenization" might become `["token", "ization"]` or `["tok", "en", "ization"]` depending on what merges were learned.

**Why BPE works well:**
- Common words become single tokens (efficient).
- Rare words decompose into subword pieces (no out-of-vocabulary problem).
- The vocabulary size is a tunable hyperparameter.

**OpenAI's tiktoken** uses BPE with a byte-level base vocabulary — every possible byte is a valid starting token. This eliminates unknown characters entirely. Any UTF-8 text can be tokenized, even binary data.

## SentencePiece: The Alternative Approach

Google's SentencePiece takes a different path. Instead of operating on pre-tokenized words, it treats the input as a raw stream of Unicode characters (or bytes) and learns subword units directly. This makes it language-agnostic by design — no need for language-specific pre-tokenization rules.

SentencePiece supports two algorithms:
- **BPE** (same core algorithm, different implementation)
- **Unigram** — starts with a large vocabulary and iteratively removes tokens that contribute least to the corpus likelihood

The unigram approach is theoretically cleaner: it optimizes a probabilistic objective rather than greedily merging pairs. In practice, both produce similar quality tokenizations.

Models like LLaMA, Gemma, and T5 use SentencePiece. GPT-4 and Claude use tiktoken-style BPE.

## Vocabulary Size: The Fundamental Tradeoff

Vocabulary size is one of the most important design decisions:

**Small vocabulary (e.g., 32K tokens):**
- Smaller embedding table → less memory
- More tokens per text → longer sequences, higher compute
- Better generalization to rare words (more subword sharing)

**Large vocabulary (e.g., 128K+ tokens):**
- Fewer tokens per text → shorter sequences, faster inference
- Larger embedding table → more parameters
- Common phrases might become single tokens
- Risk of undertrained embeddings for rare tokens

The trend has been toward larger vocabularies. GPT-2 used ~50K tokens. GPT-4 uses ~100K. Some multilingual models push to 250K+. The reasoning: modern models are large enough that the embedding table is a tiny fraction of total parameters, so the compression benefits of larger vocabularies dominate.

## The Multilingual Problem

English-trained tokenizers are notoriously unfair to other languages. A tokenizer trained primarily on English text might tokenize "hello" as one token but "こんにちは" (Japanese for "hello") as five tokens. This means:

- Japanese users pay 5x more per equivalent message
- Japanese text uses 5x more context window
- The model effectively has 5x less working memory for Japanese

Solutions include:
- **Balanced training corpora** — ensuring the tokenizer sees proportional amounts of each language
- **Language-specific tokens** — adding common words from target languages as single tokens
- **Byte-level fallback** — guaranteeing any text can be encoded, even if inefficiently

Modern multilingual models like Gemma 2 and LLaMA 3 have made significant progress here, but the gap between English efficiency and other languages persists.

## Special Tokens: The Hidden Control Layer

Beyond regular text tokens, tokenizers include special tokens that control model behavior:

- `<|begin_of_text|>` — marks the start of input
- `<|end_of_turn|>` — separates conversation turns  
- `<|system|>`, `<|user|>`, `<|assistant|>` — role markers in chat formats
- `<|pad|>` — fills unused positions in batched inputs

These tokens are never generated from regular text — they are injected by the chat template or API layer. They form a control plane that is invisible to users but critical for model behavior.

Getting special tokens wrong is a common source of bugs. A misplaced end-of-turn token can cause the model to think it has already responded. A missing system token can cause it to ignore system prompt instructions.

## Tokenization and Arithmetic

LLMs are famously bad at arithmetic. Tokenization is partly why.

The number "12345" might be tokenized as `["123", "45"]` or `["1", "2345"]` — the digit boundaries are arbitrary and inconsistent. The model has to learn arithmetic not over digits but over arbitrary multi-digit chunks whose boundaries shift depending on context.

Some researchers have experimented with digit-level tokenization for numbers, but this increases sequence length significantly. Others use special number encoding schemes. The fundamental tension between compression efficiency and semantic granularity remains unresolved.

## Practical Implications for Developers

**Token counting matters for cost estimation.** Use the provider's tokenizer library to count tokens before sending requests. Rough heuristic: 1 token ≈ 4 characters in English, but this varies wildly for code, other languages, and structured data.

**Prompt engineering is partly token engineering.** Understanding how your prompts tokenize can reveal why certain phrasings work better. A word that tokenizes as a single token has a unified representation; one that splits into subwords has a compositional representation.

**Structured data is expensive.** JSON, XML, and other structured formats have high token overhead due to repeated delimiters, brackets, and keys. This is why some developers prefer compact formats like YAML or custom delimiters for large structured inputs.

**Test with the actual tokenizer.** Most providers offer tokenizer libraries (tiktoken for OpenAI, tokenizers for Hugging Face models). Use them to understand exactly how your inputs are processed.

## The Future of Tokenization

Research is exploring alternatives to traditional tokenization:

- **Byte-level models** that process raw bytes without any tokenizer (like ByT5). These eliminate tokenization artifacts but are computationally expensive.
- **Multi-granularity tokenization** that represents text at multiple scales simultaneously.
- **Dynamic vocabularies** that adapt to the input domain.
- **Tokenizer-free architectures** that learn character-level representations end-to-end.

For now, BPE-family tokenizers remain dominant because they offer the best balance of compression, flexibility, and computational efficiency. But as models grow and multilingual demands increase, tokenizer design will continue evolving.

## Key Takeaways

Tokenizers are not just a preprocessing step — they are a fundamental design choice that affects model capability, cost, fairness, and behavior. Understanding how your model's tokenizer works gives you better intuition for prompt engineering, cost optimization, and diagnosing unexpected model behavior.

The best tokenizer is invisible: it maps your intent to the model's representation space with minimal distortion, regardless of language, domain, or format.
