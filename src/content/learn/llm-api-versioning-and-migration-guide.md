---
title: "LLM API Versioning and Migration: Surviving Model Updates Without Breaking Production"
depth: technical
pillar: building
topic: llm-api-integration
tags: [llm-api-integration, versioning, migration, production, reliability]
author: bee
date: "2026-03-20"
readTime: 9
description: "Models get deprecated, APIs change, and behavior shifts between versions. Here's how to build LLM integrations that survive model updates without emergency deployments."
related: [llm-api-fallback-and-failover, llm-api-observability-and-tracing-guide, llm-api-prompt-caching-guide]
---

It's 2am and your pager fires. Customer complaints are spiking. Nothing in your code changed. What happened? The model provider updated the default model version, and your carefully tuned prompts now produce different outputs.

This scenario has happened to every team that's been in production long enough. Model versioning and migration strategy isn't glamorous, but it's the difference between a smooth upgrade and a production incident.

## The Versioning Problem

LLM providers update models constantly. These updates can change:

- **Output quality** — usually better on benchmarks, but different enough to break expectations
- **Output format** — subtle changes in how the model structures responses
- **Behavior on edge cases** — the cases your prompts were specifically tuned for
- **Token usage** — efficiency changes that affect cost and latency
- **API parameters** — new features, deprecated options, changed defaults

OpenAI, Anthropic, and Google all handle versioning differently:

**OpenAI:** Named snapshots (gpt-4-0613, gpt-4-turbo-2024-04-09) with a rolling "latest" alias. Snapshots are deprecated with advance notice.

**Anthropic:** Dated versions (claude-3-5-sonnet-20241022) that are stable. No rolling alias by default.

**Google:** Version suffixes (gemini-1.5-pro-002) with "latest" aliases.

## The Golden Rule

**Never use a "latest" or unpinned model alias in production.** Always pin to a specific version.

```python
# Bad: "latest" can change without warning
client.chat.completions.create(model="gpt-4o")

# Good: pinned to a specific snapshot
client.chat.completions.create(model="gpt-4o-2024-11-20")
```

This seems obvious, but a surprising number of production systems use unpinned aliases because that's what the tutorial showed.

## Building a Migration Pipeline

### Step 1: Version Configuration

Make the model version a configuration value, not a hardcoded string.

```python
from pydantic import BaseModel

class LLMConfig(BaseModel):
    model: str = "gpt-4o-2024-11-20"
    fallback_model: str = "gpt-4o-2024-08-06"
    temperature: float = 0.0
    max_tokens: int = 4096

# Load from environment or config file
config = LLMConfig.model_validate(load_config("llm"))
```

### Step 2: Prompt Versioning

Your prompts are coupled to specific model versions. When the model changes, prompts may need updating. Track this explicitly.

```python
PROMPT_REGISTRY = {
    "extract_entities": {
        "gpt-4o-2024-08-06": {
            "system": "Extract named entities...",
            "version": "v2",
        },
        "gpt-4o-2024-11-20": {
            "system": "Extract named entities...",  # Updated for new model
            "version": "v3",
        },
    }
}

def get_prompt(task: str, model: str) -> dict:
    prompts = PROMPT_REGISTRY[task]
    if model in prompts:
        return prompts[model]
    # Fall back to the latest available prompt version
    return list(prompts.values())[-1]
```

### Step 3: Evaluation Suite

Before deploying a new model version, run your evaluation suite. This is the most important piece.

```python
import json
from dataclasses import dataclass

@dataclass
class EvalCase:
    input: str
    expected_output: str
    criteria: dict  # What makes the output "correct"

async def run_migration_eval(
    eval_cases: list[EvalCase],
    current_model: str,
    candidate_model: str
) -> dict:
    results = {"pass": 0, "fail": 0, "regressions": []}
    
    for case in eval_cases:
        current_output = await generate(case.input, model=current_model)
        candidate_output = await generate(case.input, model=candidate_model)
        
        current_score = evaluate(current_output, case.criteria)
        candidate_score = evaluate(candidate_output, case.criteria)
        
        if candidate_score >= current_score:
            results["pass"] += 1
        else:
            results["fail"] += 1
            results["regressions"].append({
                "input": case.input,
                "current": current_output,
                "candidate": candidate_output,
                "score_delta": candidate_score - current_score
            })
    
    results["pass_rate"] = results["pass"] / len(eval_cases)
    return results
```

