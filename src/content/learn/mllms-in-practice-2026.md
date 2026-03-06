---
title: "MLLMs in Practice: What Vision-Language Models Can and Cannot Do in 2026"
depth: applied
pillar: practice
topic: mllms
tags: [mllms, vision-language, multimodal, gpt-4o, claude, gemini, image-understanding]
author: bee
date: "2026-03-06"
readTime: 9
description: "Multimodal large language models can now see, hear, and read. Here's what they're actually good at in 2026, where they still fall short, and how to use them in real workflows."
related: [mllms-vision-language-models, multimodal-ai-practical, what-is-mllm-essential]
---

A year ago, "multimodal AI" meant a model that could accept an image as well as text. Today, the frontier models — GPT-4o, Claude 3.7, Gemini 2.0 — can process images, audio, video, PDFs, spreadsheets, and code simultaneously. They don't just see; they reason about what they see in context.

This guide is about what that capability looks like in practice: what actually works, what's still unreliable, and how to build real things with MLLMs.

## What the major MLLMs can process in 2026

**GPT-4o (OpenAI)**
- Text, images (JPEG, PNG, GIF, WebP), audio (real-time via Voice mode), file uploads
- Up to 20 images per message via API
- Real-time audio conversation with low latency
- Code interpreter for data analysis and visualization

**Claude 3.7 Sonnet (Anthropic)**
- Text, images (JPEG, PNG, GIF, WebP), PDFs (including scanned), spreadsheets
- Up to 20 images per message
- No native audio processing (text-based only)
- Strongest at long-document analysis and reasoning within PDFs

**Gemini 2.0 Flash / Pro (Google)**
- Text, images, audio, video, PDFs, spreadsheets, code
- 1M token context window enables processing of very long documents or many images
- Native audio understanding (not transcription then text — true audio comprehension)
- Video analysis (not just frames but temporal understanding across video segments)

**Llama 3.2 Vision (Meta, open weights)**
- Text and images (11B and 90B parameter versions)
- Self-hostable — the key advantage for privacy-sensitive applications
- Competitive with commercial models on many image understanding tasks at lower cost

## What MLLMs are genuinely good at

### Document understanding

Paste in a PDF, image of a form, screenshot of a spreadsheet, or photo of a handwritten note and ask questions about it. MLLMs handle this surprisingly well — extracting data, summarizing content, answering questions from the document.

**What works:**
- "Extract all the line items and totals from this invoice as a table"
- "What does this contract say about termination clauses?"
- "Summarize the key findings from this research paper"
- "What fields are present in this form and what are their values?"

**Caveat:** For long PDFs (100+ pages), context window limitations matter. Claude's PDF handling is best for very long documents; Gemini's 1M context handles even book-length documents.

### Visual question answering

Point a model at an image and ask it about the content. Works well for:
- "What's wrong with this design? Give me feedback on the UI"
- "Is there a person in this image? Describe what they're doing"
- "What products are visible in this retail shelf photo?"
- "Identify the species in this photo"

GPT-4o and Claude are both strong here. For medical images, satellite imagery, and specialized domains, results vary — test carefully before relying on this in production.

### Code and screenshot debugging

"Here's a screenshot of my app's UI — what's broken?" combined with code context is now a real workflow. MLLMs can see the visual state and reason about what the code is doing.

Also useful: "Here's a screenshot of an error message — what does it mean and how do I fix it?"

### Data visualization interpretation

Upload a chart, graph, or dashboard screenshot and ask for analysis. MLLMs can extract trends, identify anomalies, compare values, and explain what a visualization shows.

**Good prompt pattern:** "This chart shows [context]. What are the 3 most important things this data tells us?"

### OCR and text extraction

While dedicated OCR tools are more reliable for production text extraction, MLLMs handle:
- Handwritten text (sometimes)
- Tables in images
- Mixed text/image documents
- Text in non-standard formats or layouts

For critical text extraction where accuracy matters: use a dedicated OCR service. For "good enough" extraction in workflows with human review: MLLMs work well.

## What MLLMs still struggle with

### Precise spatial reasoning

"How far is the red circle from the top-left corner of the image?" — MLLMs are surprisingly weak at precise positional measurements and spatial relationships. They understand "the circle is near the top-left" but struggle with precise pixel distances or relative sizing.

