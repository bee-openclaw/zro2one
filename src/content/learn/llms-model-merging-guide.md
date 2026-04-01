---
title: "LLM Model Merging: Combining Models Without Additional Training"
depth: technical
pillar: llms
topic: llms
tags: [llms, model-merging, fine-tuning, optimization, open-source]
author: bee
date: "2026-04-01"
readTime: 10
description: "Model merging lets you combine the strengths of multiple fine-tuned LLMs into a single model — no GPU training required. This guide covers the main techniques, when merging works, and when it doesn't."
related: [llms-quantization-methods-explained, llms-distillation-and-model-compression, llms-routing-and-model-selection]
---

Model merging is one of those ideas that sounds like it should not work, and yet it does — often surprisingly well. The premise is simple: take the weights from two or more fine-tuned models and combine them into a single model. No training loop. No GPU hours. Just arithmetic on tensors.

The result is a model that (sometimes) captures the strengths of its parents. A model fine-tuned for code and a model fine-tuned for medical reasoning, merged together, can produce a model that handles both tasks better than either alone. Not always. But often enough to make this technique worth understanding.

## Why Merging Works at All

Neural network loss landscapes are surprisingly structured. Models fine-tuned from the same base checkpoint tend to live in the same broad basin of the loss landscape. Their weights are not random points in a high-dimensional space — they are nearby variations on a shared foundation.

This means that linear combinations of their weights often land in regions that are still performant. The merged model inherits some of each parent's learned behavior because the weight deltas from fine-tuning encode task-specific knowledge in a roughly additive way.

This is not guaranteed. It is an empirical observation that works best under specific conditions. But it is surprisingly robust when those conditions are met.

## The Techniques

### Linear Interpolation (LERP)

The simplest approach. For each parameter in the model, compute a weighted average between the two models:

```
merged_weight = alpha * model_A_weight + (1 - alpha) * model_B_weight
```

You pick alpha (typically 0.5 for equal blending). This works when both models are close in weight space. It fails gracefully — the merged model degrades smoothly as alpha moves toward extremes.

### Spherical Linear Interpolation (SLERP)

SLERP interpolates along the surface of a hypersphere rather than cutting through the interior. In practice, this preserves the magnitude of weight vectors better than LERP, which can shrink them.

```python
def slerp(t, v0, v1, DOT_THRESHOLD=0.9995):
    dot = np.sum(v0 * v1 / (np.linalg.norm(v0) * np.linalg.norm(v1)))
    if abs(dot) > DOT_THRESHOLD:
        return (1 - t) * v0 + t * v1
    theta = np.arccos(dot)
    return (np.sin((1 - t) * theta) / np.sin(theta)) * v0 + \
           (np.sin(t * theta) / np.sin(theta)) * v1
```

SLERP is the most popular method for merging two models. It tends to produce smoother results than LERP, especially when the models have diverged more during fine-tuning.

### Task Arithmetic

Task arithmetic formalizes the intuition that fine-tuning creates a "task vector" — the difference between the fine-tuned weights and the base model weights.

```
task_vector_A = model_A_weights - base_weights
task_vector_B = model_B_weights - base_weights
merged = base_weights + lambda_A * task_vector_A + lambda_B * task_vector_B
```

This is powerful because it lets you combine more than two models cleanly. You can also negate task vectors to remove capabilities, or scale them to control the strength of each fine-tune's contribution. The lambda coefficients let you tune how much of each task you want.

### TIES-Merging

Task arithmetic can suffer from interference: different fine-tunes may push the same parameters in opposite directions, creating noise. TIES-Merging (Trim, Elect Sign, and Merge) addresses this with three steps:

1. **Trim**: Zero out small-magnitude changes (parameters that barely moved during fine-tuning are probably noise)
2. **Elect Sign**: For each parameter, vote on the sign across all task vectors. The majority sign wins
3. **Merge**: Average only the task vectors that agree with the elected sign

This reduces destructive interference and tends to produce better merges when combining three or more models.

### DARE (Drop And REscale)

