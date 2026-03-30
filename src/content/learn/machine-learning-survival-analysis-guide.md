---
title: "Survival Analysis with Machine Learning: Predicting When Events Happen"
depth: technical
pillar: machine-learning
topic: machine-learning
tags: [machine-learning, survival-analysis, time-to-event, censoring, statistics]
author: bee
date: "2026-03-30"
readTime: 11
description: "Survival analysis predicts not just whether something will happen, but when. This guide covers how ML approaches improve on classical methods like Cox regression, with practical applications from churn prediction to equipment maintenance."
related: [machine-learning-time-series-forecasting-guide, machine-learning-anomaly-detection-guide, machine-learning-calibration-guide]
---

Most machine learning models answer a binary question: will this happen or not? Survival analysis asks a better question: *when* will this happen? And critically, it handles a problem most ML approaches can't — censored data, where you know something hasn't happened yet but don't know when (or if) it will.

## Why Standard Classification Fails

Imagine predicting customer churn. You train a classifier on historical data: churned vs. retained. But there's a problem. A customer who signed up yesterday and hasn't churned isn't the same as a customer who's been loyal for 5 years. Your classifier treats them identically — both labeled "not churned."

Worse, customers who signed up recently haven't had *time* to churn. Including them biases your model toward predicting retention. This is the censoring problem, and it's everywhere:

- Medical trials: patients who are still alive at study end
- Equipment maintenance: machines still running when you pull the data
- Employee retention: staff who haven't left yet
- Subscription services: users still active

Survival analysis was built for exactly this.

## Core Concepts

### The Survival Function

S(t) = P(T > t) — the probability that the event hasn't occurred by time t. It starts at 1 (everyone starts alive/subscribed/employed) and decreases over time. The shape tells you everything: steep drops mean high early risk, long tails mean some subjects survive indefinitely.

### The Hazard Function

h(t) = the instantaneous rate of the event at time t, given survival to that point. Think of it as "risk right now." A bathtub curve (high early, low middle, high late) is common for equipment — infant mortality, then reliable operation, then wear-out failure.

### Censoring

The defining feature of survival data. Right-censoring (most common): you know the subject survived at least until time t, but not how much longer. The observation is "still alive at day 300" rather than "died at day 450."

## Classical Methods

### Kaplan-Meier Estimator

Non-parametric. Estimates the survival function directly from observed event times, adjusting for censored observations. Great for visualization and comparing groups (log-rank test), but can't handle continuous covariates.

### Cox Proportional Hazards

The workhorse of survival analysis for decades. Models the hazard as: h(t|X) = h₀(t) × exp(β₁X₁ + β₂X₂ + ...). The baseline hazard h₀(t) is unspecified (semi-parametric), and the model estimates how covariates multiply the hazard.

Key assumption: proportional hazards — the hazard ratio between any two subjects is constant over time. This often doesn't hold (a drug might help early but not late), limiting the model's applicability.

## ML Approaches

### Random Survival Forests

Extension of random forests to survival data. Each tree splits on covariates to maximize survival difference between groups. The ensemble estimates the survival function by averaging individual tree estimates.

Advantages:
- No proportional hazards assumption
- Handles nonlinear relationships and interactions automatically
- Variable importance measures work naturally
- Robust to irrelevant features

Implementation: `scikit-survival` provides `RandomSurvivalForest` with a familiar scikit-learn API.

```python
from sksurv.ensemble import RandomSurvivalForest

rsf = RandomSurvivalForest(
    n_estimators=500,
    min_samples_split=10,
    min_samples_leaf=5,
    random_state=42
)
rsf.fit(X_train, y_train)  # y is structured array: (event, time)

# Predict survival function for new observations
surv_funcs = rsf.predict_survival_function(X_test)
```

### Gradient Boosted Survival Models

XGBoost and LightGBM both support survival objectives. They optimize the Cox partial likelihood (or AFT models) with gradient boosting.

```python
import xgboost as xgb

dtrain = xgb.DMatrix(X_train, label=y_time)
dtrain.set_float_info("label_lower_bound", lower_bound)
dtrain.set_float_info("label_upper_bound", upper_bound)

params = {
    "objective": "survival:aft",
    "eval_metric": "aft-nloglik",
    "aft_loss_distribution": "normal",
    "learning_rate": 0.05,
    "max_depth": 6
}
model = xgb.train(params, dtrain, num_boost_round=500)
```

### Deep Learning: DeepSurv and Beyond

DeepSurv replaces the linear predictor in Cox regression with a neural network. The loss function is the negative log partial likelihood — same as Cox, but the risk score is a nonlinear function of inputs.

More recent approaches:

- **DRSA (Deep Recurrent Survival Analysis)** — handles sequential data where covariates change over time
- **DATE (Deep Accelerated Time-to-Event)** — models time directly rather than hazards
- **SurvTRACE** — transformer-based survival model that handles competing risks natively

### Discrete-Time Approaches

A pragmatic alternative: discretize time into intervals and model each interval as a classification problem. A customer either churns in month 1, month 2, ... or survives. This converts survival analysis into a sequence of binary classifications, letting you use any classifier.

The trick: at each time step, only include subjects who survived to that point. This naturally handles censoring — censored subjects drop out at their censoring time.

## Evaluation Metrics

### Concordance Index (C-index)

The most common metric. For all pairs of subjects where outcomes can be ordered, what fraction does the model rank correctly? C-index of 0.5 is random, 1.0 is perfect.

```python
from sksurv.metrics import concordance_index_censored

c_index = concordance_index_censored(
    event_indicator, event_time, risk_scores
)
```

### Time-Dependent AUC

The C-index is a global measure. Time-dependent AUC evaluates discrimination at specific time horizons: "How well does the model distinguish who will experience the event within the next 6 months?"

### Brier Score

Measures calibration — do predicted survival probabilities match observed survival rates? A model that predicts 80% 1-year survival should see roughly 80% of those subjects surviving to 1 year.

## Practical Applications

### Customer Churn

Model time-to-churn with customer features (usage patterns, support interactions, billing events). The survival function gives you P(active at month 12), enabling proactive retention targeting for high-risk customers before they leave.

### Predictive Maintenance

Time-to-failure modeling for equipment. Sensor data feeds the model, and the hazard function identifies when risk spikes. Schedule maintenance when predicted survival probability drops below threshold.

### Clinical Trials

The original application. Estimate treatment effects on time-to-event outcomes (survival, disease progression, symptom relief) while properly handling patients who drop out or whose follow-up ends.

## Key Takeaways

1. Use survival analysis when *time to event* matters, not just whether the event occurs
2. Censoring is the defining challenge — models must handle incomplete observations correctly
3. ML methods (random survival forests, gradient boosted models) relax the restrictive assumptions of classical approaches
4. The C-index is your primary evaluation metric, but check calibration with Brier scores
5. Discrete-time approaches let you repurpose standard classifiers for survival problems
