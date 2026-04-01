---
title: "Deep Learning for Tabular Data: When Neural Networks Compete with Gradient Boosting"
depth: technical
pillar: deep-learning
topic: deep-learning
tags: [deep-learning, tabular-data, transformers, neural-networks, gradient-boosting]
author: bee
date: "2026-04-01"
readTime: 11
description: "Gradient boosting has long dominated tabular ML, but recent architectures are closing the gap. This guide reviews the leading deep learning approaches for tabular data — TabNet, FT-Transformer, TabPFN — and when they actually beat tree-based methods."
related: [machine-learning-model-evaluation-guide, deep-learning-attention-mechanisms-visual-guide, ai-foundations-neural-networks]
---

There's a running joke in machine learning: deep learning conquered images, conquered text, conquered audio, and then sat down at a spreadsheet and lost to XGBoost. The joke persists because it's largely true. On standard tabular benchmarks, well-tuned gradient boosting (XGBoost, LightGBM, CatBoost) still wins more often than not. But the gap has narrowed significantly, and there are now genuine scenarios where deep learning is the better choice for structured data.

This guide covers what's actually working, what's hype, and when to reach for a neural network instead of a tree ensemble.

## Why Tabular Data Is Hard for Deep Learning

Understanding why neural networks struggle with tables helps you understand when they won't.

### No Spatial or Sequential Structure

Images have pixels arranged in a grid. Text has tokens in a sequence. Both have strong local patterns that convolutional or recurrent architectures exploit. Tabular features have no inherent ordering — column 3 being next to column 4 is an artifact of your spreadsheet, not a meaningful relationship. Architectures that assume spatial locality don't get free inductive bias from table structure.

### Heterogeneous Feature Types

A single row might contain a continuous variable (income), a categorical variable (state), a boolean (is_active), and an ordinal variable (education_level). Neural networks prefer homogeneous inputs. Trees handle mixed types natively — they just pick split points.

### Small Datasets Are Common

Many tabular problems have thousands or tens of thousands of rows, not millions. Deep learning's advantage comes from learning complex representations on large datasets. With 10,000 rows and 50 features, a gradient boosting model with 500 trees can already express rich interactions without overfitting. A neural network needs more careful regularization.

### Irregular Target Functions

Tabular data often has sharp, axis-aligned decision boundaries. "If income > $50K AND age > 30, then approve." Trees represent this trivially with two splits. Neural networks approximate it with smooth activation functions, requiring more parameters and training to achieve the same boundary.

## Modern Architectures That Actually Work

The past few years have produced several architectures worth knowing about. Here's an honest assessment of each.

### TabNet (2019)

TabNet introduced attention-based feature selection to tabular learning. At each decision step, the model selects which features to focus on using a learned attention mask, then processes those features through a shared network.

**What's good:** Interpretable feature importance at prediction time. No need for manual feature selection. Handles raw features without extensive preprocessing.

**What's honest:** On standard benchmarks, TabNet rarely beats well-tuned gradient boosting. It often beats poorly-tuned gradient boosting, which may explain some of the positive results in the original paper. Training is finicky — learning rate, number of steps, and attention parameters all interact.

### FT-Transformer (2021)

The Feature Tokenizer + Transformer (FT-Transformer) treats each feature as a token. Numerical features get projected through a linear layer, categorical features get learned embeddings, and the whole sequence goes through a standard transformer encoder. A [CLS] token collects the final representation for prediction.

**What's good:** This is currently the strongest general-purpose deep learning architecture for tabular data. The transformer's self-attention naturally captures feature interactions without manual feature engineering. Scales well to datasets with many features.

**What's honest:** Still loses to gradient boosting on many benchmarks, particularly with fewer than 10,000 samples. The computational cost is significantly higher than tree-based methods. Hyperparameter tuning budget matters a lot.

```python
import torch
import torch.nn as nn

class FeatureTokenizer(nn.Module):
    def __init__(self, num_features, cat_cardinalities, d_token):
        super().__init__()
        # Numerical features: linear projection to d_token dimensions
        self.num_embeddings = nn.Linear(1, d_token)

        # Categorical features: learned embedding per category
        self.cat_embeddings = nn.ModuleList([
            nn.Embedding(card, d_token) for card in cat_cardinalities
        ])

        # CLS token for final prediction
        self.cls_token = nn.Parameter(torch.randn(1, 1, d_token))

    def forward(self, x_num, x_cat):
        # Each numerical feature becomes a token
        num_tokens = self.num_embeddings(x_num.unsqueeze(-1))  # (batch, num_features, d_token)

        # Each categorical feature becomes a token
        cat_tokens = torch.stack([
            emb(x_cat[:, i]) for i, emb in enumerate(self.cat_embeddings)
        ], dim=1)

        # Prepend CLS token
        cls = self.cls_token.expand(x_num.size(0), -1, -1)
        return torch.cat([cls, num_tokens, cat_tokens], dim=1)
```

The key insight is treating features as a sequence. Once you've done that, the transformer does what transformers do best: learn pairwise interactions through attention.

### SAINT (2021)

Self-Attention and Intersample Attention Transformer. SAINT extends the transformer approach by adding attention across rows (intersample attention), not just across features. This lets the model compare a data point against others in the batch.

