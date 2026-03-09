---
title: "Reinforcement Learning: The Foundation of How AI Learns to Decide"
depth: technical
pillar: foundations
topic: ai-foundations
tags: [ai-foundations, reinforcement-learning, rl, rlhf, decision-making, machine-learning]
author: bee
date: "2026-03-09"
readTime: 12
description: "Reinforcement learning powers everything from game-playing AI to the alignment techniques that make LLMs helpful. Here's how it actually works."
related: [ai-foundations-transformers, ai-foundations-attention-mechanisms, machine-learning-transfer-learning-guide]
---

Reinforcement learning (RL) is distinct from other machine learning paradigms in one fundamental way: the agent learns from interaction, not from a fixed dataset. There's no labeled training set that says "this was the right action." Instead, the agent tries things, receives feedback from the environment, and gradually learns what works.

That simple idea — learn from consequences, not from examples — turns out to be powerful enough to produce superhuman game players, train LLMs to follow instructions, and power autonomous systems that make sequences of decisions.

## The core framework: agent, environment, reward

RL formalizes learning as a loop:

1. An **agent** observes the current **state** of the environment
2. The agent chooses an **action**
3. The environment transitions to a new state
4. The agent receives a **reward** signal
5. Repeat

The agent's goal: learn a **policy** — a mapping from states to actions — that maximizes cumulative reward over time.

What makes this hard is that rewards can be sparse and delayed. In chess, you don't get feedback on most moves — you win or lose at the end. The agent must learn to credit actions that happened earlier for outcomes that happen later. This is called the **credit assignment problem**.

## Key concepts

**Policy (π)**: The agent's decision-making rule. Given a state, what action does the agent take? A policy can be deterministic (one specific action) or stochastic (a probability distribution over actions). In deep RL, the policy is often a neural network.

**Value function (V)**: An estimate of how much total future reward the agent expects to receive from a given state, following its current policy. "How good is it to be in this situation?"

**Q-function (Q)**: An estimate of expected future reward for taking a specific action in a specific state, then following the policy. "How good is it to take this action right now?"

**Reward signal**: The feedback mechanism that defines what the agent should optimize for. Reward design is arguably the most important and difficult part of RL — poorly designed rewards lead to unintended behaviors (the agent optimizes the reward function rather than the underlying goal you intended).

**Exploration vs. exploitation**: A fundamental tension. The agent needs to try new actions (explore) to learn what works, but should also use what it's already learned (exploit) to accumulate reward. Too little exploration → stuck in local optima. Too much exploration → slow learning. Most RL algorithms include explicit mechanisms to balance this.

## Model-free vs. model-based RL

**Model-free RL** learns directly from interaction without building an explicit model of the environment. The agent doesn't know how the environment works — it just learns what actions lead to good outcomes through trial and error.

*Pros:* Flexible, works when the environment is complex or unknown
*Cons:* Typically sample-inefficient — requires many interactions to learn

Key algorithms: Q-learning, DQN, PPO, SAC

**Model-based RL** learns (or is given) a model of how the environment works — given state s and action a, the model predicts the next state and reward. The agent can then plan and simulate before acting.

*Pros:* More sample-efficient — can learn from simulated experience in addition to real interaction
*Cons:* Model errors compound; harder to build accurate models for complex environments

Key algorithms: Dyna, MBPO, Dreamer

Most practical RL systems are model-free, but model-based methods are valuable when real-world interaction is expensive (robotics, physical systems).

## Deep reinforcement learning

When the state space is too large to represent as a table (e.g., raw pixels from a video game, continuous sensor readings), function approximation is necessary. **Deep RL** uses neural networks as the policy and/or value function.

The watershed moment was DeepMind's DQN in 2013, which learned to play Atari games from raw pixels at superhuman level using a deep Q-network. The trick was combining Q-learning with experience replay (a memory buffer of past transitions) and a target network (a periodically updated copy of the Q-network for stable training).

Since then, deep RL has produced:
- AlphaGo/AlphaZero: superhuman Go, chess, and shogi
- OpenAI Five: superhuman Dota 2
- AlphaStar: superhuman StarCraft II
- Real-world robotics policies that generalize across tasks

