---
title: "How Neural Networks Actually Learn: Backpropagation Explained"
depth: technical
pillar: foundations
topic: deep-learning
tags: [deep-learning, backpropagation, gradient-descent, neural-networks, technical]
author: bee
date: "2026-03-05"
readTime: 10
description: "Backpropagation is the algorithm that makes deep learning work. Here's a clear technical explanation of how gradients flow backward through a network, why it works, and what actually happens during training."
related: [what-is-deep-learning-essential, ai-foundations-neural-networks, machine-learning-technical]
---

## The core question

How does a neural network with millions of parameters know which ones to adjust, and by how much, when it gets an answer wrong?

The answer is **backpropagation** — a method for computing gradients efficiently by applying the chain rule of calculus backward through a network. Understanding it precisely is one of the most valuable technical investments you can make in ML.

This article assumes you know what a neural network is. If you need a primer, start with [Neural Networks: The Architecture That Powers Modern AI](/learn/ai-foundations-neural-networks).

---

## Setting up the problem

Let's be concrete. We have a neural network:
- Input **x** (say, a 28×28 pixel image, flattened to 784 numbers)
- Multiple hidden layers with learnable weights **W¹, W², ...** and biases **b¹, b², ...**
- Output **ŷ** (predicted class probabilities, e.g., probability this is digit 0, 1, ..., 9)

We have a training example where:
- Input: image of the digit "7"
- Correct label: **y** = [0, 0, 0, 0, 0, 0, 0, 1, 0, 0] (one-hot: the 7th class)
- Model output: **ŷ** = [0.01, 0.02, 0.05, 0.03, 0.02, 0.01, 0.04, 0.75, 0.05, 0.02]

The network mostly got it right (0.75 probability for "7"), but not perfectly. We want to adjust the weights so it gets more confident.

**How much do we adjust each weight?** This is the question backprop answers.

---

## Step 1: Forward pass

The forward pass is straightforward — just computation flowing left to right through the network.

For each layer `l`:

```
z[l] = W[l] @ a[l-1] + b[l]   # Linear transformation
a[l] = f(z[l])                  # Activation function (ReLU, sigmoid, etc.)
```

Where:
- `@` is matrix multiplication
- `a[0]` is the input **x**
- `f` is the activation function

After the forward pass, we have:
- All intermediate activations `a[1], a[2], ..., a[L]`
- The final output `a[L] = ŷ`

We'll need these stored for the backward pass.

---

## Step 2: Compute the loss

The **loss function** L(y, ŷ) measures how wrong the prediction is. For classification, we typically use **cross-entropy loss**:

```
L = -Σᵢ yᵢ * log(ŷᵢ)
```

For our example where y[7] = 1 and ŷ[7] = 0.75:
```
L = -log(0.75) ≈ 0.288
```

