---
title: "Running LLMs Locally: A Practical Getting Started Guide"
depth: essential
pillar: practice
topic: getting-started
tags: [getting-started, local-llms, ollama, open-source-llms, self-hosting, llm]
author: bee
date: "2026-03-09"
readTime: 8
description: "You can run capable language models on your own hardware in minutes. Here's what you need to know to get started with local LLMs — hardware requirements, model selection, and the tools that make it practical."
related: [getting-started-first-ai-project, getting-started-ai-30-days, how-llms-work-essential]
---

Cloud LLM APIs are convenient, but there are real reasons to run models locally: privacy, cost at scale, offline access, customization, and just wanting to understand how the technology works at a deeper level. The good news is that local inference has become dramatically more accessible — you can have a capable model running on your laptop in about five minutes.

This guide gets you up and running fast and helps you make smart choices about hardware and models.

## What you need

### Hardware minimums

**Mac with Apple Silicon (M1/M2/M3/M4):** This is currently the best consumer hardware for local LLMs. The unified memory architecture means system RAM is accessible to the GPU — a 32GB M2 Mac can run 13B-parameter models comfortably and 30B-parameter models in a pinch. Metal acceleration is well-supported.

**Windows/Linux with NVIDIA GPU:** CUDA-accelerated inference is fast and well-supported. Minimum: 8GB VRAM for 7B models, 16GB for 13B models, 24GB+ for 30B+ models. Consumer cards (RTX 3080/4070 and up) work well.

**CPU only:** Possible, but slow. A 7B model generates 1-5 tokens per second on CPU — usable for some tasks, frustrating for others. Consider this a fallback, not a recommended path.

**RAM requirements (rough guides):**
| Model size | Quantization | RAM needed |
|---|---|---|
| 7B | 4-bit (Q4) | ~4-6 GB |
| 7B | 8-bit (Q8) | ~7-9 GB |
| 13B | 4-bit (Q4) | ~8-10 GB |
| 30B | 4-bit (Q4) | ~18-22 GB |
| 70B | 4-bit (Q4) | ~38-45 GB |

**Quantization** is the key to running large models on consumer hardware — more on that below.

## The tool: Ollama

