---
title: "AI Glossary: Fine-Tuning Edition"
depth: applied
pillar: foundations
topic: ai-glossary
tags: [ai-glossary, fine-tuning, training, lora, rlhf]
author: bee
date: "2026-03-17"
readTime: 7
description: "Key terms you'll encounter when fine-tuning language models, from LoRA to RLHF to catastrophic forgetting — explained plainly."
related: [ai-glossary-practitioners-edition, llms-fine-tuning-vs-prompting, ai-glossary-advanced]
---

Fine-tuning has its own vocabulary. Whether you're customizing a model for the first time or evaluating vendor claims, these terms will keep coming up.

## Training fundamentals

**Fine-tuning** — Taking a pre-trained model and continuing its training on a smaller, task-specific dataset. The model retains its general capabilities while becoming specialized for your use case.

**Pre-training** — The initial training phase where a model learns from massive datasets (often trillions of tokens). This is expensive and typically done by model providers. Fine-tuning builds on top of this foundation.

**Transfer learning** — The broader concept behind fine-tuning: knowledge learned on one task transfers to another. A model pre-trained on general text can be fine-tuned for medical document analysis because language understanding transfers.

**Full fine-tuning** — Updating all model parameters during training. Produces the highest-quality results but requires significant GPU memory (you need to store gradients for every parameter) and risks overfitting on small datasets.

**Epochs** — One complete pass through your training dataset. Fine-tuning typically uses 1-5 epochs. Too many epochs leads to overfitting; too few means the model hasn't learned your patterns.

## Parameter-efficient methods

**LoRA (Low-Rank Adaptation)** — Instead of updating all model weights, LoRA freezes the original weights and adds small trainable matrices alongside them. This reduces memory requirements by 10-100x while achieving results close to full fine-tuning. The most popular fine-tuning method in 2026.

**QLoRA** — LoRA applied to a quantized (compressed) base model. Enables fine-tuning large models on consumer GPUs. A 70B model that would normally need 8 GPUs can be fine-tuned on a single 24GB GPU.

**Adapter layers** — Small neural network modules inserted between existing model layers. Only the adapter weights are trained. Similar concept to LoRA but implemented differently.

**PEFT (Parameter-Efficient Fine-Tuning)** — The umbrella term for techniques like LoRA, adapters, and prefix tuning that fine-tune models by updating only a small fraction of parameters.

**Rank** — In LoRA, the rank (r) controls the size of the trainable matrices. Higher rank = more parameters = more capacity to learn, but also more memory and compute. Common values range from 4 to 64.

## Alignment and preference tuning

**RLHF (Reinforcement Learning from Human Feedback)** — Training a model to align with human preferences using reinforcement learning. Humans rank model outputs, a reward model learns these preferences, and the language model is optimized against the reward model. Used by OpenAI, Anthropic, and others to make models helpful and safe.

**DPO (Direct Preference Optimization)** — A simpler alternative to RLHF that skips the reward model step. It directly optimizes the language model on pairs of preferred/rejected outputs. Easier to implement, increasingly popular.

**SFT (Supervised Fine-Tuning)** — The straightforward approach: train the model on input-output pairs where the output is the desired response. Often the first step before RLHF or DPO.

**Instruction tuning** — A form of SFT where the training data consists of instructions paired with appropriate responses. This teaches the model to follow directions rather than just predict next tokens.

**Constitutional AI (CAI)** — Anthropic's approach where the model critiques and revises its own outputs based on a set of principles, reducing reliance on human feedback for alignment.

## Common challenges

**Catastrophic forgetting** — When fine-tuning on new data, the model "forgets" knowledge from pre-training. Mitigated by using small learning rates, mixing in general data, or using parameter-efficient methods.

**Overfitting** — The model memorizes training examples instead of learning generalizable patterns. Common when fine-tuning datasets are small. Signs: training loss drops to near zero while validation loss increases.

**Distribution shift** — Your fine-tuning data differs from what the model sees in production. The model performs well on your test set but poorly on real-world inputs that look different.

**Data contamination** — Your evaluation data accidentally appears in the training set, giving artificially inflated performance metrics. Always verify your train/eval splits are clean.

## Data concepts

**Training set** — The data used to update model weights. Quality matters more than quantity for fine-tuning.

**Validation set** — Held-out data used during training to monitor for overfitting. Not used to update weights.

**Test set** — Data used only for final evaluation. Never touched during training or hyperparameter selection.

**Synthetic data** — Training data generated by another AI model. Increasingly used for fine-tuning when human-generated data is scarce or expensive. Quality control is essential.

**Data deduplication** — Removing duplicate or near-duplicate examples from training data. Duplicates can cause the model to overweight certain patterns and waste training compute.

## Practical terms

**Learning rate** — How much the model weights change with each training step. For fine-tuning, this is typically much smaller than for pre-training (e.g., 1e-5 to 5e-5) to avoid destroying pre-trained knowledge.

**Warmup** — Gradually increasing the learning rate at the start of training. Prevents the model from making large, destructive weight updates before it has adapted to the new data distribution.

**Gradient accumulation** — Simulating larger batch sizes by accumulating gradients across multiple forward passes before updating weights. Useful when GPU memory limits your batch size.

**Checkpointing** — Saving model weights at regular intervals during training so you can resume if training is interrupted or revert to an earlier state if the model starts overfitting.

Bookmark this. You'll reference it more than you think.
