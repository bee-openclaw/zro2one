---
title: "AI Glossary: Multimodal Edition"
depth: applied
pillar: practice
topic: ai-glossary
tags: [ai-glossary, multimodal, reference, terminology, vision, audio]
author: bee
date: "2026-03-15"
readTime: 8
description: "Key terms and concepts for working with multimodal AI — models that understand text, images, audio, and video together."
related: [ai-glossary-advanced, multimodal-ai-how-it-works, mllms-vision-language-models]
---

Multimodal AI has its own vocabulary. This glossary covers the terms you'll encounter when working with models that process multiple types of input — text, images, audio, video, and beyond.

## Core Concepts

**Modality.** A type of data or sensory input. Text, images, audio, and video are the primary modalities in AI. Some models also handle 3D point clouds, sensor data, or structured tables.

**Multimodal model.** A model that can process and/or generate more than one modality. GPT-4V processes text and images. Gemini handles text, images, audio, and video. The "multi" means it bridges modalities rather than just handling them separately.

**Cross-modal understanding.** The ability to connect information across modalities. Answering "What color is the car in this image?" requires connecting visual (car, color) and linguistic (question, answer) understanding.

**Modality alignment.** The process of mapping different modalities into a shared representation space so the model can compare and combine them. CLIP aligned text and image representations; modern models align many modalities simultaneously.

## Architecture Terms

**Vision encoder.** The component that converts raw pixel data into a representation the language model can process. Typically a Vision Transformer (ViT) that produces a sequence of "visual tokens."

**Projection layer.** A learned mapping between one modality's representation space and another's. When a vision encoder feeds into a language model, a projection layer translates visual features into the language model's embedding space.

**Visual tokens.** The representation of image patches after encoding. An image might be split into a 14×14 grid of patches, each becoming a token that the transformer processes alongside text tokens.

**Interleaved attention.** A transformer architecture where text and visual tokens attend to each other within the same attention layers, rather than being processed separately and combined later. This allows richer cross-modal interaction.

**Early fusion.** Combining modalities at the input level — raw features from different modalities are concatenated or mixed before processing. Produces stronger cross-modal understanding but requires more compute.

**Late fusion.** Processing each modality separately through dedicated encoders, then combining the resulting representations. Simpler and more modular but may miss fine-grained cross-modal relationships.

**Adapter.** A lightweight module added to a frozen model to connect new modalities. Instead of retraining the entire model, you train only the adapter. LLaVA-style architectures use adapters to connect vision encoders to language models.

## Training Concepts

**Contrastive learning.** Training a model to associate matching pairs (e.g., an image and its caption) while separating non-matching pairs. CLIP was trained this way on 400M image-text pairs.

**Image-text matching (ITM).** A pretraining objective where the model predicts whether an image and text description match. Helps the model learn fine-grained alignment between visual and linguistic concepts.

**Masked image modeling.** Like masked language modeling but for images. The model reconstructs hidden image patches from context — learning visual representations in the process.

**Instruction tuning.** Fine-tuning a multimodal model on instruction-following data that includes images, audio, or video. "Describe this image in detail" or "What happens in this video clip?" teaches the model to follow multimodal instructions.

**Visual grounding.** Training a model to connect text references to specific regions in an image. "The red car on the left" should activate attention in the correct spatial location.

## Evaluation Terms

**VQA (Visual Question Answering).** A benchmark where models answer questions about images. "How many people are in this photo?" Tests both visual perception and language understanding.

**Image captioning.** Generating natural language descriptions of images. Evaluated with metrics like CIDEr, METEOR, and increasingly with LLM-as-judge approaches.

**OCR (Optical Character Recognition).** Extracting text from images. Modern multimodal models handle this natively — they can read text in photos, documents, and screenshots without specialized OCR modules.

**Grounding accuracy.** How precisely a model can locate objects or regions it references. Measured by IoU (Intersection over Union) between predicted and ground-truth bounding boxes.

**Hallucination rate.** How often a model describes objects, text, or details that aren't present in the input. A persistent problem — models may confidently describe things that aren't there.

## Video-Specific Terms

**Temporal understanding.** Comprehending how events unfold over time in video. Distinguishing "a person sitting down" from "a person standing up" requires understanding frame ordering.

**Frame sampling.** Selecting which frames from a video to process, since analyzing every frame is computationally prohibitive. Uniform sampling (every Nth frame) or keyframe extraction are common strategies.

**Video tokens.** Representations of video segments analogous to visual tokens for images. May encode single frames, short clips, or compressed temporal features.

## Audio-Specific Terms

**Speech-to-text (STT/ASR).** Converting spoken audio to text. Whisper popularized end-to-end neural approaches. Modern multimodal models can do this natively.

**Audio tokens.** Discrete representations of audio segments, often produced by audio codecs like EnCodec or SoundStream. These allow language models to process audio as a sequence of tokens.

**Speaker diarization.** Identifying who speaks when in multi-speaker audio. Critical for meeting transcription and conversation analysis.

## Practical Terms

**Token budget.** The total context window consumed by all modalities. An image might cost 500-2,000 tokens depending on resolution. Video can consume tens of thousands. Managing the token budget is a practical concern.

**Resolution scaling.** How a model handles different image resolutions. Some models resize all images to a fixed size (losing detail). Better approaches use dynamic tiling — splitting high-res images into patches processed at native resolution.

**Modality-specific prompting.** Crafting prompts that guide the model's attention to specific aspects of non-text input. "Focus on the text in the upper-right corner" or "Describe the audio starting at 30 seconds."

**Multimodal RAG.** Retrieval-augmented generation that indexes and retrieves across modalities. A query might retrieve relevant images, documents, and audio clips to provide context for generation.

This glossary covers the most common terms as of March 2026. The field evolves fast — new architectures and techniques regularly introduce new vocabulary.
