---
title: "Text Summarization: From Extractive to Abstractive to LLM-Powered"
depth: applied
pillar: building
topic: nlp
tags: [nlp, summarization, text-processing, llms, applied]
author: bee
date: "2026-03-15"
readTime: 9
description: "Summarization has evolved from sentence extraction to sophisticated LLM-powered condensation. This guide covers techniques, trade-offs, and practical implementation."
related: [nlp-text-classification-guide, nlp-information-extraction-guide, prompting-structured-reasoning]
---

Text summarization is one of the oldest NLP tasks and one of the most practically useful. Every knowledge worker summarizes — emails, reports, meetings, research papers. AI summarization has evolved through three generations, each with distinct strengths.

## The three generations

### Generation 1: Extractive summarization

**Approach:** Select the most important sentences from the original text and concatenate them. No new language is generated — the summary is literally a subset of the source.

**How it works:** Score each sentence by importance (based on position, keyword frequency, similarity to other sentences, or TF-IDF), then select the top-scoring sentences.

**Strengths:**
- Never hallucinates (every sentence is from the source)
- Fast — no generation required
- Works at any scale (10-page documents to 1,000-page books)

**Weaknesses:**
- Summaries are often choppy — sentences lack transitions
- Can't synthesize across paragraphs
- Important information split across multiple sentences is often missed
- Fixed to the source's vocabulary and phrasing

**Still useful for:** Legal documents (where exact wording matters), very long documents (initial filtering), and any context where faithfulness is more important than readability.

### Generation 2: Abstractive summarization (pre-LLM)

**Approach:** Generate new text that captures the source's meaning. Models like BART, PEGASUS, and T5 were specifically trained for this task.

**How it works:** Encoder-decoder transformers read the full source and generate a summary token by token. Trained on large datasets of (document, summary) pairs.

**Strengths:**
- More fluent and natural than extractive
- Can synthesize information from multiple parts of the source
- Adjustable length and style through training

**Weaknesses:**
- Hallucination risk — models can generate plausible but incorrect details
- Limited context windows (typically 512-1024 tokens for input)
- Requires task-specific training data
- Struggles with out-of-domain content

**Historical significance:** These models proved that machines could summarize abstractively. But they've been largely superseded by LLMs for most applications.

### Generation 3: LLM-powered summarization

**Approach:** Use a general-purpose LLM (GPT-4, Claude, Gemini, Llama) with prompting to summarize any text.

**How it works:** Provide the source text in the prompt with instructions specifying length, style, audience, and focus areas. The LLM generates a summary following the instructions.

**Strengths:**
- Highly flexible — adjust focus, tone, length, and audience through prompts
- Handles diverse content without task-specific training
- Can follow complex instructions ("summarize for a technical audience, emphasizing methodology")
- Strong at synthesizing across long documents
- Can answer follow-up questions about the summary

**Weaknesses:**
- Hallucination remains a concern, especially for technical content
- Cost per summary is higher than purpose-built models
- Context window limits for very long documents
- Latency is higher than extractive methods

## Practical summarization strategies

### For short documents (< 4K tokens)

Simple single-pass prompting works well:

```
Summarize the following document in 3-5 bullet points, 
focusing on key decisions and action items:

{document}
```

Specify the output format, length, and focus explicitly. Vague instructions produce vague summaries.

### For medium documents (4K-100K tokens)

Most modern LLMs handle this range within their context windows. Key techniques:

**Structured prompting.** Ask for specific sections rather than a generic summary:

```
Read the following report and provide:
1. Executive summary (2-3 sentences)
2. Key findings (bullet points)
3. Recommendations (numbered list)
4. Open questions or risks
```

**Audience specification.** "Summarize for a CEO who has 60 seconds" produces very different output from "summarize for the engineering team."

### For long documents (> 100K tokens)

Documents exceeding the context window require a chunking strategy:

**Map-reduce.** Split the document into chunks, summarize each chunk independently, then summarize the summaries:

1. Split document into N chunks
2. Generate summary of each chunk
3. Concatenate chunk summaries
4. Generate final summary from chunk summaries

This scales to any document length. The downside: information that spans chunk boundaries may be lost.

**Hierarchical.** For structured documents (books with chapters, reports with sections), summarize at the natural hierarchy:

1. Summarize each section
2. Summarize each chapter from section summaries
3. Summarize the book from chapter summaries

**Incremental.** Process the document sequentially, maintaining a running summary:

1. Summarize chunk 1
2. Read chunk 2 + current summary → update summary
3. Read chunk 3 + current summary → update summary
4. Continue...

This preserves context better than map-reduce but is sequential (slower) and biased toward later content.

## Evaluating summary quality

### Automated metrics

**ROUGE** (Recall-Oriented Understudy for Gisting Evaluation) measures n-gram overlap between generated and reference summaries. ROUGE-1 (unigrams), ROUGE-2 (bigrams), and ROUGE-L (longest common subsequence) are standard. Good for extractive methods, less meaningful for abstractive.

**BERTScore** measures semantic similarity using contextual embeddings. Better for abstractive summaries since it captures meaning beyond exact word matching.

**LLM-as-judge.** Use a strong LLM to evaluate summary quality on dimensions like faithfulness, completeness, conciseness, and coherence. Increasingly the preferred evaluation method.

### Manual evaluation

For production systems, periodic human evaluation is essential. Evaluate:

- **Faithfulness:** Does the summary accurately represent the source? No hallucinated facts?
- **Coverage:** Are the key points captured? Anything important missing?
- **Conciseness:** Is the summary appropriately condensed? No unnecessary detail?
- **Coherence:** Does the summary read well? Logical flow?

### Hallucination detection

The critical quality dimension for production summarization. Techniques:

- **Entailment verification:** Check whether each claim in the summary is entailed by the source document
- **Source attribution:** For each summary sentence, identify which source sentences support it
- **Fact-checking pipeline:** Extract factual claims from the summary and verify against the source

## Common patterns and anti-patterns

**Do:** Specify the audience, format, and focus of the summary. "Summarize this research paper for a product manager, focusing on practical implications, in 5 bullet points" works much better than "summarize this."

**Do:** Include examples of good summaries in your prompt (few-shot) when quality and format consistency matter.

**Don't:** Ask for a summary "in your own words." LLMs don't have their own words — this instruction adds nothing. Specify what you actually want.

**Don't:** Assume the summary is faithful without verification. Especially for technical, medical, or legal content, always verify critical claims against the source.

**Do:** Use extractive approaches as a first pass for very long documents, then abstractive summarization on the extracted content. Hybrid approaches often outperform either alone.

## The future

Summarization is converging toward a world where LLMs handle most use cases competently, with specialized approaches for extreme requirements (million-token documents, real-time streaming summarization, guaranteed-faithful legal summarization).

The current bottleneck isn't generation quality — it's faithfulness verification. The summarization systems that win are the ones that can prove their summaries are accurate, not just the ones that produce the most fluent text.
