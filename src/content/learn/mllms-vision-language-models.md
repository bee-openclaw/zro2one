---
title: "Vision-Language Models: How MLLMs Understand Images and Text Together"
depth: technical
pillar: foundations
topic: mllms
tags: [mllms, multimodal, vision-language, gpt4v, claude-vision, technical]
author: bee
date: "2026-03-05"
readTime: 9
description: "A technical deep dive into multimodal large language models (MLLMs) — how vision encoders connect to language models, what architectural choices matter, and how capability limits manifest in practice."
related: [what-is-mllm-essential, multimodal-ai-research, how-llms-work-technical]
---

## From single-modal to multimodal

Standard large language models operate entirely in token space — they take tokens as input and produce tokens as output. Images aren't tokens. So how do modern MLLMs like GPT-4o, Claude 3.7, and Gemini 1.5 understand images?

The answer involves two key components working together: a **vision encoder** that transforms images into representations a language model can process, and an **alignment mechanism** that bridges the representational gap between visual and linguistic modalities.

This article explains how that works technically, what architectural choices matter, and where current MLLMs succeed and fail.

---

## Architecture overview

Most production MLLMs follow a three-component structure:

```
Image → [Vision Encoder] → [Adapter/Projector] → [Language Model] → Text output
```

### Component 1: Vision Encoder

The vision encoder takes a raw image and produces a sequence of high-dimensional vectors (embeddings) representing visual features. Two dominant approaches:

**CNN-based encoders:** Traditional convolutional networks extract spatially-local features hierarchically. Less common in recent MLLMs but still used in some specialized architectures.

**Vision Transformers (ViT):** The dominant approach. ViT splits the image into a grid of patches (typically 14×14 or 16×16 pixels), linearly projects each patch into an embedding, adds position embeddings, and processes them through transformer self-attention layers.

The original ViT (Dosovitskiy et al., 2020) demonstrated that pure transformer architectures work for images — a significant result because it meant the same architectural principles underlying LLMs could apply to vision.

**CLIP encoders:** Most production MLLMs use CLIP (Contrastive Language-Image Pretraining) or CLIP-like vision encoders. CLIP is trained via contrastive learning: given image-text pairs from the web, it learns to make the image embedding and its corresponding text caption similar in embedding space (and dissimilar to non-matching pairs).

The result is a vision encoder whose representations are semantically aligned with language by construction — making CLIP embeddings particularly suitable as inputs to language models.

### Component 2: Adapter / Projector

The vision encoder produces visual embeddings of dimension D_v (e.g., 1024 or 1280). The language model expects embeddings of dimension D_l (e.g., 4096 for a 7B parameter LLM). These don't match, and more importantly, the semantic spaces need to be aligned.

The **projector** (also called adapter, bridge, or connector) maps visual tokens into the language model's embedding space.

Common architectures:

**Linear projection:** `visual_tokens = W @ image_embeddings + b`
Simple, fast, surprisingly effective. Used in LLaVA and many early MLLMs.

**MLP projection:** Two or more linear layers with activation functions. Provides more expressive mapping. More common in current approaches.

**Q-Former (Querying Transformer):** Used in BLIP-2 and InstructBLIP. A separate transformer with a fixed number of learnable query vectors that extract information from image embeddings via cross-attention. The output is a fixed-length sequence regardless of image size — more efficient for large images, at the cost of potential information loss.

**Cross-attention in LLM layers:** Some architectures (Flamingo-family) interleave cross-attention layers within the LLM itself, allowing the language model to directly attend to visual features at each layer.

### Component 3: Language Model

The language model backbone is a standard autoregressive LLM. The visual tokens from the projector are concatenated with text tokens and processed together. From the LLM's perspective, visual tokens are just additional tokens in the sequence.

This simplicity is elegant: the LLM doesn't need to know it's processing visual information. It just sees a longer sequence of tokens with different statistical properties.

---

## Training regimes

Training modern MLLMs typically happens in stages:

### Stage 1: Pretraining the vision-language connection

With the LLM weights **frozen**, train only the projector/adapter on large-scale image-caption datasets (LAION, CC3M, CC12M, etc.). Goal: teach the projector to map image embeddings into the LLM's embedding space in a semantically meaningful way.

This stage is computationally efficient because most parameters (the LLM) aren't being updated.

### Stage 2: Multimodal instruction tuning

Fine-tune the full model (or the projector + LLM, with the vision encoder frozen) on multimodal instruction-following data. This includes:

- Image QA pairs (visual questions and answers)
- Image captioning examples
- Interleaved image-text documents
- Visual reasoning tasks
- OCR and document understanding examples

The quality of instruction tuning data is critical. Models fine-tuned on high-quality datasets with diverse visual tasks significantly outperform those trained on quantity alone.

### Stage 3: Preference optimization (RLHF/DPO)

Similar to text-only LLM alignment, MLLMs are refined using human preference data. Particularly important for reducing hallucinations and improving calibration — the model's tendency to say "I'm not sure" when appropriate rather than confidently stating incorrect visual information.

---

## Image representation choices

### How many visual tokens?

A key architectural decision: how many tokens represent an image?

- **CLIP ViT-L/14:** Produces 256 visual tokens for a 224×224 image (256 patches of 14×14 pixels)
- **LLaVA-1.5:** Projects these to 256 tokens per image
- **LLaVA-HD (High Resolution):** Tiles large images into multiple crops, processes each separately, produces ~2000+ tokens
- **GPT-4V:** Exact approach not published; reportedly uses dynamic tiling

More tokens = more visual detail the LLM can reason about, but more context consumed and slower inference.

