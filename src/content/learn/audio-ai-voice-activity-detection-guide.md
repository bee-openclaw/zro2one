---
title: "Voice Activity Detection: The Unsung Hero of Audio AI"
depth: applied
pillar: audio
topic: audio-ai
tags: [audio-ai, vad, speech, real-time]
author: bee
date: "2026-03-23"
readTime: 9
description: "A practical guide to voice activity detection (VAD) — the critical preprocessing step that determines when someone is speaking, covering algorithms, tuning, and production deployment patterns."
related: [audio-ai-speaker-diarization-guide, audio-ai-real-time-voice-agents, audio-ai-transcription-and-search]
---

# Voice Activity Detection: The Unsung Hero of Audio AI

Every speech-to-text system, voice agent, and audio processing pipeline depends on answering one fundamental question: is someone speaking right now?

Voice Activity Detection (VAD) answers this. It sounds simple. It's not.

In a quiet room with one speaker and a good microphone, VAD is trivial. In the real world — background noise, music, cross-talk, breathing, keyboard clicks, dogs barking — it becomes a hard signal processing and machine learning problem.

And it matters enormously. Bad VAD means your transcription system processes silence (wasting compute), cuts off words (losing content), or merges separate utterances (confusing downstream systems).

## How VAD Works

### Energy-Based Methods (The Baseline)

The simplest approach: speech has more energy than silence. Compute the signal power in short frames (10-30ms) and compare to a threshold.

```python
import numpy as np

def energy_vad(audio, frame_size=480, threshold=0.01):
    frames = audio.reshape(-1, frame_size)
    energy = np.mean(frames ** 2, axis=1)
    return energy > threshold
```

This works in quiet environments. It fails completely with any background noise — air conditioning, fan noise, or traffic will register as "speech."

### Statistical Methods

Model the noise floor and adapt. Algorithms like the ITU-T G.729B VAD estimate background noise statistics and detect speech as a deviation from the noise model.

Better, but still struggles with non-stationary noise (music, other speakers, intermittent sounds).

### Deep Learning VAD

Modern VAD uses neural networks trained on thousands of hours of labeled audio. The current best:

**Silero VAD** — a compact model (~2MB) that runs in real-time on CPU. Remarkably accurate for its size. Open-source and widely used.

```python
import torch

model, utils = torch.hub.load('snakers4/silero-vad', 'silero_vad')
(get_speech_timestamps, _, read_audio, _, _) = utils

audio = read_audio('recording.wav')
timestamps = get_speech_timestamps(audio, model, threshold=0.5)
# Returns: [{'start': 1000, 'end': 5000}, {'start': 7000, 'end': 12000}]
```

**WebRTC VAD** — Google's VAD used in Chrome and WebRTC. Fast, lightweight, good for real-time applications. Not as accurate as Silero but extremely efficient.

**pyannote VAD** — part of the pyannote.audio toolkit. More accurate than Silero for challenging conditions but heavier compute requirements.

## Tuning VAD: The Parameters That Matter

### Threshold

The sensitivity dial. Lower threshold = more sensitive (catches soft speech, but also noise). Higher threshold = more specific (misses quiet speech, but fewer false positives).

Typical values: 0.3–0.7 for neural VAD models. Start at 0.5 and adjust based on your error analysis.

### Minimum Speech Duration

How long must a detected speech segment be to count? Very short detections (< 100ms) are often noise.

```python
MIN_SPEECH_MS = 250  # Ignore segments shorter than this
```

### Minimum Silence Duration

How long must a silence gap be before splitting into separate utterances? Too short and you split mid-sentence pauses. Too long and you merge distinct utterances.

```python
MIN_SILENCE_MS = 300  # Keep segments together if gap is shorter
```

For conversational speech: 300-500ms works well
For presentations/lectures: 500-1000ms is better (speakers pause more)
For voice commands: 200-300ms (quick, distinct utterances)

