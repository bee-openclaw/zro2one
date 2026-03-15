---
title: "Machine Learning Explainability: SHAP, LIME, and Beyond"
depth: technical
pillar: foundations
topic: machine-learning
tags: [machine-learning, explainability, shap, lime, interpretability]
author: "bee"
date: "2026-03-14"
readTime: 11
description: "A technical guide to machine learning explainability methods—SHAP, LIME, attention visualization, and emerging techniques—with practical advice on choosing the right approach for your use case."
related: [machine-learning-model-evaluation-guide, machine-learning-bias-variance-tradeoff, machine-learning-technical]
---

## Why Explainability Matters

A model that makes accurate predictions but can't explain why is a liability in any high-stakes domain. Healthcare, finance, criminal justice, hiring—these are areas where "the model said so" isn't good enough. Regulators demand explanations. Users deserve them. And engineers need them to debug and improve their systems.

Explainability isn't just an ethical nicety. It's a practical tool for building better models. When you understand *why* a model makes a prediction, you can identify spurious correlations, data leakage, and failure modes that loss curves alone won't reveal.

## The Explainability Landscape

Explainability methods fall along several axes:

### Global vs. Local

- **Global explanations** describe the model's overall behavior: which features matter most across all predictions
- **Local explanations** explain individual predictions: why did the model output *this* for *this specific input*

### Model-Agnostic vs. Model-Specific

- **Model-agnostic** methods work with any model—they treat it as a black box and analyze input-output relationships
- **Model-specific** methods leverage internal model structure (attention weights, decision paths, feature importances)

### Post-Hoc vs. Intrinsic

- **Post-hoc** methods explain a model after training
- **Intrinsically interpretable** models are designed to be understandable by construction (decision trees, linear models, rule lists)

## SHAP: SHapley Additive exPlanations

SHAP is grounded in cooperative game theory. It treats each feature as a "player" in a game where the "payout" is the model's prediction. The Shapley value for each feature represents its fair contribution to the prediction, averaged over all possible coalitions of features.

### How SHAP Works

For a prediction f(x), SHAP computes the contribution of each feature by considering what happens when that feature is present vs. absent, across all possible subsets of other features:

```
φᵢ = Σ [|S|!(|F|-|S|-1)!/|F|!] × [f(S ∪ {i}) - f(S)]
```

Where S is a subset of features, F is the full feature set, and φᵢ is the Shapley value for feature i.

In practice, exact computation is exponential, so SHAP uses approximations:

- **KernelSHAP**: Model-agnostic, uses weighted linear regression on sampled coalitions
- **TreeSHAP**: Exact and fast for tree-based models (XGBoost, LightGBM, Random Forests)
- **DeepSHAP**: Combines SHAP with DeepLIFT for neural networks
- **PartitionSHAP**: Groups correlated features for efficiency

### SHAP Strengths

- **Theoretically grounded**: Shapley values satisfy desirable axioms (efficiency, symmetry, linearity, null player)
- **Consistent**: Adding a feature that genuinely matters always increases its attribution
- **Both local and global**: Individual explanations aggregate into global feature importance
- **Rich visualizations**: Force plots, waterfall charts, dependence plots, beeswarm plots

### SHAP Limitations

- **Computationally expensive** for non-tree models (KernelSHAP scales poorly with feature count)
- **Assumes feature independence** in some variants, which can produce misleading explanations for correlated features
- **Can be slow** for real-time applications

### Practical SHAP Usage

```python
import shap

explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)

# Global importance
shap.summary_plot(shap_values, X_test)

# Single prediction
shap.waterfall_plot(shap.Explanation(
    values=shap_values[0],
    base_values=explainer.expected_value,
    data=X_test.iloc[0]
))
```

## LIME: Local Interpretable Model-agnostic Explanations

LIME explains individual predictions by fitting a simple, interpretable model (typically linear regression) in the neighborhood of the instance being explained.

### How LIME Works

1. **Perturb** the input: generate variants by slightly modifying feature values
2. **Predict** with the black-box model on all perturbed variants
3. **Weight** the perturbed samples by their proximity to the original input
4. **Fit** a simple model (linear, decision tree) on the weighted samples
5. **Extract** the simple model's coefficients as the explanation

### LIME Strengths

- **Intuitive**: Explanations are easy to understand ("feature X pushed the prediction up by Y")
- **Model-agnostic**: Works with any classifier or regressor
- **Fast**: Typically faster than SHAP for individual explanations
- **Flexible**: Works for tabular data, text, and images

### LIME Limitations

