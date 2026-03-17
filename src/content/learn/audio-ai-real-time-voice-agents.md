---
title: "Building Real-Time Voice Agents with Audio AI"
depth: applied
pillar: modalities
topic: audio-ai
tags: [audio-ai, voice-agents, real-time, speech, conversational-ai]
author: bee
date: "2026-03-17"
readTime: 10
description: "Voice agents that can listen, think, and respond in real time are now practical to build. This guide covers the architecture, latency budgets, and design decisions behind conversational voice AI."
related: [audio-ai-speech-to-speech-systems-2026, multimodal-ai-voice-agents-guide, audio-ai-guide-2026]
---

The voice agent landscape has shifted dramatically. What used to require months of engineering and specialized hardware can now be built in days using APIs and open-source components. The challenge has moved from "can we build this?" to "can we make it feel natural?"

## The latency equation

Human conversation has strict timing expectations. When you ask someone a question, you expect a response within 300-800 milliseconds. Exceed 1 second and the interaction feels sluggish. Exceed 2 seconds and it feels broken.

Your voice agent's latency budget breaks down like this:

| Component | Target | Typical range |
|-----------|--------|---------------|
| Audio capture + VAD | 50ms | 30-100ms |
| Speech-to-text | 200ms | 100-500ms |
| LLM processing | 300ms | 200-2000ms |
| Text-to-speech | 150ms | 100-400ms |
| Network overhead | 100ms | 50-200ms |
| **Total** | **800ms** | **480-3200ms** |

The total budget is tight. Every component needs to be fast, and you need streaming everywhere to avoid waiting for complete outputs.

## Architecture patterns

### Pipeline approach (STT → LLM → TTS)

The classic architecture: convert speech to text, process with an LLM, convert response to speech. Each component is independent and swappable.

**Pros:** Flexibility. You can use the best model for each stage. Easy to debug — you can inspect the text at each step.

**Cons:** Latency stacks. Three serial API calls is slow unless you stream aggressively. Loses audio context (tone, emotion, emphasis) in the text conversion.

### Speech-to-speech models

Models like GPT-4o's voice mode and open alternatives process audio natively without a text intermediate. The model "hears" your voice and generates a spoken response directly.

**Pros:** Lower latency (fewer steps). Preserves audio context. More natural-sounding responses because the model controls prosody.

**Cons:** Less debuggable (no text intermediate to inspect). Fewer model choices. Harder to apply content filters.

### Hybrid approach

Use a speech-to-speech model for the core interaction but maintain a text pipeline in parallel for logging, safety filtering, and analytics. This gives you the naturalness of speech-to-speech with the observability of the pipeline approach.

## Voice Activity Detection (VAD)

Getting turn-taking right is crucial. The system needs to know when the user has finished speaking and when they're just pausing to think.

Good VAD considers:
- **Silence duration** — But silence alone is insufficient. A 500ms pause mid-sentence is different from a 500ms pause after a question.
- **Prosodic cues** — Falling intonation often signals end-of-turn. Rising intonation may signal a question with more context coming.
- **Semantic completeness** — Is the utterance a complete thought? Some systems use a lightweight model to assess this.

The hardest problem: **barge-in**. When the user starts talking while the agent is still speaking, the agent should stop and listen. This requires canceling the current TTS output immediately and switching back to listening mode.

## Choosing a TTS voice

Voice quality makes or breaks the user experience:

- **Naturalness** — Does it sound human? Modern neural TTS (ElevenLabs, Play.ht, OpenAI TTS) is remarkably natural.
- **Consistency** — Does the voice sound the same across utterances? Inconsistent voices are unsettling.
- **Expressiveness** — Can it convey appropriate emotion and emphasis?
- **Latency** — First-byte latency matters more than total generation time (since you stream).
- **Cost** — TTS at scale gets expensive. Budget for it.

## Handling edge cases

**Noisy environments:** Use noise suppression on the input audio. Krisp and RNNoise are good options.

**Accented speech:** Test your STT with diverse accents. Whisper handles accents well; some real-time alternatives don't.

**Interruptions:** Implement barge-in cleanly. The user should be able to cut off the agent at any time.

**Silence:** If the user doesn't respond for 5+ seconds, the agent should prompt gently rather than sitting in silence.

**Errors:** When the LLM fails or is slow, have fallback responses: "I'm sorry, could you repeat that?" buys time without breaking the illusion.

## What makes a voice agent feel good

Technical performance is necessary but not sufficient. The best voice agents:

1. **Respond quickly** — Under 1 second for first audio output
2. **Use filler naturally** — "Let me check that..." while processing longer queries
3. **Handle interruptions gracefully** — Stop talking immediately when the user speaks
4. **Match conversational register** — Casual for consumer, professional for enterprise
5. **Know their limits** — Escalate to humans when confidence is low

Building a voice agent that works is engineering. Building one that feels natural is design. You need both.
