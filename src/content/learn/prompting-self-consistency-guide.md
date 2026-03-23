---
title: "Self-Consistency Prompting: When One Answer Isn't Enough"
depth: applied
pillar: prompting
topic: prompting
tags: [prompting, self-consistency, reasoning, reliability]
author: bee
date: "2026-03-23"
readTime: 8
description: "How to use self-consistency prompting to improve LLM accuracy — generating multiple reasoning paths, aggregating answers, and knowing when the technique is worth the extra cost."
related: [prompting-chain-of-thought, prompting-tree-of-thought-guide, prompting-structured-reasoning]
---

# Self-Consistency Prompting: When One Answer Isn't Enough

Chain-of-thought prompting gets the model to show its reasoning. Self-consistency takes the next step: get the model to show its reasoning *multiple times* and pick the answer that appears most often.

The intuition is simple. If you ask a person to solve a math problem and they get 42 three times and 37 once, you'd trust 42. Self-consistency applies the same logic to LLMs.

## How It Works

1. **Prompt with chain-of-thought** — ask the model to reason step by step
2. **Sample multiple responses** — generate N different reasoning paths (using temperature > 0)
3. **Extract the final answer** from each response
4. **Take the majority vote** — the most common answer wins

```python
import collections

def self_consistency(prompt, model, n=5, temperature=0.7):
    responses = []
    for _ in range(n):
        response = model.generate(prompt, temperature=temperature)
        answer = extract_answer(response)
        responses.append(answer)
    
    # Majority vote
    counter = collections.Counter(responses)
    best_answer, count = counter.most_common(1)[0]
    confidence = count / n
    
    return best_answer, confidence
```

The key insight: different reasoning paths may make different mistakes, but they tend to converge on the correct answer. Errors are random; correctness is consistent.

## Why It Works

Consider a math word problem. The model might:
- **Path 1:** Correctly set up the equation, solve correctly → 42
- **Path 2:** Misread one number, solve correctly with wrong input → 37
- **Path 3:** Correct setup, arithmetic error → 45
- **Path 4:** Correct setup, correct solution → 42
- **Path 5:** Slightly different approach, correct solution → 42

Majority vote: **42** (3 out of 5)

Each individual path has some probability of error. But errors are unlikely to all produce the same wrong answer. The correct answer, by contrast, is a stable attractor — different valid reasoning paths converge on it.

## When to Use It

**Self-consistency helps most when:**
- The task has a definite correct answer (math, logic, factual questions)
- Chain-of-thought already partially works but has inconsistent accuracy
- The cost of being wrong is high
- You can afford the extra API calls

**Self-consistency helps least when:**
- The task is creative or subjective (no single "right" answer to vote on)
- The model consistently gets the answer wrong (majority vote on wrong answers still gives wrong answers)
- The answer space is continuous (hard to vote on free-text)
- Latency matters more than accuracy

## Practical Implementation

### Choosing N (Number of Samples)

More samples = more accuracy, but diminishing returns:

| Samples | Accuracy Gain | Cost Multiplier |
|---------|---------------|-----------------|
| 1 | Baseline | 1x |
| 3 | Significant | 3x |
| 5 | Good sweet spot | 5x |
| 10 | Near-maximum | 10x |
| 20 | Minimal additional | 20x |

**For most applications: 5 samples is the sweet spot.** Going from 1 to 5 gives you most of the accuracy improvement. Going from 5 to 20 gives marginal gains.

### Temperature Setting

Temperature controls how different each reasoning path will be:

- **Temperature 0.0** — every response is (nearly) identical. Self-consistency is useless.
- **Temperature 0.3-0.5** — moderate variation. Good starting point.
- **Temperature 0.7-1.0** — high variation. More diverse reasoning paths, but also more noise.

Start at 0.7 and adjust. If most responses already agree at low temperature, you don't need self-consistency — the model is confident and likely correct.

### Answer Extraction

The hardest part of implementation. You need to reliably extract the final answer from free-text reasoning. Strategies:

```python
def extract_answer(response):
    # Strategy 1: Look for explicit answer format
    match = re.search(r"(?:answer|result)(?:\s+is)?[:\s]+(.+?)(?:\.|$)", response, re.I)
    if match:
        return match.group(1).strip()
    
    # Strategy 2: Take the last number/value
    numbers = re.findall(r'\b\d+(?:\.\d+)?\b', response)
    if numbers:
        return numbers[-1]
    
    # Strategy 3: Take the last sentence
    sentences = response.strip().split('.')
    return sentences[-1].strip()
```

Better approach: instruct the model to format its answer consistently:

```
Think step by step, then give your final answer on a new line formatted as:
ANSWER: [your answer]
```

### Confidence Estimation

Self-consistency gives you a natural confidence score: the fraction of responses that agreed on the winning answer.

```python
confidence = winning_count / total_samples

if confidence >= 0.8:    # 4/5 or 5/5 agree
    # High confidence — likely correct
elif confidence >= 0.6:  # 3/5 agree
    # Moderate confidence — probably correct
else:                    # Only 2/5 or less agree
    # Low confidence — consider escalating to human review
```

This is genuinely useful for production systems. When the model is unsure, self-consistency *shows* the uncertainty through disagreement.

## Advanced Patterns

### Weighted Voting

Not all reasoning paths are equally trustworthy. Weight votes by:
- Response length (longer reasoning often indicates more careful thought)
- Presence of specific reasoning markers ("therefore," "because," "this means")
- Model-assigned confidence ("I'm confident that..." vs. "I think...")

### Hierarchical Self-Consistency

For complex multi-step problems:
1. Apply self-consistency to each sub-step independently
2. Use the consensus answer from each step as input to the next
3. This prevents early errors from cascading through the entire reasoning chain

### Adaptive Sampling

Don't always run all N samples. Start with 3. If all 3 agree, stop (high confidence). If they disagree, generate more:

```python
def adaptive_self_consistency(prompt, model, max_n=10):
    responses = []
    for i in range(max_n):
        response = model.generate(prompt, temperature=0.7)
        responses.append(extract_answer(response))
        
        if i >= 2:  # At least 3 responses
            counter = collections.Counter(responses)
            top_count = counter.most_common(1)[0][1]
            if top_count > len(responses) / 2:  # Majority exists
                return counter.most_common(1)[0][0], top_count / len(responses)
    
    counter = collections.Counter(responses)
    return counter.most_common(1)[0][0], counter.most_common(1)[0][1] / len(responses)
```

This saves tokens on easy questions (3 samples) while spending more on hard ones (up to 10).

## Cost-Benefit Analysis

Self-consistency multiplies your LLM costs by N. Is it worth it?

**Calculate:** (accuracy improvement × value of correct answers) vs. (N × cost per call)

For a customer-facing system where wrong answers cause support tickets ($15 each), going from 80% to 92% accuracy with 5x cost is:
- 12% fewer errors × value per error saved
- If you process 1000 queries/day: 120 fewer errors × $15 = $1,800/day saved
- Extra cost: 4 × 1000 × $0.01 = $40/day
- ROI: 45x

For a low-stakes suggestion system where wrong answers are mildly annoying, probably not worth it.

## The Bottom Line

Self-consistency is the simplest technique that reliably improves LLM accuracy on tasks with definitive answers. It's not clever — it's just "ask multiple times and vote." That directness is its strength. No prompt engineering tricks, no fine-tuning, no architecture changes. Just sampling and counting.

Use it when accuracy matters more than cost and latency. Use adaptive sampling to keep costs reasonable. And use the built-in confidence signal to know when to trust the answer and when to escalate.
