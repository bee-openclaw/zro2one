---
title: "Coreference Resolution: Teaching AI to Track Who's Who in Text"
depth: applied
pillar: foundations
topic: nlp
tags: [nlp, coreference-resolution, entity-tracking, language-understanding]
author: bee
date: "2026-03-20"
readTime: 9
description: "When text says 'she,' 'the company,' or 'it,' something needs to figure out what those words refer to. Coreference resolution is the NLP task of linking mentions to entities — and it's harder than it sounds."
related: [nlp-named-entity-recognition, nlp-information-extraction, nlp-text-classification]
---

Consider this paragraph:

> *"Sarah joined Acme Corp in January. She quickly impressed her manager, who recommended her for the London project. The company approved the transfer last week."*

Humans instantly understand: "She" = Sarah. "Her manager" = someone at Acme Corp. "The company" = Acme Corp. "The transfer" = Sarah's move to London.

Teaching machines to make these connections is **coreference resolution** — one of the foundational challenges in NLP and a critical component in any system that needs to understand text beyond individual sentences.

## Why It Matters

Without coreference resolution, NLP systems treat every mention independently:

- **Summarization** can't merge information about the same entity across sentences
- **Question answering** can't follow pronoun chains to find answers
- **Information extraction** creates duplicate, disconnected entity records
- **Dialogue systems** lose track of what users are referring to

Any time text refers back to something mentioned earlier, coreference resolution is the bridge.

## Types of Coreference

### Pronominal

The most common: pronouns referring to entities.
> "**The engineer** reviewed the code. **She** found three bugs."

### Nominal

Different noun phrases referring to the same entity.
> "**Barack Obama** won the 2008 election. **The 44th president** was inaugurated in January."

### Proper Name Variations

> "**Microsoft** announced earnings. **MSFT** stock rose 3%."

### Event Coreference

References to the same event.
> "**The earthquake** hit at 3am. **The disaster** displaced thousands."

## How Modern Systems Work

### The Neural Approach

Modern coreference resolvers (since Lee et al., 2017) treat the problem as mention-pair scoring:

1. **Identify candidate mentions** — spans of text that might refer to entities
2. **Score every pair** — for each mention, score how likely it is to refer to each preceding mention
3. **Link the highest-scoring pairs** — form clusters of coreferent mentions

```python
# Simplified coreference scoring
class CoreferenceScorer(nn.Module):
    def __init__(self, hidden_dim):
        super().__init__()
        self.mention_scorer = nn.Sequential(
            nn.Linear(hidden_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 1)
        )
        self.pair_scorer = nn.Sequential(
            nn.Linear(hidden_dim * 3, 256),  # mention_i, mention_j, element-wise product
            nn.ReLU(),
            nn.Linear(256, 1)
        )
    
    def score_pair(self, mention_i, mention_j):
        combined = torch.cat([
            mention_i, 
            mention_j, 
            mention_i * mention_j  # Element-wise interaction
        ], dim=-1)
        return self.pair_scorer(combined)
```

### SpanBERT and Beyond

The current state of the art uses transformer-based encoders (originally SpanBERT, now larger models) to produce rich mention representations. The transformer's attention mechanism naturally captures long-range dependencies that pronouns require.

```python
from transformers import AutoModel, AutoTokenizer

def encode_mentions(text, mention_spans):
    tokenizer = AutoTokenizer.from_pretrained("SpanBERT/spanbert-large-cased")
    model = AutoModel.from_pretrained("SpanBERT/spanbert-large-cased")
    
    inputs = tokenizer(text, return_tensors="pt", return_offsets_mapping=True)
    outputs = model(**inputs)
    
    mention_embeddings = []
    for start, end in mention_spans:
        # Span representation: concat of start token, end token, 
        # and attention-weighted span
        span_emb = torch.cat([
            outputs.last_hidden_state[0, start],
            outputs.last_hidden_state[0, end],
            outputs.last_hidden_state[0, start:end+1].mean(0)
        ])
        mention_embeddings.append(span_emb)
    
    return mention_embeddings
```

### LLM-Based Approaches

