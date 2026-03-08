---
title: "AI Glossary: Builder's Edition"
depth: applied
pillar: building
topic: ai-glossary
tags: [glossary, reference, ai-terms, building, developers, api, deployment]
author: bee
date: "2026-03-08"
readTime: 10
description: "The terms you actually need when building AI-powered products: from inference basics to deployment patterns, defined plainly for people who ship things."
related: [ai-glossary-beginner, ai-glossary-advanced, llm-api-integration-guide]
---

This isn't a glossary for observers. It's for people who are building AI products and keep hitting terms they half-understand. Clear definitions, without the hype, organized by where you'll encounter them.

---

## Inference & Generation

**Inference**
Running a trained model on new input to get a prediction or output. When you call an AI API, you're running inference. Contrasted with *training*, which is where the model learns from data.

**Token**
The basic unit of text that LLMs process. Not exactly words — tokens can be word fragments, punctuation, or whole common words depending on the tokenizer. "Unbelievable" might be 3-4 tokens. A rough rule: 1 token ≈ 0.75 words in English. Token limits and costs are both denominated in tokens.

**Context window**
The maximum amount of text a model can consider at once — both the input you send and the output it generates. Measured in tokens. A 128k context window can hold roughly 100,000 words. Input beyond this limit gets truncated (or causes an error, depending on the API).

**Prompt**
The text you send to a model. In chat APIs, this includes system prompts, conversation history, and the current user message.

**System prompt**
Instructions you send before the conversation that shape the model's behavior, persona, and constraints for the entire session. Most chat APIs support this as a distinct role separate from user messages.

**Temperature**
A parameter controlling how random the model's outputs are. Low temperature (near 0) makes outputs more deterministic and focused. High temperature increases variety and creativity. Most APIs default to around 1.0.

**Top-p (nucleus sampling)**
An alternative to temperature that limits sampling to the smallest set of tokens whose combined probability exceeds p. Top-p = 0.9 means the model samples only from tokens that collectively make up 90% of the probability mass. Often used together with temperature.

**Max tokens / max completion tokens**
The maximum number of tokens the model will generate in its response. Doesn't guarantee the model uses all of them — it stops when it's done, at a stop sequence, or at the limit.

**Stop sequence**
A string (or list of strings) that, when generated, causes the model to stop producing output. Useful for constraining outputs to formats: e.g., stop at `\n` to get single-line outputs, or stop at `###` in structured generation.

**Streaming**
Receiving model output token by token as it's generated, rather than waiting for the complete response. Dramatically improves perceived latency in user-facing applications. Supported by most major APIs.

**Logprobs**
Log probabilities assigned to each output token. Some APIs expose these. Useful for: calibrating confidence, detecting when the model is uncertain, computing perplexity, filtering outputs.

---

## Models & Capabilities

**Foundation model**
A large model trained on broad data at scale, designed to be adapted for many tasks. GPT-5, Claude Sonnet, Gemini Pro — these are foundation models. Contrasted with task-specific models trained for one narrow purpose.

**Multimodal model**
A model that can process multiple types of input — typically text plus images, and sometimes audio or video. GPT-4V, Claude Sonnet, Gemini — all multimodal.

**MLLM (Multimodal Large Language Model)**
Specifically a large language model extended to handle multimodal inputs. The language model backbone is the same; multimodal inputs are encoded and projected into the model's representation space.

**Fine-tuning**
Continuing to train a pre-trained model on a curated dataset to adapt it for a specific task, style, or domain. Changes the model's weights. Contrasted with prompting, which adapts behavior without changing weights.

**RLHF (Reinforcement Learning from Human Feedback)**
A training technique used to align models with human preferences. Humans rate model outputs; a reward model is trained on those ratings; the LLM is then optimized to maximize reward. Used in essentially all frontier chat models.

**Embedding**
A dense numerical vector representing a piece of text (or image, audio, etc.) in high-dimensional space. Similar meaning = similar vectors. Embeddings enable semantic search, clustering, and classification without task-specific training.

**Context length vs. effective context**
The difference between how many tokens a model *can* process and how many it can effectively *use*. A model with a 1M context window may still degrade on tasks requiring reasoning across the full length. Effective context is often shorter than the spec sheet suggests.

---

## Architecture & APIs

