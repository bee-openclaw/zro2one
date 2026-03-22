---
title: "Online Learning: Training Models on Streaming Data"
depth: technical
pillar: foundations
topic: machine-learning
tags: [machine-learning, online-learning, streaming, real-time, incremental]
author: bee
date: "2026-03-22"
readTime: 10
description: "How online learning algorithms update models one example at a time, why they matter for streaming data, and practical guidance on implementing them in production systems."
related: [machine-learning-anomaly-detection-guide, machine-learning-experiment-tracking-guide, machine-learning-data-centric-playbook-2026]
---

# Online Learning: Training Models on Streaming Data

Traditional machine learning follows a comfortable pattern: collect a dataset, train a model, deploy it, retrain periodically. But what happens when your data never stops arriving? When the distribution shifts faster than you can retrain? When your dataset is too large to fit in memory?

Online learning flips the script. Instead of batch training on a fixed dataset, online learning algorithms update the model incrementally — one example (or mini-batch) at a time. The model learns continuously, adapting to new patterns as they emerge.

## Batch vs. Online: The Fundamental Distinction

**Batch learning** assumes you have access to the entire training set. You iterate over it multiple times, compute gradients over large batches, and converge to a solution. Retraining means starting from scratch (or near-scratch) with the updated dataset.

**Online learning** processes data sequentially. Each example is seen once (or a small number of times), the model updates, and the example may be discarded. The model is always "current" — no retraining cycle needed.

This isn't just a technical distinction. It changes how you think about ML systems:

| Aspect | Batch | Online |
|--------|-------|--------|
| Data access | Full dataset | One example at a time |
| Memory | O(n) | O(1) |
| Adaptation speed | Hours/days | Seconds/minutes |
| Concept drift handling | Retrain from scratch | Continuous adaptation |
| Training stability | High | Requires careful tuning |

## Core Algorithms

### Online Gradient Descent

The simplest online algorithm: receive an example, compute the loss, take a gradient step.

```python
for x, y in data_stream:
    prediction = model(x)
    loss = loss_fn(prediction, y)
    loss.backward()
    optimizer.step()
    optimizer.zero_grad()
```

This looks like standard SGD — and it is. The difference is philosophical: you're not iterating over a dataset. You're processing a stream that may never end.

**Key consideration:** Learning rate scheduling matters more in online settings. Too high and the model oscillates. Too low and it can't adapt to distribution shifts. Adaptive optimizers like Adam help, but they can also "forget" too slowly.

### Online Convex Optimization (OCO)

The theoretical foundation of online learning. At each round:

1. The learner chooses a model (hypothesis)
2. Nature reveals a loss function
3. The learner suffers the loss and updates

Performance is measured by **regret** — the difference between the learner's cumulative loss and the best fixed model in hindsight:

```
Regret(T) = Σ l(w_t, z_t) - min_w Σ l(w, z_t)
```

A good online algorithm has sublinear regret: O(√T), meaning it converges to the best fixed model's performance over time.

### Follow the Regularized Leader (FTRL)

FTRL maintains a running sum of gradients and solves a regularized optimization at each step. It's the algorithm behind many production online learning systems, including Google's ad click prediction.

Why FTRL over plain SGD? It naturally produces sparse solutions (when using L1 regularization), which matters when your feature space has millions of dimensions.

### Bandits and Contextual Bandits

A special case of online learning where you only observe the reward for the action you took — not the counterfactual. Critical for recommendation systems, ad placement, and A/B testing.

The explore-exploit tradeoff is central: do you show the user what you think they'll like (exploit), or try something new to improve your model (explore)?

## Handling Concept Drift

The killer feature of online learning is its ability to handle concept drift — when the relationship between inputs and outputs changes over time.

### Types of Drift

- **Sudden drift:** The distribution changes abruptly (new product launch, policy change)
- **Gradual drift:** Slow migration from one distribution to another (seasonal trends)
- **Recurring drift:** Patterns that cycle (weekday vs. weekend behavior)
- **Incremental drift:** Small, continuous changes that accumulate

### Drift Detection Methods

**Statistical tests:** Monitor model performance metrics. When accuracy drops below a threshold or error rate increases significantly, declare drift. The Page-Hinkley test and ADWIN (Adaptive Windowing) are popular choices.

**Feature distribution monitoring:** Track input feature distributions with KS tests or PSI (Population Stability Index). Drift in inputs often precedes drift in model performance.

**Ensemble disagreement:** Maintain multiple models trained on different time windows. When they disagree significantly, drift is likely occurring.

### Adaptation Strategies

**Sliding window:** Only train on the most recent N examples. Old data is forgotten, keeping the model current. The window size controls the trade-off between stability and adaptability.

**Exponential decay:** Weight recent examples more heavily than older ones. Equivalent to a soft sliding window.

**Reset and retrain:** When drift is detected, reset the model and retrain on recent data. Aggressive but effective for sudden drift.

**Ensemble methods:** Maintain multiple models from different time periods. Weight their predictions based on recent performance. The Dynamic Weighted Majority algorithm formalizes this.

