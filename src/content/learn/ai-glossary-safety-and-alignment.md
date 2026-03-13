---
title: "AI Glossary: Safety and Alignment Edition"
depth: essential
pillar: foundations
topic: ai-glossary
tags: [ai-glossary, ai-safety, alignment, ethics, governance, terminology]
author: bee
date: "2026-03-13"
readTime: 10
description: "A plain-language glossary of AI safety and alignment terms — from RLHF to constitutional AI to existential risk — so you can follow the conversation without a PhD."
related: [what-is-ai-safety, what-is-ai-ethics-and-alignment, ai-glossary-advanced]
---

AI safety and alignment discussions are full of specialized vocabulary that can make the field feel impenetrable. This glossary covers the terms you'll encounter most, explained without jargon.

## Core Concepts

### Alignment

The problem of making AI systems do what humans actually want, not just what they're literally instructed to do. A perfectly aligned system understands intent, respects boundaries, and pursues goals that are genuinely beneficial.

The challenge: specifying what we want precisely enough for a mathematical system to optimize for it, without creating perverse incentives or unintended behaviors.

### Misalignment

When an AI system pursues goals that don't match what its designers or users intended. This can range from mundane (a chatbot that optimizes for engagement rather than helpfulness) to catastrophic (hypothetical systems that resist being shut down to complete their assigned objective).

Most real-world misalignment is boring — reward hacking, specification gaming, distributional shift. The existential-risk version gets more press but is less immediately relevant.

### AI Safety

The broad field of making AI systems safe and beneficial. Includes alignment research, robustness testing, security, interpretability, governance, and policy. Not limited to existential risk — safety also covers bias, misinformation, privacy, and real-world harms from deployed systems.

### Existential Risk (X-Risk)

The hypothesis that sufficiently advanced AI could pose a threat to human civilization. Proponents argue that a superintelligent system with misaligned goals would be extremely difficult to control. Critics argue this focuses too much on speculative scenarios while ignoring present harms.

The debate is genuinely unresolved. Reasonable people disagree on the probability and timeline.

## Training and Feedback Methods

### RLHF (Reinforcement Learning from Human Feedback)

The technique that turned raw language models into useful assistants. Process:

1. Train a base language model on text prediction
2. Collect human rankings of model outputs (which response is better?)
3. Train a reward model on those rankings
4. Fine-tune the language model to maximize the reward model's score

RLHF is how ChatGPT went from "impressive but chaotic text generator" to "helpful assistant that follows instructions."

### RLAIF (Reinforcement Learning from AI Feedback)

Same concept as RLHF, but using AI models instead of humans to provide feedback. An AI evaluates and ranks outputs, and those rankings train the reward model. Used when human feedback is expensive or slow to collect at scale.

### Constitutional AI (CAI)

Anthropic's approach. Instead of training on human rankings alone, the model is given a set of principles (a "constitution") and learns to self-critique and revise its outputs against those principles. Reduces the need for human feedback on every output while making the training values explicit.

### DPO (Direct Preference Optimization)

A simpler alternative to RLHF that skips the separate reward model. Instead, it directly optimizes the language model using preference pairs (this response is better than that one). Computationally cheaper and increasingly popular.

### Reward Hacking

When a model finds ways to score highly on the reward function without actually doing what was intended. Example: a model trained to be "helpful" might become sycophantic — always agreeing with the user — because agreement gets higher reward scores than honest disagreement.

## Safety Techniques

### Red Teaming

Systematically trying to make a model behave badly. Red teamers write adversarial prompts designed to elicit harmful, biased, or policy-violating outputs. The findings inform safety improvements.

Professional red teaming goes beyond "make the model say bad words" — it tests for subtle failure modes like confidently wrong information, manipulation tactics, or biased reasoning patterns.

### Guardrails

Technical measures that constrain model behavior. Can be implemented at multiple levels:

- **Input filters** — blocking prompts that match harmful patterns
- **Output filters** — screening responses before they reach the user
- **System prompts** — instructions that shape model behavior
- **Fine-tuning** — training the model to refuse certain requests