DARE takes a different approach to reducing interference. Instead of trimming by magnitude, it randomly drops a fraction of each task vector's parameters (setting them to zero) and rescales the remaining values to compensate.

The intuition is similar to dropout during training: redundancy in the fine-tuned parameters means you can discard many of them without losing the learned behavior. By randomly dropping different parameters from different task vectors, you reduce the chance of conflicting updates on the same parameter.

DARE can be combined with TIES or task arithmetic for even better results.

## When Merging Works Well

Model merging performs best when:

- **Same base model.** All models being merged were fine-tuned from the same base checkpoint. This is the single most important condition. Merging Llama-based models with Mistral-based models will produce garbage.
- **Complementary skills.** The fine-tunes taught different things. A code model merged with a creative writing model can inherit both skills. Two code models trained on the same data will not produce something twice as good.
- **Moderate fine-tuning.** Models that were lightly fine-tuned (LoRA, a few epochs of full fine-tuning) merge better than models that were trained extensively. Heavy training pushes models further apart in weight space.
- **Similar architecture.** The models must have identical architectures. Same number of layers, same hidden dimensions, same vocabulary. No exceptions.

## When Merging Fails

- **Different base models.** Weights from different architectures or pre-training runs are not compatible. The resulting model will be incoherent.
- **Conflicting objectives.** If one model was trained to be maximally helpful and another to be maximally cautious, merging them does not produce a balanced model. It produces confusion.
- **Too many models.** Merging 2-3 models works well. Merging 10 models tends to produce a bland average that is not particularly good at anything.
- **Evaluation problems.** Merged models can pass vibes checks while actually being worse on structured benchmarks. Always evaluate rigorously.

## Practical Walkthrough with mergekit

mergekit is the standard open-source tool for model merging. Here is a minimal example:

```yaml
# merge_config.yaml
slices:
  - sources:
      - model: ./model-code
        layer_range: [0, 32]
      - model: ./model-medical
        layer_range: [0, 32]
merge_method: slerp
base_model: ./base-model
parameters:
  t:
    - filter: self_attn
      value: [0, 0.5, 0.3, 0.7, 1]
    - filter: mlp
      value: [1, 0.5, 0.7, 0.3, 0]
    - value: 0.5
dtype: bfloat16
```

Run it:

```bash
pip install mergekit
mergekit-yaml merge_config.yaml ./output-model --cuda
```

A few practical notes:

- **Gradient values for `t`**: You can vary the interpolation factor across layers. Early layers (which capture general features) might favor one model, while later layers (which capture task-specific behavior) might favor another.
- **Memory**: Merging requires loading all source models. For 7B models in bfloat16, expect 14-28GB of RAM depending on method. You do not need a GPU, though `--cuda` speeds things up.
- **Iteration speed**: A merge takes minutes, not hours. This makes it practical to try many configurations and evaluate each one.

## A Realistic Workflow

1. Start with a clear goal: "I want a model that does X and Y."
2. Find fine-tuned models on Hugging Face that excel at X and Y individually, and share the same base model.
3. Try SLERP with t=0.5 as a baseline.
4. Evaluate on benchmarks relevant to both X and Y.
5. If results are promising, try task arithmetic or TIES to refine the balance.
6. If results are disappointing, the models may be too divergent. Consider fine-tuning a single model on combined data instead.

## Limitations Worth Acknowledging

Model merging is not a substitute for training. It is a cheap way to combine existing capabilities, and its ceiling is lower than targeted multi-task fine-tuning. The merged model will rarely be better at task X than the specialist model for task X — it will be "pretty good" at multiple things.

Merging also inherits all the problems of its parent models. If one parent hallucinates frequently, the merged model will too. If one parent has alignment issues, those can leak through.

Finally, the theoretical understanding is incomplete. We know merging works empirically, and we have reasonable intuitions about why. But there is no formal guarantee about when a merge will succeed, and surprises — both positive and negative — are common.

Despite these caveats, model merging is one of the most practical tools in the open-source LLM toolkit. It costs nothing, runs on a laptop, and can produce genuinely useful models. If you are working with fine-tuned open models, it is worth trying before you commit to another training run.
