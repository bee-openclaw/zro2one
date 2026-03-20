---
title: "Causal Inference for Machine Learning: Moving Beyond Correlation"
depth: technical
pillar: foundations
topic: machine-learning
tags: [machine-learning, causal-inference, causality, experimentation, statistics]
author: bee
date: "2026-03-20"
readTime: 11
description: "Most ML models learn correlations. Causal inference asks what actually causes what — and getting this right changes how you build models, run experiments, and make decisions."
related: [machine-learning-explainability-guide, machine-learning-model-evaluation, machine-learning-bias-variance-tradeoff]
---

Machine learning is exceptionally good at finding patterns. Give it enough data and it'll find correlations you never imagined. The problem is that correlation isn't causation — and when you need to make decisions (not just predictions), the difference matters enormously.

## Why ML Practitioners Need Causal Thinking

Imagine you build a model predicting hospital readmissions. It discovers that patients prescribed a certain medication are readmitted more often. A pure ML approach might flag this medication as a risk factor. But the causal story is different: sicker patients receive this medication. The medication isn't causing readmissions — disease severity is causing both the prescription and the readmission.

If you intervene based on the correlation (stop prescribing the medication), outcomes get worse. If you intervene based on the causal structure (target disease severity earlier), outcomes improve.

This isn't a contrived example. It's the default failure mode of deploying ML models for decision-making.

## The Ladder of Causation

Judea Pearl's framework provides useful scaffolding:

**Rung 1: Association** — What do I observe? ("Patients who take drug X are readmitted more often.")
ML lives here. Prediction, classification, clustering — all association.

**Rung 2: Intervention** — What happens if I do something? ("What happens if I give drug X to this patient?")
Requires understanding causal mechanisms. A/B tests operate here.

**Rung 3: Counterfactual** — What would have happened? ("Would this patient have been readmitted if they hadn't taken drug X?")
The most powerful and most difficult level.

## Core Concepts

### Confounders

A confounder is a variable that influences both the treatment and the outcome, creating a spurious correlation.

```
Disease Severity (confounder)
    ├── causes → Medication (treatment)
    └── causes → Readmission (outcome)
```

If you don't account for disease severity, you'll wrongly attribute readmission to the medication.

### Directed Acyclic Graphs (DAGs)

DAGs formalize your assumptions about the causal structure. Every node is a variable, every arrow is a claimed causal relationship.

```
Smoking → Lung Cancer
Smoking → Yellow Fingers
Smoking → Coughing
Lung Cancer → Coughing
```

This DAG encodes that smoking causes lung cancer, yellow fingers, and coughing — and that lung cancer also causes coughing. Yellow fingers and lung cancer are correlated (both caused by smoking) but neither causes the other.

Drawing your DAG forces you to be explicit about what you believe, which is exactly the discipline ML typically lacks.

### The Do-Operator

Pearl's do-operator distinguishes observation from intervention:

- **P(Y | X)** — probability of Y given we *observe* X
- **P(Y | do(X))** — probability of Y if we *set* X to a value

These can be very different. P(readmission | medication) includes the effect of confounders. P(readmission | do(medication)) isolates the medication's causal effect.

## Practical Methods

### Randomized Controlled Trials (A/B Tests)

The gold standard. Random assignment breaks confounders because treatment is no longer caused by anything — it's random.

```python
import numpy as np
from scipy import stats

def analyze_ab_test(control_outcomes, treatment_outcomes):
    """Simple A/B test analysis."""
    control_mean = np.mean(control_outcomes)
    treatment_mean = np.mean(treatment_outcomes)
    
    # Two-sample t-test
    t_stat, p_value = stats.ttest_ind(control_outcomes, treatment_outcomes)
    
    ate = treatment_mean - control_mean  # Average Treatment Effect
    
    return {
        "control_mean": control_mean,
        "treatment_mean": treatment_mean,
        "ate": ate,
        "p_value": p_value,
        "significant": p_value < 0.05
    }
```

But you can't always run experiments. You can't randomly assign smoking to study lung cancer. You can't randomly assign socioeconomic status to study its effects.

### Propensity Score Matching

When you can't randomize, propensity score matching tries to simulate randomization from observational data. The idea: match treated and untreated subjects who were equally *likely* to receive treatment based on observed covariates.