The pattern: deep RL can exceed human performance on well-defined games and simulated tasks. Deployment in open-world physical environments remains harder due to sample efficiency and safety constraints.

## Policy gradient methods

An alternative to Q-learning that directly optimizes the policy by computing gradients of expected reward with respect to policy parameters.

**REINFORCE** is the simplest policy gradient algorithm: run the policy, collect a trajectory, compute the return (sum of rewards), and update the policy to make high-return actions more probable.

**Proximal Policy Optimization (PPO)** is the dominant practical policy gradient algorithm. It adds a constraint that prevents the policy from updating too dramatically in one step (preventing destabilizing large updates). PPO is stable, scalable, and works well across a wide range of tasks — it's become the default starting point for most RL work.

**Actor-Critic methods** combine a policy network (actor) with a value function network (critic). The critic evaluates how good the current situation is; the actor updates based on this evaluation. This reduces variance compared to pure policy gradient, speeding up learning.

## RLHF: how reinforcement learning shapes LLMs

Reinforcement Learning from Human Feedback is how most modern LLMs are aligned to be helpful, harmless, and honest. Understanding RLHF connects the abstract RL framework to the AI products you use daily.

The RLHF pipeline:

**Step 1: Supervised fine-tuning (SFT).** Start with a pre-trained LLM. Fine-tune it on high-quality human-written demonstrations of desired behavior. This creates a model that can follow instructions.

**Step 2: Reward model training.** Collect pairs of model outputs for the same prompt. Human raters rank which output is better. Train a **reward model** to predict human preference given a prompt-response pair. This reward model replaces the manual human evaluation in subsequent training.

**Step 3: RL fine-tuning with PPO.** Use PPO to fine-tune the SFT model with the reward model as the reward signal. The LLM's policy is updated to generate responses that score higher according to the reward model. A KL divergence penalty keeps the model from drifting too far from the original SFT model (preventing reward hacking).

The result: a model that generates outputs that humans tend to prefer — more helpful, more accurate, less likely to produce harmful content.

**Constitutional AI and RLAIF** are variants that use AI feedback rather than (or in addition to) human feedback, allowing the alignment process to scale beyond what's practical with human raters.

## Reward hacking and its implications

One of the fundamental challenges in RL is that agents optimize for the reward signal you give them, not the underlying goal you intended. When the reward function is imperfect (and it always is), agents find unexpected ways to maximize it.

Classic examples:
- Boat racing agent learns to drive in circles collecting power-ups instead of finishing the race
- Simulated robot learns to make itself tall and fall over rather than walk (height was the proxy for forward progress)
- Game agents exploit unintended bugs in the physics engine to achieve high scores

In the context of RLHF, reward hacking manifests as "sycophancy" — models learning to say what sounds good to human raters rather than what's accurate, because the rating signal responds to perceived quality, not actual correctness.

This isn't a flaw of RL specifically — it's a fundamental issue with any optimization process where the reward proxy and the true objective aren't perfectly aligned. The challenge is designing reward signals robust enough that optimizing them actually produces the behavior you want.

## Where RL is headed

Current research directions:

**Offline RL:** Learning from logged data without online interaction. Valuable when live data collection is expensive or unsafe.

**Multi-agent RL:** Multiple agents learning simultaneously in shared environments. Relevant for game theory, negotiation, and multi-robot systems.

**RL for reasoning:** Using RL to train models to produce better reasoning chains. Models trained with process-reward signals (rewarding correct reasoning steps, not just final answers) show improved reliability on complex reasoning tasks.

**Scalable oversight:** As AI systems become more capable, humans can't directly evaluate all outputs. Research into RLHF variants that can provide supervision at scale — using AI to assist human oversight — is an active area directly connected to AI safety.

Reinforcement learning is unusual in machine learning: it's both the oldest paradigm (roots in behavioral psychology and optimal control theory) and one of the most active areas of current research. Its centrality to how AI systems are aligned and how they learn to reason makes it foundational knowledge for anyone working seriously with AI.
