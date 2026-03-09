---
title: "AI Glossary: The Practitioner's Edition"
depth: applied
pillar: practice
topic: ai-glossary
tags: [ai-glossary, terminology, applied-ai, definitions, practitioners]
author: bee
date: "2026-03-09"
readTime: 10
description: "The terms you actually encounter when building and deploying AI systems — defined clearly, with context for why they matter in practice."
related: [ai-glossary-beginner, ai-glossary-builders-edition, ai-glossary-advanced]
---

This glossary covers the terminology that shows up when you move from "I've heard of AI" to "I'm actually building with it." Not an academic reference — a working vocabulary for practitioners.

---

## A

**Agentic system** — An AI setup where a model can take actions, use tools, and make sequential decisions to accomplish a goal rather than responding to a single query. An agentic system might search the web, run code, and write a file in sequence to complete a task. The key characteristic: the AI drives a loop, not just a single response.

**Attention mechanism** — The core component of transformer models that lets each token in a sequence attend to (weight the influence of) every other token. When you ask about "Paris" in the context of "the capital of France," attention is what connects those tokens. Attention is computed at every layer of the transformer.

**API rate limit** — The maximum number of requests or tokens you can send to a model API in a given time window. Rate limits vary by tier, model, and provider. In production systems, you need retry logic, exponential backoff, and often queue management to handle rate limits gracefully.

---

## B

**Batch inference** — Processing multiple inputs together rather than one at a time. More efficient than sequential inference for high-volume use cases. Most providers offer batch APIs at lower cost (but higher latency) than real-time APIs.

**Beam search** — A decoding strategy where the model keeps track of multiple candidate continuations simultaneously (the "beam") and returns the highest-scoring complete sequence. Produces more coherent outputs than greedy decoding but at higher computational cost. Mostly relevant when you're running inference yourself rather than using APIs.

**Benchmark** — A standardized test for evaluating model capabilities. Common ones: MMLU (multiple choice knowledge), HumanEval (coding), MATH (mathematical reasoning). Benchmark results are useful for rough comparisons but don't always predict real-world performance on your specific task.

---

## C

**Chain of thought (CoT)** — A prompting technique where the model is asked to reason through a problem step by step before giving a final answer. "Think step by step" triggers this. CoT reliably improves performance on reasoning tasks — the model's intermediate steps catch errors that direct answering misses.

**Chunking** — Splitting a document into smaller pieces for retrieval or context management. Chunk size and strategy (by tokens, by sentences, by sections) significantly affects RAG system quality. Too small → context fragmentation; too large → irrelevant content dilutes retrieval.

**Context window** — The maximum amount of text (measured in tokens) a model can process in a single request, including both input and output. Modern models range from 8K to 1M+ tokens. Information outside the context window is invisible to the model.

**Cost per million tokens** — The standard unit for comparing LLM pricing. Input tokens and output tokens are typically priced differently (output usually costs more). When estimating costs at scale, measure your average prompt + completion length and calculate throughput.

---

## D

**Deterministic output** — Setting temperature to 0 (or very close) makes the model select the highest-probability token at each step, producing consistent outputs for the same input. Useful for tasks where reproducibility matters. Not truly deterministic in all implementations, but much more consistent.

**Document store** — The database in a RAG system where source documents are stored and indexed for retrieval. Common choices: vector databases (Pinecone, Weaviate, Chroma), traditional databases with vector extensions (pgvector), or hybrid systems.

**Drift** — Degradation in AI system performance over time. Can be data drift (the distribution of inputs changes), model drift (a model update changes behavior), or concept drift (the underlying relationship between inputs and outputs changes). All production AI systems require monitoring for drift.

---

## E

**Embedding** — A numerical representation of text (or other content) as a vector in high-dimensional space. Embeddings capture semantic meaning — similar texts have similar vectors. Used for retrieval in RAG systems, semantic search, clustering, and classification.

**Embedding model** — A model specifically designed to produce embeddings, typically smaller and faster than generative models. Examples: OpenAI's text-embedding-3, Cohere Embed, various open-weight sentence transformer models.

**Evaluation (evals)** — Systematic assessment of AI system quality. Good evals measure the right things (task-relevant outcomes), are grounded in real data, and can be run automatically. Without evals, you can't tell if system changes improve or degrade quality.

---

## F

**Function calling** — A model capability where the model can invoke tools or APIs by generating structured JSON specifying the function name and parameters. The hosting code executes the function, returns the result, and continues the conversation. Foundation for building agentic systems.

**Fine-tuning** — Updating a pre-trained model's weights on a task-specific dataset. The model learns new patterns while retaining general capability. Full fine-tuning updates all weights; parameter-efficient methods (LoRA, adapters) update only a fraction.

**Frontier model** — A term for state-of-the-art models at the leading edge of capability. GPT-5, Claude Opus, Gemini Ultra — the models at (or near) the frontier are the most capable but also the most expensive.

---

## G

**Grounding** — Connecting model outputs to verifiable facts or current information. An ungrounded model hallucinates from training data. Grounding can be achieved via RAG (inject relevant facts), function calling (look things up), or constrained generation (force outputs to reference a provided source).

**Guardrails** — Rules or filters applied to AI inputs or outputs to enforce constraints. Can be rule-based (regex patterns, keyword lists), model-based (a classifier that detects policy violations), or both. Common uses: content moderation, PII detection, topic restriction.

---

## H

**Hallucination** — When a model generates confident-sounding but incorrect or fabricated information. Hallucination is a structural property of language models (they predict likely-sounding text, not necessarily true text). Mitigation: grounding, verification, constrained generation, output checking.

