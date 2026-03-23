---
title: "Text Preprocessing in 2026: What Still Matters and What Doesn't"
depth: applied
pillar: building
topic: nlp
tags: [nlp, preprocessing, text-processing, practical]
author: bee
date: "2026-03-23"
readTime: 9
description: "A modern guide to text preprocessing — what's still necessary in the age of LLMs, what's been made obsolete, and the preprocessing steps that actually improve your NLP pipeline."
related: [nlp-from-rules-to-transformers-guide, nlp-text-classification-guide, ai-foundations-tokenization-explained]
---

# Text Preprocessing in 2026: What Still Matters and What Doesn't

Text preprocessing guides haven't kept up with the models. Most still teach a pipeline designed for bag-of-words models: lowercase everything, remove stopwords, stem words, strip punctuation. Following that advice in 2026 will actively hurt your results.

Modern language models handle raw text well. But that doesn't mean preprocessing is dead — it's changed. Here's what actually matters now.

## What You Can (Mostly) Stop Doing

### Lowercasing

Old wisdom: convert everything to lowercase to reduce vocabulary size.

Modern reality: casing carries information. "Apple" (company) vs. "apple" (fruit). "WHO" (organization) vs. "who" (pronoun). Transformer tokenizers handle cased text natively.

**When to still lowercase:** search and retrieval where case-insensitive matching is explicitly desired. Even then, do it at query time, not on the stored text.

### Stopword Removal

Old wisdom: remove "the," "is," "and" to reduce noise.

Modern reality: stopwords carry syntactic and semantic information. "Not good" without "not" is just "good." Transformers use attention to weight word importance dynamically — they've learned what to ignore.

**When to still remove stopwords:** keyword extraction, TF-IDF based systems, or when token limits force aggressive compression.

### Stemming

Old wisdom: reduce "running," "runs," "ran" to "run" so they match.

Modern reality: stemming destroys information (and produces non-words like "comput" from "computing"). Subword tokenization (BPE, WordPiece) handles morphological variation naturally.

**When to still stem:** legacy search systems, very resource-constrained environments where vocabulary size matters.

### Punctuation Removal

Old wisdom: strip all punctuation as noise.

Modern reality: punctuation is structure. Question marks, commas, semicolons — they signal intent, clause boundaries, and tone. LLMs use them.

**When to still remove punctuation:** almost never for LLM-based pipelines. Maybe for very specific classification tasks where you've empirically verified it helps.

## What Still Matters

### Unicode Normalization

This is boring but critical. The same text can be encoded differently in Unicode:

```python
# These look identical but are different byte sequences
"café"  # 'é' as a single character (NFC)
"café"  # 'e' + combining accent (NFD)
```

Normalize to NFC (the most common form) before any processing:

```python
import unicodedata

def normalize_unicode(text):
    return unicodedata.normalize("NFC", text)
```

Without this, identical-looking strings won't match in search, deduplication, or comparison.

### Whitespace Normalization

Real-world text has inconsistent whitespace: multiple spaces, tabs, non-breaking spaces, zero-width characters, and mixed line endings.

```python
import re

def normalize_whitespace(text):
    # Replace various whitespace characters with standard space
    text = re.sub(r'[\t\r\xa0\u200b\u200c\u200d\ufeff]', ' ', text)
    # Collapse multiple spaces
    text = re.sub(r' +', ' ', text)
    # Normalize line endings
    text = text.replace('\r\n', '\n')
    return text.strip()
```

### HTML/Markup Cleaning

Web-sourced text often contains HTML tags, entities, and artifacts:

```python
from bs4 import BeautifulSoup
import html

def clean_html(text):
    # Decode HTML entities
    text = html.unescape(text)
    # Remove HTML tags (preserve text content)
    text = BeautifulSoup(text, "html.parser").get_text(separator=" ")
    return text
```

Be careful with aggressive cleaning — sometimes formatting (headers, lists, emphasis) carries semantic information worth preserving.

### Encoding Issues

Mojibake — garbled text from encoding mismatches — is still common in production data:

```python
import ftfy

def fix_encoding(text):
    return ftfy.fix_text(text)

# "The Mona Lisa doesnÃ¢â‚¬â„¢t smile" → "The Mona Lisa doesn't smile"
```

The `ftfy` library handles most encoding issues automatically. Run it early in your pipeline.

### Length Management

LLMs have context limits. Long documents need to be chunked, truncated, or summarized:

```python
def smart_truncate(text, max_tokens=4000, tokenizer=None):
    tokens = tokenizer.encode(text)
    if len(tokens) <= max_tokens:
        return text
    
    # Truncate at sentence boundary
    truncated = tokenizer.decode(tokens[:max_tokens])
    last_period = truncated.rfind('.')
    if last_period > len(truncated) * 0.8:  # Don't cut too much
        return truncated[:last_period + 1]
    return truncated
```

For RAG and document processing, chunking strategy matters more than any other preprocessing step.

### PII Redaction

If your pipeline processes user data, redact personally identifiable information before sending to external APIs:

```python
import re

def redact_pii(text):
    # Email
    text = re.sub(r'\b[\w.+-]+@[\w-]+\.[\w.-]+\b', '[EMAIL]', text)
    # Phone (US)
    text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]', text)
    # SSN
    text = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]', text)
    return text
```

For production use, consider dedicated PII detection models (Presidio, AWS Comprehend) that handle more patterns and languages.

## Domain-Specific Preprocessing

### Code
- Preserve indentation and formatting (they're semantic)
- Handle or standardize comment styles
- Consider whether to include import statements and boilerplate

### Medical/Scientific Text
- Expand or standardize abbreviations (inconsistent abbreviation is a major issue)
- Handle chemical formulas and notation
- Preserve numerical precision

### Social Media
- Handle @mentions, #hashtags, URLs, emojis
- Decide whether to expand contractions ("don't" → "do not" — usually don't bother for LLMs)
- Handle intentional misspellings and slang (often carry meaning — don't "correct" them)

### Legal/Financial
- Preserve section numbering and cross-references
- Handle defined terms (Title Case terms that have specific legal meanings)
- Maintain document structure (sections, subsections, clauses)

## The Modern Preprocessing Pipeline

For most LLM-based applications in 2026:

```python
def preprocess(text):
    text = fix_encoding(text)           # Fix encoding issues
    text = normalize_unicode(text)      # Normalize Unicode
    text = clean_html(text)             # Remove HTML if present
    text = normalize_whitespace(text)   # Clean whitespace
    text = redact_pii(text)             # Remove PII if needed
    # DO NOT: lowercase, remove stopwords, stem, remove punctuation
    return text
```

That's it. Five steps. Let the model handle the rest.

The irony of modern NLP preprocessing: the better the model, the less preprocessing you need. But the preprocessing you *do* need — encoding fixes, Unicode normalization, PII redaction — is more about data hygiene than linguistic transformation. Less art, more plumbing. And the plumbing matters.
