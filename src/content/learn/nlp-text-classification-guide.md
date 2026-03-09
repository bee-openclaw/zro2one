---
title: "Text Classification with NLP: From Rules to Transformers"
depth: technical
pillar: practice
topic: nlp
tags: [nlp, text-classification, machine-learning, transformers, applied-nlp, fine-tuning]
author: bee
date: "2026-03-09"
readTime: 11
description: "Text classification is one of NLP's most practical tasks. Here's how modern approaches work, how to choose the right method, and how to build reliable classifiers."
related: [nlp-sentiment-analysis-explained, nlp-named-entity-recognition, machine-learning-transfer-learning-guide]
---

Text classification — assigning a label or category to a piece of text — is one of NLP's most common and practical tasks. Spam detection, sentiment analysis, topic categorization, intent recognition, content moderation: all are classification problems. Despite the sophistication of modern LLMs, classification remains a domain where the right approach depends heavily on your specific constraints.

This guide covers the full range of approaches from rule-based methods to fine-tuned transformers, with honest guidance on when each is appropriate.

## The classification spectrum

Text classification approaches range from simplest to most complex:

1. **Rules and regular expressions** — Handcrafted patterns
2. **Keyword and lexicon-based** — Vocabulary matching with pre-built word lists
3. **Traditional ML** — Bag-of-words features + classifiers (Naive Bayes, SVM, logistic regression)
4. **Embedding-based** — Represent text as embeddings, classify with traditional ML
5. **Zero/few-shot with LLMs** — Prompt a language model to classify
6. **Fine-tuned transformers** — Train a specialized classification model

The right approach isn't always the most sophisticated one. Match the method to your constraints.

## When to use each approach

### Rules and regex

**When to use:**
- Very narrow, well-defined classification categories with clear surface patterns
- Regulatory or compliance requirements demand interpretability
- No labeled data exists and collection is expensive
- High precision required for a small number of patterns

**When to avoid:**
- Natural language variation is high (same meaning, many phrasings)
- Categories are subtle or overlapping
- More than ~50 rules (maintenance becomes untenable)

**Example:** Routing messages that contain "cancel my subscription" or "I want to cancel" to a retention workflow. Simple string matching catches the common cases; edge cases can be caught by downstream handling.

### Traditional ML (TF-IDF + classifiers)

**When to use:**
- You have 1,000+ labeled examples
- Interpretability matters (which words drove the classification?)
- Fast inference is required and model complexity is a constraint
- Category boundaries are relatively clear in the vocabulary

**How it works:**
1. Convert text to numerical features using TF-IDF (term frequency–inverse document frequency) — a sparse vector where each dimension represents a word/ngram, weighted by how distinctive it is
2. Train a classifier (logistic regression, SVM, random forest) on these features
3. At inference: transform new text to TF-IDF vector, run classifier

TF-IDF + logistic regression is a strong, fast baseline. Harder to beat than you'd think with simple data.

**Limitations:** Doesn't understand semantics. "Good" and "excellent" are unrelated in TF-IDF space despite similar meaning. Struggles with negation ("not good"), sarcasm, and long-range dependencies.

### Embedding-based classification

**When to use:**
- You have limited labeled data but a good pre-trained embedding model
- Semantic meaning matters more than exact vocabulary
- You need a fast inference path (embeddings are precomputed; classification is a simple operation)

**How it works:**
1. Compute text embeddings using a pre-trained model (sentence-transformers, OpenAI embeddings, Cohere Embed)
2. Train a lightweight classifier (logistic regression, kNN, MLP) on the embeddings
3. At inference: embed new text, run classifier

**Embedding similarity as classification:** For categories with clear prototypical examples, you can skip classifier training entirely. Compute embeddings for one or more examples of each category. At inference, embed the text and find the nearest category. This "zero-shot via similarity" approach works surprisingly well when categories are semantically distinct.

**Key advantage:** Works well with small labeled datasets (100-500 examples) because the embedding already encodes rich semantic information.

### Zero/few-shot with LLMs

**When to use:**
- Rapid prototyping and iteration
- Complex, nuanced categories that are hard to define through training examples
- Small volumes where API cost is acceptable
- You need flexible re-labeling (change categories without retraining)
- Complex reasoning is required about why something belongs to a category

**How it works:** Write a prompt that describes the categories and asks the model to classify:

```
Classify the following customer message into exactly one of these categories:
- BILLING: Questions or issues about invoices, payments, or pricing
- TECHNICAL: Problems with the product not working correctly  
- FEATURE: Requests for new functionality
- GENERAL: Everything else

Customer message: {message}

Respond with only the category name.
```

**Advantages:** Flexible, requires no training data, can handle complex category definitions, can be updated instantly. Models can reason about edge cases in ways simple classifiers can't.

**Disadvantages:** Slower (LLM inference latency), expensive at high volume, output parsing needed, consistency can vary. Not reproducible in the strict sense (temperature > 0).

**Optimization:** For classification, you often don't need frontier models. GPT-4o mini, Claude Haiku, or Gemini Flash are much cheaper and often perform comparably on well-specified classification tasks.

### Fine-tuned transformers