**Human-in-the-loop (HITL)** — System design where a human reviews or approves AI outputs before they take effect. Especially important for high-stakes or irreversible actions. The challenge is designing HITL that's efficient enough not to eliminate AI's productivity benefit.

---

## I

**Inference** — Running a trained model to produce outputs. Distinct from training. When you call a model API, you're doing inference. Inference cost, latency, and throughput are the operational metrics that matter for production systems.

**In-context learning** — The model's ability to learn patterns from examples provided in the prompt. Few-shot prompting is in-context learning. The model updates no weights — it adapts its behavior for the duration of that prompt based on the examples you provide.

---

## J

**JSON mode** — A model output setting that constrains generation to valid JSON. Useful for structured extraction and tool integration. Not all models support this natively; some require careful prompting and output parsing instead.

---

## K

**KV cache** — A technique that stores computed key-value attention states so they don't need to be recomputed for repeated or incremental inputs. Dramatically reduces latency and cost for long context reuse. Provider-side prompt caching leverages KV cache mechanisms.

---

## L

**Latency** — Time from request to response. Critical for user-facing applications. Factors: model size, context length, hardware, network. Time to first token (TTFT) and time to complete response (TTCT) are both relevant. Streaming responses (tokens delivered as they're generated) improve perceived latency.

**LoRA (Low-Rank Adaptation)** — A parameter-efficient fine-tuning technique that injects small trainable matrices into transformer layers, leaving original weights frozen. Dramatically reduces compute and memory requirements for fine-tuning. The standard approach for LLM adaptation.

**LLM-as-judge** — Using an LLM to evaluate the quality of another LLM's outputs. Common in evaluation pipelines where human review is impractical at scale. Best practices: use a stronger model as the judge, provide clear rubrics, sample human-vs-AI agreement regularly.

---

## M

**Max tokens** — The maximum number of tokens in the model's output. Setting this too low truncates responses; too high wastes budget and increases latency. Set based on expected output length with headroom.

**Memory (agentic)** — How an agent maintains information across steps or sessions. Types: in-context (in the prompt), external (a database the agent reads/writes), retrieved (via RAG), and compressed (summarized history).

**Multi-turn conversation** — An interaction consisting of multiple exchanges between user and model, where each exchange can reference previous context. Managed by maintaining a conversation history and including it in each API request.

---

## O

**Orchestration** — The code layer that manages the sequence of LLM calls, tool uses, and data flows in a multi-step or agentic system. Frameworks like LangChain, LlamaIndex, and LangGraph provide orchestration primitives.

**Output parsing** — Extracting structured information from model-generated text. Even with JSON mode, you often need to validate and parse outputs. Robust parsing handles the inevitable edge cases where output format deviates from expectations.

---

## P

**Prompt injection** — An attack where malicious content in the model's context overrides the intended system prompt or instructions. A significant security concern for agentic systems that process untrusted inputs (web pages, user documents, external API responses).

**Prompt template** — A reusable prompt structure with variables filled in at runtime. The foundation of maintainable prompt engineering. Versioning your prompt templates like code is good practice.

**Provider** — The company whose model you're calling. OpenAI, Anthropic, Google, Cohere, Mistral, Together AI (for open models). Provider selection involves tradeoffs between capability, cost, latency, privacy, and reliability.

---

## R

**RAG (Retrieval-Augmented Generation)** — A system architecture where relevant information is retrieved from an external store and injected into the model's context before generation. Solves the knowledge cutoff problem and reduces hallucination on factual tasks.

**Retrieval** — Finding relevant documents or passages given a query. Vector similarity search (embedding-based) is the dominant method, but keyword search (BM25) and hybrid approaches often outperform pure vector search in practice.

**RLHF (Reinforcement Learning from Human Feedback)** — The alignment technique used to make LLMs helpful and safe. Human raters score model outputs; those scores train a reward model; that reward model guides further policy optimization.

---

## S

**Structured output** — Model output formatted as JSON, XML, or another schema. Required for tool use and integration with downstream systems. Reliability of structured output varies significantly across models and prompting strategies.

**System prompt** — Instructions given to the model at the start of a conversation, separate from user messages. Defines persona, constraints, task context, and output format. The most reliable way to configure model behavior.

---

## T

**Temperature** — A parameter controlling output randomness. Higher temperature → more varied, creative outputs; lower temperature → more deterministic, consistent outputs. Temperature 0 is near-deterministic. Temperature 1 is the model's natural distribution. Values above 1 increase randomness substantially.

**Tokenization** — Converting text into the tokens a model processes. Words, subwords, and characters all become tokens. "tokenization" might be 3 tokens; "cat" is 1. Understanding tokenization helps you estimate prompt lengths and costs.

**Tool use** — The ability of a model to invoke external functions, APIs, or services during a response. Also called function calling. Enables agents to search the web, run code, read files, query databases, and interact with the world.

---

## V

**Vector database** — A database optimized for storing and querying high-dimensional vectors (embeddings). Supports efficient approximate nearest-neighbor search, which is how RAG systems find relevant documents. Examples: Pinecone, Weaviate, Chroma, Qdrant, Milvus.

**Vector search** — Finding vectors (embeddings) that are most similar to a query vector, typically using cosine similarity or dot product. The core retrieval mechanism in RAG systems.

---

## Z

**Zero-shot** — Asking a model to perform a task without providing any examples. Works well for common task types the model has learned from training. For less common tasks or specific output formats, few-shot examples substantially improve performance.

---

*This glossary is a living document. Terms evolve as the field does — check the AI Glossary series for updated editions.*
