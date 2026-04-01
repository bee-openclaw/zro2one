---
title: "AI Glossary: Audio AI Edition"
depth: essential
pillar: ai-glossary
topic: ai-glossary
tags: [ai-glossary, audio-ai, speech, signal-processing, terminology]
author: bee
date: "2026-04-01"
readTime: 7
description: "Key terms for working with audio AI — from spectrograms and mel-frequency cepstral coefficients to speaker diarization and voice activity detection. Plain-language definitions with enough depth to be useful."
related: [ai-glossary-beginner, audio-ai-guide-2026, audio-ai-speaker-diarization-guide]
---

Audio AI spans speech recognition, music generation, voice synthesis, speaker identification, and audio analysis. The terminology borrows from signal processing, linguistics, and machine learning. This glossary covers the terms you will encounter most frequently, with definitions that are practical rather than exhaustive.

## Terms

### ASR (Automatic Speech Recognition)

The task of converting spoken audio into text. Modern ASR systems are typically end-to-end neural models that take audio features (such as mel spectrograms) as input and produce text directly, without the intermediate phoneme-level decoding that older systems required. Whisper, wav2vec 2.0, and Conformer-based models are representative of the current state of the art. ASR quality is measured by word error rate (WER).

### Audio Codec

A method for compressing and decompressing audio data. In the context of audio AI, neural audio codecs (such as EnCodec, SoundStream, and DAC) are particularly important. These models compress audio into discrete tokens that can be processed by language model architectures, enabling text-to-audio generation and audio understanding within transformer-based systems.

### Diarization

The process of determining "who spoke when" in an audio recording. Speaker diarization segments an audio stream into regions associated with individual speakers without necessarily identifying who those speakers are. This is distinct from speaker identification (matching a voice to a known identity). Diarization is essential for meeting transcription, call center analytics, and any application where multiple speakers share a recording.

### Embedding (Speaker)

A fixed-length numerical vector that represents the characteristics of a speaker's voice. Speaker embeddings are produced by models trained to map audio segments to points in a vector space where segments from the same speaker are close together and segments from different speakers are far apart. These embeddings power speaker verification, diarization, and voice similarity search. Common architectures include d-vectors and x-vectors.

### Formant

A resonant frequency of the vocal tract. When a person speaks, the shape of their mouth, tongue, and throat creates resonances that amplify certain frequencies in the sound. The first two or three formants (F1, F2, F3) are the primary acoustic cues that distinguish vowel sounds from each other. Formant analysis is used in phonetics research and some voice analysis applications.

### Fundamental Frequency (F0)

The lowest frequency of a periodic sound wave, corresponding to the perceived pitch of a voice. F0 is determined by how fast the vocal cords vibrate — faster vibration produces a higher pitch. Tracking F0 over time reveals intonation patterns and is used in speech synthesis, emotion detection, and prosody analysis. Typical speaking F0 ranges from roughly 85-180 Hz for adult men and 165-255 Hz for adult women.

### Mel Spectrogram

A visual representation of audio that maps frequency content over time, with the frequency axis scaled according to the mel scale — a perceptual scale that approximates how humans perceive pitch differences. Low frequencies are given more resolution than high frequencies, which mirrors human hearing. Mel spectrograms are the most common input representation for modern audio AI models because they capture the information that matters most for speech and music perception.

### MFCC (Mel-Frequency Cepstral Coefficients)

A compact representation of the spectral shape of an audio signal. MFCCs are derived from the mel spectrogram through a discrete cosine transform, producing a small set of coefficients (typically 13-40) that describe the overall spectral envelope while discarding fine-grained pitch information. MFCCs were the dominant audio feature for decades and are still used in some applications, though many modern systems now work directly with mel spectrograms or raw waveforms.

### Noise Gate

A signal processing tool that silences audio below a certain amplitude threshold. In AI audio pipelines, noise gating is used during preprocessing to remove background noise between speech segments. While simple, it is often the first step in an audio processing pipeline and can significantly improve downstream model performance by reducing noise in training data.

### Phoneme

The smallest unit of sound that distinguishes meaning in a language. English has roughly 44 phonemes. For example, the words "bat" and "pat" differ by one phoneme (the initial consonant). Phonemes are an intermediate representation used in some speech synthesis and recognition systems, though end-to-end models increasingly bypass explicit phoneme representation.

### Pitch Detection

The process of estimating the fundamental frequency (F0) of an audio signal over time. Accurate pitch detection is essential for music transcription, speech prosody analysis, and voice conversion. Common algorithms include CREPE (a neural pitch tracker), pYIN, and WORLD. Pitch detection is straightforward for clean, single-voice audio but becomes challenging with background noise, multiple speakers, or musical polyphony.

