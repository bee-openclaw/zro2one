---
title: "Federated Learning: Training Models Without Sharing Data"
depth: technical
pillar: machine-learning
topic: machine-learning
tags: [machine-learning, federated-learning, privacy, distributed-systems]
author: bee
date: "2026-03-23"
readTime: 11
description: "A practical guide to federated learning — how to train ML models across distributed devices without centralizing sensitive data, covering algorithms, challenges, and real-world deployment patterns."
related: [machine-learning-applied, machine-learning-monitoring-playbook-2026, machine-learning-data-centric-playbook-2026]
---

# Federated Learning: Training Models Without Sharing Data

The standard ML playbook assumes you can gather all your data in one place. Federated learning throws that assumption out. Instead of moving data to the model, you move the model to the data.

This matters because a lot of the world's most valuable data can't be centralized. Medical records across hospitals. Financial transactions across banks. Keyboard typing patterns across phones. Privacy regulations, competitive concerns, and sheer data volume make centralization impractical or illegal.

Federated learning offers a path forward: collaborative model training where the data never leaves its source.

## How It Works

The basic federated learning loop:

1. **Server sends model** — a central server distributes the current global model to participating clients
2. **Local training** — each client trains the model on its local data for a few epochs
3. **Clients send updates** — clients send model updates (gradients or weight deltas) back to the server
4. **Server aggregates** — the server combines updates into a new global model
5. **Repeat** — iterate until convergence

The canonical algorithm is **Federated Averaging (FedAvg)**:

```python
# Server side
global_model = initialize_model()

for round in range(num_rounds):
    # Select a subset of clients
    selected_clients = random.sample(all_clients, k=clients_per_round)
    
    # Distribute model and collect updates
    client_updates = []
    for client in selected_clients:
        local_model = copy.deepcopy(global_model)
        updated_model = client.train(local_model, local_epochs=5)
        client_updates.append(updated_model.state_dict())
    
    # Aggregate (weighted by dataset size)
    global_model = weighted_average(client_updates, weights=client_data_sizes)
```

Simple in concept. The challenges are in the details.

## The Non-IID Problem

In centralized ML, you shuffle your data to get uniform batches. In federated learning, you can't. Each client's data reflects its own distribution.

A keyboard prediction model trained across phones: one user types mostly in English, another mixes English and Spanish, a third writes formal emails while the fourth sends memes. These distributions are wildly different — **non-IID** (not independent and identically distributed).

Non-IID data causes:
- **Slow convergence** — client updates pull the model in different directions
- **Client drift** — local models diverge significantly from the global optimum
- **Fairness issues** — the model may work well for majority patterns and poorly for minorities

### Mitigations

- **FedProx** — adds a proximal term that penalizes local models for diverging too far from the global model
- **SCAFFOLD** — uses control variates to correct for client drift
- **More frequent aggregation** — fewer local epochs mean less drift
- **Client clustering** — group similar clients and train separate models or personalized layers

## Communication Efficiency

In federated learning, communication is often the bottleneck. Sending a full model (millions or billions of parameters) to thousands of devices each round is expensive.

### Compression Techniques

**Gradient quantization** — reduce precision of updates from 32-bit floats to 8-bit or lower:

```python
def quantize_update(update, bits=8):
    min_val, max_val = update.min(), update.max()
    scale = (max_val - min_val) / (2**bits - 1)
    quantized = ((update - min_val) / scale).round().to(torch.uint8)
    return quantized, min_val, scale
```

**Gradient sparsification** — only send the top-k% largest updates:

```python
def sparsify_update(update, top_k_percent=1.0):
    threshold = torch.quantile(update.abs().flatten(), 1 - top_k_percent/100)
    mask = update.abs() >= threshold
    return update * mask, mask
```

**Federated distillation** — instead of sending model weights, clients send soft predictions on a shared public dataset. The server uses these to train the global model.

## Privacy: It's Not Automatic

A common misconception: "data stays local, so federated learning is private." Not quite.

Model updates leak information. Given enough updates from a client, an adversary can reconstruct training samples. Gradient inversion attacks can recover individual images from shared gradients.

### Differential Privacy

The gold standard for formal privacy guarantees. Add calibrated noise to updates before sharing:

```python
def add_dp_noise(update, clip_norm=1.0, noise_multiplier=1.1):
    # Clip the update norm
    norm = torch.norm(update)
    clipped = update * min(1, clip_norm / norm)
    
    # Add Gaussian noise
    noise = torch.randn_like(clipped) * clip_norm * noise_multiplier
    return clipped + noise
```

The trade-off: more noise = stronger privacy = worse model accuracy. The privacy budget (ε) tracks cumulative information leakage across rounds.

### Secure Aggregation

Cryptographic protocols that let the server compute the aggregate without seeing individual updates. The server learns the sum but not who contributed what.

Techniques include:
- **Secret sharing** — each client splits their update into shares distributed to other clients
- **Homomorphic encryption** — compute on encrypted updates directly
- **Trusted execution environments** — hardware-isolated computation

## System Challenges

### Heterogeneous Devices

Phones range from flagship to entry-level. Some complete training in seconds; others take minutes. Stragglers slow everything down.

Solutions:
- **Asynchronous aggregation** — don't wait for everyone; aggregate as updates arrive
- **Client selection** — prefer clients with sufficient compute and battery
- **Adaptive local computation** — let weaker clients do fewer local epochs

### Client Availability

Phones go offline. Users close apps. Connection quality varies.

Design for unreliability:
- **Over-select clients** — if you need 100 updates, invite 150
- **Checkpoint frequently** — don't lose progress when clients drop
- **Timeout gracefully** — proceed with available updates after a deadline

### Model Versioning

When rounds take hours and clients are slow, some clients may be training on an outdated global model. This "staleness" degrades convergence.

Track model versions and weight stale updates less in aggregation, or discard updates that are too old.

## Real-World Applications

**Keyboard prediction (Gboard)** — Google pioneered federated learning for next-word prediction. Trained across millions of Android devices without collecting what users type.

**Healthcare** — hospitals collaboratively train diagnostic models without sharing patient records. Projects like NVIDIA CLARA train across institutions while maintaining HIPAA compliance.

**Financial fraud detection** — banks train shared fraud models without exposing transaction data to competitors.

**Edge AI** — IoT devices collaboratively improve models for anomaly detection, predictive maintenance, and personalization without sending sensor data to the cloud.

## When to Use Federated Learning

**Good fit:**
- Data can't be centralized (privacy, regulation, volume)
- Multiple parties benefit from collaboration
- Each party has enough data for meaningful local training
- The task benefits from diverse data sources

**Poor fit:**
- You can centralize data easily and legally
- Individual clients have too little data
- The model needs to train from scratch (federated works better for fine-tuning)
- You need training to be fast (federated adds communication overhead)

## Getting Started

1. **Start with simulation** — use frameworks like Flower, PySyft, or TensorFlow Federated to simulate federated training on a single machine
2. **Benchmark against centralized** — know what accuracy you're giving up
3. **Profile communication costs** — measure update sizes and round-trip times
4. **Test with non-IID splits** — don't just random-split; create realistic client distributions
5. **Add privacy incrementally** — get the base system working, then layer on DP and secure aggregation

Federated learning isn't a drop-in replacement for centralized training. It's a fundamentally different paradigm with different trade-offs. But when data can't move, it's often the only option — and it's getting better fast.
