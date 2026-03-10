---
title: "Visual Grounding and Reasoning in Multimodal LLMs"
depth: technical
pillar: foundations
topic: mllms
tags: [mllms, visual-grounding, visual-reasoning, computer-vision, multimodal, vqa, object-detection]
author: bee
date: "2026-03-10"
readTime: 10
description: "How MLLMs understand the spatial structure of images, locate specific objects, and reason about visual relationships — the technical foundations of grounding and visual reasoning."
related: [mllms-vision-language-models, multimodal-ai-how-it-works, ai-foundations-embeddings-explained]
---

When a Multimodal Large Language Model (MLLM) answers "what is the person in the red shirt doing?" it's doing something more complex than matching text to image features. It's localizing the person, identifying the red shirt, tracking the person's pose, and connecting that perception to a language-based understanding of human actions.

This is visual grounding — the ability to connect language references to specific locations and objects in an image. Along with visual reasoning (making logical inferences about visual content), grounding is one of the hardest and most commercially important capabilities in current MLLMs.

## What grounding means technically

**Visual grounding** is the task of locating the image region that corresponds to a natural language description. There are several subtasks:

**Referring expression comprehension (REC):** Given the text "the man behind the desk," produce a bounding box around that specific person. This is grounding at the object level.

**Referring expression segmentation (RES):** Produce a pixel-level segmentation mask rather than a bounding box. More precise, more computationally expensive.

**Grounded caption generation:** Generate a description of an image where specific phrases are linked to specific bounding boxes. "A [dog] is sitting next to a [fire hydrant]" — where each bracketed entity corresponds to a precise image region.

**Phrase grounding:** Given a sentence and an image, identify which regions correspond to each noun phrase in the sentence.

These are the tasks; the question is how modern MLLMs approach them.

## How standard MLLMs handle grounding (the naive approach and its limits)

Early MLLMs (2022-2023 era) were trained primarily on image-caption pairs: a full image embedding fed to a language model, trained to produce a description. This produced models that could describe images generally, but their grounding capability was limited in a specific way:

**No spatial precision.** The image encoding (typically a CLIP or ViT embedding) compresses the entire image to a single fixed-size representation. Spatial information is present implicitly (high-resolution image tokens preserve some position information in ViT), but the model doesn't have an explicit mechanism for "look at this specific region."

The result: models that can tell you what's in an image but struggle to answer "what is in the upper-left corner?" or "draw a box around the dog."

## Architecture for grounding-capable MLLMs

Grounding-capable models require explicit mechanisms to connect language to image positions. Several architectural approaches:

### High-resolution patch-based encoding

Instead of encoding the whole image as one embedding, divide the image into a grid of patches (e.g., 14×14 = 196 patches) and process each patch separately. Each patch becomes an image token. Language model cross-attention can then attend to specific patches, learning to associate language tokens with spatial positions.

Models like LLaVA and its variants use this approach. The vision encoder produces a sequence of patch tokens; the language model learns to reference specific patch positions via attention.

### Visual coordinate tokens

Some models introduce special coordinate tokens into the vocabulary — `<x_0>`, `<x_1>`, ..., `<y_0>`, `<y_1>`, ... representing discretized pixel positions. Grounding is then expressed directly in the model's output:

"The dog is at `<x_0.23>``<y_0.45>``<x_0.48>``<y_0.72>`"

This converts grounding into a standard sequence prediction task. The model predicts coordinate tokens the same way it predicts text tokens — no separate detection head required.

QwenVL, CogVLM, and several other open-source MLLMs use coordinate-based approaches.

### Separate detection heads with language alignment

Hybrid approaches keep a dedicated detection head (based on DETR or similar architectures) for precise localization, while the language model provides semantic understanding. The two components are aligned by training on datasets where language descriptions are paired with precise object detections.

This gives higher localization precision than coordinate tokens (detection heads can produce continuous coordinates and high-quality segmentation masks), at the cost of architectural complexity.

## Visual reasoning: beyond object detection

