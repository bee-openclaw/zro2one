---
title: "AI Glossary: Model Training Edition"
depth: applied
pillar: foundations
topic: ai-glossary
tags: [ai-glossary, training, terminology, reference]
author: bee
date: "2026-03-18"
readTime: 7
description: "A plain-language glossary of the terms you'll encounter when reading about how AI models are trained — from epochs to gradient accumulation."
related: [ai-glossary-practitioners-edition, ai-foundations-gradient-descent-intuition, deep-learning-training-at-scale]
---

Training is where AI models go from random numbers to useful systems. The terminology can be dense. Here's what each term actually means.

## Core Concepts

**Training** — The process of adjusting a model's parameters (weights) so its outputs match desired outputs on example data. The model sees data, makes predictions, measures errors, and updates itself to make better predictions.

**Inference** — Using a trained model to make predictions on new data. Training is learning; inference is using what you learned.

**Pre-training** — The first phase of training, usually on massive amounts of general data (web text, books, images). Produces a foundation model with broad capabilities but no specific task focus.

**Fine-tuning** — Additional training on a smaller, task-specific dataset after pre-training. Adapts a general model to a particular use case (medical Q&A, legal analysis, customer support).

**Post-training** — Everything after pre-training: fine-tuning, alignment (RLHF/DPO), safety training. Transforms a raw pre-trained model into a useful, safe product.

## The Training Loop

**Epoch** — One complete pass through the entire training dataset. Most models train for multiple epochs, seeing the same data several times. Too few epochs → undertrained. Too many → overfitting.

**Batch** — A subset of training data processed together. Instead of updating weights after every single example, you average the gradients across a batch. Common batch sizes: 32, 64, 128, 256.

**Batch Size** — How many examples are in each batch. Larger batches give more stable gradients but use more memory. Smaller batches add noise that can actually help the model generalize.

**Iteration / Step** — One weight update. Process a batch, compute loss, update weights = one step. An epoch contains many steps.

**Gradient** — The direction and magnitude to adjust each weight to reduce the loss. Computed via backpropagation. The gradient tells you "if you increase this weight, the error goes up/down by this much."

**Gradient Accumulation** — When your batch is too large for GPU memory, split it into smaller micro-batches, accumulate gradients across them, then update. Simulates a larger batch size without needing more memory.

**Learning Rate** — How much to adjust weights in response to gradients. Too high → overshoots optimal values. Too low → takes forever to converge. The single most important hyperparameter in training.

**Learning Rate Schedule** — A plan for changing the learning rate during training. Common pattern: warm up (start low, increase), then decay (gradually decrease). Cosine annealing is the most popular schedule in 2026.

## Loss and Optimization

**Loss Function** — The mathematical measure of how wrong the model's predictions are. Training minimizes the loss. Common losses: cross-entropy (classification), MSE (regression), contrastive loss (embeddings).

**Optimizer** — The algorithm that uses gradients to update weights. **SGD** (stochastic gradient descent) is the simplest. **Adam** is the most popular — it adapts the learning rate per parameter based on gradient history. **AdamW** adds weight decay correctly and is the default for most transformer training.

**Convergence** — When the loss stops improving meaningfully. The model has learned what it can from this data with this architecture.

**Overfitting** — The model memorizes training data instead of learning general patterns. Performs great on training data, poorly on new data. Signs: training loss decreases while validation loss increases.

**Underfitting** — The model hasn't learned enough. Both training and validation loss remain high. Usually means the model is too small, training was too short, or the learning rate is wrong.

## Data

**Training Set** — Data used to actually train the model (~80% of total data). The model sees this directly.

**Validation Set** — Data used to evaluate the model during training (~10%). Never used for weight updates. Helps you detect overfitting and tune hyperparameters.

**Test Set** — Data used for final evaluation only (~10%). Touched once, after all training and tuning is done. Your honest assessment of model performance.

**Data Augmentation** — Artificially expanding training data by applying transformations (rotating images, paraphrasing text, adding noise to audio). Improves generalization without collecting more data.

**Tokenization** — Converting raw text into numbers the model can process. "Hello world" might become [15496, 995]. Different tokenizers produce different token sequences. Important because the tokenizer defines what the model literally sees.

## Scaling and Distribution

**Distributed Training** — Training across multiple GPUs or machines. Necessary for large models that don't fit on a single GPU.

**Data Parallelism** — Each GPU gets a copy of the model and a different batch of data. Gradients are averaged across GPUs. Scales training speed with more GPUs.

**Model Parallelism** — The model is split across GPUs (different layers on different GPUs). Necessary when the model is too large for one GPU's memory.

**Tensor Parallelism** — Individual layers are split across GPUs. A single matrix multiplication is distributed. Reduces memory per GPU for very large layers.

**Pipeline Parallelism** — Different stages of the model run on different GPUs, with micro-batches flowing through like an assembly line. Balances memory and computation.

**Mixed Precision** — Training with both 16-bit and 32-bit floating point numbers. 16-bit for most operations (faster, less memory), 32-bit for sensitive operations (gradient accumulation, loss scaling). Standard practice in 2026.

## Alignment and Preferences

**RLHF (Reinforcement Learning from Human Feedback)** — Training a model to match human preferences. Humans rank model outputs, a reward model learns their preferences, then the language model is optimized against that reward model. How ChatGPT and Claude became helpful assistants.

**DPO (Direct Preference Optimization)** — A simpler alternative to RLHF that skips the reward model. Directly trains on pairs of "better" and "worse" responses. Faster and more stable than RLHF, increasingly popular.

**Constitutional AI** — Anthropic's approach: the model critiques and revises its own outputs based on a set of principles, reducing reliance on human feedback for safety training.

**Reward Hacking** — When a model optimizes for the reward signal without actually achieving the intended behavior. The AI equivalent of teaching to the test.

## Efficiency Techniques

**LoRA (Low-Rank Adaptation)** — Fine-tuning only a small number of added parameters instead of all model weights. Drastically reduces memory and compute requirements. The standard approach for custom fine-tuning in 2026.

**QLoRA** — LoRA applied to a quantized (compressed) base model. Fine-tune a 70B model on a single GPU.

**Distillation** — Training a smaller "student" model to mimic a larger "teacher" model. Produces compact models that retain much of the teacher's capability. How many production models are created.

**Quantization** — Reducing the precision of model weights (e.g., from 16-bit to 4-bit). Shrinks model size and speeds up inference at the cost of minor quality degradation.

---

This glossary covers the terms you'll encounter most often when reading about model training. For deployment and operations terminology, see the [MLOps edition](/learn/ai-glossary-deployment-mlops-edition). For safety and alignment terms, see the [safety edition](/learn/ai-glossary-safety-and-alignment).
