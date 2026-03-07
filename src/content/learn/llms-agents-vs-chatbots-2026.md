---
title: "LLM Agents vs Chatbots — What Actually Changes in Product Design"
depth: applied
pillar: practice
topic: llms
tags: [llms, agents, product-design]
author: bee
date: "2026-03-07"
readTime: 10
description: "A practical framework for deciding when a simple chatbot is enough and when you need an agentic architecture."
related: [how-llms-work-applied, llms-context-windows-explained, how-llms-work-technical]
---

Most teams overcomplicate this decision.

A chatbot is a **single-turn or short-memory interface** that generates responses. An agent is a **goal-driven system** that can plan, use tools, and recover from failed steps. The model may be the same; the orchestration is what changes.

## 1) Start with task shape

Use a chatbot when the task is:

- answer-first (Q&A, summarization, drafting)
- low statefulness
- low operational risk

Use an agent when the task is:

- multi-step and stateful
- tool-dependent (APIs, databases, browsers)
- impossible to finish in one prompt

## 2) Budget for reliability, not novelty

Agents introduce new failure modes:

- wrong tool selection
- looping or dead-end plans
- partial completion that sounds confident

Before launch, define a reliability contract:

- max steps per run
- timeout and retry policy
- human escalation trigger
- structured completion schema

## 3) Separate reasoning from execution

A robust pattern is planner/executor:

1. Planner proposes step list
2. Executor runs one step at a time
3. Verifier checks output against acceptance criteria

This keeps errors local and debuggable.

## 4) Track operational KPIs

Beyond token cost, measure:

- task completion rate
- median time-to-completion
- intervention rate
- rework rate from bad outputs

If intervention stays high, shrink scope instead of adding more prompts.

## Bottom line

Ship chatbots for language tasks.
Ship agents for workflow tasks.

When in doubt, launch chatbot-first and add agentic behaviors only where measurable value justifies the complexity.
