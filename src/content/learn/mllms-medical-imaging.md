---
title: "MLLMs for Medical Imaging: Current Capabilities and Limits"
depth: technical
pillar: building
topic: mllms
tags: [mllms, medical-imaging, healthcare-ai, vision-language-models, applied-ai]
author: bee
date: "2026-03-13"
readTime: 10
description: "Multimodal large language models are entering medical imaging workflows, but the gap between demo and deployment is wide. Here's where they actually work, where they fail, and what responsible adoption looks like."
related: [mllms-vision-language-models, mllms-grounding-and-visual-reasoning, multimodal-ai-how-it-works]
---

Multimodal large language models — models that process both images and text — are being evaluated for medical imaging tasks at an accelerating pace. The demos are impressive: upload a chest X-ray, get a detailed radiology report. Upload a pathology slide, get a differential diagnosis.

The reality is more complex. MLLMs bring genuinely new capabilities to medical imaging, but they also introduce failure modes that are different from — and in some ways more dangerous than — traditional computer vision systems. Understanding both sides is essential for anyone building or evaluating these systems.

## What MLLMs bring that traditional models don't

Traditional medical imaging AI systems are task-specific. A model trained to detect pneumonia on chest X-rays does exactly that — it outputs a probability score for pneumonia and nothing else. If the image shows a fracture, the model has nothing to say about it.

MLLMs operate differently. They can describe what they see in natural language, answer follow-up questions, compare multiple images, and integrate visual findings with clinical context provided in text. This flexibility is the core advantage.

### Report generation

The most immediately practical application is generating structured radiology reports from imaging studies. An MLLM can examine a chest X-ray and produce a findings section that describes lung fields, cardiac silhouette, mediastinum, and bony structures in standard radiological language.

Current systems generate reports that radiologists rate as clinically acceptable in 60-80% of routine cases. This doesn't mean they're ready to replace radiologists — it means they can produce a draft that a radiologist reviews and edits, saving time on the most routine and repetitive part of the reporting workflow.

### Visual question answering

Clinicians can ask specific questions about an image: "Is there evidence of cardiomegaly?" or "What is the approximate diameter of this lesion?" MLLMs handle these focused queries reasonably well for common findings, particularly when the question maps to well-defined visual features.

### Cross-study comparison

Comparing a current study to prior imaging is a routine part of radiology. MLLMs can process multiple images and describe changes — "The right lower lobe opacity seen on the prior study has decreased in size." This capability is still early but represents a genuinely useful workflow integration.

## Where they fail

### Hallucination in medical context

The same hallucination problem that affects LLMs in text becomes significantly more dangerous in medical imaging. An MLLM might confidently describe a finding that doesn't exist on the image, using perfectly appropriate medical terminology. A report that states "there is a 2.3cm nodule in the right upper lobe" when no such nodule exists could trigger unnecessary procedures.

The fluency of the output makes hallucinations harder to catch. A garbled or obviously wrong report is easy to reject. A well-written report with one fabricated finding embedded in otherwise accurate observations requires careful line-by-line verification.

### Spatial reasoning limitations

MLLMs process images through vision encoders that convert images into token sequences. This conversion can lose spatial precision. Tasks that require exact localization — marking the precise boundary of a tumor, measuring distances between structures, or identifying the exact vertebral level of a finding — are less reliable than tasks that require general recognition.

### Rare and subtle findings

Like all machine learning systems, MLLMs perform best on common findings well-represented in training data. Rare conditions, unusual presentations of common conditions, and subtle early-stage findings are more likely to be missed. This is particularly concerning because these are precisely the cases where AI assistance would be most valuable — the cases that are also hardest for humans.

### Distribution shift

Medical imaging varies significantly across institutions. Different scanner manufacturers, imaging protocols, patient populations, and image quality levels all create distribution shift. An MLLM trained primarily on data from academic medical centers may perform differently on images from community hospitals or outpatient clinics.

## Current regulatory landscape

Medical imaging AI operates under regulatory frameworks that are still adapting to MLLMs:

**FDA clearance** in the US has approved hundreds of traditional AI medical imaging tools through the 510(k) pathway. These are narrow, task-specific systems. MLLMs, with their open-ended output capabilities, don't fit neatly into existing regulatory categories. The FDA is actively developing frameworks for foundation model-based medical devices, but as of early 2026, no MLLM has received clearance for autonomous diagnostic use.

**EU MDR** (Medical Device Regulation) similarly requires clinical evidence and conformity assessment for AI medical devices. The general-purpose nature of MLLMs creates challenges for the required clinical evaluation, which traditionally assumes a well-defined intended use.

**Clinical validation** requirements mean that even technically impressive models need prospective clinical trials demonstrating safety and effectiveness before deployment. These trials take years, not months.

## Responsible deployment patterns

The organizations moving most thoughtfully on medical imaging MLLMs share common approaches:

### Human-in-the-loop, always

No current MLLM should operate autonomously for clinical decisions. The standard deployment pattern is assistance: the model generates a draft report or preliminary findings, and a qualified clinician reviews, edits, and signs off. The clinician remains responsible for the final interpretation.

### Calibrated confidence

Systems should communicate uncertainty. A model that says "there may be a subtle opacity in the right lower lobe — recommend clinical correlation" is more useful than one that either confidently asserts or silently omits a borderline finding.

### Continuous monitoring

Performance monitoring after deployment is essential. Tracking agreement rates between model output and final clinician reports, flagging cases where the model's output was significantly revised, and monitoring for systematic errors across patient subgroups.

### Focused scope

Rather than deploying MLLMs as general-purpose radiology assistants, successful implementations focus on specific, well-validated tasks: screening chest X-rays for critical findings, generating structured reports for routine studies, or flagging studies that need urgent review.

## What's coming

Several developments are likely to improve medical imaging MLLMs in the near term:

**Specialized medical foundation models** trained primarily on medical imaging data, rather than adapted from general-purpose vision-language models, show improved performance on medical tasks. Models like Med-PaLM M and BiomedCLIP derivatives are becoming more capable.

**Integration with clinical data** — combining imaging with lab results, clinical notes, and patient history — allows more contextually appropriate interpretations. An opacity on a chest X-ray means different things in a post-surgical patient versus an immunocompromised patient.

**Better evaluation frameworks** that test not just accuracy but also calibration, hallucination rates, performance on rare conditions, and fairness across demographic groups.

The trajectory is toward MLLMs as a standard part of the medical imaging workflow — not replacing radiologists, but changing how they work. The transition will be slower than the technology demos suggest, and appropriately so. The stakes are too high for move-fast-and-break-things deployment.
