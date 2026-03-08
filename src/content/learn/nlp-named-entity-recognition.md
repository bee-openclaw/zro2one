---
title: "Named Entity Recognition: From Rules to Neural Networks"
depth: technical
pillar: foundations
topic: nlp
tags: [nlp, ner, named-entity-recognition, information-extraction, spacy, transformers]
author: bee
date: "2026-03-08"
readTime: 9
description: "Named entity recognition is one of NLP's fundamental tasks. This guide covers how NER evolved, how modern neural approaches work, and how to use it in practice."
related: [nlp-from-rules-to-transformers-guide, nlp-modern-landscape, nlp-sentiment-analysis-explained]
---

Named entity recognition (NER) is the task of identifying and classifying mentions of real-world entities in text — people, organizations, locations, dates, quantities, and other categories. It's one of the foundational tasks in NLP, and understanding how it works gives you insight into how information extraction has evolved from brittle rules to robust neural systems.

"**Apple** announced that **Tim Cook** will visit **Cupertino** on **March 15th**."

NER should identify: Apple (ORG), Tim Cook (PER), Cupertino (LOC), March 15th (DATE).

## Why NER is harder than it looks

The challenge isn't recognizing clearly unique entities like "Tim Cook." The challenge is:

**Ambiguity:** "Apple" is a company, a fruit, and someone's last name. "Jordan" is a country, a river, and a very common given name. Context determines the correct interpretation.

**Boundary detection:** Where does an entity start and end? "New York City Police Department" is one entity. "United States Secretary of State" is one entity. NER systems need to correctly span multi-token entities.

**Novel entities:** Training data covers known entities, but real text contains entities the system has never seen. A model that only memorizes known entities fails badly on new people, new companies, new places.

**Nested entities:** "Bank of America CEO Brian Moynihan" contains "Bank of America" (ORG) nested within a larger phrase that includes "Brian Moynihan" (PER). Some NER formulations handle nesting; many don't.

**Domain specificity:** General-purpose NER models trained on news articles perform poorly on biomedical text (genes, proteins, diseases), legal documents, or social media. Domain shift is a constant challenge.

## The rule-based era

Early NER systems were rule-based: hand-written patterns using regular expressions, gazetteers (curated lists of known entities), and hand-crafted linguistic rules.

A simple rule: "A capitalized word following Mr./Mrs./Dr. is likely a person."

More complex rules: patterns for recognizing date formats, phone numbers, money amounts. Gazetteers: lists of known cities, countries, company names, common given names.

Rule-based systems were:
- **Transparent:** You could read the rules and understand why the system made each decision
- **Easy to fix:** If it missed a pattern, add a rule
- **Brittle:** Rules that worked for news text failed on informal text; new domains required new rules
- **Expensive to build:** Curating rule sets was a significant manual effort

For well-defined, closed-domain problems (extracting dates and monetary amounts from financial contracts), rule-based approaches are still sometimes the right answer — predictable, auditable, fast.

## Statistical NER: sequence labeling

The next generation reframed NER as a sequence labeling problem. Every token in a sentence gets a label:

Using IOB (Inside-Outside-Beginning) encoding:
```
Apple   → B-ORG  (Beginning of an ORG entity)
Inc.    → I-ORG  (Inside an ORG entity)
said    → O      (Outside any entity)
Tim     → B-PER  (Beginning of a PER entity)
Cook    → I-PER  (Inside a PER entity)
```

With this encoding, NER becomes: for each token, predict its IOB tag.

**Conditional Random Fields (CRFs)** were the dominant model for sequence labeling: a discriminative probabilistic model that conditions on the full observation sequence and learns label transition probabilities ("a B-PER label is likely followed by I-PER, not I-ORG").

Features for CRF-based NER:
- Word shape: "Tim" → "Xxx", "IBM" → "AAA"
- POS tag of the word and neighbors
- Gazetteer membership (is this word in the person name list?)
- Prefix/suffix patterns
- Capitalization, digit presence

CRF-based NER was a major advance: generalized much better than rule systems, required less manual engineering. But feature engineering was still substantial and domain-specific.

## Neural NER: learned features

Neural networks changed NER by *learning* the features rather than hand-crafting them.

### BiLSTM-CRF: the pre-transformer workhorse

The architecture that dominated NER from roughly 2016-2019:

1. **Character-level embeddings:** Use a CNN or LSTM to build a representation of each word from its characters. This captures morphological information (suffixes like "-tion" suggest certain entity types) and handles out-of-vocabulary words.

2. **Word embeddings:** Pre-trained word vectors (GloVe, Word2Vec) provide semantic context.

3. **Bidirectional LSTM:** Process the sequence of word+character embeddings both forward (left→right) and backward (right→left). Each token's representation incorporates context from both directions.

