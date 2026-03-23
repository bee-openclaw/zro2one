---
title: "Spatial Understanding in Multimodal LLMs: How Models Reason About Space"
depth: technical
pillar: building
topic: mllms
tags: [mllms, spatial-reasoning, vision, 3d, scene-understanding]
author: bee
date: "2026-03-15"
readTime: 9
description: "Modern MLLMs can describe what's in an image but often struggle with where things are. This guide explores spatial reasoning capabilities, limitations, and techniques for improvement."
related: [mllms-grounding-and-visual-reasoning, mllms-vision-language-models, multimodal-ai-how-it-works]
---

Ask a multimodal LLM "What's in this photo?" and you'll get an impressive answer. Ask "Is the coffee cup to the left or right of the keyboard?" and the answer becomes unreliable. Ask "How far away is the car?" and you're mostly getting guesses.

This gap between recognition and spatial understanding is one of the most active areas of MLLM research. Understanding where it stands helps you know when to trust these models and when to supplement them.

## What spatial understanding means

Spatial understanding encompasses several capabilities:

**Object localization.** Where in the image is a specific object? Can the model point to it, provide bounding box coordinates, or describe its position?

**Relative positioning.** How are objects arranged relative to each other? Is A above B? Is C between D and E? Is the dog behind the couch?

**Depth estimation.** How far away are objects from the camera? Which objects are in the foreground vs. background?

**Size estimation.** How large is an object in absolute terms (not just pixels)? Is that a toy car or a real car?

**Scene layout.** What's the overall spatial structure? Where are the walls, floor, furniture? How is the room organized?

**3D reasoning.** Can the model infer the 3D structure from a 2D image? What would this scene look like from a different angle?

## Current capabilities (March 2026)

### What works

**Coarse spatial relations.** "The person is standing next to the tree" — models handle this well. High-level spatial descriptions that don't require precision are reliable.

**Foreground/background.** Models can distinguish what's close to the camera from what's far away, especially with clear depth cues (size difference, occlusion, blur).

**Scene type recognition.** "This is a kitchen" or "This is an outdoor café" — spatial layout understanding at the scene level is strong.

**Counting (small numbers).** Models can count objects up to about 5-7 with reasonable accuracy. Beyond that, they estimate.

### What struggles

**Left/right disambiguation.** This is notoriously unreliable. Models confuse the viewer's left with the subject's left, and accuracy on left/right questions is often 60-70% — barely above chance.

**Precise localization.** "Click on the third button from the top" or "What text is in the upper-right corner?" requires precise spatial reasoning that current models handle inconsistently.

**Distance estimation.** Without explicit depth cues or known reference objects, models can't reliably estimate absolute distances.

**Spatial counting at scale.** "How many windows are on this building?" with 30+ windows is beyond current reliable capabilities.

**Multi-hop spatial reasoning.** "Is the object closest to the door also the tallest object in the room?" requires chaining spatial operations, which compounds errors.

## Why spatial reasoning is hard for MLLMs

### The architecture problem

Standard vision transformers split images into patches (typically 14×14 or 16×16 pixels) and process them as a sequence. The spatial relationship between patches is encoded in positional embeddings, but these embeddings are learned — they don't explicitly encode geometric relationships.

When the image is tokenized and fed to the language model, spatial information becomes even more abstract. The model must reconstruct spatial relationships from distributed representations, without an explicit spatial coordinate system.

### The training data problem

Image-text training pairs rarely include precise spatial descriptions. Captions say "a dog on the beach" not "a golden retriever positioned in the left-center of the frame, 3 meters from the camera, 1.5 meters to the right of a red surfboard." Without spatial supervision, models don't learn spatial precision.

### The resolution problem

Higher resolution means more spatial detail, but also more tokens. Processing a 4K image at full resolution would consume the entire context window. Models must downsample, losing fine-grained spatial information.

## Techniques for better spatial reasoning

### Coordinate-based prompting

Include coordinate systems in your prompts:

"I've divided this image into a 3×3 grid. Describe what's in each cell, using row-column notation (top-left is R1C1, bottom-right is R3C3)."

This gives the model an explicit spatial framework. Some models respond significantly better when spatial language has concrete anchors.

### Region-of-interest approaches

Instead of asking about the full image, crop and zoom:

1. Ask the model to identify regions of interest
2. Crop those regions at higher resolution
3. Ask detailed questions about each crop
4. Combine answers with the overall scene understanding

This mimics how humans handle spatial tasks — overview first, then focus.

### Grounding models

Specialized models like Grounding DINO and Florence-2 produce bounding box coordinates for objects. Use these as preprocessing:

1. Run a grounding model to get object locations
2. Convert bounding boxes to spatial descriptions
3. Feed the spatial descriptions as structured context to the MLLM
4. Ask the MLLM to reason about the structured spatial information

This separates perception (where things are) from reasoning (how they relate).

### Depth estimation augmentation

Run a monocular depth estimation model (Depth Anything, MiDaS) to produce a depth map. Provide the depth map alongside the image:

"Here is a photo and its depth map, where brighter pixels are closer. Using both, describe the spatial layout of the scene."

Adding explicit depth information significantly improves the model's 3D reasoning.

### Multi-view approaches

For applications where you control image capture, provide multiple views:

- Front view + side view → better 3D understanding
- Wide shot + close-up → better detail at preserved spatial context
- Sequential frames → motion and spatial change understanding

MLLMs handle multi-image spatial reasoning better than single-image spatial inference, because the additional views provide explicit 3D information.

## Practical applications

**Document understanding.** "What's the total in the invoice?" requires finding the right number in the right spatial position. Augment with OCR coordinates for reliability.

**UI testing.** "Is the submit button below the form fields?" Spatial verification of UI layouts. Use bounding box extraction rather than relying on the MLLM's spatial sense alone.

**Retail and inventory.** "Is the product correctly placed on the shelf?" Spatial compliance checking. Works best with reference images showing correct placement.

**Accessibility.** Describing the spatial layout of a room or environment for visually impaired users. Current models provide useful but imprecise descriptions — good enough for general orientation, not for navigation.

## The trajectory

Spatial reasoning is improving rapidly. Key developments to watch:

- **3D-aware vision encoders** that maintain geometric information through the encoding pipeline
- **Spatial instruction tuning** with training data that includes precise spatial descriptions
- **Native coordinate output** — models that can produce bounding boxes, segmentation masks, and depth estimates alongside text
- **Video-trained spatial reasoning** — learning spatial relationships from how objects move through space over time

The gap between "what's in this image" and "where exactly is everything" is closing. Today, supplement MLLMs with specialized spatial tools for precision tasks. In 12-18 months, the models themselves may handle spatial reasoning reliably enough to trust without augmentation.
