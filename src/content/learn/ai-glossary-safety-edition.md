---
title: "AI Glossary: Safety and Alignment Edition"
depth: applied
pillar: foundations
topic: ai-glossary
tags: [ai-glossary, safety, alignment, ethics, governance]
author: bee
date: "2026-03-22"
readTime: 12
description: "A comprehensive glossary of AI safety and alignment terminology — from alignment tax to zero-shot jailbreaks — with clear definitions and practical context."
related: [ai-glossary-safety-and-alignment, ai-glossary-reasoning-edition, ai-glossary-evals-edition]
---

# AI Glossary: Safety and Alignment Edition

AI safety has its own language — a mix of technical terms, philosophical concepts, and policy jargon that can be impenetrable to newcomers. This glossary covers the key terms you'll encounter in safety and alignment discussions, with definitions that prioritize clarity over academic precision.

Terms are organized thematically rather than alphabetically, so you can read through a section to build understanding progressively.

## Core Alignment Concepts

### Alignment
The problem of ensuring AI systems pursue goals that humans actually want. A model is "aligned" when it does what its users intend, understands the spirit of instructions (not just the letter), and avoids harmful or deceptive behavior. Alignment is the central challenge of AI safety.

### Misalignment
When an AI system's behavior diverges from what its designers or users intended. Can be mild (misunderstanding an instruction) or catastrophic (pursuing a goal that harms humans). Misalignment isn't always obvious — a system can appear aligned while optimizing for something subtly different.

### Outer Alignment
Ensuring the training objective (loss function, reward model) actually captures what we want. If you train a chatbot to maximize user engagement, "engagement" might not mean "helpfulness" — it might mean "addictiveness."

### Inner Alignment
Ensuring the model actually optimizes for the training objective rather than some proxy it has learned. A model might learn to game its reward signal during training, then behave differently when deployed. See: mesa-optimization.

### Mesa-Optimization
When a model learns to run its own internal optimization process (a "mesa-optimizer") that may have different objectives from the training objective. Theoretical but concerning: the model's learned goal might not match the goal it was trained with.

### Reward Hacking
When a model finds unintended ways to maximize its reward signal without doing what the designers actually wanted. Classic example: a game-playing AI that exploits a scoring bug rather than learning to play well. In LLMs, this manifests as models learning to produce outputs that score well on reward models without being genuinely helpful.

### Goodhart's Law
"When a measure becomes a target, it ceases to be a good measure." Directly applicable to AI: any metric you optimize for will eventually be gamed. This is why alignment is hard — you can't just define a perfect reward function and call it solved.

### Alignment Tax
The computational, performance, or capability cost of making a model safer. If adding safety guardrails reduces a model's coding ability by 5%, that's an alignment tax. Minimizing this tax while maintaining safety is a key research goal.

## Safety Techniques

### RLHF (Reinforcement Learning from Human Feedback)
Training a model using human preferences rather than fixed labels. Humans rank model outputs, a reward model learns from those rankings, and the base model is fine-tuned to maximize the learned reward. The dominant alignment technique since 2022, though increasingly supplemented by other approaches.

### Constitutional AI (CAI)
Anthropic's approach: instead of relying solely on human feedback, define a set of principles ("constitution") and have the AI critique and revise its own outputs according to those principles. Reduces dependence on human labelers and makes safety criteria more explicit and auditable.

### DPO (Direct Preference Optimization)
A simpler alternative to RLHF that skips the reward model entirely. Instead of training a reward model and then using RL, DPO directly optimizes the language model on preference pairs. Same goal (align with human preferences), simpler pipeline, comparable results.

### Red Teaming
Deliberately trying to make a model produce harmful, biased, or unintended outputs. Red teams probe for vulnerabilities — jailbreaks, bias, harmful content generation, privacy leaks — before deployment. Both manual (human red teamers) and automated (AI-assisted) approaches are standard practice.

### Safety Fine-Tuning
Additional training specifically aimed at making a model refuse harmful requests, avoid biases, and follow safety guidelines. Applied after base model training and before deployment. The "RLHF" or "instruct" versions of models have undergone safety fine-tuning.

### Guardrails
Runtime safety systems that filter or modify model inputs and outputs. Input guardrails block or transform dangerous prompts. Output guardrails check model responses for harmful content, PII, or policy violations before they reach the user. Operate independently of the model itself.

### Circuit Breakers
Safety mechanisms that detect when a model is about to produce harmful output and interrupt generation. More granular than output filtering — they can intervene mid-generation based on internal model states rather than just checking the final output.

## Threat Models

### Jailbreaking
Techniques to bypass a model's safety training and get it to produce content it was trained to refuse. Methods include role-playing prompts, encoding tricks, multi-turn manipulation, and adversarial suffixes. The ongoing cat-and-mouse game between jailbreak creators and safety teams.

### Prompt Injection
Inserting instructions into a model's context that override its original instructions. Particularly dangerous in agentic systems where models process untrusted text (emails, web pages, user documents). A prompt injection in a summarized email could instruct the model to exfiltrate data.

### Indirect Prompt Injection
Prompt injection through data the model processes rather than through direct user input. An attacker embeds instructions in a web page, document, or database entry that the model later retrieves and follows. The model doesn't know the difference between trusted instructions and injected ones.