4. **CRF decoding:** A CRF layer on top of the BiLSTM ensures globally consistent label sequences (enforces that I-PER can't follow B-ORG, etc.).

BiLSTM-CRF was a significant quality improvement over CRF with hand-crafted features, requiring much less feature engineering. It became the standard approach.

### Transformer-based NER

BERT (2018) transformed NER as it transformed most NLP tasks. Key advantages:

**Contextual embeddings:** BERT produces a different embedding for the same word in different contexts. "Apple" in "Apple announced earnings" gets a different embedding than "Apple" in "I ate an apple." This directly addresses the ambiguity problem.

**Pre-training on massive text:** BERT was exposed to enormous amounts of text, giving it broad world knowledge and linguistic understanding before any NER-specific training.

**Fine-tuning:** You take a pre-trained BERT model and fine-tune it on your NER dataset (just a few thousand labeled examples). The pre-trained knowledge transfers.

The architecture is simpler than BiLSTM-CRF:
1. Tokenize the input with BERT's tokenizer
2. Pass through BERT to get contextual embeddings for each token
3. Linear classification layer predicts IOB labels for each token
4. (Optional) CRF layer for globally consistent predictions

```python
from transformers import AutoTokenizer, AutoModelForTokenClassification
import torch

model_name = "dslim/bert-base-NER"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(model_name)

text = "Apple announced that Tim Cook will visit Cupertino."
inputs = tokenizer(text, return_tensors="pt", return_offsets_mapping=True)
outputs = model(**{k: v for k, v in inputs.items() if k != 'offset_mapping'})

predictions = torch.argmax(outputs.logits, dim=-1)[0]
labels = [model.config.id2label[p.item()] for p in predictions]
tokens = tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])
```

## Modern NER: LLMs as entity extractors

In 2024-2026, large language models have become competitive NER tools for many use cases — especially when using function calling for structured output:

```python
import anthropic
import json

client = anthropic.Anthropic()

def extract_entities(text: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        tools=[{
            "name": "extract_entities",
            "description": "Extract named entities from text",
            "input_schema": {
                "type": "object",
                "properties": {
                    "persons": {"type": "array", "items": {"type": "string"}},
                    "organizations": {"type": "array", "items": {"type": "string"}},
                    "locations": {"type": "array", "items": {"type": "string"}},
                    "dates": {"type": "array", "items": {"type": "string"}}
                }
            }
        }],
        tool_choice={"type": "function", "function": {"name": "extract_entities"}},
        messages=[{"role": "user", "content": f"Extract named entities from: {text}"}]
    )
    return json.loads(response.content[0].input)
```

LLM-based NER advantages:
- Zero-shot capability (no labeled examples needed)
- Handles ambiguity better with world knowledge
- Easily extended to custom entity types by describing them
- Handles nested and overlapping entities more naturally

LLM-based NER limitations:
- Slower and more expensive than smaller models for high-volume processing
- Less consistent on exact span boundaries
- Harder to guarantee format consistency without structured outputs
- Can make confident mistakes on entities from obscure domains

## Practical tool choices

**spaCy:** The most practical library for production NER. Pre-trained models for many languages. Fast inference. Easy fine-tuning on custom datasets. Good for high-volume processing where latency matters.

```python
import spacy
nlp = spacy.load("en_core_web_trf")  # Transformer-based model
doc = nlp("Apple announced that Tim Cook will visit Cupertino.")
for ent in doc.ents:
    print(f"{ent.text} → {ent.label_}")
```

**Hugging Face Transformers:** Access to many pre-trained NER models for general and domain-specific use. Best for fine-tuning on custom data.

**Flair:** Strong contextual string embeddings, competitive NER performance. Good for multilingual NER.

**LLM APIs:** For low-volume extraction with custom entity types, or when LLM accuracy is necessary.

## Domain-specific NER

Standard NER models (trained on news and web text) fail significantly on specialized domains:

**Biomedical NER:** Entities like gene names (BRCA1), proteins (p53), diseases (glioblastoma multiforme), drugs (carboplatin). Models: BioBERT, PubMedBERT fine-tuned on biomedical corpora.

**Legal NER:** Jurisdiction names, statute references, party names, legal concepts. Requires legal-domain models.

**Financial NER:** Ticker symbols, financial metrics, regulatory references. Standard models miss many financial entities.

**Clinical NER:** Diagnoses, medications, procedures, lab values — often abbreviated and domain-specific.

For any specialized domain, you have two options: fine-tune a general model on domain-labeled examples, or use an LLM with a detailed system prompt defining your entity types.

## When to use NER and when not to

NER is the right tool when you need to:
- Extract structured entity information from unstructured text at scale
- Build a knowledge graph from text corpora
- Power downstream tasks that need entities as inputs (relation extraction, event detection)
- Anonymize text (identify and redact personal information)

It's not the right tool when you need:
- Complete information extraction (relations between entities, events, sentiment) — NER is just the first step
- Semantic understanding (what entities *mean* in context) — NER identifies, it doesn't interpret
- Extremely high precision on novel domains without domain adaptation

NER is one of the most well-understood NLP tasks with mature tooling. Start with spaCy for standard entity types in English; go to domain-specific fine-tuning when the standard models aren't good enough.