**What's good:** Intersample attention is a genuinely interesting idea — it's reminiscent of how k-NN works but learned end-to-end. Can capture distributional patterns that column-wise attention misses.

**What's honest:** The intersample attention is computationally expensive and the results are inconsistent across benchmarks. The improvement over FT-Transformer is often within noise.

### TabPFN (2022-2024)

This is the most conceptually different approach. TabPFN is a Prior-Data Fitted Network — a transformer that was pre-trained on millions of synthetic tabular datasets to perform in-context learning. At inference time, you pass your training data and test point as input, and the model outputs a prediction without any gradient updates.

**What's good:** No training required. You literally pass your dataset in and get predictions out. Extremely fast for small datasets. On datasets with fewer than 1,000 training samples, TabPFN frequently beats everything else, including gradient boosting.

**What's honest:** The original TabPFN was limited to ~1,000 training samples and ~100 features due to context length constraints. Newer versions (TabPFN v2) push these limits higher but still can't handle truly large datasets. The synthetic pre-training distribution may not match your specific domain.

```python
from tabpfn import TabPFNClassifier

# No training loop. No hyperparameter tuning.
model = TabPFNClassifier(device="cuda")
model.fit(X_train, y_train)  # This just stores the data
predictions = model.predict(X_test)  # In-context learning happens here
```

## Honest Benchmark Results

The most rigorous comparison comes from the 2022 paper "Why do tree-based models still outperform deep learning on typical tabular data?" by Grinsztajn et al. On 45 datasets from OpenML:

- Random forests and gradient boosting outperformed deep learning on most medium-sized datasets (1K-50K rows)
- Deep learning's gap was largest on datasets with many uninformative features
- Deep learning performed relatively better on datasets with smooth target functions
- Hyperparameter tuning budget disproportionately affected deep learning results

More recent benchmarks (2024-2025) with FT-Transformer and TabPFN show a narrower gap, especially when:
- The dataset has more than 50,000 rows
- Features include text or high-cardinality categorical variables
- The tuning budget for the neural network is generous

## When Deep Learning Actually Wins

There are genuine cases where neural networks are the right choice for tabular data:

### Very Large Datasets

With millions of rows, neural networks have room to learn complex representations that trees can't efficiently capture. The crossover point varies, but above 100K-500K rows, deep learning becomes increasingly competitive.

### Multimodal Features

If your table includes text descriptions, image URLs, or other unstructured data alongside numerical features, deep learning is the natural choice. You can embed text and images with pretrained models and feed those embeddings alongside tabular features into a single architecture. Trees can't process raw text.

### Learned Embeddings Matter

When categorical features have very high cardinality (user IDs, product IDs) and you need to learn meaningful embeddings, neural networks provide a natural framework. These embeddings can then be used downstream for similarity search, clustering, or transfer to other tasks.

### End-to-End Training Is Required

If the tabular prediction is part of a larger differentiable pipeline (a recommendation system, a reinforcement learning agent), you need gradients flowing through the tabular model. Trees don't provide gradients.

## When Gradient Boosting Still Wins

### Small to Medium Datasets

Below 50K rows with well-defined numerical and categorical features, gradient boosting remains the default. It's faster to train, easier to tune, and more robust to hyperparameter choices.

### Purely Numerical Features

On datasets where all features are numerical and the target function has sharp decision boundaries, trees have a structural advantage. They partition the feature space with axis-aligned splits, which matches the structure of many real-world problems.

### Limited Compute Budget

Training a TabNet or FT-Transformer to convergence with proper hyperparameter search takes 10-100x the compute of fitting an XGBoost model. If you're iterating quickly on feature engineering or running many experiments, gradient boosting's speed is a genuine advantage.

## Practical Tips for Training Neural Networks on Tables

If you've decided deep learning is worth trying, these practices improve your odds:

1. **Start with FT-Transformer.** It's the most consistently strong architecture. Use the `rtdl` library for a clean implementation.

2. **Quantile-transform numerical features.** Mapping continuous features to a roughly uniform distribution through quantile transformation often helps neural networks more than standardization does.

3. **Use proper embedding dimensions for categoricals.** A common heuristic: `min(50, (cardinality + 1) // 2)`. Don't over-parameterize low-cardinality features.

4. **Apply serious regularization.** Dropout (0.1-0.3), weight decay (1e-5 to 1e-3), and early stopping are all essential. Tabular datasets are small enough that overfitting is the default failure mode.

5. **Tune learning rate and batch size together.** These interact strongly. Start with learning rate 1e-4 to 3e-4 and batch size 256-512.

6. **Always compare against a tuned baseline.** The most common mistake in "deep learning beats XGBoost" papers is comparing a heavily-tuned neural network against default XGBoost parameters. Use Optuna or similar to tune both fairly.

7. **Consider ensembling both.** A gradient boosting model and a neural network often make different errors. Ensembling them (even a simple average) frequently outperforms either alone.

## The Honest Summary

Gradient boosting is still the default for tabular data, and that's unlikely to change soon. But "default" doesn't mean "always best." If you have a large dataset, multimodal features, or need embeddings, deep learning deserves a serious evaluation. If you have a small dataset and purely structured features, save yourself the trouble and fit a LightGBM model. The architecture wars are less important than proper evaluation methodology — make sure you're comparing fairly, with proper cross-validation and sufficient hyperparameter tuning for both approaches.