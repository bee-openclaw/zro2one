---
title: "AI Glossary: Essential Terms for Beginners — From Algorithm to Zero-Shot"
depth: essential
pillar: foundations
topic: ai-glossary
tags: [glossary, ai-basics, definitions, beginner, terminology]
author: bee
date: "2026-03-06"
readTime: 9
description: "Clear, jargon-free definitions of the most important AI terms. If you're new to AI and keep running into words you don't know, start here."
related: [ai-glossary-advanced, what-is-ai, how-llms-work-essential, machine-learning-essential]
---

AI discussions can feel like a foreign language. Terms get thrown around — "hallucination," "fine-tuning," "embeddings," "RAG" — without explanation, as if everyone already knows what they mean.

This glossary is the reference you wished you had at the start. Plain English. No assumed knowledge. Alphabetically organized so you can find what you need fast.

---

## A

**Agent / AI Agent**
An AI system that can take actions in the world — not just respond to questions. An AI agent might browse the web, run code, send emails, or call external tools to accomplish a goal. The key difference from a chatbot: agents *act*, not just *respond*. Most current AI agents require significant human supervision.

**Algorithm**
A set of rules or steps that a computer follows to solve a problem. In AI, "algorithm" often refers to the mathematical process used to train a model. Think of it as the recipe; the model is what you get when you follow it.

**Artificial General Intelligence (AGI)**
A hypothetical AI capable of performing any intellectual task a human can, with human-level (or greater) flexibility and competence. No current AI system is generally considered AGI. The term is heavily debated — what counts as "general" is contested.

**Artificial Intelligence (AI)**
Computer systems designed to perform tasks that would typically require human intelligence — like understanding language, recognizing images, or making decisions. The term covers a huge range of systems, from simple rule-based programs to large language models.

**Attention / Attention Mechanism**
The core technique inside modern AI models (especially Transformers) that lets the model "pay attention" to relevant parts of its input when producing an output. When a translation model translates "The cat sat on the mat" to French, attention is what lets it focus on "cat" when producing the French word for cat. See: Transformer.

---

## B

**Benchmark**
A standardized test used to evaluate and compare AI models. Common benchmarks test things like math reasoning, reading comprehension, or coding ability. Important caveat: benchmark performance doesn't always translate to real-world usefulness — models can be optimized to score well on tests without being more practically capable.

**Bias (AI)**
Two related concepts: (1) **Statistical bias** — systematic errors in a model's predictions due to wrong assumptions. (2) **Social bias** — unfair treatment of groups based on patterns in training data. An AI trained mostly on text written by men might reflect masculine assumptions about who holds positions of authority, for example.

---

## C

**Chatbot**
An AI system designed for conversational interaction. ChatGPT, Claude, and Gemini are sophisticated chatbots, though calling them just "chatbots" understates their capabilities. Basic chatbots follow scripted rules; modern AI chatbots generate responses from learned patterns.

**Context Window**
The amount of text an LLM can "see" at once — its short-term memory. If a model has a 128K token context window, it can process roughly 96,000 words in a single conversation. Text outside the context window is invisible to the model. Longer context windows enable longer conversations and larger documents.

**Computer Vision**
The field of AI focused on enabling computers to interpret and understand visual information — images, video, faces, objects. Powers self-driving car cameras, medical image diagnosis, photo search, and image generation.

---

## D

**Deep Learning**
A subset of machine learning that uses neural networks with many layers ("deep" refers to the number of layers). Deep learning is responsible for most of the impressive AI results of the past decade — image recognition, natural language processing, voice synthesis, and more.

**Diffusion Model**
The type of AI model behind most image generators (Stable Diffusion, DALL-E 3, Midjourney). Diffusion models learn to generate images by learning to remove noise — they're trained on noisy-to-clean image pairs and then generate images by starting with pure noise and progressively denoising it.

---

## E

**Embedding**
A way of representing concepts (words, sentences, images) as lists of numbers (vectors) that capture meaning. The magic: similar concepts get similar numbers. "Dog" and "cat" end up close together in embedding space; "dog" and "democracy" end up far apart. Embeddings are how AI systems understand semantic relationships. Used extensively in search, recommendation systems, and RAG.

**Emergent Capability**
An ability that appears in a large AI model that wasn't explicitly trained for and wasn't present in smaller versions of the same model. As language models scaled up, they suddenly became able to do arithmetic, translate languages, and write code — none of which were in the training objective. Researchers are still debating why emergence happens.

---

## F

**Few-Shot Learning**
Teaching an AI to perform a new task by showing it a few examples in the prompt, without additional training. If you show an LLM three examples of a specific email format and then ask it to write one, you're using few-shot prompting. Contrast with zero-shot (no examples) and fine-tuning (retraining on examples).

**Fine-Tuning**
Further training a pre-trained model on a specific dataset to specialize it for a particular task or domain. A general-purpose LLM fine-tuned on medical literature will become better at medical questions. Fine-tuning changes the model's weights, unlike prompting, which only changes the context.

**Foundation Model**
A large AI model trained on broad data that serves as a base for many different applications. GPT-4, Claude 3, Gemini — these are foundation models. You can use them directly, fine-tune them, or build applications on top of them.

---

## G

**Generative AI**
AI systems that create new content — text, images, audio, video, code. The "generative" distinguishes this from AI that classifies or predicts (discriminative AI). ChatGPT generates text; Midjourney generates images; Sora generates video.

**GPU (Graphics Processing Unit)**
Specialized computer hardware originally designed for video games, now essential for AI. GPUs can perform many mathematical operations in parallel, which makes training and running neural networks dramatically faster than traditional processors (CPUs). Training large models requires thousands of high-end GPUs.