**Minimum evaluation coverage:**
- Happy path cases (common inputs)
- Edge cases (unusual formats, languages, empty inputs)
- Output format compliance (does it still return valid JSON?)
- Regression cases (specific issues you've fixed with prompt engineering)

### Step 4: Gradual Rollout

Don't switch 100% of traffic to a new model version at once.

```python
import random

def select_model(config: LLMConfig, rollout_percent: float = 0) -> str:
    if rollout_percent > 0 and random.random() < rollout_percent:
        return config.candidate_model
    return config.model
```

Start at 1-5%, monitor metrics, increase gradually. The metrics you care about:
- Error rate
- Latency (new models can be faster or slower)
- Output quality (if you have automated evaluation)
- Cost per request
- User-facing metrics (completion rate, satisfaction scores)

### Step 5: Deprecation Monitoring

Track model deprecation dates and set alerts.

```python
MODEL_DEPRECATION = {
    "gpt-4o-2024-08-06": "2025-06-01",
    "gpt-4o-2024-11-20": "2025-12-01",
    "claude-3-5-sonnet-20241022": "2026-06-01",
}

def check_deprecation_warnings():
    today = date.today()
    for model, deprecation_date in MODEL_DEPRECATION.items():
        dep_date = date.fromisoformat(deprecation_date)
        days_remaining = (dep_date - today).days
        
        if days_remaining < 30:
            alert(f"URGENT: {model} deprecated in {days_remaining} days")
        elif days_remaining < 90:
            warn(f"{model} deprecated in {days_remaining} days — plan migration")
```

## Multi-Provider Strategy

The safest approach to versioning is not depending on a single provider.

```python
class ModelRouter:
    def __init__(self):
        self.primary = "anthropic/claude-3-5-sonnet-20241022"
        self.secondary = "openai/gpt-4o-2024-11-20"
        self.tertiary = "google/gemini-1.5-pro-002"
    
    async def generate(self, messages, **kwargs):
        for model in [self.primary, self.secondary, self.tertiary]:
            try:
                return await call_model(model, messages, **kwargs)
            except (RateLimitError, ServiceUnavailableError):
                continue
        raise AllProvidersFailedError()
```

This protects against both version deprecation and provider outages. The cost is maintaining prompt compatibility across providers, which is real but manageable for most use cases.

## Common Migration Failures

1. **"It scored the same on benchmarks."** General benchmarks don't test your specific use case. A model can improve on benchmarks while regressing on your exact prompt patterns.

2. **Skipping the evaluation.** "It's a newer model, it must be better." It usually is. But "usually" isn't good enough for production.

3. **Migrating prompts and model simultaneously.** Change one thing at a time. Migrate to the new model with existing prompts first. Then optimize prompts for the new model.

4. **Not testing output parsing.** If your code parses model output (JSON extraction, regex matching), even minor format changes break things. New models often have subtly different formatting preferences.

5. **Forgetting about cost.** Newer models are often cheaper per token but may use more tokens. Or vice versa. Model your cost impact before switching.

## The Migration Checklist

- [ ] Pin to specific model version (never use "latest" in production)
- [ ] Build evaluation suite covering your specific use cases
- [ ] Run evaluation against candidate model
- [ ] Review regressions and update prompts if needed
- [ ] Deploy with gradual rollout (1% → 10% → 50% → 100%)
- [ ] Monitor production metrics for 48+ hours at each stage
- [ ] Update prompt registry and documentation
- [ ] Set deprecation alerts for new version
- [ ] Keep previous version config for instant rollback

Model updates are inevitable. The question is whether they happen to you or you manage them. A migration pipeline turns a potential crisis into routine maintenance.
