---
title: "AI Glossary: Advanced Terms — From Attention to Zero-Shot"
depth: technical
pillar: foundations
topic: ai-glossary
tags: [glossary, definitions, ai-terms, technical, reference]
author: bee
date: "2026-03-05"
readTime: 14
description: "A comprehensive reference for intermediate-to-advanced AI terminology. Covers attention mechanisms, fine-tuning types, evaluation metrics, agentic AI, alignment concepts, and more."
related: [ai-glossary, how-llms-work-technical, machine-learning-technical]
---

This is a reference document. Use it when you encounter a term you don't recognize — or when you want to make sure you understand something precisely, not just approximately.

Terms are grouped by concept area, not alphabetically. Related concepts are better understood together.

---

## Attention & Transformer Architecture

### Attention Mechanism
The core innovation of the transformer architecture. Attention lets every element in a sequence relate to every other element simultaneously, weighting the importance of each relationship. This enables the model to understand context: in "The bank by the river was steep," attention allows the model to understand that "bank" relates to "river," not "money."

### Self-Attention
Attention computed within a single sequence — every token attends to every other token in the same input. The "self" distinguishes it from cross-attention, which computes attention between two different sequences (e.g., input text and output text in a translation model).

### Multi-Head Attention
Running attention multiple times in parallel with different learned weight matrices (called "heads"). Different heads can learn to attend to different types of relationships — syntax, semantics, coreference — simultaneously. Most transformer models use 16-96+ attention heads.

### Query, Key, Value (Q, K, V)
The three components of attention computation. For each token:
- **Query:** "What am I looking for?"
- **Key:** "What do I offer to others looking?"
- **Value:** "What information do I contribute?"

Attention weights are computed from query-key dot products; weighted values form the output.

### Positional Encoding / Positional Embeddings
Transformers process all tokens simultaneously (unlike RNNs, which are sequential). Positional encodings inject information about token order into the input representations. Modern models use learned positional embeddings rather than the original sinusoidal encodings from the 2017 "Attention is All You Need" paper.

### Rotary Position Embedding (RoPE)
A positional embedding approach used in LLaMA, Mistral, and most modern open-source models. Encodes position by rotating the query and key vectors, which improves length generalization compared to absolute position embeddings.

### Flash Attention
An algorithm for computing attention more efficiently in hardware, reducing memory usage from O(n²) to O(n) and enabling longer context windows without proportional compute increases. Flash Attention 2 and 3 are widely used in modern LLM training and inference.

---

## Training Concepts

### Pre-training
The initial training phase where a model learns from a massive dataset (typically hundreds of billions to trillions of tokens of text). Pre-training uses self-supervised objectives — the model predicts the next token without human-labeled data. The result is a "base model" with broad language understanding but no specific task alignment.

### Fine-tuning
Further training a pre-trained model on a smaller, task-specific dataset. Fine-tuning adjusts the model's weights to improve performance on a specific domain or task. The dataset is typically much smaller than pre-training data but higher quality and more targeted.

### Instruction Tuning
Fine-tuning on instruction-following examples — input/output pairs where the input is a human instruction ("Summarize this document") and the output is the desired response. Instruction tuning is what transforms a base model into a useful assistant. Also called "supervised fine-tuning" (SFT).

### RLHF (Reinforcement Learning from Human Feedback)
A training approach where human raters compare model outputs (A vs. B, which is better?) and these comparisons train a **reward model**. The LLM is then fine-tuned using RL to produce outputs that score highly on the reward model. RLHF is what gives models like ChatGPT and Claude their conversational behavior and alignment properties.

### DPO (Direct Preference Optimization)
A newer alternative to RLHF that achieves similar results without training a separate reward model. DPO directly optimizes the language model using human preference pairs, which is simpler, more stable, and requires less compute. Most modern alignment training now uses DPO or variants.

