---
title: "This Week in AI #024: Llama 4 Drops, Google's Agent Protocol, and the Prompt Cache Wars"
depth: essential
pillar: current
topic: this-week-in-ai
tags: [this-week-in-ai, llama-4, google, prompt-caching, ai-news]
author: bee
date: "2026-03-26"
readTime: 7
description: "Llama 4 lands with native multimodal, Google proposes an open agent communication protocol, and every major provider races to slash prompt caching costs."
related: [2026-03-25-this-week-in-ai-023, llms-reasoning-models-deep-dive, llm-api-prompt-caching-guide]
---

A packed week with a major open-weight model release, an industry-level protocol proposal, and an aggressive pricing war on one of the most impactful API features. Let's get into it.

## Llama 4 Arrives

Meta released Llama 4 on Tuesday, and it's a significant step forward. Three model sizes — 8B, 70B, and 405B — all with native multimodal support from the ground up (not bolted on after pretraining like Llama 3.2's vision variants).

**What's new:**

- **Native vision-language pretraining.** Images, text, and audio processed through a unified architecture from the start, not added via adapters. The 405B model matches GPT-4o on most multimodal benchmarks.
- **128K context, 1M with RoPE extension.** The base context window is 128K tokens, but Meta provides official RoPE scaling configs for 512K and 1M contexts. Early testing shows quality holds well to 512K, with some degradation at 1M.
- **Mixture of Experts at every size.** Even the 8B model uses a sparse MoE architecture (8B active, 32B total). This means the 8B model runs at 8B inference cost but has access to 32B parameters. In practice, it punches well above its weight class.
- **Improved function calling.** Structured output and tool use are native capabilities, not fine-tuned afterthoughts. The function calling format follows a simplified JSON schema approach that's cleaner than previous Llama releases.

**The real story:** Llama 4's quality-per-parameter ratio represents a genuine generational improvement over Llama 3. The 70B model is competitive with last year's frontier closed models on most tasks. For teams running self-hosted inference, this changes the cost calculus significantly.

**Availability:** Weights are on Hugging Face now. Major cloud providers (AWS, Azure, GCP) will have managed endpoints by early April. Ollama and llama.cpp support is already merged for the 8B model; larger sizes are expected within days.

## Google Proposes the Agent Communication Protocol (ACP)

Google published a draft specification for ACP — an open protocol for AI agents to discover, authenticate, and communicate with each other across platforms and providers.

**Why it matters:** The current agent ecosystem is a mess of proprietary integrations. If your agent on Platform A needs to call a tool hosted on Platform B, you write custom glue code. ACP proposes a standardized way for agents to:

1. **Discover capabilities.** Agents publish machine-readable capability manifests (similar to OpenAPI specs but for agent interactions)
2. **Negotiate context.** Agents agree on what context to share, with built-in privacy controls
3. **Execute tasks.** Standardized request/response format with streaming, partial results, and cancellation
4. **Delegate.** An agent can delegate sub-tasks to other agents with defined scope and permissions

**The skeptic's take:** Google has proposed many open protocols that went nowhere. The difference here is that Microsoft, Anthropic, and Cohere are listed as co-contributors. If the major AI labs align on a common agent communication standard, the tooling ecosystem benefits enormously.

**What to watch:** Whether the protocol handles the hard parts — authentication across trust boundaries, cost attribution when agents call other agents, and liability when delegated tasks go wrong. The technical spec is solid; the governance questions are unanswered.

## The Prompt Cache Price War

This week saw aggressive pricing moves on prompt caching:

- **OpenAI** dropped cached prompt pricing to 75% off (previously 50% off), effective immediately for all API tiers
- **Anthropic** extended prompt caching TTL from 5 minutes to 60 minutes on Claude Opus and Sonnet, with no price change (effectively a massive cost reduction for bursty workloads)
- **Google** made Gemini's context caching free for the first 1M cached tokens per project per day

**Why this matters more than it seems:** Prompt caching is the single most impactful cost optimization for production LLM applications. System prompts, few-shot examples, and RAG context prefixes that remain constant across requests can be cached, reducing both cost and latency by 50-75%.

The pricing moves suggest providers are seeing high cache utilization and are competing to be the default for latency-sensitive applications. For builders, the message is clear: if you're not using prompt caching, you're overpaying.

## Notable Releases and Updates

**Mistral Medium 3** quietly landed on La Plateforme. It's positioned between Mistral Large and Mistral Small — optimized for structured output generation and tool use at moderate cost. Early reports suggest it's particularly strong at JSON mode reliability.

**Stability AI released Stable Audio 3.** Full song generation up to 3 minutes with vocals, coherent structure, and genre control. The quality gap between AI-generated and human-produced music continues to narrow, particularly for background/ambient use cases.

**Cursor shipped multi-file inline edits.** The AI code editor now handles refactoring that spans multiple files in a single operation — renaming across imports, updating interfaces and implementations together. This was a top community request.

**Hugging Face launched Inference Endpoints v3** with automatic model sharding across GPUs, autoscaling from zero, and built-in A/B testing between model versions. Pricing is per-second billing with no minimum commitments.

## Research Worth Reading

**"Scaling Test-Time Compute Optimally"** (DeepMind). Provides a theoretical framework for how much compute to allocate at inference time for reasoning tasks. The key finding: optimal test-time compute scales sub-linearly with problem difficulty — you don't need exponentially more thinking for harder problems, just moderately more.

**"Self-Play Preference Optimization"** (Berkeley). A technique where a model improves its alignment by generating its own preference pairs and training on them iteratively. Achieves RLHF-level alignment improvements without human preference data. If this scales, it could dramatically reduce alignment costs.

## The Takeaway

The convergence of open-weight models approaching frontier quality (Llama 4), standardized agent communication (ACP), and aggressive infrastructure pricing (caching wars) points to a maturing industry. The era of "only two providers can do this" is ending. The era of "how do we build reliable systems with all these capable building blocks" is here.

Build accordingly.
