---
title: "AI in Medical Imaging: What's Working, What's Hype, and What's Next"
depth: applied
pillar: practice
topic: image-ai
tags: [image-ai, medical-imaging, healthcare, diagnostics, computer-vision]
author: bee
date: "2026-03-20"
readTime: 10
description: "Medical imaging is one of AI's most impactful applications — but the gap between research papers and clinical reality is larger than headlines suggest. Here's an honest assessment of where things stand."
related: [image-ai-vision-transformers, image-ai-diffusion-models, mllms-medical-imaging]
---

AI in medical imaging is the rare case where the technology genuinely saves lives. FDA-cleared algorithms detect cancers, flag strokes, and identify fractures with accuracy that matches or exceeds radiologists in specific tasks. But the story is more nuanced than the headlines.

## Where AI Is Actually Deployed

### Radiology Triage

The most impactful production use case. AI scans incoming imaging studies and flags critical findings (large vessel occlusion strokes, pneumothorax, pulmonary embolism) for immediate review. This doesn't replace the radiologist — it changes the order in which studies are read.

The impact is measurable: time-to-treatment for critical conditions decreases by 30-60% in facilities with AI triage. When a stroke patient's scan gets flagged and read in 5 minutes instead of sitting in a queue for 2 hours, outcomes change dramatically.

### Mammography Screening

The most studied AI application in medical imaging. Multiple large clinical trials have shown:
- AI-assisted reading reduces false negatives (catches more cancers)
- AI as a second reader is as good as a second human radiologist
- AI can potentially halve the number of radiologists needed for screening without losing accuracy

Sweden's MASAI trial (160,000+ women) showed AI-supported screening detected 20% more cancers with the same false positive rate. The UK's NHS is piloting AI-assisted screening nationally.

### Chest X-Ray Analysis

The most common radiological exam, and where AI has the broadest deployment. FDA-cleared tools detect:
- Pneumothorax (collapsed lung)
- Cardiomegaly (enlarged heart)
- Pleural effusion (fluid around the lungs)
- Lung nodules
- Rib fractures

These work well because chest X-rays have relatively standardized positioning and the pathologies have clear visual signatures.

### Retinal Imaging

Google's diabetic retinopathy detection system (IDx-DR was first FDA-cleared, followed by Google's system) is deployed in primary care clinics. Patients get screened for diabetic eye disease without needing an ophthalmologist. Particularly impactful in underserved areas.

## What's Harder Than It Looks

### Generalization

The biggest challenge. A model trained on images from GE scanners at academic hospitals doesn't automatically work on Siemens scanners at community hospitals. Differences in:
- Scanner manufacturer and model
- Imaging protocol and parameters
- Patient demographics
- Image quality and artifacts
- Pathology prevalence

This "distribution shift" problem means models need extensive validation on diverse datasets before deployment, and ongoing monitoring after.

### Integration Into Workflow

A brilliant AI that doesn't fit into the radiologist's workflow won't get used. Practical requirements:
- Results must appear in the existing PACS (picture archiving system)
- Latency must be low enough not to slow down reading
- Findings must be presented in a format radiologists trust
- False positive rates must be low enough to avoid alert fatigue

Many technically impressive models fail at this step. A model with 98% sensitivity and 90% specificity sounds great until you realize that in a screening population with 0.5% disease prevalence, most flagged cases will be false positives.

### Regulatory Pathway

Getting FDA clearance (or CE marking in Europe) is expensive and slow. The regulatory framework is still evolving:
- Most AI devices are cleared as Clinical Decision Support, not as autonomous diagnostic tools
- Continuous learning (model updates) requires re-submission in most cases
- Post-market surveillance is increasingly required

### Liability

When AI misses a diagnosis, who's responsible? Currently, the radiologist who read the study is. AI is treated as a tool, not a practitioner. But this creates a paradox: the radiologist is responsible for the AI's mistakes but may not fully understand how the AI reached its conclusions.

## The Technical Stack

Modern medical imaging AI pipelines:

```
Acquisition → DICOM → Preprocessing → Model → Post-processing → PACS/EHR
```

**Preprocessing:** Normalization, windowing (for CT), resampling to consistent voxel spacing, artifact removal.

**Models:** Primarily convolutional architectures (U-Net for segmentation, ResNet/DenseNet for classification), increasingly Vision Transformers and hybrid architectures.

**Segmentation** (outlining structures): U-Net remains the workhorse, with nnU-Net providing automated architecture search that consistently wins medical segmentation challenges.

```python
# nnU-Net: Self-configuring segmentation
# The framework analyzes your dataset and configures:
# - Network architecture (2D, 3D, cascade)
# - Patch size and batch size
# - Preprocessing pipeline
# - Training schedule
# All you provide is the data and labels

from nnunetv2.run.run_training import run_training
run_training(dataset_name="Dataset001_Liver", fold=0)
```

**Foundation models:** SAM (Segment Anything Model) and its medical adaptations (MedSAM, SAM-Med2D) are changing the annotation workflow. Instead of manual pixel-by-pixel labeling, a few clicks or a bounding box produces accurate segmentations.

## The Economics

Medical imaging AI is a real business now:
- **Aidoc, Viz.ai, Qure.ai** — triage and detection, deployed in hundreds of hospitals
- **Paige** — computational pathology (tissue analysis)
- **Tempus** — genomics-informed pathology
- **HeartFlow** — cardiac CT analysis

Reimbursement is the key bottleneck. In the US, CPT codes for AI-assisted diagnosis are limited. Hospitals often absorb the cost, which limits adoption to large systems that can justify the investment through operational efficiency.

## What's Coming

**Multimodal models** that combine imaging with clinical data (lab results, patient history, genetics) for more accurate diagnosis. Current models look at images in isolation; clinicians never do.

**Self-supervised pretraining** on large unlabeled medical image datasets. Labeled medical data is scarce and expensive; pre-training on millions of unlabeled scans (similar to how LLMs pre-train on text) is showing promising results.

**Pathology AI** is where the next wave of clinical impact is likely. Digital pathology (scanning tissue slides at high resolution) creates enormous images that are perfect for AI analysis. Detecting cancer subtypes, predicting treatment response, and identifying prognostic markers from tissue images.

**Federated learning** for training on multi-institutional data without sharing patient information. Privacy concerns are the biggest barrier to building large, diverse training datasets. Federated approaches let models learn from data at each hospital without the data leaving the institution.

## The Honest Assessment

Medical imaging AI works. It's deployed, it's saving lives, and it's improving. But it's not replacing radiologists, and it won't for the foreseeable future. The technology is best understood as:

- An expert second opinion that never gets tired
- A triage system that ensures the sickest patients are seen first
- A safety net that catches findings that might be overlooked
- A force multiplier that lets fewer radiologists serve more patients

The most important advances aren't in model accuracy (which is already high for many tasks) but in deployment, integration, equity of access, and regulatory clarity. The technology works; making it work everywhere, for everyone, reliably, is the hard part.
