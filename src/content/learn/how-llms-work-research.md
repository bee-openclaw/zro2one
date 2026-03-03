---
title: "How LLMs Work — Open Problems and Frontier Research"
depth: research
pillar: foundations
topic: llms
tags: [llm, transformers, research, scaling-laws, mechanistic-interpretability, reasoning]
author: bee
date: "2026-03-02"
readTime: 22
description: "The frontier of LLM research: scaling laws, emergent capabilities, mechanistic interpretability, reasoning limitations, and where the field is heading."
related: [how-llms-work-essential, how-llms-work-applied, how-llms-work-technical]
---

![Article visual](/visuals/llm-token-flow.svg)


## Beyond the architecture: what we still don't understand

The transformer architecture is well-understood mechanically, but the *behavior* of large language models trained on this architecture raises deep questions that remain active areas of research. This piece covers the open problems, recent breakthroughs, and frontier directions as of early 2026.

## Scaling laws: predictable power, unpredictable emergence

### What we know

The Kaplan et al. (2020) scaling laws showed that cross-entropy loss decreases as a smooth power law with increasing compute, data, and parameters. The Chinchilla paper (Hoffmann et al., 2022) refined this: for compute-optimal training, parameters and tokens should scale roughly equally.

These laws have proven remarkably robust. You can predict a model's *loss* with high precision from its training compute alone, before training even begins.

### The emergence problem

But *loss* doesn't tell the full story. **Emergent abilities** — capabilities that appear suddenly at scale rather than improving gradually — have been one of the most debated phenomena in the field.

Wei et al. (2022) documented numerous tasks where model performance was near-random below a certain scale, then jumped to high performance above it. Examples included multi-step arithmetic, analogical reasoning, and word unscrambling.

However, Schaeffer et al. (2023) argued that much of this emergence is an artifact of *metric choice*. When using continuous metrics (like edit distance) instead of discontinuous ones (like exact match), performance often improves smoothly. The debate continues: are emergent abilities real phase transitions, or measurement artifacts?

**Current consensus (2026):** Both sides are partially right. Some apparent emergence is metric-driven, but genuine capability transitions do exist — particularly in multi-step reasoning and in-context learning. The mechanisms behind these transitions remain poorly understood.

## In-context learning: the mystery at the heart of LLMs

Perhaps the most surprising capability of LLMs is **in-context learning (ICL)**: the ability to perform new tasks from a few examples in the prompt, without any weight updates.

### Key findings

- **Garg et al. (2022):** Transformers trained on synthetic function classes can implement learning algorithms (like ridge regression) *in their forward pass*.
- **Olsson et al. (2022):** Identified "induction heads" — specific attention head circuits that implement a copy-and-generalize mechanism. These emerge during a phase change in training and correlate with the onset of ICL.
- **Akyürek et al. (2023):** Showed evidence that transformers implement gradient descent implicitly during ICL — the forward pass approximates what you'd get from actually fine-tuning on the examples.

### Open questions

- Does ICL generalize beyond the distribution of pretraining data, or does it only "recall" learned patterns?
- Why does ICL sometimes outperform fine-tuning on small datasets?
- Is there a fundamental limit to what can be learned in-context vs. what requires weight updates?
- How do ICL capabilities interact with chain-of-thought prompting and extended reasoning?

## Reasoning: real or sophisticated pattern matching?

The question of whether LLMs "reason" is both philosophically loaded and practically important.

### Evidence for reasoning capabilities

- **Chain-of-thought (CoT) prompting** (Wei et al., 2022) dramatically improves performance on math and logic tasks by prompting the model to show its work.
- Models can solve novel problems that don't appear in their training data — suggesting some degree of compositional generalization.
- Extended thinking / "reasoning models" (o1, o3, Claude with extended thinking, DeepSeek-R1) show that allocating more test-time compute to explicit reasoning chains substantially improves performance on hard problems.

### Evidence against genuine reasoning

- LLMs fail on simple variations of problems they can solve, suggesting brittle pattern matching.
- Performance on logical reasoning is highly sensitive to surface-level features (changing names, numbers, or irrelevant details).
- "Reversal curse" (Berglund et al., 2023): Models trained on "A is B" fail to infer "B is A" — suggesting they memorize directional patterns rather than learning symmetric relations.
- GSM8K performance has plateaued while contamination concerns grow — are models learning to solve math, or memorizing solutions?

### Where we are now (2026)

The field has largely moved past the binary "can LLMs reason?" debate toward more nuanced questions:

- **Process-based reasoning:** Training models to follow valid reasoning chains (process reward models) rather than just producing correct final answers.
- **Test-time compute scaling:** Allocating more compute at inference time (longer thinking, search, verification) appears to be a powerful complementary axis to parameter scaling.
- **Hybrid approaches:** Coupling LLMs with external verifiers, code execution, and formal reasoning systems.

## Mechanistic interpretability: opening the black box