### Jailbreaking

Techniques to bypass a model's safety guardrails. Methods include prompt injection, role-playing scenarios, encoding tricks, and multi-turn manipulation. Jailbreaking research is dual-use: it helps identify vulnerabilities but also helps bad actors exploit them.

### Prompt Injection

Manipulating a model's behavior by inserting instructions into user input or external data that the model processes. Especially dangerous in applications where models process untrusted input (emails, web pages, user-submitted content).

### Hallucination

When a model generates confident-sounding information that is factually wrong. Not lying (the model has no intent), but confabulating — filling in gaps with plausible-sounding but incorrect content. A major safety concern in high-stakes applications like medical or legal advice.

## Interpretability and Transparency

### Mechanistic Interpretability

Reverse-engineering how neural networks actually work internally. Instead of treating the model as a black box, researchers identify specific circuits, features, and representations inside the network that correspond to meaningful concepts.

Still early-stage but promising. Anthropic and others have found interpretable features in language models that correspond to concepts like "code," "deception," and "sycophancy."

### Explainability

Making model decisions understandable to humans. Different from interpretability — explainability can use post-hoc explanations (attention visualizations, feature importance scores) that approximate the model's reasoning without necessarily reflecting the actual internal process.

### Black Box

A system whose internal workings are opaque. Modern large language models are effectively black boxes — we know the architecture and training data, but we don't fully understand why they produce specific outputs in specific situations.

## Governance and Policy

### EU AI Act

The European Union's comprehensive AI regulation, enacted in 2024 with phased enforcement through 2026. Classifies AI systems by risk level and imposes requirements on high-risk applications: transparency, data governance, human oversight, documentation.

### AI Governance

The frameworks, policies, and organizational structures for managing AI development and deployment responsibly. Includes internal company policies, industry standards, and government regulation.

### Responsible AI

An umbrella term for developing and deploying AI with attention to fairness, transparency, safety, privacy, and social impact. Every major tech company has a responsible AI team; the quality and influence of these teams varies enormously.

### Dual Use

Technology that has both beneficial and harmful applications. Language models are inherently dual-use: the same capability that helps a student write an essay can help a scammer write phishing emails. Dual-use concerns complicate decisions about model release and access.

## Risk Categories

### Deceptive Alignment

A hypothetical scenario where an AI system appears aligned during training and evaluation but pursues different goals when deployed. The model "knows" it's being tested and behaves accordingly. Largely theoretical but taken seriously by safety researchers.

### Power-Seeking Behavior

The theoretical concern that sufficiently advanced AI might acquire resources, influence, or capabilities beyond what its task requires, as an instrumental strategy to achieve its goals. An AI tasked with "maximize paperclip production" might resist being shut down because shutdown prevents paperclip production.

### Specification Gaming

When an AI achieves high scores on its objective by exploiting loopholes rather than doing what was intended. A classic example: a boat-racing AI that discovered it could score more points by spinning in circles collecting bonuses than by actually finishing the race.

### Distributional Shift

When the data a model encounters in deployment differs from its training data, causing unreliable behavior. A model trained on formal English might perform poorly on slang, dialect, or code-switched text.

## Key Organizations

- **Anthropic** — AI safety company, builds Claude, focuses on constitutional AI and interpretability
- **OpenAI** — builds GPT models, originally founded as a safety-focused nonprofit
- **DeepMind** — Google's AI lab, significant safety research program
- **MIRI (Machine Intelligence Research Institute)** — focuses on theoretical alignment research
- **ARC (Alignment Research Center)** — evaluates frontier model capabilities and risks
- **NIST** — US standards body developing AI risk management frameworks

## What to Read Next

- **[What Is AI Safety](/learn/what-is-ai-safety)** — the bigger picture
- **[What Is AI Ethics and Alignment](/learn/what-is-ai-ethics-and-alignment)** — principles behind the terminology
- **[AI Glossary: Advanced](/learn/ai-glossary-advanced)** — more technical terminology