[Ollama](https://ollama.ai) is the easiest way to get started with local models. It handles downloading, storing, and running models with a simple CLI interface and a REST API that mirrors OpenAI's format.

**Install:**
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows: download installer from ollama.ai
```

**Run your first model:**
```bash
ollama run llama3.2
```

That's it. Ollama downloads the model (if not already present) and drops you into an interactive chat session. To exit: `/bye`

**Other useful Ollama commands:**
```bash
ollama list            # List downloaded models
ollama pull qwen2.5    # Download a model without running it
ollama rm llama3.2     # Remove a model
ollama serve           # Start the API server (auto-started on install)
```

**API access:** Ollama exposes a REST API at `localhost:11434` that's compatible with the OpenAI API format. You can swap Ollama in for OpenAI in most code by changing the base URL and model name:

```python
from openai import OpenAI

client = OpenAI(
    base_url='http://localhost:11434/v1',
    api_key='ollama',  # required but ignored
)

response = client.chat.completions.create(
    model='llama3.2',
    messages=[
        {'role': 'user', 'content': 'Explain gradient descent simply.'}
    ]
)
print(response.choices[0].message.content)
```

## Model selection

There are hundreds of models available. Here's a practical guide to picking one.

### By capability tier

**7B models — Good starting point.** Modern 7B models (Mistral 7B, Llama 3.2 8B, Qwen 2.5 7B) punch well above their weight. For many tasks — summarization, simple question answering, code completion, basic reasoning — they're competitive with early GPT-3.5. They run well on 8-16GB RAM with 4-bit quantization.

**13-14B models — The sweet spot.** Significantly more capable than 7B for complex reasoning and instruction following. Still practical on 16GB RAM. If your hardware can run these, they're often the best value.

**30B+ models — High capability, demanding.** Require 24GB+ RAM. Noticeably stronger at complex tasks, nuanced instruction following, and creative work. Worth it if your hardware supports them.

**70B models** — Approaching frontier model quality on many tasks, but requires 48GB+ RAM or multi-GPU setup. Not accessible on most consumer hardware without quantization tricks.

### By use case

**General assistant / chat:** Llama 3.2 (Meta), Mistral, Qwen 2.5

**Code assistance:** DeepSeek Coder V2, Qwen 2.5 Coder, CodeLlama

**Reasoning and logic:** QwQ, DeepSeek-R1 (if your hardware can handle the size)

**Compact / fast:** Phi-4 (Microsoft), Gemma 2 2B — great for basic tasks with minimal resource usage

**Multimodal (vision):** LLaVA, Moondream, Llama 3.2 Vision

### Quantization levels

Models are typically distributed as quantized versions. Quantization reduces the precision of model weights to reduce memory requirements and speed up inference.

Common formats:
- **Q4_K_M** — 4-bit quantization (medium). Best quality/size tradeoff for most 4-bit users. Recommended starting point.
- **Q5_K_M** — 5-bit quantization. Better quality than Q4, slightly larger.
- **Q8_0** — 8-bit quantization. Near full quality. Requires roughly 2× the VRAM of Q4.
- **F16 / BF16** — Half precision, full quality. Requires ~2× Q8 VRAM. For GPU inference when memory allows.

For most users: start with Q4_K_M. If you notice quality issues (especially on complex reasoning), step up to Q5_K_M or Q8_0.

In Ollama, you can specify variants:
```bash
ollama pull llama3.2:8b-instruct-q5_K_M
```

## Alternative tools

**LM Studio** — A GUI application for Mac and Windows. Download, manage, and chat with models without any command line. The most beginner-friendly option. Also includes an OpenAI-compatible API server.

**Jan.ai** — Open-source desktop app with chat interface and API server. Good alternative to LM Studio.

**llama.cpp** — The underlying inference engine used by most local LLM tools. If you want maximum control or you're embedding local inference in your own application, use llama.cpp directly.

**Text Generation WebUI (oobabooga)** — Feature-rich web interface for advanced users. Supports many model formats and fine-tunes.

## Practical things to know

**Speed expectations:** A 7B model on an M2 Mac with 16GB RAM generates at roughly 30-60 tokens per second. That's fast enough for interactive use. A 13B model runs at ~15-30 tokens/sec on the same hardware — still usable. On an 8GB VRAM GPU, similar figures apply.

**Context length:** Most locally run models support 8K-32K token contexts. Some support longer with `--ctx-size` flags. Check the model's documentation.

**Memory vs. speed tradeoff:** Running a model that barely fits in RAM will page memory and become very slow. If a model is consistently slow despite good hardware, it may be slightly over your RAM budget — try a smaller quantization variant.

**Model storage location:** Ollama stores models in `~/.ollama/models` (Mac/Linux) or `C:\Users\username\.ollama\models` (Windows). Models can be large (7B Q4 ≈ 4GB, 13B Q4 ≈ 8GB). Plan your storage accordingly.

**Custom system prompts in Ollama:** Create a Modelfile to customize a model's default behavior:

```
FROM llama3.2

SYSTEM """
You are a concise technical assistant. Answer questions directly and briefly.
Avoid unnecessary preamble.
"""

PARAMETER temperature 0.7
```

Then build and run: `ollama create my-assistant -f Modelfile && ollama run my-assistant`

## Is local good enough for your use case?

A practical comparison:

| Use case | Local 7-13B | Cloud frontier model |
|---|---|---|
| Simple Q&A | ✅ Good | ✅ Excellent |
| Summarization | ✅ Good | ✅ Excellent |
| Code completion | ✅ Good | ✅ Excellent |
| Complex reasoning | ⚠️ Moderate | ✅ Strong |
| Creative writing | ✅ Good | ✅ Excellent |
| Privacy-sensitive tasks | ✅ Best option | ⚠️ Data leaves device |
| Offline use | ✅ Works | ❌ Requires internet |
| High volume / cost | ✅ After hardware cost | ⚠️ Expensive at scale |

For many everyday tasks, local 7-13B models are genuinely good enough. The quality difference compared to frontier models is real — especially on complex, multi-step reasoning — but for a large fraction of practical use cases, local models deliver excellent results.

Start small. Run `ollama run llama3.2` and see for yourself. The best way to understand the capability gap (or lack thereof) is to experience it on your actual tasks.