If ŷ[7] were 0.99, L ≈ 0.01 (very small, we're nearly correct).
If ŷ[7] were 0.10, L ≈ 2.3 (large, we're very wrong).

The loss is a single number measuring our error. Our goal is to minimize it.

---

## Step 3: The gradient — what we're computing

**Gradient descent** minimizes the loss by updating each weight in the direction that reduces the loss:

```
W[l] ← W[l] - α * ∂L/∂W[l]
```

Where:
- `α` is the learning rate (a small number, like 0.001)
- `∂L/∂W[l]` is the partial derivative of the loss with respect to weight matrix `W[l]`

This partial derivative tells us: "if we increase W[l] slightly, how much does the loss change?" A positive derivative means increasing this weight increases the loss — so we decrease it. A negative derivative means the opposite.

The challenge: computing `∂L/∂W[l]` for every weight in every layer. With millions of weights, this needs to be efficient.

---

## Step 4: Backpropagation — the chain rule applied recursively

The key insight: we can compute all gradients efficiently using the **chain rule** of calculus, applied backward through the network.

The chain rule: if y = f(g(x)), then dy/dx = (dy/dg) * (dg/dx)

In neural networks, the loss is a composition of many functions (one per layer). The chain rule lets us decompose the gradient computation.

### Computing the output layer gradient

Start at the output layer. We need `∂L/∂a[L]` — how does the loss change as we change the output activations?

For cross-entropy loss with softmax:
```
∂L/∂a[L] = ŷ - y    # Predicted minus true labels
```

For our example: [0.01, 0.02, 0.05, 0.03, 0.02, 0.01, 0.04, **-0.25**, 0.05, 0.02]

This "error signal" is large and negative for the correct class (we want to increase its probability), and small and positive for incorrect classes (we want to decrease theirs).

### Propagating backward through a layer

Now we propagate this error signal backward. For layer `l`:

**Gradient with respect to weights:**
```
∂L/∂W[l] = ∂L/∂z[l] @ a[l-1].T
```

**Gradient with respect to biases:**
```
∂L/∂b[l] = ∂L/∂z[l]    # (summed over the batch)
```

**Gradient to pass to the previous layer:**
```
∂L/∂a[l-1] = W[l].T @ ∂L/∂z[l]
```

Where `∂L/∂z[l]` is the gradient with respect to the pre-activation values:
```
∂L/∂z[l] = ∂L/∂a[l] * f'(z[l])    # Element-wise multiplication
```

`f'` is the derivative of the activation function. For **ReLU** (f(x) = max(0, x)):
```
f'(x) = 1 if x > 0, else 0
```

This is why dead neurons happen: if a ReLU neuron's pre-activation is always negative, f'(z) = 0, meaning no gradient flows through it. The neuron stops learning permanently.

### The full backward pass

Starting from the output layer and moving to the input:

```python
# Pseudo-code for a simple network
delta = dL_da_last    # ŷ - y for cross-entropy + softmax

for l in reversed(range(1, L+1)):
    # Compute gradient for this layer's weights
    dW[l] = delta @ a[l-1].T
    db[l] = delta
    
    # Apply activation derivative
    delta = delta * f_prime(z[l])   # Hadamard (element-wise) product
    
    # Propagate to previous layer
    delta = W[l].T @ delta
```

After this loop, we have `dW[l]` and `db[l]` for every layer — the gradients we need for the weight update.

---

## Step 5: The weight update

With gradients in hand:

```python
for l in range(1, L+1):
    W[l] -= learning_rate * dW[l]
    b[l] -= learning_rate * db[l]
```

This is **vanilla stochastic gradient descent (SGD)**. Modern optimizers (Adam, AdaGrad, RMSProp) apply adaptive learning rates and momentum, but the fundamental operation is the same: move each weight slightly in the direction that reduces the loss.

---

## Why this is computationally efficient

Without backprop, computing the gradient of the loss with respect to every weight naively would require:
- Perturbing each weight by a tiny amount
- Running a forward pass
- Measuring how the loss changed
- Repeating for every weight

That's 2N forward passes for N weights. For a network with 10 million weights, this is completely intractable.

Backprop computes all gradients in **one backward pass** — roughly the same cost as a single forward pass. This O(N) vs O(N²) difference is why deep learning is feasible at scale.

---

## Automatic differentiation

Modern deep learning frameworks (PyTorch, JAX, TensorFlow) implement backprop via **automatic differentiation (autograd)**. Instead of you implementing the backward pass, the framework:

1. Records all operations during the forward pass (builds a computational graph)
2. Automatically computes the backward pass through this graph

In PyTorch:
```python
import torch
import torch.nn as nn

# Forward pass — PyTorch records operations
output = model(input)
loss = criterion(output, target)

# Backward pass — PyTorch computes all gradients automatically
loss.backward()

# Gradients are now stored in each parameter's .grad attribute
for param in model.parameters():
    param.data -= learning_rate * param.grad
```

This is what `loss.backward()` does — it runs backpropagation through the computational graph that PyTorch built during the forward pass. You get gradients for every parameter without implementing the backward pass yourself.

---

## Common issues during training

### Vanishing gradients

As gradients are multiplied together backward through many layers, they can become extremely small — effectively zero. Deep networks with sigmoid activations were particularly prone to this because sigmoid's derivative is at most 0.25, so multiplying 10 of them gives at most 0.25^10 ≈ 10^-6.

Solutions:
- **ReLU activations** — derivative is 1 (not < 1) when active, so gradients don't shrink with depth
- **Batch normalization** — normalizes activations at each layer, preventing extreme values
- **Residual connections (ResNets)** — add skip connections that provide gradient highways bypassing many layers

### Exploding gradients

The opposite problem — gradients grow exponentially large, causing unstable training.

Solutions:
- **Gradient clipping** — cap the gradient norm at a maximum value
- **Lower learning rate**
- **Careful weight initialization** (Xavier, He initialization)

### Learning rate sensitivity

The learning rate is the most important hyperparameter. Too high: training diverges. Too low: training is impossibly slow or gets stuck in poor local minima.

Solutions:
- **Learning rate schedules** — start high, decay over training
- **Adaptive optimizers** — Adam, AdaGrad automatically tune per-parameter learning rates
- **Learning rate warmup** — start very low, increase gradually (important for large transformers)

---

## The loss landscape

Backprop optimizes a loss surface that is high-dimensional and non-convex. For a model with 100 million parameters, the loss is a function in 100 million dimensions.

Good news: empirical evidence shows that large networks rarely get stuck in bad local minima. The saddle points are more common than local minima, and stochastic gradient descent tends to escape saddle points. In practice, neural networks optimize surprisingly well despite the theoretical complexity.

---

## What backprop can and cannot tell you

Backprop is a computational method for efficiently computing gradients. It tells you **what direction to move the weights**. It does not tell you:

- How to choose the learning rate
- Whether you've reached a good solution
- Whether the model is overfitting
- What the model has "learned" semantically

These remain the hard problems of training neural networks — and they require judgment, experimentation, and good evaluation practices that go beyond the mechanics of backprop itself.

---

## Summary

1. **Forward pass:** Compute predictions and intermediate activations, storing them all
2. **Loss:** Measure how wrong the prediction is with a loss function
3. **Backward pass:** Apply the chain rule backward through the network, computing `∂L/∂W` for every weight in one efficient pass
4. **Update:** Subtract (learning rate × gradient) from each weight
5. **Repeat:** Across millions of training examples

This loop, run billions of times across massive datasets, is how neural networks learn to do remarkable things. Modern frameworks automate step 3 via automatic differentiation, so you write the forward pass and get the backward pass for free.

Understand this loop and you understand the foundation of essentially all of modern deep learning.