## Production Online Learning Systems

### Architecture Patterns

A production online learning system looks different from a batch ML pipeline:

```
Data Stream → Feature Extraction → Model Update → Prediction Service
                                        ↕
                                  Model Checkpoint
                                        ↕
                                  Monitoring & Drift Detection
```

Key components:

1. **Stream processor** (Kafka, Flink, Spark Streaming) ingests and preprocesses data
2. **Feature store** provides real-time feature computation
3. **Model updater** applies online learning updates
4. **Serving layer** provides predictions with the latest model
5. **Monitoring** tracks performance and detects drift

### The Delayed Feedback Problem

In many applications, the label arrives much later than the prediction. A fraud detection model predicts at transaction time, but the fraud label might not arrive for days or weeks.

Solutions:
- **Importance-weighted updates:** When labels arrive, update with weights proportional to delay
- **Proxy labels:** Use faster-arriving signals as approximate labels
- **Two-stage systems:** A real-time model handles immediate predictions; a batch model periodically corrects with delayed labels

### Feature Engineering for Online Learning

Online learning constrains your feature engineering:

- **No global statistics:** You can't compute mean/std over the full dataset because you don't have it. Use running estimates (exponential moving averages).
- **No future information:** Features must be computable at prediction time, not just training time.
- **Cardinality management:** High-cardinality features (user IDs, URLs) need hashing or embedding strategies that work incrementally.

## Practical Implementation with River

[River](https://riverml.xyz) is the leading Python library for online learning. It provides a clean API for streaming ML:

```python
from river import linear_model, metrics, preprocessing

model = preprocessing.StandardScaler() | linear_model.LogisticRegression()
metric = metrics.Accuracy()

for x, y in stream:
    y_pred = model.predict_one(x)
    metric.update(y, y_pred)
    model.learn_one(x, y)

print(metric)  # Accuracy computed over the stream
```

River supports classification, regression, clustering, anomaly detection, and time series — all in online mode.

### When to Use River vs. Incremental Batch

River excels when:
- Data truly streams one example at a time
- You need single-example latency
- Memory is severely constrained
- You want pure online learning semantics

For many production systems, **mini-batch online learning** is more practical: collect examples for a few minutes, update the model on the batch, repeat. This gives you online adaptation with better gradient estimates.

## Online Learning for Deep Learning

Online learning with deep networks is harder than with linear models. Deep networks need many passes over data to converge, and single-example updates are noisy.

### Continual Learning

The deep learning community calls it "continual learning" or "lifelong learning." The central challenge is **catastrophic forgetting** — when learning new tasks destroys performance on old ones.

Key techniques:
- **Elastic Weight Consolidation (EWC):** Penalize changes to weights that were important for previous tasks
- **Progressive Networks:** Add new capacity for new tasks while freezing old weights
- **Experience Replay:** Maintain a buffer of old examples and mix them with new data
- **Parameter Isolation:** Dedicate different subnetworks to different tasks

### Practical Compromises

Most production deep learning systems don't do pure online learning. Instead:

1. **Frequent fine-tuning:** Retrain (from last checkpoint) on recent data every few hours
2. **Warm-starting:** Initialize new models from the previous model's weights
3. **Embedding updates:** Keep the model architecture fixed but update embedding tables online
4. **Two-tower systems:** Update user embeddings frequently, item embeddings less often

## Evaluation in Online Learning

You can't use train/test splits in the traditional sense. Instead:

### Prequential Evaluation (Interleaved Test-Then-Train)

For each example:
1. Predict (test)
2. Observe the true label
3. Update the model (train)
4. Record the error

This gives you an honest estimate of model performance on unseen data, computed continuously.

### Windowed Metrics

Track metrics over sliding windows (last 1000 examples, last hour, last day). This shows how the model performs on recent data, which matters more than cumulative performance when distributions shift.

## When Online Learning Makes Sense

**Good fits:**
- Ad click prediction (billions of examples, rapid distribution shift)
- Fraud detection (adversarial drift, need fast adaptation)
- Recommendation systems (user preferences change)
- IoT sensor data (continuous, memory-constrained)
- Financial markets (non-stationary by nature)

**Poor fits:**
- Static datasets that don't change
- Tasks requiring many epochs to learn (complex vision, language)
- When labels are expensive or slow to obtain
- When model stability is more important than adaptability

## Key Takeaways

- Online learning updates models incrementally, one example at a time
- **Regret** is the theoretical measure of online learning performance
- **Concept drift** is the primary motivation — data distributions change over time
- **FTRL** and adaptive gradient methods are workhorses for production online learning
- **Catastrophic forgetting** is the central challenge for online deep learning
- **Prequential evaluation** replaces train/test splits in streaming settings
- Most production systems use **mini-batch online learning** as a practical compromise

The future is increasingly streaming. As more systems demand real-time adaptation and data volumes grow beyond batch feasibility, online learning moves from niche technique to essential capability.
