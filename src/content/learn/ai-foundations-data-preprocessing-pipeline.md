---
title: "Data Preprocessing for AI: The Pipeline That Makes or Breaks Your Model"
depth: technical
pillar: foundations
topic: ai-foundations
tags: [ai-foundations, data-preprocessing, feature-engineering, data-quality, pipelines]
author: bee
date: "2026-03-19"
readTime: 10
description: "Bad data in, bad predictions out. This guide covers the essential preprocessing steps for AI systems — from cleaning and normalization to encoding and splitting — with practical code and common mistakes."
related: [machine-learning-feature-engineering, ai-foundations-tokenization-explained, machine-learning-model-evaluation-guide]
---

Every experienced ML engineer has the same story: they spent weeks tuning a model, then got a bigger improvement by fixing the data pipeline. Data preprocessing isn't glamorous, but it's where most real-world model performance comes from.

## Why Preprocessing Matters

Raw data is messy. Sensors drift. Users enter "N/A" and "none" and "" for missing values. Dates come in twelve formats. Categories have typos. Numerical features span ranges from 0.001 to 1,000,000. Feed this directly into a model and you'll get garbage.

Preprocessing transforms raw data into a format that models can learn from effectively. It's not optional — it's the foundation.

## The Core Pipeline

### 1. Missing Value Handling

The first question isn't "how do I fill missing values?" — it's "why are they missing?"

- **Missing Completely at Random (MCAR)**: The missingness has no pattern. Safe to impute or drop.
- **Missing at Random (MAR)**: Missingness depends on observed variables. Imputation works but needs care.
- **Missing Not at Random (MNAR)**: The missingness itself is informative (e.g., high-income people skip income questions). You might need a "missing" indicator feature.

```python
import pandas as pd
import numpy as np

# Strategy 1: Simple imputation
df['age'].fillna(df['age'].median(), inplace=True)
df['category'].fillna('unknown', inplace=True)

# Strategy 2: Add missingness indicator + impute
df['income_missing'] = df['income'].isna().astype(int)
df['income'].fillna(df['income'].median(), inplace=True)

# Strategy 3: Model-based imputation (KNN)
from sklearn.impute import KNNImputer
imputer = KNNImputer(n_neighbors=5)
df[numerical_cols] = imputer.fit_transform(df[numerical_cols])
```

**Rule of thumb**: If a column is >50% missing, consider dropping it. If a row is mostly missing, drop it. Otherwise, impute with a strategy appropriate to the missingness type.

### 2. Outlier Detection and Treatment

Outliers can dominate model training, especially for algorithms sensitive to scale (linear regression, SVMs, k-means).

```python
# IQR method
Q1 = df['value'].quantile(0.25)
Q3 = df['value'].quantile(0.75)
IQR = Q3 - Q1
lower = Q1 - 1.5 * IQR
upper = Q3 + 1.5 * IQR

# Option A: Remove
df_clean = df[(df['value'] >= lower) & (df['value'] <= upper)]

# Option B: Cap (winsorize)
df['value'] = df['value'].clip(lower, upper)

# Option C: Log transform (for right-skewed data)
df['value_log'] = np.log1p(df['value'])
```

**Critical**: Don't blindly remove outliers. A $10M transaction might be fraud (remove it) or a whale customer (keep it). Domain context matters.

### 3. Feature Scaling

Different features on different scales confuse distance-based and gradient-based algorithms.

```python
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler

# StandardScaler: mean=0, std=1 (good default)
scaler = StandardScaler()

# MinMaxScaler: [0, 1] range (good for neural nets, images)
scaler = MinMaxScaler()

# RobustScaler: uses median/IQR (robust to outliers)
scaler = RobustScaler()

# IMPORTANT: fit on training data only, transform both
scaler.fit(X_train)
X_train_scaled = scaler.transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

Tree-based models (XGBoost, Random Forest) are scale-invariant — they don't need scaling. Everything else probably does.

### 4. Categorical Encoding

Models need numbers. Categories need encoding.

```python
# One-hot encoding (few categories, no ordinal relationship)
pd.get_dummies(df, columns=['color', 'size'], drop_first=True)

# Label encoding (ordinal categories: low < medium < high)
from sklearn.preprocessing import OrdinalEncoder
encoder = OrdinalEncoder(categories=[['low', 'medium', 'high']])
df['priority_encoded'] = encoder.fit_transform(df[['priority']])

# Target encoding (high-cardinality: zip codes, product IDs)
from sklearn.preprocessing import TargetEncoder
encoder = TargetEncoder(smooth='auto')
df['zipcode_encoded'] = encoder.fit_transform(df[['zipcode']], df['target'])
```

**High cardinality** (1000+ categories) is the hardest case. One-hot encoding creates too many features. Target encoding is effective but risks leakage — always use cross-validation or smoothing.

### 5. Text Preprocessing (for NLP)

```python
import re

def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'http\S+', '', text)          # Remove URLs
    text = re.sub(r'[^a-zA-Z\s]', '', text)      # Remove punctuation
    text = re.sub(r'\s+', ' ', text).strip()      # Normalize whitespace
    return text
```

For modern transformer models, minimal preprocessing is usually best — they handle raw text well. Heavy preprocessing (stemming, stop word removal) can actually hurt performance with transformers.

### 6. Train/Test Split

This seems simple but has critical pitfalls:

```python
from sklearn.model_selection import train_test_split

# Standard random split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# For time series: NEVER random split
# Use temporal ordering instead
split_date = '2025-06-01'
train = df[df['date'] < split_date]
test = df[df['date'] >= split_date]

# For grouped data: keep groups together
from sklearn.model_selection import GroupShuffleSplit
gss = GroupShuffleSplit(n_splits=1, test_size=0.2)
```

**The golden rule**: Your test set must represent future, unseen data. Any information leakage from test to train invalidates your evaluation.

## Common Mistakes

1. **Fitting scalers/encoders on the full dataset** before splitting — this leaks test information into training
2. **Imputing with global statistics** instead of training set statistics
3. **Removing outliers from the test set** — your model needs to handle them in production
4. **Over-engineering features** before establishing a baseline
5. **Inconsistent preprocessing** between training and serving — use sklearn Pipelines or similar

## Putting It Together

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

preprocessor = ColumnTransformer([
    ('num', Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ]), numerical_features),
    ('cat', Pipeline([
        ('imputer', SimpleImputer(strategy='constant', fill_value='unknown')),
        ('encoder', OneHotEncoder(handle_unknown='ignore'))
    ]), categorical_features)
])

model_pipeline = Pipeline([
    ('preprocess', preprocessor),
    ('model', XGBClassifier())
])

# Now preprocessing is part of the model — no leakage possible
model_pipeline.fit(X_train, y_train)
```

Pipelines ensure preprocessing is consistent between training and inference. They're not optional for production systems.
