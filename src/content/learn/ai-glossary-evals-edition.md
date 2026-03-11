---
title: "AI Glossary: Evals Edition"
depth: applied
pillar: building
topic: ai-glossary
tags: [ai-glossary, evals, testing, reliability, llmops]
author: bee
date: "2026-03-11"
readTime: 8
description: "The practical vocabulary behind LLM evaluation, red-teaming, and AI reliability. If your team is building with models, these are the terms worth understanding."
related: [ai-glossary-builders-edition, rag-evaluation-guide, llm-api-integration-reliability-checklist]
---

As soon as teams move from AI demos to production systems, the vocabulary changes. Suddenly everyone is talking about evals, judges, regression suites, hallucination rates, and red teams.

Here is the plain-English version of the terms that matter most.

## Core terms

**Eval**  
A repeatable test used to measure how an AI system performs on a defined task. Good evals are specific, versioned, and tied to real failure modes.

**Benchmark**  
A standardized evaluation set, often shared across teams or the wider industry. Benchmarks are useful for comparison, but they rarely capture the messiness of your exact product.

**Golden set**  
A curated set of examples with trusted expected outputs. This is the foundation of many practical eval pipelines.

**Regression test**  
A test that catches when a model, prompt, retrieval setup, or tool chain gets worse after a change.

## Reliability terms

**Hallucination**  
An output that sounds plausible but is unsupported, invented, or wrong. In production, teams should define this more narrowly by task. A fabricated citation and a slight wording error are not the same class of failure.

**Grounded answer**  
A response that is traceable to provided context, retrieved documents, or structured data rather than free-form generation.

**Deterministic output**  
A stable result for the same input, usually encouraged by lower temperature, stronger formatting constraints, or programmatic post-processing.

**Schema adherence**  
Whether the model returned the format you asked for, such as valid JSON with the required keys.

## Human and model judging

**Human eval**  
A review process where people score outputs for quality, correctness, tone, usefulness, or safety. This is expensive but still the gold standard for many subjective tasks.

**LLM-as-judge**  
Using one model to evaluate the output of another. Useful for scale and triage, but risky if you treat it as ground truth.

**Pairwise comparison**  
Showing two outputs and asking which is better. Humans usually do this more consistently than assigning absolute scores.

**Rubric**  
A scoring guide that defines what good looks like. Without a rubric, evaluators drift and your scores become hard to trust.

## Safety and adversarial terms

**Red-teaming**  
Actively probing the system for dangerous, misleading, or policy-breaking behavior.

**Prompt injection**  
An attack where malicious instructions are inserted into retrieved content, tool output, or user input so the model follows the wrong rules.

**Jailbreak**  
An attempt to bypass model safety behavior with cleverly phrased prompts or multi-step interactions.

**Data exfiltration**  
A failure mode where the model leaks information it should not reveal.

## Operational terms

**Offline eval**  
Testing before deployment against saved examples.

**Online eval**  
Testing using live traffic, production traces, or real user interactions.

**Canary release**  
Sending a small slice of traffic to a new model or prompt configuration before wider rollout.

**Trace**  
A structured record of what happened during one AI interaction, including prompts, retrieval results, tool calls, outputs, and sometimes user feedback.

## The most important distinction

Not every metric is an eval, and not every eval is a decision tool.

If your team cannot answer these questions, the eval program is still immature:

- What failure is this eval supposed to detect?
- What change would cause us to block a release?
- Who reviews borderline cases?
- How often do we refresh the examples?

## Bottom line

The purpose of evaluation vocabulary is not to sound sophisticated. It is to make AI quality discussable in concrete terms.

Once your team shares precise language for failure modes, tests, and thresholds, reliability work gets much easier. Before that, most debates about AI quality are just people using the same words to mean different things.