**Endpoint**
The specific API URL you call to get a model response. Chat completions, embeddings, image generation, and speech synthesis are all different endpoints on most platforms.

**Completion**
The model's output — a "completion" of your input. The term comes from text completion; in modern chat APIs, the full response to your messages.

**Function calling / tool use**
A capability where models can output structured calls to functions you define, rather than (or in addition to) prose. The model decides when to use a tool, what arguments to pass, and you execute the function and return the result. Enables agents that take actions.

**Structured outputs**
API-level guarantees that model output conforms to a specified JSON schema. More reliable than asking the model to output JSON in a prompt — the model is constrained at the generation level to produce valid, schema-conforming output.

**RAG (Retrieval-Augmented Generation)**
Architecture where relevant documents are retrieved at inference time and injected into the prompt context before the model generates a response. Gives models access to external knowledge without fine-tuning.

**Vector database**
A database optimized for storing and querying embedding vectors by similarity. Used in RAG systems to find chunks of text semantically similar to a query. Common options: Pinecone, Weaviate, Qdrant, pgvector.

**Chunking**
Splitting large documents into smaller pieces before embedding them for RAG. Chunk size affects retrieval quality — too large loses precision, too small loses context. Typical: 256–1024 tokens with overlap.

---

## Deployment & Operations

**Latency**
Time from sending a request to receiving the complete response. Matters a lot in user-facing applications. Streaming reduces *perceived* latency even when total latency is the same.

**Throughput**
Requests per second (or tokens per second) the system can handle. Relevant when you need to process large volumes of data.

**Rate limiting**
API usage limits imposed per minute, hour, or day — in terms of requests or tokens. Hitting rate limits causes errors. Plan around them with queuing, retries with backoff, or higher-tier plans.

**Token cost**
Most APIs charge per input token and per output token, at different rates. Output tokens cost more than input tokens (generating is harder than reading). At scale, optimize for fewer input tokens (tighter prompts) and output tokens (concise responses).

**Latency vs. quality tradeoff**
Smaller, faster models have higher latency performance but lower quality ceilings. Larger, more capable models are slower and more expensive. Most production systems route between models by task complexity.

**Prompt caching**
API feature where prefix portions of prompts are cached and not recomputed on repeated calls. If your system prompt is long and repeated across many calls, caching can dramatically reduce costs and latency. Anthropic and Google support this; check provider docs for specifics.

**Fallback**
Automatic switching to an alternative model or provider when the primary fails or is rate-limited. Essential for production reliability. Implement with exponential backoff and circuit breakers.

**Eval (evaluation)**
A test suite for your AI system. Defines inputs and expected outputs (or quality criteria), measures whether the system meets them. Without evals, you can't tell if changes made things better or worse.

**LLM-as-judge**
Using an LLM to evaluate the output of another LLM. Common for assessing open-ended quality (accuracy, helpfulness, format compliance) at scale. Requires careful prompt design to reduce bias; correlates reasonably well with human judgment on many tasks.

---

## Agents & Orchestration

**Agent**
An AI system that takes actions in the world — calling tools, browsing the web, writing and executing code, interacting with APIs — based on LLM reasoning. Contrasted with chatbots that only generate text.

**ReAct (Reason + Act)**
A prompting pattern for agents where the model alternates between reasoning steps (Thought) and actions (Action/Observation). Makes the model's reasoning process explicit and allows it to update based on tool results.

**Agentic loop**
The cycle in an agent system: model generates output → actions are taken → results fed back to model → model generates next output. Can run for many iterations.

**Orchestrator**
Code (or a model) that manages multiple agents or tools — routing tasks, managing state, handling failures, combining results.

**Memory (agent context)**
How agents maintain information across multiple turns or sessions. Types: in-context (in the prompt), external (stored in a database and retrieved), procedural (stored in the agent's instructions).

**Tool**
A function an agent can call. Could be a web search, a calculator, a database query, an API call, code execution — anything with a defined interface the model can invoke.

**Guardrails**
Checks and constraints applied to agent inputs and outputs. Input guardrails block harmful requests before they reach the model. Output guardrails validate or filter model responses before they're returned or acted on.

---

The pace of new terminology in AI is fast enough that this list will grow. When you hit an unfamiliar term in a doc or paper: look for the original paper that introduced it — definitions are usually clearest there.