With capable LLMs, you can now do coreference resolution through prompting:

```python
async def resolve_coreferences_llm(text: str) -> dict:
    prompt = f"""Identify all entity mentions in the following text and group 
    coreferent mentions (mentions that refer to the same entity).

    Text: {text}

    Return JSON with format:
    {{
        "entities": [
            {{
                "id": 1,
                "canonical_name": "main name",
                "mentions": ["mention 1", "mention 2", ...]
            }}
        ]
    }}"""
    
    response = await llm.generate(prompt)
    return json.loads(response)
```

This works surprisingly well for many applications and is dramatically simpler to implement than dedicated models. The tradeoff: higher latency, higher cost, and less consistent output format.

## Practical Applications

### Document Understanding

Resolving coreferences transforms documents from collections of sentences into connected narratives:

```python
def resolve_and_simplify(text: str, coreferences: dict) -> str:
    """Replace pronouns with their referents for clearer text."""
    resolved = text
    for entity in coreferences["entities"]:
        canonical = entity["canonical_name"]
        for mention in entity["mentions"]:
            if mention.lower() in ["he", "she", "they", "it", "his", "her", "their", "its"]:
                resolved = resolved.replace(mention, f"{canonical}", 1)
    return resolved
```

Before: "She told him that the company would review it next week."
After: "Sarah told Mark that Acme Corp would review the proposal next week."

### Knowledge Graph Construction

Coreference resolution is essential for building knowledge graphs from text. Without it, you get duplicate nodes for the same entity:

Without coref: `{Sarah} → worked_at → {Acme}`, `{She} → impressed → {her manager}` (disconnected)
With coref: `{Sarah} → worked_at → {Acme Corp}`, `{Sarah} → impressed → {Sarah's manager}` (connected)

### Meeting Transcription

In meeting transcripts, speakers constantly use pronouns and references:
> "Can you send me the report?" "I'll send it after the meeting." "Great, and make sure to include the Q4 numbers."

Resolving what "it" (the report), "you" (specific person), and "the Q4 numbers" refer to is essential for generating useful meeting summaries and action items.

## Hard Cases

Coreference resolution still struggles with:

**Winograd schemas** — Ambiguous pronouns that require world knowledge:
> "The trophy doesn't fit in the suitcase because **it** is too big."
> "The trophy doesn't fit in the suitcase because **it** is too small."

"It" refers to the trophy in the first sentence and the suitcase in the second. The only difference is the adjective, which requires understanding physical properties.

**Implicit references:**
> "I went to the restaurant but **they** were closed."

"They" refers to the restaurant, but treated as a collective entity. No explicit antecedent uses a plural form.

**Long-distance references:**
> [Paragraph about Sarah] ... [Three paragraphs about other topics] ... "She returned to the office."

The longer the distance between mention and referent, the harder resolution becomes.

**Bridging anaphora:**
> "I walked into the kitchen. **The fridge** was empty."

"The fridge" hasn't been mentioned before, but it's implicitly connected to the kitchen through world knowledge.

## Evaluation

The standard metric is **CoNLL F1**, which measures the overlap between predicted and gold coreference clusters using three scoring methods (MUC, B³, CEAFe) and averages them.

Current state of the art on OntoNotes (the standard benchmark): ~83% CoNLL F1. This sounds high, but the remaining 17% includes many of the hard cases that matter most for downstream applications.

## When to Use What

| Approach | Best For | Latency | Cost |
|----------|----------|---------|------|
| Dedicated model (SpanBERT-based) | High-throughput pipelines | Low | Low |
| LLM prompting | Prototyping, low-volume | Medium | Medium |
| spaCy/Hugging Face neuralcoref | Quick integration | Low | Low |
| LLM with structured output | Production with quality needs | Medium | Medium |

For most production applications in 2026, the LLM-based approach offers the best quality-to-effort ratio. For high-throughput pipelines processing millions of documents, dedicated models remain more practical.

Coreference resolution is one of those NLP tasks that's invisible when it works and painfully obvious when it doesn't. Any system that claims to "understand" text needs it — and getting it right is still an active area of improvement.