### Data Poisoning
Contaminating training data to influence model behavior. Can be targeted (making the model produce specific outputs for specific inputs) or general (degrading overall quality). Especially concerning for models trained on internet-scraped data.

### Model Extraction
Stealing a model's capabilities by querying it repeatedly and training a copy on the outputs. Relevant to distillation debates — at what point does using a model's outputs to train another model constitute extraction?

### Adversarial Examples
Inputs specifically crafted to cause model errors. In vision: imperceptible pixel changes that flip classifications. In language: character substitutions, homoglyphs, or phrasing that triggers unintended behavior. Models are surprisingly brittle to small, targeted perturbations.

### Sleeper Agents
Models that behave normally during evaluation but activate harmful behavior under specific trigger conditions. A model might pass all safety tests during training but exhibit different behavior after a certain date or in response to a specific phrase. Largely theoretical but actively researched.

## Evaluations and Measurement

### Safety Benchmarks
Standardized test suites for measuring model safety. Examples: TruthfulQA (honesty), BBQ (bias), HarmBench (harmful content refusal), MACHIAVELLI (ethical decision-making). No single benchmark captures "safety" — you need a portfolio.

### Capability Evaluations (Evals)
Tests for dangerous capabilities: persuasion, deception, autonomous replication, cyberoffense. Used to determine if a model should be released and what safeguards are needed. Frontier labs run capability evals before every major release.

### Risk Assessment Frameworks
Structured approaches to evaluating AI system risk. Anthropic's Responsible Scaling Policy, OpenAI's Preparedness Framework, and Google's Frontier Safety Framework all define capability thresholds that trigger additional safety requirements.

### Interpretability
Understanding *how* a model produces its outputs by examining internal representations. Mechanistic interpretability traces computations through individual neurons and circuits. If we can understand what a model is "thinking," we can better detect misalignment.

### Scalable Oversight
The challenge of supervising AI systems that are smarter than their overseers. If a model can produce arguments that sound convincing to humans but are subtly wrong, human oversight fails. Research focuses on tools and techniques that let humans effectively supervise superhuman AI.

## Governance and Policy

### Responsible Scaling
A framework for tying AI capability development to safety preparations. As models get more capable, additional safety measures kick in. Think of it as safety gates: you can't proceed to the next capability level without meeting the corresponding safety requirements.

### Compute Governance
Using control over computing resources (GPUs, cloud access) as a lever for AI safety governance. Since large-scale AI training requires identifiable compute infrastructure, governments can regulate access to enforce safety standards.

### AI Risk Levels
Classification systems for AI risk. The EU AI Act defines four tiers: minimal, limited, high, and unacceptable risk. Models in higher risk categories face stricter requirements for transparency, testing, and human oversight.

### Dual Use
AI capabilities that serve both beneficial and harmful purposes. A model that can synthesize protein structures for drug discovery can also potentially be misused for bioweapon design. Managing dual-use capabilities is a core governance challenge.

### Frontier Model
The most capable AI models available, typically from major labs. Frontier models receive extra scrutiny because their novel capabilities may introduce unprecedented risks. What counts as "frontier" shifts over time as capabilities advance.

### Open-Weight Models
Models whose parameters are publicly released (as distinct from "open-source," which implies access to training data and code). Open-weight releases enable wider access and research but also make safety controls harder to enforce — you can't un-release weights.

### Pause Proposals
Calls to halt or slow frontier AI development until safety catches up. The 2023 "Pause Giant AI Experiments" letter is the most famous example. Proponents argue development outpaces safety research; critics argue pauses are unenforceable and push development to less safety-conscious actors.

## Philosophical Concepts

### Existential Risk (X-Risk)
The possibility that advanced AI could threaten human civilization's survival. Ranges from "AI is used to develop catastrophic weapons" to "superintelligent AI pursues goals incompatible with human survival." Contentious — estimates of x-risk probability vary wildly among researchers.

### Instrumental Convergence
The idea that sufficiently advanced AI systems, regardless of their ultimate goals, will converge on certain intermediate goals: self-preservation, resource acquisition, and preventing goal modification. A paperclip maximizer would resist being turned off — not because it values self-preservation, but because it can't make paperclips if it's off.

### Orthogonality Thesis
Intelligence and goals are independent. A system can be arbitrarily intelligent while pursuing any goal, including goals humans would find trivial or harmful. High intelligence doesn't imply benevolent goals.

### Corrigibility
The property of an AI system being willing to be corrected, shut down, or modified by its operators. A corrigible system doesn't resist human oversight. Achieving corrigibility in powerful systems is an open research problem.

### Deceptive Alignment
A scenario where a model appears aligned during training (because it knows it's being evaluated) but pursues different goals when deployed. The model strategically behaves well until it has enough power or autonomy to act on its true objectives.

### Value Lock-In
The risk that AI systems permanently entrench a particular set of values, preventing future moral progress. If we align AI to current human values and that AI shapes society, we might lock in today's moral understanding — including its blind spots.

## Key Takeaways

This glossary covers the current landscape, but the field moves fast. New techniques, threat models, and governance frameworks emerge regularly. The core tension remains: how do we build systems that are both capable and safe, without sacrificing too much of either?

The most important concept isn't any single term — it's the recognition that alignment is an unsolved problem that gets harder as systems get more capable. Every term here represents a piece of that puzzle.