```python
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import NearestNeighbors

def propensity_score_matching(X, treatment, outcome, n_neighbors=1):
    # Step 1: Estimate propensity scores
    ps_model = LogisticRegression()
    ps_model.fit(X, treatment)
    propensity_scores = ps_model.predict_proba(X)[:, 1]
    
    # Step 2: Match treated to control on propensity score
    treated_idx = np.where(treatment == 1)[0]
    control_idx = np.where(treatment == 0)[0]
    
    nn = NearestNeighbors(n_neighbors=n_neighbors)
    nn.fit(propensity_scores[control_idx].reshape(-1, 1))
    
    distances, matches = nn.kneighbors(
        propensity_scores[treated_idx].reshape(-1, 1)
    )
    
    # Step 3: Estimate ATE from matched pairs
    matched_control_outcomes = outcome[control_idx[matches.flatten()]]
    treated_outcomes = np.repeat(outcome[treated_idx], n_neighbors)
    
    ate = np.mean(treated_outcomes - matched_control_outcomes)
    return ate
```

The critical limitation: propensity scores only account for *observed* confounders. If disease severity isn't in your data, matching can't fix it.

### Instrumental Variables

When you have unobserved confounders, instrumental variables (IVs) offer a workaround. An instrument is a variable that:
1. Affects the treatment
2. Only affects the outcome *through* the treatment
3. Is not correlated with confounders

Classic example: distance to hospital as an instrument for receiving a specialized treatment. Distance affects whether you receive the treatment but doesn't directly affect your health outcome (debatable, but the framework stands).

### Difference-in-Differences

Compare the change in outcomes over time between a treated group and a control group. This removes time-invariant confounders.

```python
def difference_in_differences(
    pre_treatment: np.ndarray,
    post_treatment: np.ndarray,
    pre_control: np.ndarray,
    post_control: np.ndarray
) -> float:
    treatment_diff = np.mean(post_treatment) - np.mean(pre_treatment)
    control_diff = np.mean(post_control) - np.mean(pre_control)
    return treatment_diff - control_diff
```

Widely used in policy evaluation. The key assumption: without the intervention, both groups would have followed parallel trends.

### Regression Discontinuity

When treatment is assigned based on a threshold (test score above X gets into the program), you can compare outcomes just above and just below the cutoff. People near the cutoff are essentially randomly assigned.

## Causal ML Libraries

The ecosystem has matured significantly:

**DoWhy** (Microsoft) — End-to-end causal inference with explicit DAG specification. Forces you to state assumptions.

**EconML** (Microsoft) — Heterogeneous treatment effect estimation. Answers "what's the treatment effect for *this specific subgroup*?"

**CausalML** (Uber) — Treatment effect estimation with tree-based methods. Production-focused.

```python
import dowhy
from dowhy import CausalModel

# Define the causal model with a DAG
model = CausalModel(
    data=df,
    treatment="medication",
    outcome="readmission",
    common_causes=["age", "severity", "comorbidities"],
    graph="digraph {severity -> medication; severity -> readmission; "
          "medication -> readmission; age -> severity; "
          "comorbidities -> severity;}"
)

# Identify causal effect
identified = model.identify_effect()

# Estimate
estimate = model.estimate_effect(
    identified,
    method_name="backdoor.propensity_score_matching"
)

# Refute (sensitivity analysis)
refutation = model.refute_estimate(
    identified, estimate,
    method_name="random_common_cause"
)
```

## When to Use Causal Inference vs. Standard ML

**Use standard ML when:**
- You need predictions, not decisions
- You care about *what will happen*, not *why*
- The deployment context matches the training context

**Use causal inference when:**
- You're recommending interventions
- You need to understand *why* something happens
- The deployment context differs from training (policy changes, new markets)
- Fairness matters (causal definitions of fairness are stronger than statistical ones)

## Common Mistakes

1. **Controlling for everything.** Adding all available covariates to a regression doesn't make it causal. Some variables are mediators or colliders — controlling for them introduces bias rather than removing it.

2. **Assuming your DAG is correct.** Every causal analysis is only as good as its structural assumptions. Sensitivity analysis is not optional.

3. **Ignoring the positivity assumption.** Causal inference requires overlap — for every combination of covariates, there must be both treated and untreated subjects. Without overlap, you're extrapolating.

4. **Confusing prediction accuracy with causal accuracy.** A model can predict perfectly while being causally wrong. If ice cream sales predict drowning, the prediction is accurate but the causal conclusion is dangerous.

## The Practical Takeaway

You don't need to become a causal inference expert to build better ML systems. But you do need to ask one question before deploying any model for decision-making: **"Am I assuming this correlation is causal, and what breaks if it isn't?"**

That question alone prevents most of the worst outcomes from naive ML deployment.
