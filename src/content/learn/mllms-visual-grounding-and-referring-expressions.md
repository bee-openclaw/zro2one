---
title: "Visual Grounding and Referring Expressions: How MLLMs Connect Words to Pixels"
depth: technical
pillar: models
topic: mllms
tags: [mllms, visual-grounding, referring-expressions, vision-language, localization]
author: bee
date: "2026-03-28"
readTime: 10
description: "How multimodal language models understand spatial references like 'the red cup on the left' — the architectures, training approaches, and practical applications of visual grounding."
related: [mllms-grounding-and-visual-reasoning, mllms-spatial-understanding, mllms-vision-language-models]
---

# Visual Grounding and Referring Expressions: How MLLMs Connect Words to Pixels

When you say "pass me the blue mug next to the laptop," you are performing a complex cognitive task: mapping a natural language description to a specific object in a visual scene. This requires understanding language, perceiving objects, reasoning about spatial relationships, and resolving ambiguity.

Visual grounding — teaching AI systems to locate objects or regions in images based on natural language descriptions — is one of the most important capabilities of multimodal large language models (MLLMs). It bridges the gap between understanding what is in an image and knowing where specific things are.

## What Visual Grounding Means

Visual grounding takes a text description and an image as input, and outputs the location of the described entity in the image — typically as a bounding box (coordinates), a segmentation mask, or a point.

**Referring expression comprehension:** Given "the person in the red shirt standing behind the counter," locate that specific person. This is the classic grounding task.

**Referring expression generation:** Given a bounding box around a specific object, generate a natural language description that uniquely identifies it. The inverse of comprehension.

**Phrase grounding:** Given a sentence like "a dog is chasing a cat across the yard," locate each mentioned entity (dog, cat, yard) in the image.

The challenge increases with scene complexity. In a simple image with one cup, "the cup" is unambiguous. In a kitchen scene with five cups, "the blue cup on the second shelf from the top, behind the cereal box" requires compositional understanding of attributes, spatial relations, and contextual reference.

## How Modern MLLMs Do It

Early visual grounding systems were specialized models — separate vision encoders and language encoders with task-specific fusion layers. Modern MLLMs integrate grounding into general-purpose vision-language models, which can ground, describe, reason, and converse using a unified architecture.

### Coordinate Output Formats

MLLMs ground objects by generating location coordinates as text tokens. Several formats are used:

**Normalized coordinates:** The model outputs bounding box coordinates as numbers between 0 and 1 (or 0 and 1000), representing positions relative to image dimensions. Example: `<box>(0.15, 0.32, 0.45, 0.67)</box>` meaning the box spans from 15% to 45% of the width and 32% to 67% of the height.

**Discretized tokens:** Coordinates are quantized to a vocabulary of location tokens. The image is divided into a grid (e.g., 100×100), and locations are referenced by grid cell. This integrates naturally with the language model's token prediction.

**Point references:** For simpler grounding tasks, the model outputs a single point (center of the target object) rather than a full bounding box. Less precise but faster and often sufficient for interaction tasks.

### Architecture Patterns

**Unified decoder models** (GPT-4V, Gemini, Claude) handle grounding within the same generative framework used for all other tasks. The model receives an image and a prompt like "Where is the red cup?" and generates coordinate tokens in its response. Grounding is just another generation task.

**Specialized grounding heads** add dedicated localization modules on top of the vision encoder. Models like Grounding DINO combine a text encoder, an image encoder, and a cross-modal decoder that directly predicts bounding boxes. These are more accurate for pure grounding tasks but less flexible.

**Region-aware training** teaches models to associate text with specific image regions during pre-training. This might involve training on datasets where captions are paired with bounding boxes for mentioned objects, or using region-text pairs where descriptions correspond to cropped image regions.

## Training for Grounding

Grounding capability requires training data that pairs text with spatial locations:

**Referring expression datasets.** RefCOCO, RefCOCO+, and RefCOCOg contain images with objects annotated with multiple referring expressions written by humans. These are the standard evaluation benchmarks.

**Grounded image-text pairs.** Large-scale datasets where nouns in captions are linked to bounding boxes in the image. GRIT, All-Seeing, and similar datasets provide millions of grounded descriptions.

**Spatial instruction tuning.** After pre-training, models are fine-tuned on instructions that require spatial reasoning: "Draw a box around the tallest building," "Which object is closest to the camera?" "Point to where the cat is looking."

**Negative examples matter.** Training only on positive matches (correct descriptions for correct locations) is insufficient. Models need exposure to distractors — similar objects that do not match the description — to learn discriminative grounding rather than just detecting all objects.

## Challenges

**Ambiguity resolution.** In scenes with multiple similar objects, the model must use all available cues — attributes (color, size, shape), spatial relations (left of, behind, next to), and contextual knowledge (the one being used, the one with a handle) — to identify the correct referent. This compositional reasoning remains challenging.

**Small and occluded objects.** Visual grounding struggles with small objects and objects partially hidden behind others. The visual features for small or occluded objects are weak, making it harder to match them to descriptions.

**Complex spatial relations.** "The third book from the left on the second shelf" requires counting and ordinal reasoning in addition to spatial localization. Most current models handle simple spatial relations (left, right, above, below) better than complex compositional ones.

**Cross-image reference.** In multi-image scenarios, "the same person from the previous photo" requires grounding across images — maintaining identity consistency across different views, which is still unreliable.

## Applications

**Robotics and embodied AI.** When a robot receives the instruction "pick up the screwdriver next to the wrench," visual grounding is the capability that connects the instruction to a specific location in the robot's visual field. This is perhaps the most important downstream application.

**Visual question answering with evidence.** Instead of just answering "yes, there is a stop sign," grounded VQA shows where the stop sign is. This provides interpretability — you can verify that the model is looking at the right thing.

**Accessibility.** Grounding enables more specific image descriptions for visually impaired users. Instead of "a busy street scene," a grounded system can describe "a person with a white cane crossing at the left crosswalk, approaching a bus stop 20 meters ahead on the right."

**Interactive image editing.** "Remove the person in the background on the right" requires grounding the referring expression before applying the edit. The accuracy of the edit depends on the accuracy of the grounding.

**Document understanding.** In documents and forms, grounding connects questions to specific regions — "What is the value in the Total row of the Revenue column?" requires locating the correct cell in a table.

## Evaluation

Standard metrics for visual grounding:

- **Accuracy@0.5:** The prediction is correct if the predicted bounding box overlaps with the ground truth by more than 50% (IoU > 0.5). The most common metric.
- **Point accuracy:** For point prediction, the prediction is correct if the predicted point falls within the ground truth bounding box.
- **Precision at different IoU thresholds:** More nuanced than a single threshold — how accurate are the predictions at 0.5, 0.7, and 0.9 overlap?

Current state-of-the-art models achieve 85–90% accuracy on standard RefCOCO benchmarks, with performance dropping to 60–70% on harder datasets with more complex descriptions and crowded scenes. This gap between benchmark and real-world performance is the frontier of active research.

Visual grounding is where language understanding meets spatial perception. As MLLMs become the foundation for AI agents that interact with the physical and digital world, the ability to connect "what you say" to "where it is" becomes not just useful but essential.
