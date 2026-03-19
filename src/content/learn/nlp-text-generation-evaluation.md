---
title: "Evaluating Text Generation: Metrics, Methods, and What Actually Works"
depth: applied
pillar: nlp
topic: nlp
tags: [nlp, evaluation, text-generation, metrics, llm-evaluation]
author: bee
date: "2026-03-19"
readTime: 9
description: "How do you measure whether generated text is good? BLEU and ROUGE have known flaws. LLM-as-judge is promising but imperfect. This guide covers the full evaluation landscape for text generation."
related: [nlp-language-model-evaluation, llm-api-evals-in-production-guide, rag-evaluation-guide]
---

Evaluating generated text is one of the hardest problems in NLP. Unlike classification (accuracy is clear) or regression (MSE is obvious), text quality is subjective, multidimensional, and context-dependent. A summary can be factually correct but boring. A translation can be fluent but miss the meaning. Here's how the field navigates this.

## Traditional Metrics (and Their Limits)

### BLEU (Bilingual Evaluation Understudy)

Originally designed for machine translation. Measures n-gram overlap between generated text and reference text.

```python
from nltk.translate.bleu_score import sentence_bleu

reference = [['the', 'cat', 'sat', 'on', 'the', 'mat']]
candidate = ['the', 'cat', 'is', 'on', 'the', 'mat']
score = sentence_bleu(reference, candidate)  # ~0.61
```

**Problems:**
- Penalizes valid paraphrases ("the feline rested on the rug" scores 0)
- Doesn't measure fluency or coherence
- Requires reference text, which may not exist or may not be unique
- Correlates poorly with human judgment for longer text

**Still useful for**: Machine translation benchmarks, tracking relative improvements during training.

### ROUGE (Recall-Oriented Understudy for Gisting Evaluation)

Measures overlap between generated and reference summaries. ROUGE-L (longest common subsequence) is most common.

```python
from rouge_score import rouge_scorer

scorer = rouge_scorer.RougeScorer(['rougeL'], use_stemmer=True)
scores = scorer.score(
    "The president signed the bill into law on Tuesday",
    "On Tuesday the president signed the legislation"
)
# rougeL: precision=0.71, recall=0.71, fmeasure=0.71
```

**Problems**: Same as BLEU — it's a surface-level text overlap metric. A generated summary could have high ROUGE by copying sentences from the source without actually summarizing.

### BERTScore

Uses BERT embeddings to compare semantic similarity rather than surface-level overlap:

```python
from bert_score import score

P, R, F1 = score(
    ["The cat sat on the mat"],
    ["A feline rested on the rug"],
    lang="en"
)
# F1 ≈ 0.92 (much better than BLEU's 0.0)
```

**Better because**: Captures paraphrases and semantic equivalence. **Still limited**: Doesn't evaluate factual correctness, coherence, or task-specific quality.

## LLM-as-Judge

The most significant evaluation development of the past two years. Use a strong LLM to evaluate generated text:

```python
def evaluate_summary(source: str, summary: str) -> dict:
    prompt = f"""Evaluate this summary on a 1-5 scale for each criterion:

    SOURCE: {source}
    SUMMARY: {summary}

    Criteria:
    1. Faithfulness: Does the summary only contain information from the source?
    2. Coverage: Does it capture the key points?
    3. Coherence: Is it well-organized and readable?
    4. Conciseness: Is it appropriately brief without losing meaning?

    Return JSON: {{"faithfulness": n, "coverage": n, "coherence": n, "conciseness": n, "reasoning": "..."}}"""
    
    return call_llm(prompt, model="gpt-4o")
```

### Why It Works

- Correlates highly with human judgment (often >0.8 Spearman correlation)
- Evaluates nuanced quality dimensions that metrics can't
- Scales without human annotators
- Can be customized to specific evaluation criteria

### Why It's Imperfect

**Position bias**: LLM judges tend to prefer the first option in pairwise comparisons. Mitigate by randomizing order and averaging.

**Self-preference bias**: Models tend to rate their own outputs higher than other models' outputs. Use a different model for judging than for generating.

**Verbosity bias**: Longer responses tend to get higher scores regardless of quality. Explicitly instruct the judge to not favor length.

**Inconsistency**: The same judge can give different scores to the same text across runs. Average multiple evaluations or use lower temperature.

### Best Practices

```python
def robust_llm_evaluation(text_a, text_b, criteria):
    scores = []
    
    # Run both orderings to mitigate position bias
    for ordering in [(text_a, text_b), (text_b, text_a)]:
        score = judge_model.evaluate(*ordering, criteria=criteria)
        scores.append(score)
    
    # Average across orderings
    return aggregate(scores)
```

## Task-Specific Evaluation

### Summarization

- **Faithfulness** (factual consistency with source): Most important. Use NLI-based metrics or LLM-as-judge.
- **Coverage**: Does the summary capture all key points? Compare against multiple reference summaries.
- **Compression ratio**: Is the summary actually shorter? (Surprisingly, some models produce "summaries" longer than the input.)

### Translation

- **COMET**: Learned metric trained on human quality judgments. State-of-the-art correlation with human evaluation.
- **chrF**: Character-level F-score. Better than BLEU for morphologically rich languages.

### Creative Writing

Hardest to evaluate. No reference text exists. Options:
- Human evaluation panels with rubrics
- LLM-as-judge with creativity-specific criteria
- Reader engagement metrics (if deployed)

### Code Generation

The easiest: does the code pass the test cases?

```python
def evaluate_code(generated_code: str, test_cases: list) -> dict:
    passed = 0
    for test in test_cases:
        try:
            exec(generated_code + "\n" + test['assertion'])
            passed += 1
        except:
            pass
    return {"pass_rate": passed / len(test_cases)}
```

## Building an Evaluation Pipeline

A production-grade evaluation pipeline combines multiple approaches:

```python
class TextEvaluationPipeline:
    def evaluate(self, generated: str, reference: str = None, source: str = None):
        results = {}
        
        # Automated metrics (fast, cheap)
        if reference:
            results['bertscore'] = compute_bertscore(generated, reference)
            results['rouge'] = compute_rouge(generated, reference)
        
        # LLM-as-judge (slower, more nuanced)
        results['llm_judge'] = llm_evaluate(
            generated, source=source,
            criteria=['faithfulness', 'coherence', 'helpfulness']
        )
        
        # Task-specific checks
        results['length_appropriate'] = check_length(generated, target_range)
        results['no_hallucinations'] = check_factuality(generated, source)
        
        return results
```

## The Uncomfortable Truth

No single metric captures text quality. The best evaluation combines:

1. **Automated metrics** for fast feedback during development
2. **LLM-as-judge** for nuanced quality assessment at scale
3. **Human evaluation** for final validation and calibrating your automated methods

The teams that build the best text generation systems are the ones that invest the most in evaluation — not in model architecture.