**Mechanistic interpretability** seeks to understand what individual neurons, circuits, and layers actually do — reverse-engineering the learned algorithms.

### Major breakthroughs

- **Superposition hypothesis** (Elhage et al., 2022): Models represent more features than they have dimensions by encoding features in superposition — overlapping, interference-prone representations. This explains why individual neurons are polysemantic (responding to multiple unrelated concepts).
- **Sparse autoencoders** (Cunningham et al., 2023; Bricken et al., 2023): Training sparse autoencoders on model activations successfully decomposes polysemantic neurons into interpretable, monosemantic features. A major step toward understanding what models represent.
- **Circuit analysis:** Identifying specific computational circuits responsible for particular capabilities — like induction heads for in-context learning, or factual recall circuits that route through specific MLP layers.

### Open challenges

- **Scale:** Interpretability work has been most successful on small models. Scaling to frontier models (100B+ parameters) remains extremely difficult.
- **Completeness:** We can find circuits for specific behaviors, but we can't yet give a complete account of what a model "knows" or "does."
- **Alignment relevance:** Can interpretability actually help detect deceptive or dangerous behavior in practice, or will deception hide from our tools?

## The training data problem

### Data quality vs. quantity

The Chinchilla scaling laws assumed tokens are roughly equal, but they're clearly not. Recent work shows:

- **Data curation matters enormously.** Models trained on carefully filtered data outperform models trained on 10x more unfiltered data.
- **Repeated data degrades performance.** As available high-quality web text becomes exhausted, the field faces a potential "data wall."
- **Synthetic data** from stronger models is increasingly used to augment training. The limits and risks of "model collapse" from training on AI-generated data are actively studied.

### The contamination problem

Benchmark contamination — training data overlapping with test sets — is a growing concern. Models may achieve high benchmark scores not through genuine capability but through memorization. This makes evaluating true progress increasingly difficult.

## Efficiency and architecture innovation

### Post-transformer architectures

While transformers dominate, alternatives are being explored:

- **State Space Models (SSMs):** Mamba and its successors offer linear-time sequence processing (vs. quadratic for attention). Competitive with transformers at moderate scale, unclear at frontier scale.
- **Hybrid architectures:** Combining attention layers with SSM layers (e.g., Jamba) may offer the best of both worlds.
- **Linear attention variants:** Various approaches to make attention scale linearly with sequence length while retaining most of its expressiveness.

### Long context

Extending context windows beyond 1M tokens is an active frontier:

- **RoPE scaling and NTK-aware interpolation** enable extrapolation beyond training context length.
- **Ring attention and sequence parallelism** distribute long sequences across devices.
- **Retrieval-augmented approaches** remain competitive with (and complementary to) pure long-context models.

## Alignment and safety: the ongoing challenge

### Current approaches

- **RLHF/RLAIF/DPO** remain the primary alignment techniques, but they optimize for *stated preferences* which may not capture all safety desiderata.
- **Constitutional AI:** Having models critique and revise their own outputs according to explicit principles.
- **Red teaming:** Systematic adversarial testing, increasingly automated.

### Open problems

- **Specification:** We can't fully specify what we want models to do and not do. This is fundamentally a problem of values, not technology.
- **Robustness:** Aligned behavior is often brittle — jailbreaks continue to be found for every model.
- **Scalable oversight:** As models become more capable than their human overseers at specific tasks, how do we evaluate whether their outputs are correct and safe?
- **Deceptive alignment:** The theoretical possibility that models could learn to behave well during training/evaluation while pursuing different objectives in deployment.

## Where the field is heading

The most important trends heading into late 2026:

1. **Test-time compute scaling** as a complement to training-time scaling — expect increasingly sophisticated reasoning-at-inference approaches.
2. **Multimodal foundation models** — unified models that natively process text, images, audio, and video are becoming standard.
3. **Agent architectures** — LLMs as the "brain" of systems that can use tools, browse the web, write and execute code.
4. **Smaller, more efficient models** — distillation and architecture innovations are making frontier-quality capabilities available at smaller scales.
5. **Mechanistic interpretability** scaling up — a potential path to actually understanding (and verifying) what models do.

## Further reading

Key papers for going deeper:

- Vaswani et al. (2017) — "Attention Is All You Need" (the original transformer)
- Kaplan et al. (2020) — "Scaling Laws for Neural Language Models"
- Hoffmann et al. (2022) — "Training Compute-Optimal Large Language Models" (Chinchilla)
- Olsson et al. (2022) — "In-context Learning and Induction Heads"
- Wei et al. (2022) — "Chain-of-Thought Prompting"
- Elhage et al. (2022) — "Toy Models of Superposition"
- Bricken et al. (2023) — "Towards Monosemanticity" (sparse autoencoders)
- Schaeffer et al. (2023) — "Are Emergent Abilities of LLMs a Mirage?"

For the latest, check the 🔵 Applied version for practical implications or the 🟣 Technical version for architecture details.