### Dynamic resolution handling

Real images come in vastly different sizes and aspect ratios. Several approaches to handle this:

**Resize and pad:** Resize all images to a fixed size. Loses detail, distorts aspect ratio.

**Dynamic tiling (AnyRes):** Divide large images into fixed-size tiles, process each independently, concatenate visual tokens. Preserves detail for large images. Used by LLaVA-HD, InternVL, and similar.

**Native resolution:** Process images at native resolution using dynamic sequence length. Computationally expensive but maximally informative.

---

## Capability analysis

### What MLLMs are genuinely good at

**Object recognition and scene description:** These are well-represented in training data. GPT-4V and Claude vision describe scenes accurately with good detail.

**OCR and document understanding:** Current models can read text in images accurately — receipts, screenshots, handwriting (varies), charts with text labels. Strong enough for production use in many document processing workflows.

**Diagram and chart interpretation:** Can describe bar charts, line graphs, flowcharts. Performance varies with complexity. Simple charts: reliable. Complex multi-series plots: sometimes struggles with specific values.

**Visual question answering:** Answering specific questions about image contents. Generally strong for visually-apparent information.

**Code screenshot understanding:** Feeding a screenshot of code and asking questions about it works surprisingly well.

### Where MLLMs currently struggle

**Precise spatial reasoning:** "Which object is directly to the left of the blue cube?" — these struggle. The tokenized image representation loses precise spatial relationships.

**Counting:** MLLMs often fail at precise counting beyond ~5-6 objects. "How many people are in this photo?" with 23 people may return 20, or 25, or anywhere in the ballpark.

**Fine-grained visual attributes:** Distinguishing very similar-looking objects (dog breeds, plant species, similar logos) is unreliable.

**Temporal understanding:** Single-frame models don't understand motion, change over time, or sequences without explicit multi-image prompting.

**Hallucination on visual content:** A persistent problem — models sometimes confidently describe objects not present in the image. Always verify critical visual claims.

**Text at odd angles or in unusual fonts:** OCR quality degrades with handwriting variation, unusual orientations, or low-contrast text.

---

## Native multimodality vs. late fusion

An important architectural distinction has emerged between model families:

**Late fusion (most current MLLMs):** Train a language model and a vision encoder separately; connect them with a learned adapter. More modular, easier to update individual components, but the vision-language integration is shallower.

**Native multimodality (GPT-4o-style):** Train the model end-to-end on multiple modalities simultaneously from the beginning. The model develops joint representations rather than translating between them. Theoretically enables deeper cross-modal understanding. More expensive to train.

GPT-4o is reported to use native multimodal training, which may explain its strong performance on tasks requiring deep integration of visual and linguistic reasoning. Claude 3.7's approach has not been published in detail.

The architectural trend in 2026 is toward more native training approaches as compute scales.

---

## Practical implementation

### API usage

```python
import anthropic
import base64

client = anthropic.Anthropic()

# Load and encode image
with open("chart.png", "rb") as f:
    image_data = base64.standard_b64encode(f.read()).decode("utf-8")

message = client.messages.create(
    model="claude-3-7-sonnet-20250219",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_data,
                    },
                },
                {
                    "type": "text",
                    "text": "Describe the trends shown in this chart. What is the most notable pattern?"
                }
            ],
        }
    ],
)

print(message.content[0].text)
```

### OpenAI GPT-4V

```python
from openai import OpenAI
import base64

client = OpenAI()

with open("chart.png", "rb") as f:
    image_data = base64.b64encode(f.read()).decode("utf-8")

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{image_data}",
                        "detail": "high"  # "low" for cost, "high" for detail, "auto" for both
                    }
                },
                {
                    "type": "text",
                    "text": "Describe the trends in this chart."
                }
            ]
        }
    ],
    max_tokens=1000
)
```

### Cost considerations

Vision tokens are expensive. GPT-4o charges:
- "low" detail mode: 85 tokens per image (fixed)
- "high" detail mode: 170 tokens for base + 170 tokens per 512×512 tile

A 1024×1024 image in high detail mode costs: 170 (base) + 4 × 170 (4 tiles) = 850 tokens for the image alone. At $5/1M tokens input, that's ~$0.004 per image. At volume, this adds up.

Optimization: Use "low" detail mode when fine spatial reasoning isn't needed (e.g., object detection, general scene description). Use "high" only when you need to read text or analyze fine details.

---

## The frontier: video and real-time vision

The logical extension of image understanding is video understanding — and real-time visual processing.

**Video MLLMs:** GPT-4o and Gemini 1.5 can process video (as sampled frames). Gemini 1.5's 1M-token context window is particularly suited for long video analysis — you can process an entire film at meaningful frame rates. Natively temporal video understanding is still early.

**Real-time vision:** GPT-4o's "Advanced Voice Mode" can process the camera feed in real-time, enabling visual AI assistance. Gemini Live has similar capability. This is the category where MLLMs transition from tool to interface — the AI that sees what you see.

The architectural challenge for real-time vision is latency: processing visual tokens through a large LLM takes time, and human-paced conversation requires sub-500ms response times. Optimized inference and smaller specialized models are the current approach.

---

## Summary

MLLMs connect vision encoders (primarily ViT-based CLIP models) to language models via learned adapter layers, enabling joint processing of images and text. Current architectural choices — number of visual tokens, resolution handling, stage-wise training — significantly impact capability. Production models are strong at description, OCR, and VQA, but still struggle with precise spatial reasoning, counting, and visual hallucination. Native multimodal training is the emerging frontier. Understanding these architectural choices explains why different models have different capability profiles on visual tasks.
