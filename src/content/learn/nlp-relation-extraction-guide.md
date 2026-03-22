---
title: "Relation Extraction: Building Knowledge Graphs from Unstructured Text"
depth: technical
pillar: foundations
topic: nlp
tags: [nlp, relation-extraction, knowledge-graphs, information-extraction, ner]
author: bee
date: "2026-03-22"
readTime: 11
description: "How to extract structured relationships from unstructured text — from rule-based systems to transformer models — and build knowledge graphs that power search, QA, and reasoning systems."
related: [nlp-named-entity-recognition, nlp-information-extraction-guide, nlp-text-classification-guide]
---

# Relation Extraction: Building Knowledge Graphs from Unstructured Text

Most of the world's knowledge sits in unstructured text — articles, reports, papers, emails, web pages. Relation extraction (RE) is the task of converting this text into structured knowledge: identifying entities and the relationships between them.

"Marie Curie was born in Warsaw" → (Marie Curie, born_in, Warsaw)
"Apple acquired Beats Electronics for $3 billion" → (Apple, acquired, Beats Electronics, price=$3B)

These structured triples are the building blocks of knowledge graphs — the data structures behind Google's Knowledge Panel, medical ontologies, and enterprise intelligence systems.

## The Relation Extraction Pipeline

A complete RE system has three stages:

### 1. Entity Recognition

Before extracting relations, you need to find the entities. Named Entity Recognition (NER) identifies mentions of people, organizations, locations, dates, and domain-specific entities.

```
"Elon Musk founded SpaceX in 2002 in Hawthorne, California."
 [PERSON]         [ORG]   [DATE]  [LOCATION]
```

Modern NER uses transformer-based models (BERT, RoBERTa) fine-tuned on labeled data. Off-the-shelf options: spaCy, Hugging Face token classification, or cloud NER APIs.

### 2. Relation Classification

Given two entities in a sentence, classify the relationship between them. This is the core RE task.

**Input:** "Elon Musk founded SpaceX" + entity pair (Elon Musk, SpaceX)
**Output:** founded_by

The model must determine:
- Is there a relation between these entities?
- If so, which relation type?
- What is the directionality? (Musk founded SpaceX, not SpaceX founded Musk)

### 3. Triple Formation

Combine entities and classified relations into structured triples:

```
(Elon Musk, founded, SpaceX)
(SpaceX, founded_in_year, 2002)
(SpaceX, headquartered_in, Hawthorne)
```

## Approaches to Relation Extraction

### Rule-Based / Pattern-Based

Define syntactic or lexical patterns that indicate relations:

```python
# Dependency pattern for "born in" relation
patterns = [
    {"POS": "PROPN", "DEP": "nsubj"},  # Person
    {"LEMMA": "bear"},                   # born
    {"POS": "ADP", "LEMMA": "in"},      # in
    {"POS": "PROPN", "DEP": "pobj"}     # Location
]
```

**Pros:** High precision, interpretable, no training data needed
**Cons:** Low recall (misses paraphrases), brittle, doesn't scale to many relation types

Still useful for: bootstrapping labeled data, high-precision extraction in narrow domains, and as features for ML models.

### Supervised Classification

Train a classifier on labeled (entity_pair, sentence, relation_type) examples.

**Traditional approach (pre-transformer):**
- Extract features: entity types, dependency path between entities, words between entities, surrounding context
- Train a classifier (SVM, random forest, logistic regression)

**Transformer approach:**
- Insert entity markers into the sentence: "[E1] Elon Musk [/E1] founded [E2] SpaceX [/E2]"
- Pass through BERT/RoBERTa
- Classify using the [CLS] token or entity marker representations

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
model = AutoModelForSequenceClassification.from_pretrained(
    "bert-base-uncased", num_labels=len(relation_types)
)

# Mark entities in text
text = "[E1] Elon Musk [/E1] founded [E2] SpaceX [/E2] in 2002."
inputs = tokenizer(text, return_tensors="pt")
outputs = model(**inputs)
predicted_relation = relation_types[outputs.logits.argmax()]
```

**Key consideration:** You need labeled training data — typically 500-2000 examples per relation type for reasonable performance.

### Distant Supervision

The labeled data problem is expensive. Distant supervision sidesteps it by aligning a knowledge base with text:

1. Start with known facts: (Obama, born_in, Honolulu)
2. Find sentences mentioning both entities: "Barack Obama was born in Honolulu, Hawaii"
3. Assume these sentences express the known relation
4. Train a classifier on this automatically labeled data

**The noise problem:** Not every sentence mentioning Obama and Honolulu expresses the born_in relation. "Obama visited Honolulu last week" is a false positive. Noise-aware training methods (multi-instance learning, reinforcement learning-based selection) mitigate this.

**Practical impact:** Distant supervision made large-scale RE feasible. Projects like Google's Knowledge Vault and academic datasets like NYT-Freebase were built this way.

### LLM-Based Extraction

Modern LLMs can extract relations zero-shot or few-shot:

```
Prompt: Extract all relationships from this text as (subject, relation, object) triples:

"Marie Curie, born in Warsaw in 1867, was awarded the Nobel Prize in Physics 
in 1903 for her work on radioactivity. She later received a second Nobel Prize 
in Chemistry in 1911."

