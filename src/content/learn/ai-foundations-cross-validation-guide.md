---
title: "Cross-Validation: The Right Way to Estimate Model Performance"
depth: technical
pillar: foundations
topic: ai-foundations
tags: [ai-foundations, cross-validation, model-evaluation, overfitting, machine-learning]
author: bee
date: "2026-04-01"
readTime: 9
description: "Cross-validation gives you a more honest estimate of how your model will perform on unseen data. This guide covers k-fold, stratified, time-series, and grouped variants — with guidance on which to use when."
related: [machine-learning-model-evaluation-guide, ai-foundations-bias-variance-intuition, machine-learning-hyperparameter-tuning-guide]
---

You train a model. You evaluate it on a test set. The accuracy looks great. You deploy it. It performs noticeably worse in production. What happened?

The most common answer: your single train/test split was not representative. The model's performance estimate was optimistic because it happened to get a favorable split, or because some information leaked between training and evaluation. Cross-validation exists to give you a more honest answer.

## Why a Single Holdout Split Is Not Enough

A standard 80/20 train/test split gives you one estimate of model performance. That estimate depends on which specific rows ended up in which set. With a different random seed, you get a different number.

This variance is a problem for two reasons:

1. **You cannot distinguish between model quality and split luck.** A model that scores 0.85 on one split and 0.82 on another has a real performance range. Reporting only the 0.85 is misleading.
2. **You waste data.** That 20% in the test set is not being used for training. On small datasets, this matters — you are evaluating a weaker model than you could have trained.

Cross-validation addresses both problems by systematically rotating which data is used for training and which is used for evaluation.

## K-Fold Cross-Validation

The standard approach. You divide your dataset into k equally-sized folds (k=5 and k=10 are the most common choices). Then you train k separate models, each time using k-1 folds for training and the remaining fold for evaluation.

Visually, with k=5:

```
Fold 1: [TEST] [train] [train] [train] [train]
Fold 2: [train] [TEST] [train] [train] [train]
Fold 3: [train] [train] [TEST] [train] [train]
Fold 4: [train] [train] [train] [TEST] [train]
Fold 5: [train] [train] [train] [train] [TEST]
```

Each data point appears in exactly one test fold. You get k performance estimates, and you report both the mean and standard deviation.

```python
from sklearn.model_selection import cross_val_score
from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier(n_estimators=100, random_state=42)
scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')

print(f"Accuracy: {scores.mean():.3f} (+/- {scores.std():.3f})")
# Accuracy: 0.847 (+/- 0.023)
```

That standard deviation is the critical information you do not get from a single split. It tells you how stable the model's performance is across different subsets of your data.

### Choosing k

- **k=5**: Good default. Reasonable bias-variance tradeoff. Fast enough for most models.
- **k=10**: Slightly less biased (each training set is 90% of the data instead of 80%). More expensive. Worth it when you have enough data and compute.
- **k=3**: Use when training is very expensive (deep learning) or the dataset is very large.

Higher k means each training set is larger (less bias) but the folds overlap more (higher variance in the estimate, and more models to train). For most practical work, k=5 is the right starting point.

## Stratified K-Fold

Standard k-fold randomly assigns rows to folds. If your target variable is imbalanced — say, 95% negative and 5% positive — a random split might give one fold 8% positive examples and another 2%. The performance estimates across folds will be noisy for reasons that have nothing to do with the model.

Stratified k-fold ensures each fold has approximately the same class distribution as the full dataset.

```python
from sklearn.model_selection import StratifiedKFold

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(model, X, y, cv=skf, scoring='f1')
```

**Use stratified k-fold by default for classification tasks.** There is almost no reason not to. scikit-learn's `cross_val_score` uses stratified k-fold automatically when it detects a classification task, but being explicit is good practice.

## Time-Series Cross-Validation

Standard k-fold assumes data points are independent and identically distributed. Time-series data violates this assumption — you cannot train on future data and evaluate on past data without introducing a serious and subtle form of leakage.

### Expanding Window

The most common approach. Each fold uses all data up to a cutoff for training and the data immediately after the cutoff for testing. The training set grows with each fold.

```
Fold 1: [TRAIN    ] [TEST]
Fold 2: [TRAIN         ] [TEST]
Fold 3: [TRAIN              ] [TEST]
Fold 4: [TRAIN                   ] [TEST]
```

```python
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=5)
scores = cross_val_score(model, X, y, cv=tscv, scoring='neg_mean_absolute_error')
```

### Sliding Window

Similar to expanding window, but the training set has a fixed maximum size. Older data is dropped as the window slides forward. This is useful when the data-generating process changes over time and older data is less relevant.