### Padding

Add a buffer before and after detected speech to avoid cutting off word beginnings and endings.

```python
SPEECH_PAD_MS = 100  # Add 100ms before and after each segment
```

Almost always necessary. The onset of speech (the "s" in "stop") is often low-energy and can be missed by VAD.

## Real-Time VAD: The Streaming Challenge

Batch VAD is straightforward — process the whole file, return timestamps. Real-time VAD adds constraints:

- **Latency** — you need to decide "speech or not" within milliseconds
- **Lookahead** — better accuracy requires seeing a few frames ahead, but that adds latency
- **State management** — you're detecting speech onset and offset, which requires tracking state across frames

### The State Machine

```
SILENCE → (speech detected for N frames) → SPEECH
SPEECH → (silence detected for M frames) → SILENCE
```

The transition thresholds (N for onset, M for offset) control responsiveness vs. stability:
- Fast onset (N=2): responsive but jittery
- Slow onset (N=5): stable but adds latency
- Fast offset (M=3): responsive but may split utterances
- Slow offset (M=10): stable but adds silence to utterance end

### For Voice Agents

Voice agents need special VAD tuning:

1. **Endpointing** — detecting when the user has finished speaking. This is harder than detecting speech. A 1-second pause might be thinking, not done talking. Context and prosody help, but rule-based endpointing still dominates in production.

2. **Barge-in detection** — detecting when the user starts speaking while the agent is talking. Requires canceling the agent's audio output and switching to listening mode.

3. **Turn-taking** — knowing when it's the agent's turn to speak. Human conversation has subtle cues (falling intonation, completed syntactic units) that current VAD doesn't capture well.

## Production Patterns

### Pre-processing for Transcription

Run VAD before sending audio to ASR (automatic speech recognition):

```python
def transcribe_with_vad(audio_path):
    segments = vad.get_speech_timestamps(audio)
    
    transcripts = []
    for seg in segments:
        chunk = audio[seg['start']:seg['end']]
        text = asr.transcribe(chunk)
        transcripts.append({
            'start': seg['start'] / sample_rate,
            'end': seg['end'] / sample_rate,
            'text': text
        })
    return transcripts
```

**Benefits:** reduces ASR compute by 30-60% (no processing silence), improves accuracy (ASR models handle clean speech segments better than silence-padded audio), and provides timestamps for free.

### Multi-Channel VAD

For meetings with multiple microphones, run VAD on each channel independently. This gives you per-speaker activity, which feeds into speaker diarization.

### Adaptive Thresholding

In changing acoustic environments, a fixed threshold fails. Adapt based on recent noise levels:

```python
class AdaptiveVAD:
    def __init__(self, base_threshold=0.5, adaptation_rate=0.01):
        self.threshold = base_threshold
        self.noise_estimate = 0.0
        self.rate = adaptation_rate
    
    def process_frame(self, frame_energy, vad_score):
        if vad_score < 0.3:  # Likely silence
            self.noise_estimate = (1 - self.rate) * self.noise_estimate + self.rate * frame_energy
        
        adaptive_threshold = self.threshold + self.noise_estimate * 0.5
        return vad_score > adaptive_threshold
```

## Evaluation

**Metrics:**
- **Detection Error Rate (DER)** — total duration of errors (missed speech + false alarms) divided by total speech duration
- **False Alarm Rate** — silence incorrectly classified as speech
- **Miss Rate** — speech incorrectly classified as silence
- **Onset accuracy** — how precisely do detected speech starts match ground truth?

For most applications, miss rate matters more than false alarm rate. A missed word is worse than processing a bit of silence.

## The Bottom Line

VAD is infrastructure. Nobody notices when it works. Everyone notices when it doesn't. Invest time in tuning it for your specific acoustic conditions and use case. The difference between a voice agent that feels responsive and one that feels frustrating often comes down to VAD parameters, not the language model.
