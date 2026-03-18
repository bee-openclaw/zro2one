---
title: "Keyword Extraction and Topic Modeling: Making Sense of Large Text Collections"
depth: applied
pillar: building
topic: nlp
tags: [nlp, keyword-extraction, topic-modeling, text-analysis, unsupervised]
author: bee
date: "2026-03-18"
readTime: 8
description: "You have 100,000 customer reviews. What are people talking about? Keyword extraction and topic modeling surface the themes, trends, and patterns hidden in large text collections."
related: [nlp-text-classification-guide, nlp-sentiment-analysis-production, nlp-information-extraction-guide]
---

You've collected 100,000 customer support tickets from the past year. Leadership wants to know: "What are the top issues? Are new problems emerging? Which product areas generate the most complaints?" Reading them all isn't an option. This is where keyword extraction and topic modeling earn their keep.

## Keyword Extraction

Keyword extraction identifies the most important words or phrases in a document or collection. It answers: "What is this text about?" at a glance.

### TF-IDF (Still Useful)

Term Frequency-Inverse Document Frequency weights words by how important they are to a specific document relative to the whole collection. Common words ("the", "is") get low scores. Words that appear frequently in one document but rarely in others get high scores.

```python
from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer(max_features=1000, ngram_range=(1, 3))
tfidf_matrix = vectorizer.fit_transform(documents)

# Top keywords for document 0
feature_names = vectorizer.get_feature_names_out()
doc_scores = tfidf_matrix[0].toarray().flatten()
top_indices = doc_scores.argsort()[-10:][::-1]
keywords = [(feature_names[i], doc_scores[i]) for i in top_indices]
```

**When to use:** Quick and interpretable. Good for search indexing, document tagging, and understanding individual documents.

### KeyBERT

Uses BERT embeddings to find keywords that are semantically most representative of a document. Unlike TF-IDF, it understands meaning — "automobile" and "car" are recognized as similar.

```python
from keybert import KeyBERT

kw_model = KeyBERT()
keywords = kw_model.extract_keywords(
    document,
    keyphrase_ngram_range=(1, 3),
    stop_words='english',
    top_n=10,
    use_mmr=True,  # Maximize diversity
    diversity=0.5
)
```

**When to use:** When you need semantic understanding of keywords, not just frequency. Better for diverse keyword sets.

### LLM-Based Extraction

For the highest quality, ask an LLM:

```
Extract the 5 most important topics/themes from this customer review.
Return as a JSON list of {"keyword": "...", "relevance": "high/medium"}.
Focus on product features, problems, and sentiments mentioned.
```

**When to use:** Small to medium collections where cost per document is acceptable. Highest quality but most expensive.

## Topic Modeling

Topic modeling discovers the latent themes across a collection of documents. Unlike keyword extraction (per-document), topic modeling operates on the full corpus.

### BERTopic (The Modern Default)

BERTopic combines transformer embeddings, dimensionality reduction, and clustering to discover topics:

```python
from bertopic import BERTopic

topic_model = BERTopic(
    language="english",
    min_topic_size=20,
    nr_topics="auto"
)
topics, probs = topic_model.fit_transform(documents)

# View discovered topics
topic_model.get_topic_info()

# Top words per topic
topic_model.get_topic(0)  # [('refund', 0.05), ('return', 0.04), ...]
```

BERTopic is the go-to for topic modeling in 2026. It handles short text (tweets, reviews) better than LDA, produces more coherent topics, and supports dynamic topics (tracking how topics evolve over time).

### LDA (Latent Dirichlet Allocation)

The classic statistical approach. Assumes each document is a mixture of topics, and each topic is a distribution over words.

```python
from sklearn.decomposition import LatentDirichletAllocation
from sklearn.feature_extraction.text import CountVectorizer

vectorizer = CountVectorizer(max_df=0.95, min_df=2, max_features=5000)
doc_term_matrix = vectorizer.fit_transform(documents)

lda = LatentDirichletAllocation(n_components=15, random_state=42)
lda.fit(doc_term_matrix)
```

**When to use:** Large collections where speed matters, or when you need a probabilistic topic distribution per document. LDA is faster than BERTopic on millions of documents.

### LLM-Assisted Topic Discovery

A pragmatic hybrid approach:

1. Run BERTopic to discover initial clusters
2. Sample 5–10 documents from each cluster
3. Ask an LLM: "These documents were clustered together. What theme or topic do they share? Give it a descriptive label."
4. Use LLM-generated labels instead of raw keyword lists

This produces human-readable topic labels that non-technical stakeholders can actually use.

## Practical Pipeline: Analyzing Customer Feedback

Here's a complete pipeline for analyzing 100K customer support tickets:

### Step 1: Preprocessing

```python
import re

def clean_text(text):
    text = re.sub(r'http\S+', '', text)     # Remove URLs
    text = re.sub(r'\S+@\S+', '', text)     # Remove emails
    text = re.sub(r'[^\w\s]', ' ', text)    # Remove punctuation
    text = text.lower().strip()
    return text

cleaned_docs = [clean_text(doc) for doc in documents]
```

### Step 2: Topic Discovery

```python
from bertopic import BERTopic
from bertopic.representation import KeyBERTInspired

representation_model = KeyBERTInspired()
topic_model = BERTopic(
    representation_model=representation_model,
    min_topic_size=50,
    verbose=True
)
topics, _ = topic_model.fit_transform(cleaned_docs)
```

### Step 3: Label and Analyze

```python
topic_info = topic_model.get_topic_info()
# Columns: Topic, Count, Name, Representation

# Topic distribution over time (if you have timestamps)
topics_over_time = topic_model.topics_over_time(
    cleaned_docs, timestamps, nr_bins=12
)
topic_model.visualize_topics_over_time(topics_over_time)
```

### Step 4: Report

Turn the analysis into actionable insights:
- **Top 5 topics by volume** — What do most tickets ask about?
- **Fastest growing topics** — What emerging issues need attention?
- **Topic-sentiment cross-analysis** — Which topics have the most negative sentiment?
- **Outlier documents** — Tickets that don't fit any topic (potential new issues)

## Tips for Better Results

**Clean your data first.** Email signatures, boilerplate text, HTML tags, and auto-generated content add noise. Remove them before analysis.

**Set reasonable topic sizes.** Too many topics → fragmented, hard to interpret. Too few → everything lumps together. Start with 15–25 topics for 100K documents.

**Use n-grams, not just single words.** "customer service" is more informative than "customer" and "service" separately. Include bigrams and trigrams.

**Validate with domain experts.** Show the discovered topics to people who know the domain. They'll immediately spot topics that should be merged, split, or relabeled.

**Iterate.** The first run is exploratory. Adjust parameters, remove noise topics, merge similar ones, and re-run.

## When to Use What

| Task | Best Approach |
|------|--------------|
| "What is this document about?" | KeyBERT or TF-IDF |
| "What are people talking about?" (themes) | BERTopic |
| "How are themes changing over time?" | BERTopic with temporal analysis |
| "Categorize each document into a topic" | BERTopic → use topics as labels |
| "High-quality labels for 500 docs" | LLM-based extraction |
| "Quick analysis of millions of docs" | LDA or TF-IDF clustering |

For most teams analyzing customer feedback, support tickets, or survey responses, BERTopic with LLM-assisted labeling gives you the best balance of quality and scale.
