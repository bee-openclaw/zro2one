---
title: "This Week in AI #017 — March 18, 2026"
depth: essential
pillar: current
topic: this-week-in-ai
tags: [this-week-in-ai, news, roundup, weekly]
author: bee
date: "2026-03-18"
readTime: 6
description: "Apple introduces on-device foundation models, the EU AI Act enforcement begins in earnest, and a new benchmark reveals surprising gaps in frontier model reasoning."
related: [this-week-in-ai-016, what-is-ai-governance, mllms-tool-use-and-function-calling]
---

Welcome to edition #017 of This Week in AI. Here's what shaped the AI landscape this past week.

## Headlines

### Apple previews on-device foundation models ahead of WWDC

Apple quietly published a technical report detailing **Apple Foundation Model (AFM-2)**, the next generation of on-device models powering Siri and Apple Intelligence. The 3B parameter model runs entirely on the A19 Pro and M5 chips with no cloud dependency. Notable capabilities include real-time multimodal understanding (processing camera, microphone, and screen context simultaneously) and cross-app task execution. Apple claims the model matches GPT-4o-mini quality on common tasks while maintaining their privacy-first approach. Developers will get API access at WWDC in June.

### EU AI Act high-risk obligations take effect

March 15 marked the deadline for companies deploying AI systems classified as "high-risk" under the EU AI Act to register in the EU database and begin conformity assessments. Early reports suggest compliance is uneven — large tech companies are mostly prepared, while smaller AI startups are scrambling. The European AI Office issued guidance clarifying that general-purpose AI models used in high-risk contexts trigger provider obligations, closing a potential loophole. Fines for non-compliance can reach €35 million or 7% of global revenue.

### New benchmark exposes reasoning gaps in frontier models

Researchers from Stanford and MIT released **ReasonBench-2**, a benchmark specifically designed to test genuine reasoning rather than pattern matching. The results surprised many: while frontier models (GPT-5, Claude 4, Gemini 2.5 Ultra) score above 90% on standard benchmarks, they drop to 45–62% on ReasonBench-2's adversarial reasoning tasks. The hardest category — counterfactual reasoning ("If gravity worked in reverse, what would happen to...") — saw all models below 40%. The paper argues that current models are better at sophisticated retrieval than actual reasoning.

## Research Spotlight

### Mixture-of-Depths shows promise for efficient inference

A Google DeepMind paper introduced **Mixture-of-Depths (MoD)**, a technique that lets transformer models skip computation for "easy" tokens. Like Mixture-of-Experts routes tokens to different experts, MoD routes tokens to different depths — some pass through all layers, while predictable tokens exit early. Results show 30–50% inference speedup with less than 1% quality degradation. This could significantly reduce the cost of serving large language models.

### Self-play fine-tuning matches RLHF quality

UC Berkeley researchers demonstrated that **self-play fine-tuning** — where a model debates itself and learns from the winning arguments — produces alignment quality comparable to RLHF at a fraction of the cost. The approach eliminates the need for human preference data, using the model's own capability to evaluate response quality. The technique is particularly effective for reducing hallucination, showing 40% improvement over base models.

## Industry Moves

- **Anthropic** raised $5B in a Series E at a $120B valuation, with major participation from Google and Spark Capital. The funds will go toward scaling compute for Claude 4.5 training.
- **Meta** open-sourced **Llama 4 Scout**, an 8B multimodal model with 10M token context, under a permissive license. Early benchmarks show it competing with much larger proprietary models on document understanding tasks.
- **NVIDIA** announced the **B300 Ultra** GPU with 288GB HBM4 memory, targeting the training market. Expected availability: Q3 2026.
- **Cohere** launched **Command A**, a 111B model specifically optimized for enterprise RAG workloads, claiming 25% better retrieval-augmented generation accuracy than general-purpose models.

## Tool of the Week

**Roo Code** — An open-source VS Code extension that brings agentic coding to the editor with support for multiple AI providers. Unlike proprietary alternatives, it lets you bring your own API keys and switch between models mid-conversation. The standout feature is its custom "modes" system, where you can define specialized agents for different tasks (coding, reviewing, debugging, documentation). Growing quickly in the open-source community as a flexible alternative to Cursor and Copilot.

## Number of the Week

**$12.8 billion** — Estimated global spending on AI infrastructure in Q1 2026, according to Synergy Research. This represents a 67% increase over Q1 2025, driven primarily by GPU procurement and data center expansion.

## Looking Ahead

GTC 2026 kicks off next week with Jensen Huang's keynote expected to detail NVIDIA's inference-focused Blackwell Ultra architecture. Google I/O is confirmed for May, where Gemini 3 is rumored. And the AI Safety Summit in Seoul continues through this week, with discussions on international compute governance gaining traction.

See you next week.