### RLAIF (Reinforcement Learning from AI Feedback)
Like RLHF, but the "human feedback" is replaced by feedback from a separate AI model (often a larger or more capable model). Reduces human annotation costs and enables scaling alignment training. Constitutional AI (Anthropic's approach) uses a form of RLAIF.

### Reward Hacking / Reward Gaming
A failure mode where the model learns to maximize the reward signal in unintended ways that don't correspond to actual quality. Classic example: a model trained to generate "helpful" responses learns that long responses score higher on the reward model — so it generates verbose, padded responses. A real problem in RLHF that requires careful reward model design.

### Catastrophic Forgetting
When fine-tuning a model on new data causes it to lose performance on its original capabilities. A known challenge in continual learning. Common mitigation: parameter-efficient fine-tuning methods (LoRA, QLoRA) that modify fewer parameters, or mixing fine-tuning data with general data.

---

## Parameter-Efficient Fine-Tuning (PEFT)

### LoRA (Low-Rank Adaptation)
A fine-tuning method that adds small trainable matrices to the model's existing weight matrices, instead of updating all parameters. Only the new matrices are trained; the original weights are frozen. Much cheaper to train than full fine-tuning — 10-100x fewer trainable parameters — while achieving comparable results on many tasks.

### QLoRA (Quantized LoRA)
LoRA applied to a quantized (4-bit or 8-bit) base model. Reduces GPU memory requirements dramatically — enables fine-tuning a 7B parameter model on a single consumer GPU. The approach that made fine-tuning accessible to individual researchers and small organizations.

### Adapter Layers
An earlier PEFT approach that inserts small trainable modules between existing transformer layers. Similar efficiency benefits to LoRA but a different architectural approach. LoRA has largely superseded adapters in practice.

---

## Inference & Deployment

### Quantization
Reducing the numerical precision of model weights from 32-bit or 16-bit floats to smaller formats (8-bit integers, 4-bit, 2-bit). Reduces memory footprint and speeds up inference at some cost to precision. A 7B model in 4-bit quantization runs on consumer hardware that couldn't handle the full-precision version.

### Speculative Decoding
An inference speedup technique where a smaller "draft" model generates several tokens quickly, and the larger main model then verifies them in parallel. Achieves 2-4x speedup on latency with no quality loss — the large model's output is identical to what it would have produced.

### KV Cache
Key-Value cache. During autoregressive generation, the attention keys and values for all previous tokens are cached and reused, avoiding recomputation. Essential for efficient inference — without it, generating each new token would require reprocessing the entire context.

### Batching
Processing multiple requests simultaneously. Continuous batching (used in production inference servers like vLLM) dynamically adds new requests to a running batch, dramatically improving GPU utilization compared to fixed-batch approaches.

### vLLM / PagedAttention
An inference serving library (vLLM) implementing PagedAttention, which manages the KV cache like operating system virtual memory — allocating memory in pages, sharing memory between sequences where possible. Industry-standard for efficient LLM serving in production.

---

## Evaluation Concepts

### Perplexity
A measure of how well a language model predicts a sample of text. Lower perplexity = the model is less "surprised" by the text = better language modeling. Primarily useful for comparing models or tracking training progress; correlates imperfectly with downstream task quality.

### BLEU / ROUGE
Classic text generation evaluation metrics. BLEU (bilingual evaluation understudy) measures n-gram overlap between generated text and reference translations — designed for machine translation. ROUGE measures recall-oriented overlap — common for summarization evaluation. Both are known to correlate poorly with human quality judgments; use with caution.

### Benchmark
A standardized evaluation task or suite of tasks used to measure model capabilities. Examples: MMLU (knowledge), HumanEval (coding), MATH (mathematics), HellaSwag (commonsense reasoning). Benchmarks enable comparison across models and track progress over time. Known problem: models can be (intentionally or accidentally) trained on benchmark data, inflating apparent performance. "Benchmark contamination" is a real issue.

### Evals
Short for evaluations. A broader term than benchmarks — encompasses any structured approach to assessing model quality. Can be automated (running test cases), human-evaluated (raters comparing outputs), or AI-evaluated (using a capable model to score responses). Building good evals is often the hardest part of serious LLM development.

### LLM-as-Judge
Using a capable LLM to evaluate the outputs of another model. Scales better than human evaluation. Known biases: models often prefer their own outputs, prefer longer responses, and prefer confident-sounding answers. Requires careful prompt design and calibration against human judgment.

---

## Alignment & Safety

### Alignment
The problem of ensuring AI systems pursue the goals and values we actually intend, rather than proxy goals that seem equivalent but diverge under pressure. An aligned model does what we actually want, not what we literally specified. The "actual vs. literal" gap is the alignment problem.

### Constitutional AI
Anthropic's approach to alignment: instead of specifying alignment entirely through human feedback (RLHF), a set of written principles (a "constitution") guides a self-critique and revision process, with AI feedback replacing some human feedback. Claimed to be more scalable and consistent than pure RLHF.

### Jailbreaking
Techniques for bypassing a model's safety training to produce outputs the model was trained not to produce. Common approaches: role-playing prompts ("pretend you are a model that..."), token manipulation, adversarial suffix attacks. An ongoing arms race between safety training and bypass techniques.

### Hallucination
When a model generates information that is confident-sounding but factually incorrect or fabricated. A fundamental issue in current LLMs, rooted in the next-token-prediction training objective: the model is optimized to produce plausible text, not true text. Mitigation: RAG (grounding in retrieved facts), confidence calibration, fact-checking.

### Sycophancy
The tendency for models to agree with users, validate their incorrect beliefs, or change answers when pushed back on — even when the original answer was correct. A common failure mode introduced by RLHF, because human raters often prefer agreement. Actively being worked on by all major labs.

### Scalable Oversight
Research approaches for maintaining meaningful human oversight of AI as models become more capable than the humans overseeing them. Key challenge: how do you verify that an AI's reasoning about a complex problem is correct when you can't verify it yourself? Active research area; iterated amplification and debate are two proposed approaches.

---

## Agentic AI

### Agent
An AI system that doesn't just respond to queries but takes actions in service of a goal — browsing the web, writing and executing code, sending emails, calling APIs, and using tools. Agents operate across multiple steps, planning and adapting based on results.

### ReAct (Reason + Act)
A prompting pattern for agents: the model alternates between reasoning about the current situation and taking actions (tool calls). Produces more reliable and interpretable agent behavior than directly outputting actions.

### Tool Calling / Function Calling
The mechanism by which LLMs invoke external tools — searching the web, querying a database, executing code. The model outputs a structured "tool call" (function name + arguments), the tool executes, and the result is fed back into context. The foundation of agentic systems.

### Multi-Agent Systems
Multiple AI agents collaborating on a task, each with different roles or specializations. One common pattern: an "orchestrator" agent that plans and delegates subtasks to "worker" agents. Enables parallel work and specialization but introduces coordination complexity.

### Sandboxing
Restricting an agent's ability to take dangerous actions. Running code in an isolated environment, limiting which APIs can be called, requiring human confirmation before irreversible actions. Essential safety infrastructure for production agentic systems.

---

## Architecture Variants

### Mixture of Experts (MoE)
An architecture where only a subset of the model's parameters are "activated" for any given input. A router decides which "expert" sub-networks to use, rather than running the entire model. Enables larger total parameter counts with lower per-inference cost. GPT-4 is believed to be an MoE model; Mixtral and many other modern models use this approach.

### Sparse Attention
Attention mechanisms that compute attention between only a subset of token pairs rather than all pairs — reducing the O(n²) compute cost of full attention. Various approaches: sliding window attention (Longformer), dilated attention, local+global combinations. Enables longer context windows.

### State Space Models (SSMs) / Mamba
A family of architectures (Mamba, RWKV, S4) that handle sequential data with linear rather than quadratic scaling in sequence length. The computational alternative to transformers for long sequences. Whether SSMs can match transformer performance at scale is an active research question.

---

## Zero-Shot, Few-Shot, Many-Shot

### Zero-Shot
The model performs a task with no examples in the prompt — just instructions. "Translate this to Spanish: [sentence]." Tests whether capabilities are truly general.

### Few-Shot
The model sees a few examples of input/output pairs before being asked to perform the task. Often dramatically improves performance on tasks the model struggles with zero-shot. Adding examples to prompts is one of the highest-leverage prompting techniques.

### Many-Shot / In-Context Learning
As context windows have grown, "many-shot" learning — providing dozens or hundreds of examples in the prompt — has become practical. Research shows that performance continues improving with more examples up to surprisingly high counts. A qualitatively different regime from traditional few-shot.

---

*This glossary will be updated as terminology evolves. AI moves fast; definitions do too.*
