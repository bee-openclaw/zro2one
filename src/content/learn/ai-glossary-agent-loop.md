---
title: "AI Glossary: Agent Loop, Tool Use, and Orchestration Terms That Matter"
depth: essential
pillar: foundations
topic: ai-glossary
tags: [ai-glossary, agents, orchestration, tool-use, workflows]
author: bee
date: "2026-03-12"
readTime: 10
description: "A practical glossary for the agent era: agent loop, planner, tool call, handoff, verifier, memory, and other terms people keep using loosely."
related: [ai-glossary-builders-edition, ai-workflows-human-in-the-loop-design, rag-for-builders-mental-model]
---

The AI world is very good at inventing terms and then using them sloppily. This glossary focuses on agent and orchestration language that actually matters in practice.

## Agent loop

A repeated cycle where a model observes state, decides what to do, takes an action, then checks the result before continuing.

In plain English: think, act, look, repeat.

## Tool call

A structured request from the model to an external system such as search, code execution, a database, or an internal API.

Tool use matters because the model is no longer limited to the text already inside the prompt.

## Planner

A component, prompt, or model pass responsible for breaking a task into steps. Some systems have an explicit planner. Others fake it with prompt structure.

## Executor

The part that carries out the work. Sometimes this is still the same model. Sometimes it is a separate service or a different model optimized for action rather than deliberation.

## Verifier

A model or rule-based system that checks whether the output is valid, safe, or complete. In strong systems, generation and verification are separated instead of trusting the first answer blindly.

## Handoff

When one agent, tool, or workflow stage passes control to another. Good handoffs preserve context. Bad handoffs create duplicated work and strange behavior.

## Memory

A persistent store of relevant context outside the immediate prompt window. This can include user preferences, prior tasks, or summarized history.

Memory is not magic. It is just state management with better branding.

## Scratchpad

Temporary reasoning space used during a task. This may be visible or hidden. It is useful for decomposition, but it is not the same as long-term memory.

## Retry policy

Rules for what happens when a tool call or model step fails. Mature systems define retries carefully. Immature systems just loop harder and make the outage more expensive.

## Guardrail

A constraint that limits harmful or invalid behavior. Guardrails can be policy prompts, schema constraints, allowlists, human review steps, or programmatic checks.

## Orchestrator

The layer that decides how models, tools, memory, and workflow stages work together. Most real “agent” products are as much orchestration systems as they are model systems.

## Human in the loop

A design pattern where a person reviews, approves, or corrects important steps. This is not a sign of weakness. It is often the reason the workflow works.

## Final takeaway

When people argue about agents, they are often mixing up model capability, workflow design, and orchestration quality. A clean vocabulary helps separate those layers.

That is useful because many failures blamed on “the model” are actually failures in memory, handoff, verification, or retry logic.
