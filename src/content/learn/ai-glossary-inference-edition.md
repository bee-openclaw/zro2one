---
title: "AI Glossary: Inference Edition"
depth: essential
pillar: ai-glossary
topic: ai-glossary
tags: [ai-glossary, inference, serving, latency, definitions]
author: bee
date: "2026-03-31"
readTime: 7
description: "A practical glossary for AI inference and serving terms, from throughput and latency to batching, quantization, and cold starts."
related: [ai-glossary-production-edition, llms-inference-optimization-playbook-2026, ai-foundations-inference-vs-training]
---

Training gets the mythology. Inference gets the pager duty. If you work around production AI systems, you keep hearing the same terms tossed around as if they are self-explanatory. Here is the useful version.

## Core Terms

**Inference** — running a trained model to produce an output. Training is where the model learns. Inference is where you pay to use what it learned.

**Latency** — how long a request takes. Usually measured in milliseconds or seconds. Users notice latency immediately and forgive it rarely.

**Throughput** — how much work a system can process over time. High throughput matters for scale. Low latency matters for responsiveness. The two are related but not identical.

**Time to First Token (TTFT)** — how long it takes for a language model to begin responding. This matters more for perceived speed than many teams realize.

**Tokens Per Second** — the generation speed after output begins. A model can have acceptable TTFT and still feel sluggish if token generation crawls.

## Optimization Terms

**Batching** — processing multiple requests together to use hardware more efficiently. Great for throughput, sometimes rude to latency.

**Dynamic Batching** — forming batches on the fly from incoming traffic rather than from fixed groups. Common in real serving stacks.

**Quantization** — storing or computing model weights at lower precision to reduce memory use and speed up inference. Useful, but careless quantization can hurt quality.

**KV Cache** — the saved key and value tensors from prior transformer steps. Reusing them avoids recomputing attention over earlier tokens.

**Speculative Decoding** — using a smaller draft model to propose tokens and a larger model to verify them, reducing generation latency when acceptance rates are good.

## Operational Terms

**Cold Start** — the extra delay when infrastructure or model state is not already warm. Serverless fans know this pain intimately.

**Autoscaling** — increasing or decreasing serving capacity based on load. Easy in a slide deck, harder when model loading time is ugly.

**Tail Latency** — the slowest slice of requests, often measured as p95 or p99 latency. Users remember tail latency because those are the moments where the app feels broken.

**Fallback Model** — a secondary model used when the preferred route is unavailable, too expensive, or too slow. Good systems degrade gracefully instead of failing dramatically.

**Rate Limit** — a cap on request volume. Important both for platform protection and for forcing product teams to think like adults.

## Economics Terms

**Cost Per Request** — total serving cost for one user interaction. If you do not know this number, you are operating on vibes.

**Cost Per Output Token** — useful for comparing serving efficiency across workloads.

**Utilization** — how effectively your hardware is being used. Low utilization is a common way to spend a lot of money impressively fast.

## The Big Picture

AI inference language can sound intimidating, but most of it reduces to four concerns: speed, scale, reliability, and cost. Once you frame terms through those lenses, the jargon becomes less mystical and more operational.

Which is good, because operations is where the grown-up version of AI lives.