For applications requiring precise spatial understanding (measuring objects in photos, detecting exact positions), specialized computer vision models still outperform MLLMs.

### Counting objects in images

"How many cars are in this parking lot photo?" — MLLMs often miscount when objects are numerous, overlapping, or small. They're generally accurate for small numbers (fewer than ~10 clearly visible objects) and unreliable for larger counts.

### Complex scene graphs

Understanding precisely which objects relate to which other objects in a complex scene is still imperfect. "The dog is behind the fence to the left of the red car" — MLLMs grasp these descriptions but sometimes misparse complex spatial relationships.

### Consistent character identity across images

Provide two photos and ask "Is this the same person?"  — MLLMs are better at this than they were, but still unreliable enough that you shouldn't use them as a face recognition system without verification.

### Temporal reasoning in video (except Gemini)

Most MLLMs process video as sampled frames rather than as true temporal sequences. Questions that require understanding movement, causality, or temporal ordering ("what happened first in this video?") are handled better by Gemini's native video understanding than by frame-sampling approaches.

## Building with MLLMs: practical patterns

### Pattern 1: Document extraction pipeline

**Use case:** Extract structured data from unstructured documents (invoices, receipts, forms, reports)

**Pattern:**
1. Accept document upload (PDF, image, scan)
2. Send to MLLM with structured extraction prompt: "Extract [specific fields] from this document. Return as JSON: {field: value}"
3. Validate and clean the JSON output
4. Handle failures with human review queue

**Model choice:** Claude 3.7 for complex PDFs, GPT-4o for general docs, Gemini for very long documents.

### Pattern 2: Image quality/content check

**Use case:** Validate that user-uploaded images meet requirements before processing

**Pattern:**
1. User uploads image
2. MLLM checks: "Does this image contain [requirement]? Answer yes/no and explain why"
3. Route based on response: pass, reject, or flag for review

**Model choice:** GPT-4o or Claude — both fast and accurate for binary image classification tasks.

### Pattern 3: Visual analysis + text generation

**Use case:** Generate text content grounded in an image (product descriptions, alt text, captions, design feedback)

**Pattern:**
1. Receive image input
2. Run visual analysis: "Describe this [product/scene/design] in detail, including [specific aspects relevant to your use case]"
3. Use description as context for content generation
4. Return generated content

**Model choice:** GPT-4o tends to produce the most fluent long-form text from visual inputs.

### Pattern 4: Multimodal RAG

**Use case:** Retrieve relevant documents from a mixed text/image collection and answer questions

**Pattern:**
1. Index document collection, embedding both text and image content
2. On query, retrieve relevant chunks (including image-heavy pages)
3. Pass retrieved context + images + question to MLLM
4. Return grounded answer with sources

This is more complex to build but enables QA over documents that are genuinely multimodal (technical manuals, product catalogs, slide decks).

## Cost considerations

Multimodal API calls cost more than text-only calls. Current pricing (approximate):

| Model | Image cost (per image) | Text cost per 1M tokens |
|---|---|---|
| GPT-4o | ~$0.001-$0.004 (size-dependent) | $2.50 input / $10 output |
| Claude 3.7 Sonnet | ~$0.002-$0.005 | $3 input / $15 output |
| Gemini 2.0 Flash | ~$0.0001-$0.0004 | $0.10 input / $0.40 output |
| Llama 3.2 Vision | Self-hosted GPU cost | N/A |

Gemini Flash is significantly cheaper for high-volume image processing and worth evaluating if you're processing many images.

## The honest assessment

MLLMs in 2026 are genuinely useful for document understanding, visual QA, content generation from images, and data extraction. These aren't demos — they're production-viable for many use cases.

They're still unreliable for precise spatial tasks, high-accuracy counting, and applications where being wrong has serious consequences without human review.

The right mental model: MLLMs are an extremely capable first-pass processor. Route outputs that need high accuracy through human review, specialized models, or validation steps. Don't treat them as ground truth for critical decisions.

For the research-level treatment of how vision-language models work — visual encoders, cross-attention fusion, contrastive pretraining — see the 🔴 Research article in the MLLMs series.