Visual grounding is a prerequisite for visual reasoning, but reasoning requires more.

**Spatial reasoning:** "Is the cup to the left or right of the laptop?" This requires understanding relative positions of objects, not just identifying them.

**Causal/physical reasoning:** "If you remove the block from the bottom, what happens to the stack?" Requires understanding physical relationships and predicting outcomes.

**Compositional reasoning:** "How many red objects are there that are smaller than the blue ball?" Combining counting, color recognition, and size comparison in a single query.

**Multi-hop reasoning:** "What is the profession of the person standing next to the person in the red shirt?" Requires chaining reference resolution: find red shirt → identify adjacent person → identify that person's profession.

MLLMs handle these tasks with varying success. Single-object spatial queries ("is the dog to the left of the cat?") are now quite reliable on state-of-the-art models. Multi-hop and compositional reasoning remain significantly harder and are active research areas.

## Training data for grounding

The quality of grounding capability is heavily determined by training data. Key datasets:

**RefCOCO / RefCOCO+:** Referring expression datasets where annotators describe specific objects in images in a way that distinguishes them from other similar objects ("the woman on the right, not the one with the hat"). Used for REC training and evaluation.

**Visual Genome:** Dense image annotations with object bounding boxes, attributes, and relationships between objects. Rich source for spatial and relational visual understanding.

**GQA (Compositional Question Answering):** Questions about visual scenes that require reasoning about relationships between objects. Designed to be compositionally complex.

**FLEUR / PointQA:** Datasets specifically designed to evaluate models' ability to answer questions about specific points or regions in images.

**Interleaved image-text data:** Web data where images and text are interleaved, with the text often referencing specific aspects of the images. Models trained on large corpora of this data develop implicit grounding ability.

## Evaluation: how grounding capability is measured

**Standard metrics:**

*Pointing accuracy:* Given a referring expression, is the model's predicted bounding box center within the ground-truth box? A lenient but widely used metric.

*IoU (Intersection over Union):* The overlap between predicted and ground-truth bounding boxes. IoU > 0.5 is the standard threshold for "correct" in detection.

*Segmentation IoU:* For segmentation outputs, the overlap between predicted mask and ground-truth mask. Stricter than bounding box IoU.

*Visual Question Answering (VQA) accuracy:* On grounding-heavy VQA tasks, the percentage of correct answers. Broadly used but coarse — a model can get VQA answers right for the wrong reasons.

## Failure modes in production

Understanding where grounding fails is essential for building systems that depend on it.

**Crowded scenes:** When many similar objects are present, models struggle to disambiguate ("the third person from the left") reliably.

**Uncommon object positions:** Models trained on natural image data have spatial biases. They're better at grounding objects in typical locations (people at human height, cars at road level) than in atypical ones.

**Text in images:** Reading and localizing text in images (OCR + grounding) is a distinct capability. Models vary significantly. Strong performers: Claude, GPT-4V. Weaker on documents with complex layouts.

**Implicit references:** "The thing you'd use to open the locked door" requires inference about object function, not just appearance matching.

**Fine-grained spatial queries:** "The pixel in the exact center of the window frame" is well outside current model precision for most architectures.

## Current state of the art

As of early 2026, the best grounding performance comes from:

- **Claude 3.5/3.7 Sonnet:** Strong at spatial reasoning and text localization in documents
- **GPT-4o:** Robust grounding, particularly for natural images
- **Qwen-VL-Max:** Strong open-model-lineage performance on grounding benchmarks
- **CogAgent / CogVLM:** Specifically optimized for UI/screen understanding and precise grounding

For specialized grounding tasks (medical imaging, satellite imagery, industrial inspection), domain-specific fine-tuned models consistently outperform general MLLMs.

---

Visual grounding is a core capability that separates MLLMs that can describe images from MLLMs that can reason about them. The architectures and training data for grounding are well-understood and rapidly improving. For applications that need spatial precision — document parsing, UI automation, medical imaging — understanding what current models can and can't do spatially is essential engineering knowledge.
