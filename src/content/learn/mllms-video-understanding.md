---
title: "MLLMs and Video Understanding: What's Now Possible"
depth: technical
pillar: practice
topic: mllms
tags: [mllms, video-understanding, multimodal, video-ai, vision-language-models]
author: bee
date: "2026-03-09"
readTime: 9
description: "Multimodal large language models can now process video — understanding scenes, tracking events across time, and extracting structured information from moving images. Here's what's production-ready and what isn't."
related: [mllms-audio-visual-models, mllms-vision-language-models, video-ai-understanding-and-analysis]
---

Video is the richest and most challenging input modality for AI systems. Unlike images, video has a temporal dimension — events unfold, objects move, context evolves. Unlike text, it requires understanding visual appearance, motion, spatial relationships, and their changes across time. Unlike audio, it adds the visual layer on top of what might also be speech content.

Multimodal LLMs capable of video understanding are now available at the API level and in open-weight form. Here's what they can actually do, where they still struggle, and how to build with them.

## What video understanding means

There are several distinct capabilities often grouped under "video understanding":

**Scene description** — Describing what's visible at a moment or across a clip. "A person is running on a treadmill in a gym."

**Event recognition** — Identifying specific actions, activities, or events. "The ball is kicked into the goal at 01:23."

**Temporal reasoning** — Understanding sequences and causality across time. "The package was on the table, then the person picked it up, then placed it in the bag."

**Object tracking** — Following specific objects across frames. "The red car moves from the left side to the right side of the frame."

**Transcript-grounded understanding** — When video includes speech, combining audio transcription with visual understanding. "The speaker says 'as you can see here' while pointing to the chart on screen."

**Structured extraction** — Pulling specific information from video. "Extract all the products shown, with their prices from the store labels."

Current MLLMs are strong on description, event recognition, and temporal reasoning for well-edited video. Object tracking and detailed structured extraction remain more challenging.

## How MLLMs process video

Video poses a fundamental challenge: computational cost scales with the number of frames, and video contains many frames. A 30-second clip at 30fps is 900 frames. Processing all 900 as images would be enormously expensive.

Current approaches use several strategies to make video processing tractable:

**Frame sampling** — Select a subset of frames at fixed intervals (every Nth frame) or adaptively (sample more densely during high-motion sections). The model reasons across these sampled frames. Most current implementations use 8-32 frames for clips up to a few minutes.

**Temporal compression** — Encode sequences of frames into compressed visual tokens using a video encoder before passing to the language model. This preserves temporal information while dramatically reducing token count.

**Video-native architectures** — Some models are trained specifically on video data with architectures that model temporal dependencies directly, rather than treating video as a bag of independently processed frames.

**Long video via chunking** — For long-form video (lectures, meetings, full episodes), divide into chunks, process each independently, then aggregate or synthesize across chunks.

## What's production-ready at the API level

### Google Gemini

Gemini 1.5 Pro and Gemini 2.0 have been the most capable video-understanding APIs for most of 2025. Key capabilities:

- Process up to ~1 hour of video in a single request (via file upload)
- Strong temporal reasoning across long clips
- Native multimodal: processes video + audio + text in combined context
- Can answer specific questions about events, describe scenes, extract information

**Best for:** Long-form video analysis, meeting summarization with visual context, content moderation, documentary and archival analysis.

**Limitations:** Cost at scale, rate limits for high-volume applications, some degradation on very long videos.

### OpenAI GPT-4o

GPT-4o processes video via frame extraction. You provide frames as images in the API request (either directly as base64 or as uploaded files). The model reasons across the provided frames.

**Best for:** Short-clip analysis where you control frame selection. Less suited for automatic processing of arbitrary video without preprocessing.

### Anthropic Claude

Claude Sonnet and Opus process video similar to GPT-4o (image frames). Strong visual reasoning on selected frames.

### Open-weight video models

Several capable open-weight video MLLMs now exist:

**Video-LLaVA, LLaVA-NeXT-Video** — Video-adapted versions of LLaVA. Reasonable capability for short clips; self-hostable.

**Qwen2-VL** — Strong multimodal model with video support. Competitive on benchmarks.

**InternVL2** — Strong vision-language model with video capability; good open-weight option.

These are viable for teams needing self-hosted solutions for privacy or cost reasons. Expect lower performance than frontier models on complex temporal reasoning.