### RVC (Retrieval-based Voice Conversion)

A voice conversion technique that transforms the timbre of a source voice to match a target voice while preserving the original speech content and timing. RVC uses a retrieval mechanism to find similar voice features from the target speaker's data and applies them to the source audio. It gained popularity in the open-source community for its relatively low data requirements (a few minutes of target audio can suffice) and real-time capable inference.

### Sample Rate

The number of audio samples captured per second, measured in hertz (Hz). CD-quality audio uses 44,100 Hz (44.1 kHz). Telephone audio uses 8,000 Hz. Most speech AI models operate at 16,000 Hz, which captures the frequency range relevant to speech while keeping computational costs manageable. Higher sample rates preserve more high-frequency detail, which matters for music but is less critical for speech.

### Short-Time Fourier Transform (STFT)

A mathematical operation that decomposes an audio signal into its frequency components over short, overlapping time windows. The STFT produces a complex-valued spectrogram showing how the frequency content of the signal changes over time. It is the foundational computation behind spectrograms, mel spectrograms, and most audio feature extraction. The window size (typically 25-50ms for speech) controls the tradeoff between time resolution and frequency resolution.

### Speaker Verification

The task of confirming whether a given audio sample was spoken by a claimed identity. This is a binary decision — "is this person who they say they are?" — as opposed to speaker identification, which asks "who is this person?" Speaker verification powers voice-based authentication in banking, device unlocking, and access control systems. It works by comparing speaker embeddings and checking whether the similarity exceeds a threshold.

### Spectrogram

A two-dimensional representation of audio showing frequency on the vertical axis, time on the horizontal axis, and amplitude as color intensity. A standard (linear-frequency) spectrogram shows all frequencies with equal resolution. Spectrograms are the bridge between raw waveform audio and the visual/matrix representations that neural networks process effectively. Most practical audio AI systems use mel spectrograms rather than linear spectrograms.

### Speech Synthesis (TTS)

The generation of human-sounding speech from text input. Modern TTS systems typically operate in two stages: a text-to-spectrogram model (which generates a mel spectrogram from text) and a vocoder (which converts the spectrogram to an audio waveform). Recent systems like VALL-E, XTTS, and Bark use language model architectures over audio tokens for more natural and expressive output. Quality has improved dramatically since 2023 — current systems can produce speech that is difficult to distinguish from human recordings.

### Speech-to-Text

A synonym for automatic speech recognition (ASR). The term "speech-to-text" is more common in product and API contexts, while "ASR" is more common in research. The underlying technology is the same.

### Voice Activity Detection (VAD)

A binary classification task: given a segment of audio, determine whether it contains human speech or not. VAD is used to segment recordings before transcription (avoiding wasting compute on silence or background noise), in telecommunications to reduce bandwidth, and as a preprocessing step in most speech pipelines. Silero VAD and WebRTC VAD are widely used open-source implementations.

### Voice Cloning

The process of creating a synthetic voice that sounds like a specific person. This typically involves fine-tuning or conditioning a TTS model on a sample of the target speaker's voice. Zero-shot voice cloning (requiring only a few seconds of reference audio) has become feasible with recent models, raising both exciting possibilities for personalization and serious concerns about misuse for fraud and misinformation.

### Vocoder

A model that converts a spectral representation (typically a mel spectrogram) into a time-domain audio waveform. The vocoder is the final stage in most speech synthesis pipelines. Neural vocoders like HiFi-GAN, WaveGlow, and BigVGAN produce high-quality, natural-sounding audio and run fast enough for real-time synthesis. The choice of vocoder significantly affects the perceived quality of synthesized speech.

### Waveform

The raw time-domain representation of audio — a sequence of amplitude values sampled at regular intervals. At 16 kHz sample rate, one second of audio is 16,000 numbers. Most audio AI models do not operate directly on waveforms (they use spectrograms or learned features instead) because the raw signal is high-dimensional and contains patterns at multiple time scales that are difficult for models to learn efficiently.

### Whisper

An open-source ASR model released by OpenAI in 2022, trained on 680,000 hours of multilingual audio data. Whisper popularized the approach of training a single model for multiple speech tasks (transcription, translation, language detection) and demonstrated that large-scale weak supervision could produce robust, general-purpose speech recognition. It remains widely used in 2026 and has spawned numerous optimized variants (faster-whisper, whisper.cpp, distil-whisper) for different deployment scenarios.