- **Unstable**: Different runs can produce different explanations for the same instance
- **Neighborhood definition is arbitrary**: Results depend on how you perturb inputs and define "nearby"
- **No theoretical guarantees**: Unlike SHAP, LIME doesn't satisfy formal fairness axioms
- **Linear approximation may be poor** for highly nonlinear decision boundaries

### When LIME Beats SHAP (and Vice Versa)

Use **LIME** when you need quick, approximate explanations and stability isn't critical. Use **SHAP** when you need theoretically grounded, consistent explanations and can afford the computation. For tree-based models, TreeSHAP is almost always the better choice—it's both fast and exact.

## Attention-Based Explanations

For transformer models, attention weights are often used as a proxy for explanation: "the model attended to these tokens when making its prediction."

### The Attention Controversy

Attention weights are *not* faithful explanations. Research (Jain & Wallace, 2019; Wiegreffe & Pinter, 2019) has shown that:

- Different attention distributions can produce the same output
- Attention doesn't necessarily indicate which inputs the model "uses" for its prediction
- Gradient-based attribution often disagrees with attention patterns

That said, attention visualization remains useful for *debugging* and *building intuition*—just don't treat it as ground truth about the model's reasoning.

### Better Alternatives for Transformers

- **Integrated Gradients**: Accumulates gradients along a path from a baseline input to the actual input
- **Layer-wise Relevance Propagation (LRP)**: Propagates relevance scores backward through the network
- **SHAP for transformers**: PartitionSHAP with token-level grouping

## Counterfactual Explanations

Instead of asking "why did the model predict X?", counterfactual explanations ask "what's the smallest change to the input that would change the prediction?"

This is often the most actionable form of explanation:

- "Your loan was denied. If your income were $5,000 higher, it would have been approved."
- "This email was classified as spam. Removing the word 'FREE' from the subject would change the classification."

### Methods for Generating Counterfactuals

- **DiCE (Diverse Counterfactual Explanations)**: Generates multiple diverse counterfactuals
- **Wachter et al.**: Optimizes for the closest counterfactual in feature space
- **FACE**: Uses graph-based search to find feasible counterfactual paths

### Challenges

- Counterfactuals must be **feasible** (you can't tell someone to be 10 years younger)
- Multiple valid counterfactuals may exist—which one do you show?
- For high-dimensional inputs (images, text), defining "smallest change" is non-trivial

## Concept-Based Explanations

Rather than explaining in terms of raw features, concept-based methods explain in terms of human-understandable concepts.

**TCAV (Testing with Concept Activation Vectors)** lets you ask questions like: "How important is the concept of 'stripes' to this model's classification of zebras?" You provide example images of the concept, learn a direction in activation space, and measure the model's sensitivity to that direction.

This bridges the gap between low-level feature attributions and human-level understanding.

## Choosing the Right Method

| Scenario | Recommended Approach |
|---|---|
| Tree model, need global + local | TreeSHAP |
| Any model, quick local explanations | LIME |
| Regulatory compliance, need rigor | SHAP (with documentation) |
| User-facing "why was I denied?" | Counterfactual explanations |
| Debugging transformer behavior | Integrated Gradients + attention visualization |
| Communicating to non-technical stakeholders | LIME or counterfactuals |
| Understanding learned concepts | TCAV |

## Practical Guidelines

### Don't Rely on a Single Method

Different explanation methods can disagree. When the stakes are high, use multiple methods and look for convergence. If SHAP and LIME agree, you can be more confident. If they disagree, investigate why.

### Validate Explanations

An explanation is only useful if it's faithful to the model's actual reasoning. Test this by:

- Removing the "important" features and checking if the prediction actually changes
- Comparing explanations across similar inputs for consistency
- Having domain experts evaluate whether explanations match their intuition

### Beware of Explanation Gaming

If users know how explanations are generated, they may manipulate inputs to get desired explanations without changing the underlying reality. This is an active area of research in adversarial explainability.

### Document Your Explainability Stack

For compliance and reproducibility, document which methods you use, their known limitations, and how explanations are presented to end users. The EU AI Act and similar regulations increasingly require this.

## The Road Ahead

Explainability research is moving toward:

- **Causal explanations** that distinguish correlation from causation
- **Interactive explanations** where users can probe and question the model
- **Faithful explanations** with formal guarantees about accuracy
- **Multimodal explanations** for models that process text, images, and structured data simultaneously

The goal isn't perfect transparency—some models are genuinely too complex for complete human understanding. The goal is *useful* transparency: explanations that help people make better decisions with AI systems, catch errors before they cause harm, and build justified trust in the models they deploy.