---

## H

**Hallucination**
When an AI model confidently states something that is false, made up, or fabricated. LLMs hallucinate because they generate text based on learned patterns, not by retrieving verified facts. A hallucinating model might invent citations, make up statistics, or describe people or events that don't exist. Managing hallucination is one of the central challenges in deploying AI reliably.

**Human Feedback / RLHF (Reinforcement Learning from Human Feedback)**
A training technique where human raters evaluate model outputs and the model is updated to produce more highly rated responses. RLHF is how raw language models are turned into useful assistants — the process that makes ChatGPT helpful rather than just statistically likely to produce text.

---

## I

**Inference**
Running a trained AI model to produce outputs — as opposed to training (where the model learns). When you send a message to ChatGPT and get a response, that's inference. Inference requires significantly less compute than training.

---

## L

**Large Language Model (LLM)**
An AI model trained on vast amounts of text, capable of generating, translating, summarizing, and reasoning about language. GPT-4, Claude, Gemini, LLaMA — these are LLMs. "Large" refers to both the amount of training data and the number of parameters. See: Parameter.

**Latent Space**
The mathematical space where an AI model represents concepts internally. Points in latent space correspond to concepts, and the distance between points reflects semantic similarity. Image generators use latent space to blend and transform concepts. Word embeddings live in a latent space.

---

## M

**Machine Learning (ML)**
A category of AI where systems learn from data rather than being programmed with explicit rules. Instead of writing rules for spam detection, you train a model on millions of spam and non-spam emails and let it learn the patterns. Most modern AI is machine learning.

**Model**
In AI, a model is the mathematical system that's been trained to perform a task. "The model" is what you get after training. It contains all the learned parameters (weights) that determine how it responds to inputs.

**Multimodal**
An AI system that can process or generate multiple types of data — text, images, audio, video. GPT-4o is multimodal: it can understand images and speak as well as text. Most cutting-edge AI is moving toward multimodality.

---

## N

**Natural Language Processing (NLP)**
The field of AI focused on language — understanding it, generating it, and working with it computationally. NLP includes translation, summarization, sentiment analysis, question answering, and everything LLMs do.

**Neural Network**
A computing system loosely inspired by the brain, consisting of layers of interconnected "neurons" (mathematical functions). Each neuron takes inputs, applies a transformation, and produces an output. Deep learning uses neural networks with many layers. Modern LLMs are very large neural networks.

---

## O

**Open Source / Open Weight**
Open-source AI models (like LLaMA, Mistral, Stable Diffusion) make their code and/or model weights publicly available. "Open weight" specifically means the trained model parameters are downloadable and usable, even if the training data and code aren't fully open. This contrasts with proprietary models like GPT-4, which are accessible only via API.

**Overfitting**
When a model learns the training data *too* well — memorizing specific examples instead of learning general patterns. An overfitted model performs great on training data but poorly on new, unseen data. The opposite is underfitting (the model hasn't learned enough).

---

## P

**Parameter**
A numerical value inside a neural network that the training process adjusts. A model with "70 billion parameters" has 70 billion such values. More parameters generally means more capacity to learn complex patterns — but also more compute required to train and run. Parameters encode everything the model has learned.

**Prompt**
The input you give to an AI model. A prompt can be a question, an instruction, an example, or a combination. How you write your prompt significantly affects the quality of the response — this is why "prompt engineering" has become its own discipline.

**Prompt Engineering**
The practice of crafting prompts to get better outputs from AI models. Techniques include providing clear instructions, giving examples (few-shot prompting), specifying the output format, assigning a role to the model, and using chain-of-thought reasoning.

---

## R

**RAG (Retrieval-Augmented Generation)**
A technique that improves LLM accuracy by giving the model access to an external knowledge source at query time. Instead of relying entirely on what the model learned during training, RAG retrieves relevant documents and includes them in the context, allowing the model to answer with current, specific, or private information it wasn't trained on.

**Reasoning Model**
A type of LLM that "thinks before it answers" — it generates internal reasoning steps (a "chain of thought") before producing a final response. Models like OpenAI's o3, DeepSeek R2, and Claude's extended thinking mode use this approach. They're slower than standard models but more accurate on complex problems.

---

## T

**Token**
The unit an LLM processes — approximately a word or word fragment. "Hello world" is 2 tokens. "Uncharacteristically" might be 3-4 tokens. Models are measured in how many tokens they can handle (context window) and how many tokens they generate per second (throughput). Pricing for most LLM APIs is based on token count.

**Training**
The process of building an AI model by exposing it to data and adjusting its parameters to minimize errors. Training large language models requires massive datasets (hundreds of billions of words) and enormous compute (thousands of GPUs for weeks or months).

**Transformer**
The dominant neural network architecture in modern AI. Introduced in 2017 by Google researchers, Transformers use an "attention mechanism" that allows models to consider all parts of their input simultaneously. GPT, BERT, Claude, Gemini — all are Transformer-based.

---

## Z

**Zero-Shot Learning**
Asking an AI model to perform a task it hasn't been explicitly trained for and without providing examples. "Translate this sentence to Japanese" with no examples is a zero-shot request. Modern LLMs are surprisingly good at zero-shot tasks thanks to their broad training. Contrast with few-shot learning.

---

This is the beginner reference. For intermediate-to-advanced terms — attention mechanisms, fine-tuning types, alignment concepts, agentic AI — see the 🟣 Technical article: **AI Glossary: Advanced Terms**.
