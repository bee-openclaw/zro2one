---
title: "AI Map — How ML, Deep Learning, NLP, LLMs, and MLLMs Fit Together"
depth: essential
pillar: foundations
topic: ai-foundations
tags: [ai, machine-learning, deep-learning, llm, mllm, nlp]
author: bee
date: "2026-03-03"
readTime: 8
description: "A clear visual map of AI and where ML, DL, NLP, LLMs, and MLLMs sit inside it."
related: [machine-learning-essential,what-is-deep-learning-essential,what-is-nlp-essential,what-is-mllm-essential,what-is-llm-essential]
---

Someone says "we should use AI for this." Someone else says "you mean ML?" A third person chimes in with "actually this is just a classification problem, we need deep learning." Then someone mentions LLMs. Then agents. Then multimodal.

By the end of the meeting, nobody agrees on what's being discussed because all these terms get used interchangeably when they're actually nested layers inside a hierarchy. Understanding that hierarchy won't just clear up the vocabulary — it will help you pick the right tool for the job and stop building the wrong thing.

The diagram below shows how these layers relate. Here's how to read it.

![How AI fits together — nested hierarchy showing AI containing ML, ML containing deep learning, deep learning powering NLP and LLMs, LLMs extending to MLLMs](/visuals/ai-map-stack.svg)

The diagram shows five nested layers. The outermost is AI — the broadest category. Each inner layer is a more specific approach within the one containing it. They're not separate tools; they're nested capabilities.

## The hierarchy explained

**AI (Artificial Intelligence)** is the broadest category. It refers to any software system designed to perform tasks that normally require human intelligence — recognizing patterns, understanding language, making predictions, generating content. The field is over 70 years old. Most of what you encounter today is one specific approach within AI: machine learning.

**Machine Learning (ML)** is a subset of AI where systems learn from data instead of following explicitly programmed rules. A spam filter that improves as it sees more emails is ML. A fraud detection system that learns from historical transactions is ML. The key characteristic: performance improves with exposure to more examples. You don't write rules — you provide data and the system finds patterns.

**Deep Learning (DL)** is a subset of machine learning that uses neural networks with many layers. The "deep" refers to the depth of layers, not complexity in the abstract. Earlier layers detect simple patterns (edges in an image, syllables in audio). Later layers combine these into richer representations (faces, words, concepts). Deep learning enabled the breakthroughs in speech recognition, image classification, and language understanding that define modern AI.

**NLP (Natural Language Processing)** is the application domain focused on language — text and speech. It's not a separate technology stack from deep learning; it's a problem area that deep learning has come to dominate. Classic NLP used rule-based approaches and specialized statistical models for each task. Modern NLP uses large neural networks that handle many tasks at once. The line between "NLP" and "LLMs" is now blurry — but NLP as a domain includes tasks beyond just LLMs (classical classification, information extraction, speech-to-text).

**LLMs (Large Language Models)** are a specific type of deep learning model — Transformer architectures trained on massive text datasets. They're not a new category of AI; they're a remarkably capable implementation of deep learning applied to language. ChatGPT, Claude, and Gemini are all LLMs. Their breadth comes from scale: enough training data and parameters that a single model handles many language tasks without task-specific retraining.

**MLLMs (Multimodal LLMs)** extend LLMs beyond text to multiple input types — images, audio, video, and more. GPT-4o, Claude 3.5 Sonnet, and Gemini Ultra are MLLMs. They're still LLMs at their core — the language understanding is intact — but they've added perception channels that let them reason across modalities. You can hand an MLLM a photo and ask a text question about it, and it processes both together.

## Input → process → output: picking the right layer

**Scenario:** Your company gets 5,000 customer support emails a week. You want to route them automatically to the right team.

**Option 1 (classical ML):** Train a text classifier on your historical emails with labels. Input: email text → Model: logistic regression or SVM on TF-IDF features → Output: team label + confidence score. Fast to train, cheap to run, deterministic, interpretable. Works if your categories are stable and your volume is high enough for good training data.

**Option 2 (LLM):** Send each email to an LLM with a prompt: "Classify this support email into one of these categories: [list]. Return the category and a brief explanation." Input: email text + prompt → LLM → Output: category + reasoning. More flexible for edge cases, handles new categories without retraining, but more expensive per call and less deterministic.

**Option 3 (MLLM, if emails include screenshots):** Same as option 2, but the model also reads any attached screenshots, error images, or UI captures included in the email. Input: email text + images → MLLM → Output: richer classification that incorporates visual context.

The right choice depends on your volume, your budget, your need for interpretability, and whether your inputs are text-only or mixed. The hierarchy helps you navigate that decision.

## Why people choose the wrong layer

The most common mistake: using an LLM for everything. LLMs are impressive and accessible, which makes them feel like the answer to every problem. But they're expensive per call, non-deterministic, and overkill for tasks with fixed patterns.

If you need to extract all phone numbers from a document, regex is the right tool. If you need to classify text into 3 stable categories and you have 50,000 labeled examples, a lightweight classifier will outperform an LLM on reliability and cost by an order of magnitude.

The second most common mistake: choosing "simpler ML" for complex unstructured tasks because it seems more interpretable or controllable. Classical ML feature engineering breaks down for language, audio, and images. Deep learning's end-to-end learning is what makes it the right tool for those modalities — not just a fancier option.

## The decision rule

Ask two questions before choosing a layer:

1. **What is the input data type?** Structured tabular data usually favors classical ML. Unstructured text, audio, or images usually favors deep learning / LLMs / MLLMs.

2. **Does the task need generalization across many subtypes, or is it well-defined and stable?** Well-defined, stable tasks with clear patterns favor specialized models. Open-ended, diverse tasks benefit from the generalization of LLMs.

The smallest, most reliable layer that solves your problem is the right choice. Not the most impressive one — the most appropriate one.

## The quick reference

| Layer | What it does | When to use |
|---|---|---|
| Classical ML | Learns patterns from structured data | Tabular data, stable categories, high volume, interpretability required |
| Deep Learning | Learns complex patterns from raw unstructured data | Images, audio, language at scale |
| NLP | Language-specific tasks | Classification, extraction, translation, summarization |
| LLM | General language tasks via prompting | Open-ended language work, reasoning, synthesis |
| MLLM | Language + visual/audio reasoning | Mixed-media inputs, document understanding, visual Q&A |

Know which level of the stack you're working at. It's the most important architectural decision in any AI project.
