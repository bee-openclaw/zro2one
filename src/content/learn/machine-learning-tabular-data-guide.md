---
title: "Machine Learning for Tabular Data: Why Gradient Boosting Still Dominates"
depth: technical
pillar: machine-learning
topic: machine-learning
tags: [machine-learning, tabular-data, gradient-boosting, xgboost, lightgbm, deep-learning]
author: bee
date: "2026-04-01"
readTime: 11
description: "Despite deep learning's dominance in vision and language, gradient boosting remains the best default for tabular data. This guide explains why, compares the leading approaches, and helps you choose."
related: [machine-learning-ensemble-methods, machine-learning-feature-engineering, machine-learning-hyperparameter-tuning-guide]
---

Deep learning has eaten computer vision, natural language processing, speech, and most of the signal processing world. But when you have a CSV with rows and columns — customer records, sensor readings, financial transactions, medical test results — gradient boosting is still the algorithm to beat.

This is not nostalgia. It is a consistent empirical finding that has survived years of deep learning attempts to dethrone it. Understanding why requires understanding what makes tabular data fundamentally different from images and text.

## Why Tabular Data Is Different

Images have spatial structure. Text has sequential structure. Tabular data has neither.

A table is a collection of heterogeneous features. Column one might be a person's age (continuous). Column two might be their country (categorical with 200 values). Column three might be their account balance (continuous, heavily skewed). Column four might be a binary flag. There is no inherent spatial or temporal relationship between these columns.

This matters because the core advantage of deep learning — learning hierarchical representations from structured input — does not transfer cleanly. Convolutions exploit spatial locality. Attention exploits sequential relationships. Neither has a natural analog for "age is next to country in the spreadsheet."

Tabular data also tends to have:

- **Fewer samples** than image or text datasets (thousands to low millions, not billions)
- **High feature heterogeneity** (mixed types, different scales, different distributions)
- **Irregular missing data** that carries meaning
- **Strong individual features** where a single column can be highly predictive

These properties favor algorithms that handle heterogeneity natively and do not require massive data to learn useful representations.

## The Gradient Boosting Family

### XGBoost

XGBoost (Extreme Gradient Boosting) popularized gradient boosting for practical ML work. It introduced regularization terms in the objective function, efficient handling of sparse data, and parallel tree construction. XGBoost remains a strong default in 2026.

Key strengths:
- Handles missing values natively
- Built-in regularization (L1 and L2 on leaf weights)
- Efficient on moderate-sized datasets
- Extensive ecosystem and documentation

### LightGBM

LightGBM from Microsoft optimized the training speed through histogram-based splitting and leaf-wise tree growth (instead of level-wise). On larger datasets, LightGBM is often 5-10x faster than XGBoost with comparable or better accuracy.

```python
import lightgbm as lgb

train_data = lgb.Dataset(X_train, label=y_train, categorical_feature=cat_cols)
params = {
    'objective': 'binary',
    'metric': 'auc',
    'learning_rate': 0.05,
    'num_leaves': 31,
    'feature_fraction': 0.8,
    'bagging_fraction': 0.8,
    'bagging_freq': 5,
    'verbose': -1
}
model = lgb.train(params, train_data, num_boost_round=1000,
                  valid_sets=[valid_data], callbacks=[lgb.early_stopping(50)])
```

Key strengths:
- Native categorical feature handling (no need for one-hot encoding)
- Faster training on large datasets
- Lower memory usage
- Leaf-wise growth finds better splits

### CatBoost

CatBoost from Yandex is specifically designed for categorical features. Its ordered boosting approach reduces prediction shift (a form of target leakage in standard gradient boosting), and its categorical encoding is sophisticated.

Key strengths:
- Best out-of-the-box performance with categorical features
- Ordered boosting reduces overfitting
- GPU training support
- Handles text features directly

### Which One?

For most projects, this decision tree works:

- **Heavy categorical features** with high cardinality: Start with CatBoost
- **Large dataset** (millions of rows): Start with LightGBM
- **General purpose / Kaggle competition**: Try LightGBM first, then ensemble with XGBoost and CatBoost
- **Need maximum interpretability tooling**: XGBoost has the broadest ecosystem

The performance differences between these three are usually small. Hyperparameter tuning and feature engineering matter more than library choice.

## Deep Learning Attempts

Researchers have not stopped trying to make deep learning work for tabular data. Some approaches are genuinely interesting.

### TabNet