## Real-world use cases

### Security and surveillance analysis

Analyze security footage for specific events: motion detection with context ("person entered through rear door at 2:17 AM"), anomaly detection ("shopping cart left unattended for >30 minutes"), access violations. Retrospective analysis of incidents from recorded footage.

**Production status:** Viable for retrospective analysis; real-time analysis requires inference optimization.

### Sports and performance analysis

Analyze sports footage: track player positions, identify play patterns, extract statistics (shot attempts, positions, movement paths), generate play-by-play descriptions.

**Production status:** Viable for highlights and post-game analysis; fine-grained player tracking at scale is more challenging.

### Educational content processing

Process lecture recordings: extract key points, generate chapter markers with timestamps, identify when specific topics are covered, create study guides grounded in specific moments in the lecture.

**Production status:** Strong. Lecture content is well-suited for current video MLLMs — clear audio, mostly static shots, structured content.

### Media and entertainment

Clip search ("find all scenes with the main character in a red dress"), content moderation at scale (identify policy violations in user-uploaded video), automatic tagging and metadata generation for video libraries.

**Production status:** Content moderation and tagging are production-ready. Precise clip search at the specific frame level requires additional infrastructure.

### Manufacturing and quality control

Analyze process video for defects, procedure compliance, equipment anomalies. Inspect assembly line footage for quality issues without constant human monitoring.

**Production status:** Promising but domain-specific. Fine-tuning on domain footage typically required for production reliability.

### Video generation grounding

Use video understanding to evaluate AI-generated video. Verify temporal consistency, identify artifacts, assess whether generated video matches the prompt. This "video judge" pattern is valuable as video generation becomes more common.

**Production status:** Emerging use case, early adopters deploying this pattern.

## Building with video MLLMs: the practical stack

A typical video understanding pipeline:

```
Video file/URL
    ↓
[Preprocessing]
  - Format conversion (to MP4/H264 if needed)
  - Resolution normalization
  - Duration check → routing decision
    ↓
[Transcription] (if audio matters)
  - Whisper or Gemini native audio processing
  - Timestamp alignment
    ↓
[Frame extraction / upload]
  - Short clip (<5 min): upload full video to Gemini
  - Medium clip (5-30 min): strategic frame sampling + chunking
  - Long form (>30 min): chunked processing with aggregation
    ↓
[MLLM inference]
  - Task-specific prompt
  - Structured output specification
    ↓
[Post-processing]
  - Timestamp linking
  - Result aggregation (for chunked video)
  - Validation
    ↓
[Storage / downstream use]
```

## Design considerations

**Frame rate vs. quality tradeoff:** More sampled frames → better temporal coverage, more cost and latency. For slow-paced content (presentations, interviews), 1 frame per 5-10 seconds may be sufficient. For action-dense content (sports, industrial processes), higher sampling rates may be necessary.

**Context injection:** Video MLLMs perform better when given relevant context. "This is a video of a sales presentation about our Q4 results" performs better than presenting the video without context.

**Task decomposition:** Complex video analysis tasks often benefit from decomposition. First extract the transcript; then describe the visual content per segment; then synthesize both streams to answer the overall question.

**Timestamp grounding:** Always preserve timestamp information in your pipeline. The value of video analysis multiplies when results link to specific moments the user can navigate to.

**Evaluation:** Video understanding quality is hard to evaluate automatically. Build a human review process for your specific task to establish quality baselines before deploying.

## Current limitations

**Long video quality degradation:** Performance on very long videos (>30 minutes in a single context) is inconsistent. Most models are trained primarily on short clips and extrapolate to longer videos with varying success.

**Fine-grained spatial reasoning:** "Is the red car in front of or behind the blue car?" — precise spatial reasoning across video frames remains error-prone.

**Dense frame content:** Highly information-dense video (busy store floor, crowded events) where tracking specific elements is important remains challenging.

**Real-time inference:** Current video MLLMs aren't fast enough for true real-time video processing at typical frame rates. Most production deployments process video in batch or near-real-time (several seconds delay).

Video understanding is one of the most active areas in MLLM development. The capabilities available today represent a significant leap from 18 months ago, and the trajectory suggests continued rapid improvement. If you're evaluating video AI for a specific use case, the practical advice is to test current frontier models against your actual task — the results may be better than you expect.
