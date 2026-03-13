---
title: "Tokenization Explained: How AI Reads Text"
depth: essential
pillar: foundations
topic: ai-foundations
tags: [ai-foundations, tokenization, bpe, tokens, nlp, llms]
author: bee
date: "2026-03-13"
readTime: 8
description: "AI models don't read words — they read tokens. Understanding tokenization explains why models struggle with spelling, why some languages cost more, and why context windows have limits."
related: [ai-foundations-embeddings-explained, how-llms-work-essential, ai-foundations-transformers]
---

When you type a message to ChatGPT, it doesn't see words. It sees tokens — chunks of text that might be whole words, parts of words, or even individual characters. This seemingly mundane detail explains a surprising number of AI behaviors.

## Why Tokenization Matters

Language models are mathematical systems. They operate on numbers, not text. Tokenization is the bridge: it converts text into a sequence of integer IDs that the model can process.

The choice of tokenization scheme affects:

- **Cost** — API pricing is per token, not per word
- **Context limits** — the 128K context window is measured in tokens
- **Performance** — how text is split influences what patterns the model can learn
- **Multilingual ability** — some tokenizers handle non-English languages poorly
- **Weird behaviors** — tokenization explains why models struggle with counting letters or reversing words

## From Characters to Subwords

### Character-Level

The simplest approach: treat each character as a token. "Hello" becomes ["H", "e", "l", "l", "o"].

Pros: small vocabulary (just ~256 characters for English), handles any word including made-up ones.
Cons: sequences become extremely long, and the model has to learn spelling from scratch. A 1,000-word essay might be 5,000+ character tokens.

### Word-Level

Split on spaces and punctuation. "The cat sat" becomes ["The", "cat", "sat"].

Pros: intuitive, sequences are short.
Cons: vocabulary explodes. English has hundreds of thousands of words, plus misspellings, technical terms, proper nouns. Any word not in the vocabulary is unknown.

### Subword Tokenization (What Actually Gets Used)

The middle ground. Break words into commonly occurring subword pieces. "unhappiness" might become ["un", "happi", "ness"]. Common words like "the" stay whole. Rare words get split into recognizable pieces.

This is what modern language models actually use. It balances vocabulary size (typically 32K-100K tokens) with sequence length and coverage of rare words.

## Byte Pair Encoding (BPE)

The most common subword algorithm. Here's how it works:

1. Start with individual characters as your initial vocabulary
2. Count all adjacent pairs in the training text
3. Merge the most frequent pair into a single token
4. Repeat until you reach your target vocabulary size

Example starting from "low lower newest":

```
Initial: l o w _ l o w e r _ n e w e s t
Most frequent pair: (e, s) → merge to "es"
Then: (es, t) → "est"
Then: (l, o) → "lo"
Then: (lo, w) → "low"
...and so on
```

After thousands of merges, you end up with a vocabulary that efficiently represents the training text. Common words and subwords get their own tokens. Rare text falls back to character-level representation.

GPT-4 uses a BPE tokenizer with roughly 100,000 tokens. Claude uses a similar approach.

## What Tokens Actually Look Like

This surprises most people. Tokens don't align with words the way you'd expect:

| Text | Tokens |
|------|--------|
| "Hello world" | ["Hello", " world"] |
| "tokenization" | ["token", "ization"] |
| "ChatGPT" | ["Chat", "G", "PT"] |
| " indentation" | [" ind", "ent", "ation"] |
| "🎉" | [specific emoji token] |

Note the leading spaces — most tokenizers treat " the" (with a space) and "the" (without) as different tokens. This is why whitespace handling matters in prompts.

## Why This Explains AI Quirks

### Spelling and Character Tasks

When you ask "How many r's in strawberry?", the model doesn't see individual letters. It might see ["str", "aw", "berry"]. It has to reason about character-level questions using subword representations, which is inherently harder.

### Counting and Math

Numbers tokenize inconsistently. "1234" might be one token, but "12345" might be ["123", "45"]. This makes arithmetic unreliable because the model can't consistently access individual digits.

### Code Behavior

Code tokenization matters a lot. Whitespace, brackets, and common programming patterns get their own tokens. A well-tokenized programming language (Python, JavaScript) tends to get better model performance than a poorly tokenized one, simply because the model can "see" the structure more clearly.

### Language Bias

BPE tokenizers trained primarily on English text create more tokens for non-English languages. A sentence in Japanese or Arabic might use 2-3x as many tokens as the English equivalent, meaning:

- Higher API costs for non-English text
- Less effective context window utilization
- Potentially lower quality outputs due to longer sequences

This is a real equity issue. A Thai user pays more per message and gets less context window than an English user, purely because of tokenizer design.

## Tokenizer Differences Between Models

Different model families use different tokenizers:

- **GPT-4** — cl100k_base tokenizer (~100K vocab)
- **Claude** — custom tokenizer, similar scale
- **Llama** — SentencePiece with 32K vocab
- **Gemini** — SentencePiece variant, 256K vocab

The same text produces different token counts across models. "Hello, world!" might be 4 tokens in one model and 3 in another. This is why token counts aren't directly comparable across providers.

## Practical Implications

### Prompt Engineering

Understanding tokenization helps you write more efficient prompts:

- Common words and phrases use fewer tokens than unusual ones
- Abbreviations aren't always shorter in tokens
- Code blocks can be token-expensive depending on formatting
- JSON with lots of quoted keys is more token-expensive than you'd expect

### Cost Optimization

If you're building applications, token efficiency matters for costs:

- Strip unnecessary whitespace and formatting
- Use concise system prompts
- Consider whether you need the full document or just relevant sections
- Monitor token usage per request to catch inefficiencies

### Context Window Management

When working with long documents, token count determines how much fits in context:

- English text averages roughly 1 token per 4 characters, or about 0.75 tokens per word
- Code tends to use more tokens per line than prose
- Structured data (JSON, XML) is relatively token-expensive

## The Future of Tokenization

Current tokenizers are good enough, but not ideal. Active research areas:

- **Byte-level models** that skip tokenization entirely, processing raw bytes
- **Multilingual-fair tokenizers** that allocate vocabulary more equitably across languages
- **Dynamic tokenization** that adapts to content type
- **Patch-based tokenization** for multimodal models that need to handle images and text in a unified framework

The trend is toward tokenization becoming less of a bottleneck as models get better at handling longer sequences and as tokenizers become more language-equitable.

## What to Read Next

- **[Embeddings Explained](/learn/ai-foundations-embeddings-explained)** — what happens after tokenization
- **[How LLMs Work](/learn/how-llms-work-essential)** — the full pipeline from input to output
- **[Transformers Explained](/learn/ai-foundations-transformers)** — the architecture that processes token sequences