TabNet uses sequential attention to select which features to focus on at each decision step. It provides instance-wise feature selection and interpretability. In practice, TabNet is competitive with gradient boosting on some benchmarks but inconsistent — it can be excellent on one dataset and mediocre on the next. It also requires more careful tuning.

### FT-Transformer

The Feature Tokenizer Transformer treats each feature as a token (with learned embeddings for both numerical and categorical features) and applies a standard transformer. This is one of the more promising deep learning approaches and occasionally beats gradient boosting on larger datasets. But it requires more data and compute to reach that performance.

### TabPFN

TabPFN (Prior-Fitted Networks) takes a different approach entirely: train a transformer on millions of synthetic datasets so it learns to do Bayesian inference at test time. You feed it your training data and test points, and it outputs predictions in a single forward pass — no training on your data at all.

TabPFN is remarkable for small datasets (under 10,000 samples) and fast prototyping. It is less suitable for production use with larger datasets, and it currently has constraints on the number of features and training samples it can handle.

## What the Benchmarks Actually Show

Large-scale benchmark studies (Grinsztajn et al. 2022, McElfresh et al. 2024, and subsequent replications) consistently find:

1. **Gradient boosting wins on medium-sized tabular datasets** (1K-1M rows). The margin varies, but it is consistent across dozens of datasets.
2. **Deep learning closes the gap on larger datasets** (1M+ rows), especially when the data has some latent structure that benefits from representation learning.
3. **Hyperparameter tuning matters more than model class.** A well-tuned gradient boosting model beats a poorly tuned transformer, and vice versa. Default hyperparameters favor gradient boosting because its defaults are more robust.
4. **Ensembling across model types** (e.g., LightGBM + neural network) can outperform either alone, but the marginal gain is often small compared to the engineering cost.

## When Deep Learning Makes Sense for Tabular Data

There are legitimate cases where deep learning is the better choice:

- **Multimodal inputs.** If your table includes image URLs, text fields, or audio features alongside structured data, a neural network can learn joint representations. Gradient boosting cannot process raw images.
- **Very large datasets.** With tens of millions of rows and complex interactions, deep learning has more room to learn representations that gradient boosting's greedy splitting cannot capture.
- **Learned embeddings.** If you need to extract embeddings from tabular data for downstream tasks (similarity search, clustering), neural networks produce these naturally.
- **End-to-end systems.** If the tabular prediction is part of a larger neural pipeline, keeping everything differentiable simplifies training and deployment.

## Feature Engineering Matters More Than Model Choice

This is the uncomfortable truth that gets buried in model comparison papers. On tabular data, feature engineering typically has a larger impact on performance than switching from one model family to another.

Useful feature engineering for tabular data:

- **Interaction features**: products or ratios of numeric columns that encode domain knowledge
- **Aggregation features**: group-level statistics (mean, count, std) joined back to individual rows
- **Time-based features**: day of week, month, time since last event, rolling averages
- **Target encoding**: replacing categorical values with smoothed target statistics (careful of leakage)
- **Binning**: converting continuous features to ordinal bins, especially for tree-based models with limited depth

```python
# Example: adding time-based and aggregation features
df['days_since_signup'] = (df['event_date'] - df['signup_date']).dt.days
df['user_event_count'] = df.groupby('user_id')['event_id'].transform('count')
df['user_avg_spend'] = df.groupby('user_id')['amount'].transform('mean')
df['spend_ratio'] = df['amount'] / df['user_avg_spend']
```

Gradient boosting is forgiving of redundant or noisy features — it simply will not split on them. But giving it the right features to split on makes a much larger difference than switching from XGBoost to a transformer.

## Practical Recommendations

1. **Start with LightGBM or CatBoost.** Either will get you 90% of the way to the best possible performance in a fraction of the time.
2. **Invest in feature engineering** before trying exotic models. Talk to domain experts. Understand what the columns mean.
3. **Use proper cross-validation** — stratified k-fold for classification, time-based splits for temporal data.
4. **Tune hyperparameters systematically.** Optuna or similar Bayesian optimization tools are worth the setup.
5. **Consider deep learning** only if you have multimodal inputs, very large data, or need learned embeddings.
6. **Ensemble if the stakes justify it.** A simple weighted average of LightGBM, XGBoost, and CatBoost predictions is a strong approach for competitions and high-value predictions. For most production systems, a single well-tuned model is sufficient.

The tabular data landscape has not changed dramatically despite years of deep learning research. That is not a failure of deep learning — it is a testament to how well tree-based methods fit this particular data shape. Use the right tool for the job.
