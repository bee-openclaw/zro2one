---
title: "Time Series Forecasting with Machine Learning: A Practical Guide"
depth: applied
pillar: fundamentals
topic: machine-learning
tags: [machine-learning, time-series, forecasting, applied-ml, data-science]
author: bee
date: "2026-03-19"
readTime: 11
description: "Time series forecasting has been transformed by ML approaches. This guide covers when to use ML over statistical methods, which architectures work best, and the practical pitfalls that catch most teams."
related: [machine-learning-feature-engineering, machine-learning-model-evaluation-guide, deep-learning-transformers-architecture]
---

Time series forecasting is one of those domains where the gap between "works in a notebook" and "works in production" is enormous. Statistical methods like ARIMA have decades of reliability behind them. ML methods promise better accuracy but come with complexity. Here's how to navigate the tradeoffs.

## When ML Beats Statistical Methods

Not always. That's the honest answer. For simple, univariate series with strong seasonal patterns and stable trends, ARIMA or exponential smoothing often wins. ML shines when:

- **Multiple input features** influence the forecast (price, weather, promotions, holidays)
- **Complex nonlinear patterns** exist that decomposition can't capture
- **Cross-series learning** is possible (forecasting 10,000 SKUs, where patterns transfer)
- **Long horizons** are needed relative to the data frequency
- **Irregular or missing data** is common

## The ML Forecasting Toolkit

### Gradient Boosted Trees (XGBoost, LightGBM)

Still the workhorse for tabular time series. The trick is feature engineering:

```python
def create_time_features(df, target_col, lags=[1,7,14,28]):
    features = pd.DataFrame(index=df.index)
    
    # Lag features
    for lag in lags:
        features[f'lag_{lag}'] = df[target_col].shift(lag)
    
    # Rolling statistics
    for window in [7, 14, 28]:
        features[f'rolling_mean_{window}'] = (
            df[target_col].shift(1).rolling(window).mean()
        )
        features[f'rolling_std_{window}'] = (
            df[target_col].shift(1).rolling(window).std()
        )
    
    # Calendar features
    features['day_of_week'] = df.index.dayofweek
    features['month'] = df.index.month
    features['is_weekend'] = (df.index.dayofweek >= 5).astype(int)
    
    return features
```

Key rule: **never use future information in features**. Every feature must use `.shift(1)` or greater to avoid data leakage. This is the single most common mistake in time series ML.

### Foundation Models (TimesFM, Chronos, Moirai)

The newest entrant. Pre-trained on millions of time series, these models can forecast zero-shot — no training on your specific data. They're surprisingly good for:

- Cold-start problems (new product, no history)
- Quick baselines
- Series where you have too little data for custom training

Current limitations: they struggle with strong exogenous features and very domain-specific patterns.

### Deep Learning (N-BEATS, TFT, PatchTST)

Temporal Fusion Transformers (TFT) remain the strongest deep learning option for complex forecasting with multiple features. They handle:

- Static covariates (store location, product category)
- Known future inputs (holidays, planned promotions)
- Unknown future inputs (weather forecasts, economic indicators)
- Multi-horizon outputs with quantile predictions

The downside: they need significant data (thousands of series or long history) and careful tuning.

## The Evaluation Trap

Time series evaluation requires temporal cross-validation, not random splitting:

```
Training    │ Validation │ Test
──────────────┤────────────┤─────────
[Jan-Jun]     │ [Jul-Aug]  │ [Sep-Oct]
[Jan-Aug]     │ [Sep-Oct]  │ [Nov-Dec]
```

Use expanding or sliding windows. Random k-fold will massively overestimate performance because it leaks temporal information.

**Metrics that matter:**
- **MASE** (Mean Absolute Scaled Error): Compares against naive baseline, scale-independent
- **WAPE** (Weighted Absolute Percentage Error): Business-friendly, handles zeros
- **Quantile losses**: If you need prediction intervals (you probably do)

Avoid MAPE for series that cross zero or have small values — it explodes.

## Production Pitfalls

### Concept Drift

Time series patterns change. COVID broke every demand model in existence. Build monitoring that detects when your forecast error distribution shifts significantly from validation performance.

### Retraining Cadence

How often should you retrain? The answer depends on how fast your data's patterns change. Options:

- **Fixed schedule**: Retrain weekly/monthly regardless
- **Triggered**: Retrain when error exceeds a threshold
- **Online learning**: Update incrementally with each new observation

Most teams start with fixed schedule and add triggered retraining as they mature.

### The Aggregation Question

Forecasting daily vs. weekly vs. monthly isn't just about granularity — it fundamentally changes difficulty. Daily forecasts are noisier. Monthly forecasts lose signal. The right level depends on the decision being made. If you're planning staffing, daily matters. If you're ordering inventory, weekly might suffice.

### Ensembles Win

In production, ensemble a simple statistical model with your ML model. The statistical model provides stability and interpretability; the ML model captures complex patterns. A weighted average often beats either alone.

## Getting Started

1. **Start with a naive baseline** (last value, seasonal naive)
2. **Try a statistical method** (ETS or ARIMA via `statsforecast`)
3. **Add gradient boosted trees** with time features
4. **Consider deep learning** only if you have enough data and complexity
5. **Ensemble** the best performers
6. **Monitor** in production — your model will degrade

The models that win Kaggle competitions are rarely the models that survive in production. Optimize for reliability and maintainability, not just accuracy.