```python
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=5, max_train_size=10000)
```

### Gap Between Train and Test

In some applications, you need a gap between the training and test periods to account for information that would not be available in real-time. For example, if you are predicting next-month sales and your features include data that arrives with a one-week lag, you need at least a one-week gap.

scikit-learn's `TimeSeriesSplit` supports this with the `gap` parameter.

## Group K-Fold

Sometimes data points are not independent because they belong to the same group. Patients with multiple hospital visits. Students with multiple test scores. Users with multiple transactions.

If the same patient appears in both training and test folds, the model can partially memorize patient-specific patterns and report inflated performance. Group k-fold ensures that all data from the same group stays in the same fold.

```python
from sklearn.model_selection import GroupKFold

gkf = GroupKFold(n_splits=5)
scores = cross_val_score(model, X, y, cv=gkf, groups=patient_ids, scoring='roc_auc')
```

This is essential for medical data, user behavior data, and any dataset where rows are not truly independent. Missing this is one of the most common sources of overly optimistic performance estimates.

## Leave-One-Out Cross-Validation (LOOCV)

LOOCV is k-fold where k equals the number of data points. Each fold trains on all data except one row and evaluates on that single row.

This gives a nearly unbiased estimate (the training set is as large as possible) but has high variance and is computationally expensive. It is rarely worth using in practice — k=10 gives you most of the benefit at a fraction of the cost.

The one exception: very small datasets (under 100 samples) where every data point matters.

## Nested Cross-Validation

Here is a subtle but important problem. If you use cross-validation to select the best hyperparameters and then report the cross-validation score from that selection process, you have introduced optimistic bias. The score reflects the best configuration found on those specific folds, which is not the same as expected performance on new data.

Nested cross-validation solves this with two loops:

- **Outer loop**: Splits data into train and test folds for performance estimation
- **Inner loop**: Within each outer training fold, runs cross-validation for hyperparameter selection

```python
from sklearn.model_selection import cross_val_score, GridSearchCV

# Inner loop: hyperparameter tuning
inner_cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
param_grid = {'n_estimators': [100, 200], 'max_depth': [5, 10, None]}
grid_search = GridSearchCV(RandomForestClassifier(), param_grid, cv=inner_cv,
                          scoring='f1', refit=True)

# Outer loop: performance estimation
outer_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
nested_scores = cross_val_score(grid_search, X, y, cv=outer_cv, scoring='f1')

print(f"Nested CV F1: {nested_scores.mean():.3f} (+/- {nested_scores.std():.3f})")
```

Nested CV is expensive (k_outer times k_inner times number of hyperparameter combinations). Use it when you need a trustworthy performance estimate for a paper or a critical deployment decision. For exploratory work, standard CV with a separate held-out test set is fine.

## Common Mistakes

### Leaking Information Across Folds

The most dangerous mistake. Feature engineering, scaling, and feature selection must happen inside each fold, not before splitting. If you normalize your entire dataset before cross-validation, the test fold's statistics have influenced the training fold's preprocessing.

```python
# WRONG: scaling before cross-validation
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)  # Leaks test statistics into training
scores = cross_val_score(model, X_scaled, y, cv=5)

# RIGHT: scaling inside the CV loop using a pipeline
from sklearn.pipeline import Pipeline

pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('model', RandomForestClassifier())
])
scores = cross_val_score(pipe, X, y, cv=5)
```

### Shuffling Time-Series Data

If your data has a temporal component, shuffling before k-fold cross-validation destroys the time structure and creates leakage. Future information ends up in training folds. Use `TimeSeriesSplit` instead.

### Ignoring Group Structure

If your dataset has repeated measurements from the same entities (patients, users, devices), standard k-fold will overestimate performance. Use `GroupKFold` or `StratifiedGroupKFold`.

### Reporting Only the Mean

Cross-validation gives you a distribution of scores. Reporting "accuracy: 0.85" without the standard deviation hides important information about model stability. Always report both.

## Which Cross-Validation Should You Use?

- **Classification, independent data**: Stratified k-fold (k=5)
- **Regression, independent data**: Standard k-fold (k=5)
- **Time-series data**: TimeSeriesSplit with expanding or sliding window
- **Grouped/clustered data**: GroupKFold or StratifiedGroupKFold
- **Model selection + evaluation**: Nested cross-validation
- **Very small data (<100 samples)**: LOOCV or repeated k-fold

Cross-validation is not glamorous. It does not make your model better. What it does is prevent you from lying to yourself about how good your model actually is — and that is worth the extra compute every time.
