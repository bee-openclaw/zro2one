---
title: "The AI Glossary: Every Term You Actually Need to Know"
depth: essential
pillar: foundations
topic: ai-glossary
tags: [ai-basics, glossary, terminology, beginners]
author: bee
date: "2026-03-02"
readTime: 8
description: "AI has a jargon problem. Here's every term you'll encounter — defined in plain English, with context for why it matters."
related: [what-is-ai, how-llms-work-essential, start-using-ai-today]
---

## No jargon without explanation

AI conversations are full of terms that sound intimidating but usually describe simple ideas. This glossary gives you plain-English definitions and tells you *why each term matters*.

Organized by how likely you are to encounter them, not alphabetically.

---

## Terms you'll hear every day

### AI (Artificial Intelligence)
Software that can perform tasks normally requiring human intelligence — like recognizing images, understanding language, or making predictions. It's a broad category, not one specific technology.

### LLM (Large Language Model)
A type of AI trained on massive amounts of text that can generate, summarize, and analyze language. ChatGPT, Claude, and Gemini are all LLMs. "Large" refers to the billions of parameters (learned values) in the model.

### Prompt
The text you type into an AI tool. Your prompt is the input; the AI's response is the output. Better prompts → better outputs. This is why "prompt engineering" became a skill.

### Hallucination
When an AI generates information that sounds confident and plausible but is factually wrong or completely made up. This happens because LLMs generate text based on patterns, not by looking up facts. **Always verify important claims.**

### Token
The basic unit that LLMs work with. Roughly equivalent to a word, but not exactly — common words are one token, while unusual words might be split into multiple tokens. Pricing and limits are usually measured in tokens.

### Context window
The maximum amount of text an LLM can process at once — both your prompt and its response. Think of it as the model's "working memory." Modern models support 100K-200K tokens (roughly the length of a novel), but performance can degrade at the edges.

### Fine-tuning
Taking a pre-trained AI model and training it further on specific data to specialize it for a particular task. Like hiring a generalist and then training them for your industry.

### API (Application Programming Interface)
A way for developers to connect their software to an AI model. Instead of using ChatGPT's website, developers use the API to build AI into their own products. This is how most AI-powered apps work under the hood.

---

## Terms you'll encounter regularly

### Generative AI
AI that creates new content — text, images, code, music, video. Distinguished from AI that classifies, predicts, or analyzes existing data.

### Model
The actual software that does the AI work. A model is the result of training — the learned patterns stored as billions of numbers. When people say "GPT-4" or "Claude," they're naming specific models.

### Training
The process of feeding data to an AI system so it learns patterns. Like teaching, but with data instead of lessons. A model is trained once (at enormous cost), then used (cheaply) many times.

### Parameters
The internal numbers that a model learned during training. When you hear "a 70-billion parameter model," it means the model has 70 billion learned values that together encode its knowledge and abilities. More parameters generally means more capable (but also more expensive).

### Neural network
The type of mathematical structure behind modern AI. Loosely inspired by the brain, it's a network of simple computing units (neurons) arranged in layers. Data flows through the layers, getting transformed at each step.

### Deep learning
Using neural networks with many layers (hence "deep"). This is the approach behind essentially all modern AI breakthroughs, from image recognition to language models.

### Transformer
The specific neural network architecture used by LLMs. Invented in 2017 by Google. Its key innovation — "attention" — lets the model consider all parts of the input simultaneously, making it much better at understanding language than previous approaches.

### GPT (Generative Pre-trained Transformer)
OpenAI's family of LLMs. "Generative" = creates content, "Pre-trained" = trained on lots of data first, "Transformer" = uses the transformer architecture. The name has become almost synonymous with LLMs, but GPT is just one family of models among many.

### Multimodal
An AI that can work with multiple types of input — text, images, audio, video. GPT-4, Claude, and Gemini are all multimodal: you can show them images, not just text.

### RAG (Retrieval-Augmented Generation)
A technique that gives LLMs access to specific documents or databases when generating responses. Instead of relying only on what it learned during training, the model can look up current, specific information. This dramatically reduces hallucination for fact-based tasks.

---

## Terms for the curious

### Machine learning (ML)
The broader field that AI sits within. ML is the study of algorithms that improve through experience (data). AI is ML applied to tasks we consider "intelligent." In practice, the terms are often used interchangeably.

### Inference
Using a trained model to generate outputs. Training is when the model learns; inference is when it applies what it learned. When you chat with ChatGPT, that's inference.

### Temperature
A setting that controls how random/creative an AI's output is. Low temperature = predictable and focused. High temperature = creative and varied. Most chat interfaces handle this for you, but API users can adjust it.

### Embedding
A way of representing text (or images, or other data) as a list of numbers that captures meaning. Similar concepts get similar numbers. This is how AI "understands" that "dog" and "puppy" are related.

### Reinforcement Learning from Human Feedback (RLHF)
The process of improving an AI's behavior by having humans rate its outputs. "This response was helpful, this one wasn't." The model learns to produce more of the helpful kind. This is what makes ChatGPT conversational and helpful (rather than just a text predictor).

### Open source / Open weight
AI models whose code or trained parameters are publicly available. Models like LLaMA (Meta), Mistral, and others can be downloaded and run by anyone. This contrasts with "closed" models like GPT-4 where only the company can run them.

### Agent
An AI system that can take actions — not just generate text, but use tools, browse the web, write code, and make decisions. The idea is AI that can accomplish multi-step goals autonomously. Still early but developing rapidly.

### Benchmark
A standardized test used to measure AI performance. Like an SAT for AI models. Common benchmarks test math, reasoning, coding, and knowledge. Useful but imperfect — models can be optimized for benchmarks without genuine improvement.

---

## Terms you might see in headlines

### AGI (Artificial General Intelligence)
Hypothetical AI that can do any intellectual task a human can. Current AI is "narrow" — great at specific tasks, can't generalize the way humans do. AGI doesn't exist yet, and experts disagree on when (or whether) it will.

### Alignment
The challenge of making AI systems do what we actually want — not just what we literally asked for. An aligned AI is helpful, honest, and harmless. An unaligned AI might technically follow instructions while causing unintended harm.

### Diffusion model
The type of AI behind most image generators (DALL-E, Stable Diffusion, Midjourney). Works by learning to gradually remove noise from a random image until a coherent picture emerges. Different architecture than LLMs, same "learns from data" principle.

### Synthetic data
Data generated by AI that's used to train other AI. As real data becomes scarce, synthetic data is increasingly important — but training AI on AI-generated data raises quality concerns.

---

This glossary will grow as AI evolves. Missing a term? The field moves fast — check back regularly, or [subscribe to our newsletter](/newsletter) for updates.
