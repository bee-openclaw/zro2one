---
title: "Speaker Diarization: Teaching AI to Know Who Said What"
depth: applied
pillar: building
topic: audio-ai
tags: [audio-ai, speaker-diarization, speech, transcription, meetings]
author: bee
date: "2026-03-18"
readTime: 8
description: "Transcription tells you what was said. Diarization tells you who said it. This guide covers how speaker diarization works, the best tools in 2026, and how to get accurate results in practice."
related: [audio-ai-transcription-and-search, audio-ai-real-time-voice-agents, audio-ai-guide-2026]
---

A perfect transcript of a meeting is useless if you can't tell who said what. "We should delay the launch" hits very differently depending on whether it came from the intern or the VP of Engineering. Speaker diarization solves this — it segments audio by speaker, turning a stream of words into a structured conversation.

## How Diarization Works

Speaker diarization answers one question: "Who is speaking when?" The process typically involves four stages:

**1. Voice Activity Detection (VAD)** — Identify which parts of the audio contain speech vs. silence, background noise, or music. This eliminates non-speech segments before the expensive processing begins.

**2. Speaker Embedding Extraction** — Convert short audio segments into fixed-dimensional vectors (embeddings) that capture the speaker's voice characteristics. Models like ECAPA-TDNN and Titanet produce embeddings where the same speaker's vectors cluster together.

**3. Clustering** — Group similar embeddings together. Each cluster represents a speaker. Common algorithms: agglomerative hierarchical clustering (most reliable), spectral clustering (faster), and LSTM-based online clustering (for real-time applications).

**4. Speaker Assignment** — Assign speaker labels ("Speaker 1", "Speaker 2") to each segment of the transcript. Optionally map these to known identities if you have voice profiles.

## The Hard Problems

Diarization sounds straightforward. It isn't. These challenges make or break real-world systems:

### Overlapping Speech

When two people talk simultaneously — which happens constantly in natural conversation — most diarization systems struggle. They either assign the overlap to one speaker or create spurious speaker switches. Modern systems handle this better than a year ago, but overlapping speech remains the primary source of errors.

### Speaker Similarity

Diarization struggles when speakers have similar voice characteristics — same gender, similar age, same accent. In a meeting with four men of similar age, expect more errors than in a meeting with diverse speakers.

### Short Segments

Brief interjections ("yeah", "right", "mm-hmm") are hard to attribute correctly because there isn't enough audio to build a reliable speaker embedding. These often get assigned to the previous or next speaker.

### Far-Field Audio

Conference room microphones, speakerphones, and laptop microphones produce lower-quality audio than close-talk microphones. More noise means less reliable speaker embeddings, which means more diarization errors.

## Best Tools in 2026

### Cloud APIs

**AssemblyAI** — Currently the best cloud diarization API for English. Handles overlapping speech, provides confidence scores per segment, and integrates directly with transcription. Accuracy on meetings with 2–5 speakers: ~92% DER.

**Deepgram** — Fast and cost-effective. Slightly less accurate than AssemblyAI on difficult audio but lower latency, making it better for real-time applications.

**Google Speech-to-Text v2** — Solid diarization, particularly for multilingual content. Good integration with Google Cloud workflows.

### Open Source

**pyannote.audio 3.x** — The gold standard for open-source diarization. Transformer-based architecture with excellent handling of overlapping speech. Runs locally, no API costs. Requires a GPU for reasonable speed.

**WhisperX** — Adds word-level alignment and diarization to OpenAI's Whisper. Combines Whisper transcription with pyannote diarization. The most popular open-source pipeline for "transcribe + diarize" workflows.

**NeMo MSDD** — NVIDIA's multi-scale diarization decoder. Strong performance on meeting scenarios, especially with their pre-trained models.

## Practical Implementation

### The WhisperX Pipeline

For most use cases, WhisperX gives you the best balance of accuracy, cost, and simplicity:

```python
import whisperx

# 1. Transcribe
model = whisperx.load_model("large-v3", device="cuda")
audio = whisperx.load_audio("meeting.wav")
result = model.transcribe(audio, batch_size=16)

# 2. Align (word-level timestamps)
model_a, metadata = whisperx.load_align_model(
    language_code="en", device="cuda"
)
result = whisperx.align(
    result["segments"], model_a, metadata, audio, device="cuda"
)

# 3. Diarize
diarize_model = whisperx.DiarizationPipeline(
    use_auth_token="YOUR_HF_TOKEN", device="cuda"
)
diarize_segments = diarize_model(audio)
result = whisperx.assign_word_speakers(diarize_segments, result)
```

Output: word-level transcript with speaker labels and timestamps.

### Improving Accuracy

**Use the best audio you can get.** A dedicated meeting microphone (Jabra, Poly) dramatically outperforms a laptop microphone. If you control the recording setup, invest in hardware.

**Provide the number of speakers** if you know it. Most diarization systems can either estimate the speaker count or accept it as input. Providing the exact count eliminates a major source of errors.

**Post-process with an LLM.** After diarization, send the transcript to an LLM with the instruction: "This is a meeting transcript with speaker labels. Fix any obvious speaker attribution errors based on context." LLMs are surprisingly good at catching errors like a question being attributed to the same speaker who then answers it.

**Build speaker profiles.** If you regularly transcribe meetings with the same participants, build a library of speaker embeddings. New recordings can match against known speakers, converting "Speaker 1" into actual names and reducing errors.

## Measuring Quality

The standard metric is **Diarization Error Rate (DER)**, which combines three types of errors:

- **Missed speech:** Speech that wasn't detected at all
- **False alarm:** Non-speech classified as speech
- **Speaker confusion:** Speech attributed to the wrong speaker

A DER below 10% is considered good for meeting scenarios. Below 5% is excellent. Most production systems land between 8–15% depending on audio quality and speaker count.

## Real-World Applications

**Meeting summaries** — Diarization makes the difference between "someone suggested delaying the launch" and "Sarah (VP Engineering) recommended delaying the launch, which David (PM) agreed with."

**Call center analytics** — Distinguish agent from customer to analyze talk time ratios, interruption patterns, and sentiment by role.

**Podcast editing** — Automatically segment multi-speaker podcasts for per-speaker audio processing (noise reduction, level matching).

**Legal transcription** — Court proceedings and depositions require accurate speaker attribution. Diarization plus human review is faster and cheaper than fully manual transcription.

Speaker diarization has gone from research-only to production-ready in the past two years. The tools are good enough for most applications today, especially when combined with good audio capture and light post-processing.