Output:
(Marie Curie, born_in, Warsaw)
(Marie Curie, born_in_year, 1867)
(Marie Curie, awarded, Nobel Prize in Physics)
(Nobel Prize in Physics, year, 1903)
(Marie Curie, researched, radioactivity)
(Marie Curie, awarded, Nobel Prize in Chemistry)
(Nobel Prize in Chemistry, year, 1911)
```

**Advantages:** No training data needed, handles arbitrary relation types, understands context and paraphrases naturally.

**Disadvantages:** Slower and more expensive than specialized models, may hallucinate relations, inconsistent schema (uses different relation names for the same relationship), hard to control precision/recall tradeoff.

**Best practice:** Use LLMs for initial extraction, then validate against rules or a trained classifier. Or use LLMs to generate training data for a smaller, faster supervised model.

## Building Knowledge Graphs

Extracted triples feed into knowledge graphs — structured databases of entities and their relationships.

### Graph Schema Design

Define your entity types and relation types before extraction:

```
Entity Types: Person, Organization, Location, Product, Event, Date
Relations:
  - Person → founded → Organization
  - Person → works_at → Organization  
  - Organization → headquartered_in → Location
  - Organization → acquired → Organization
  - Person → born_in → Location
  - Event → occurred_on → Date
```

Keep it manageable. Start with 5-10 entity types and 15-20 relation types. You can always expand.

### Entity Resolution

The same entity appears in text many different ways:
- "Elon Musk," "Musk," "Tesla's CEO," "the SpaceX founder"
- "United States," "US," "America," "the States"

Entity resolution (also called entity linking or coreference resolution) maps these mentions to canonical entities. This is essential — without it, your graph has thousands of disconnected nodes that are actually the same entity.

**Approaches:**
- **String matching:** Fuzzy matching with edit distance thresholds
- **Context-based linking:** Use surrounding text to disambiguate (Cambridge the city vs. Cambridge the university)
- **KB linking:** Link mentions to a knowledge base like Wikidata or your internal entity database

### Graph Storage

**Triple stores:** Purpose-built for RDF triples. Apache Jena, Blazegraph, GraphDB. Query with SPARQL.

**Property graphs:** More flexible — entities and relations can have properties. Neo4j, Amazon Neptune, TigerGraph. Query with Cypher or Gremlin.

**Hybrid:** Store triples in a property graph for flexibility, maintain RDF exports for interoperability.

For most projects, **Neo4j** is the pragmatic choice — mature, well-documented, and handles both graph queries and full-text search.

### Graph Population Pipeline

```
Raw text corpus
    ↓
Text preprocessing (sentence splitting, tokenization)
    ↓
NER (entity extraction)
    ↓
Entity resolution (deduplication + linking)
    ↓
Relation extraction (classify entity pairs)
    ↓
Confidence filtering (keep high-confidence triples)
    ↓
Graph insertion (with provenance tracking)
    ↓
Quality validation (sample-based human review)
```

**Provenance matters.** For every triple in your graph, track which source document and sentence it came from. This enables:
- Tracing back to source for verification
- Identifying conflicting information from different sources
- Updating the graph when source documents change

## Evaluation

### Standard Metrics

- **Precision:** Of extracted relations, how many are correct?
- **Recall:** Of actual relations in the text, how many were extracted?
- **F1:** Harmonic mean of precision and recall

### Evaluation Challenges

**Partial credit:** Is (Obama, born, Hawaii) correct if the gold standard says (Obama, born_in, Honolulu)? Strict matching says no; relaxed matching might give partial credit.

**Relation boundaries:** "Curie won the Nobel Prize" vs. "Curie won the Nobel Prize in Physics" — both are true, but at different granularity.

**Negative relations:** If a sentence mentions two entities with no relation, the model should predict "no relation." How you count these affects metrics dramatically.

### Practical Evaluation

For production systems, precision often matters more than recall. A wrong fact in your knowledge graph is more harmful than a missing fact. Target precision > 0.85 even if recall drops to 0.5-0.6.

## Applications

### Enterprise Knowledge Management

Extract knowledge from internal documents, emails, meeting notes:
- Who owns which project?
- Which teams collaborate?
- What decisions were made and by whom?

### Biomedical Knowledge Graphs

Extract drug-gene, gene-disease, and drug-drug interaction relationships from medical literature. Projects like SemMedDB contain millions of biomedical relations extracted from PubMed.

### Financial Intelligence

Extract relationships from SEC filings, news, and press releases:
- Company ownership and subsidiary structures
- Board member and executive connections
- M&A activity and supply chain relationships

### RAG Enhancement

Knowledge graphs complement vector-based RAG. When a user asks "Who are the board members of companies that Apple has acquired?", a knowledge graph answers this directly through traversal, while vector search struggles with multi-hop reasoning.

## Key Takeaways

- Relation extraction converts unstructured text into **structured (subject, relation, object) triples**
- The pipeline is: **NER → relation classification → entity resolution → graph population**
- **Transformer-based classifiers** with entity markers are the current standard for supervised RE
- **Distant supervision** solves the labeled data problem at the cost of noise
- **LLMs** handle zero-shot extraction but need validation and schema normalization
- **Entity resolution** is often the hardest part — without it, your graph is fragmented
- **Precision over recall** for production knowledge graphs — wrong facts are worse than missing facts
- Start with a **small, well-defined schema** and expand as needed