**When to use:**
- High-volume inference where per-call LLM cost is prohibitive
- Low latency requirements (sub-100ms)
- You have 1,000+ labeled examples per category
- Consistent, reproducible classification is essential
- You need maximum accuracy on your specific domain

**How it works:**
1. Start with a pre-trained transformer (BERT, RoBERTa, DeBERTa, or domain-specific variants)
2. Add a classification head (linear layer mapping to number of classes)
3. Fine-tune on your labeled dataset
4. Deploy as a standalone inference endpoint

**Model choice for fine-tuning:**
- `bert-base-uncased` — Solid baseline, well-understood
- `roberta-base` — Generally outperforms BERT on many tasks
- `deberta-v3-base` — State-of-the-art on many NLP benchmarks; good starting point for new projects
- `distilbert-base` — ~60% smaller, ~60% faster than BERT with ~97% of performance. Good when inference speed matters
- Domain-specific: `PubMedBERT` for medical, `LegalBERT` for legal, `FinBERT` for financial text

**Fine-tuning code skeleton (Hugging Face):**

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer
from datasets import Dataset
import torch

model_name = "microsoft/deberta-v3-base"
num_labels = 4  # your number of categories

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=num_labels)

def tokenize(batch):
    return tokenizer(batch["text"], truncation=True, max_length=512, padding="max_length")

train_dataset = Dataset.from_dict({"text": train_texts, "label": train_labels})
train_dataset = train_dataset.map(tokenize, batched=True)

training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=16,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
)
trainer.train()
```

## Multi-label vs. multi-class classification

**Multi-class** — Each input gets exactly one label from N possible labels. Spam/not-spam. Sentiment: positive/negative/neutral.

**Multi-label** — Each input can get zero, one, or multiple labels. A news article can be tagged with "politics," "economy," and "international" simultaneously. A support ticket can be classified as both "billing" and "urgent."

For multi-label, the architecture difference:
- Multi-class → softmax activation, categorical cross-entropy loss → probabilities sum to 1
- Multi-label → sigmoid activation, binary cross-entropy loss → independent probability per label

LLM-based classification handles multi-label more naturally — just ask for all applicable categories. Fine-tuned models require the architectural difference above.

## Handling class imbalance

Real classification datasets are almost never balanced. Support tickets have 40% "general inquiries" and 2% "urgent billing errors." Class imbalance hurts classifiers.

**Strategies:**
- **Oversampling:** Duplicate minority class examples (basic oversampling) or synthesize new examples (SMOTE)
- **Undersampling:** Remove majority class examples to balance
- **Class weights:** Weight the loss function inversely by class frequency. Easy to implement; often effective
- **Threshold adjustment:** If your classifier outputs probabilities, adjust the threshold for each class individually rather than using 0.5 for all
- **More data for minority classes:** If possible, collect targeted examples for underrepresented categories

For extreme imbalance (0.1% positive class), consider framing as anomaly detection rather than binary classification.

## Evaluation metrics beyond accuracy

Accuracy is a misleading metric when classes are imbalanced. A classifier that always predicts "not spam" achieves 99% accuracy on a 1% spam dataset.

**Precision:** Of everything I labeled as class X, what fraction actually is class X?
**Recall:** Of everything that actually is class X, what fraction did I label as class X?
**F1 score:** Harmonic mean of precision and recall. Good single-number summary.
**AUC-ROC:** Area under the receiver operating characteristic curve. Measures discrimination ability across all thresholds.

For multi-class:
- **Macro-averaged F1:** Average F1 across all classes, treating each class equally
- **Weighted-averaged F1:** Average F1 weighted by class frequency

**For business contexts:** Often, precision and recall on the minority class (the interesting class) matter more than aggregate metrics. Know which errors are costly and optimize for the right metric.

## Confidence and uncertainty

Good classifiers don't just output labels — they output probabilities. These probabilities are useful for:

**Thresholding:** Only act on high-confidence classifications. Route low-confidence items to human review.

**Calibration:** Model probabilities should be calibrated — a model that says 80% confidence should be correct 80% of the time. Uncalibrated models are over- or under-confident. Check calibration with calibration curves; apply temperature scaling or Platt scaling if needed.

**LLMs and confidence:** When using LLMs for classification, you can ask the model to express confidence: "Classify this text and express your confidence as low/medium/high." Or inspect output token probabilities if you have API access to logprobs.

## The practical path

For a new classification task:

1. **Start with a few-shot LLM prompt.** Get results in hours, not days. Validate that the categories are well-defined and the task is solvable.
2. **Collect labeled data.** Use the LLM to generate initial labels (LLM-assisted labeling); human review to correct.
3. **Train an embedding classifier** with 200-500 labeled examples. Fast, interpretable, cheap to run.
4. **If accuracy or volume demands it:** Fine-tune a transformer. Set up evaluation infrastructure before fine-tuning so you can measure improvements.
5. **Monitor in production.** Track confidence distributions, class distribution drift, and human review rates. These signal when the model needs updating.

Classification is mature enough that the main failure modes are operational, not algorithmic: insufficient labeled data, poor category definitions, uncalibrated confidence, and no monitoring in production. Address those before worrying about which architecture to use.
