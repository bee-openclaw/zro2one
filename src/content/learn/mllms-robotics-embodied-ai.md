---
title: "MLLMs for Robotics and Embodied AI"
depth: research
pillar: frontiers
topic: mllms
tags: [mllms, robotics, embodied-ai, vision-language, manipulation]
author: "bee"
date: "2026-03-14"
readTime: 12
description: "How multimodal large language models are reshaping robotics—from vision-language-action models and embodied reasoning to real-world manipulation, navigation, and the challenges of bridging digital intelligence with physical action."
related: [mllms-grounding-and-visual-reasoning, mllms-grounded-ui-agents, multimodal-ai-sensor-fusion-for-products]
---

## The Convergence of Language and Robotics

For decades, robotics and language AI developed along separate tracks. Robots operated in physical space with engineered control systems. Language models operated in text space with statistical patterns. The convergence of these fields—using multimodal large language models (MLLMs) as the "brain" of robotic systems—is one of the most consequential research directions in AI.

The promise is compelling: a robot that can understand natural language instructions, perceive its environment through vision, reason about tasks, and execute physical actions—all through a unified model. The reality is more complex, but progress since 2023 has been remarkable.

## Vision-Language-Action Models

### The Architecture

Vision-Language-Action (VLA) models extend MLLMs to output motor commands alongside text:

1. **Vision encoder** processes camera images (or point clouds) into visual tokens
2. **Language model backbone** reasons over visual tokens, language instructions, and task context
3. **Action decoder** maps the model's output to robot motor commands (joint angles, end-effector positions, gripper states)

The key insight: language provides a natural interface for specifying goals, vision provides environmental awareness, and the language model backbone provides the reasoning to connect goals to actions.

### RT-2 and RT-X: The Foundation

Google DeepMind's **RT-2** (Robotic Transformer 2) demonstrated that a vision-language model could directly output robot actions as text tokens. Rather than predicting words, the model predicts discretized action tokens that translate to motor commands.

**RT-X** extended this to multi-robot, multi-task learning across different robot embodiments. A single model trained on data from multiple robot platforms learns transferable manipulation skills.

Key findings:
- Web-scale vision-language pre-training transfers to robotics tasks
- Models exhibit emergent capabilities: following instructions they've never been trained on (e.g., "move the banana to the red bowl" when the model has only separately learned about moving objects and color identification)
- Scaling the language model backbone (from 5B to 55B parameters) improves robotic task performance, even though the additional parameters weren't trained on robot data

### Octo and OpenVLA

The open-source community has produced competitive alternatives:

- **Octo**: A generalist robot policy that supports multiple robot embodiments, action spaces, and observation types. Designed for fine-tuning on specific robot setups.
- **OpenVLA**: An open-source VLA based on Llama, trained on the Open X-Embodiment dataset. Achieves performance competitive with proprietary models on standard manipulation benchmarks.

These models demonstrate that the VLA paradigm isn't limited to well-funded labs—it's accessible to university research groups and smaller companies.

## Embodied Reasoning

### Task Planning with LLMs

Before VLA models, a common approach was using LLMs as high-level planners:

1. Human provides a goal: "Make me a cup of coffee"
2. LLM decomposes into subtasks: "1. Find the coffee maker. 2. Open the lid. 3. Insert a pod. 4. Place a cup. 5. Press the brew button."
3. A separate low-level controller executes each subtask

Systems like **SayCan** (Google) and **Code as Policies** (also Google) demonstrated that LLMs have surprisingly good common-sense knowledge about physical tasks, even without embodied experience.

### The Grounding Problem

The fundamental challenge: LLMs know that "cups go on tables" but don't know where *this specific* cup and *this specific* table are. Grounding connects abstract language knowledge to concrete physical reality.

Solutions:
- **Affordance functions**: Score each proposed action based on whether the robot can actually execute it in the current environment
- **Visual grounding**: Point to objects in the camera feed that match language references
- **Spatial reasoning**: Maintain a 3D representation of the environment that the LLM can query
- **Active perception**: The robot can look around, ask clarifying questions, or request different viewpoints before acting

### Inner Monologue and Self-Correction

Advanced embodied AI systems use the LLM's reasoning capabilities for self-correction:

1. Execute an action
2. Observe the result through vision
3. Compare the observed result to the expected result
4. If they don't match, reason about what went wrong and try a different approach

This "inner monologue" pattern makes robot behavior more robust to errors and unexpected situations—a critical capability for real-world deployment.

## Manipulation: The Hard Problem

### Why Manipulation Is Difficult

Picking up a coffee mug seems trivial to humans but remains challenging for robots:

- **Contact dynamics**: Grasping involves complex physics (friction, deformation, force distribution) that's hard to model
- **Object diversity**: Every object has different shape, weight, material, and fragility
- **Dexterous manipulation**: Tasks like unscrewing a bottle cap or threading a needle require fine motor control
- **Partial observability**: The robot can't see the back of an object it's looking at, or feel how heavy something is before picking it up

### How MLLMs Help

MLLMs bring knowledge that purely robotic approaches lack:

- **Object understanding**: The model knows that eggs are fragile, that books can be stacked, that bottles should be grasped by the body not the cap
- **Task semantics**: Understanding that "set the table" involves specific spatial arrangements of plates, utensils, and glasses
- **Error recovery**: If a grasp fails, the model can reason about why (wrong angle, insufficient force, occlusion) and plan a different approach
- **Generalization**: Knowledge about one type of manipulation transfers to novel objects and scenarios

### Current Capabilities

State of the art in 2026:
- **Pick-and-place**: 90%+ success rate for common household objects
- **Tool use**: Using tools (spatula, tongs, sponge) with moderate reliability
- **Bimanual manipulation**: Two-armed tasks (holding and pouring) at 60-70% success
- **Deformable objects**: Folding cloth, handling food items—improving but still error-prone
- **Fine manipulation**: Inserting keys, plugging in cables—remains challenging

## Navigation and Exploration

### Vision-Language Navigation

MLLMs enable robots to navigate based on natural language instructions in previously unseen environments:

- "Go to the kitchen and find the red coffee maker on the counter"
- "Take the package to the second door on the left, past the staircase"

The model combines visual understanding (recognizing kitchens, counters, staircases) with spatial reasoning (second door on the left) and goal-directed navigation.

### Semantic Mapping

Rather than building purely geometric maps (occupancy grids), MLLM-powered robots build semantic maps that label regions and objects with natural language descriptions. This enables queries like "Where did I last see the remote control?" or "Is there a bathroom on this floor?"

### Exploration Strategies

When placed in an unknown environment, the robot must explore efficiently. MLLMs contribute:

- **Common-sense priors**: Kitchens are usually near dining rooms. Bathrooms have toilets and sinks.
- **Goal-directed exploration**: If looking for medicine, check the bathroom cabinet first.
- **Social awareness**: Don't enter closed doors without permission. Stay out of private spaces.

## Simulation and Real-World Transfer

### The Sim-to-Real Gap

Training robots in simulation is faster, safer, and cheaper than real-world training. But simulated physics don't perfectly match reality. This "sim-to-real gap" has been a major barrier.

MLLMs help bridge this gap because their knowledge comes from internet-scale data about the real world, not from simulation. A VLA model pre-trained on real-world video has better priors about object physics than one trained purely in simulation.

### Simulation Platforms

- **NVIDIA Isaac**: Photorealistic simulation with GPU-accelerated physics
- **MuJoCo**: Fast, accurate physics simulation for manipulation research
- **Habitat**: Embodied AI simulation from Meta for navigation tasks
- **RoboSuite**: Modular simulation framework with standardized tasks

### Data Collection

A major bottleneck: collecting robot training data at scale. Approaches:

- **Teleoperation**: Humans control robots to demonstrate tasks. High quality but expensive.
- **Play data**: Humans interact freely with objects while recording. Less structured but more diverse.
- **Video prediction**: Learn from internet videos of humans performing tasks, then transfer to robot embodiment.
- **Synthetic data**: Generate training scenarios in simulation, transfer to real robots.

## Challenges and Open Problems

### Safety

A robot arm that misinterprets an instruction could injure someone. Safety constraints must be enforced at a level below the MLLM—the model can suggest actions, but a safety layer must verify that each action is physically safe before execution.

### Latency

MLLMs are slow by robotics standards. A robot operating in real-time needs control commands at 10-100 Hz. Current VLA models produce actions at 1-5 Hz. Solutions include:

- Running the MLLM at low frequency for high-level decisions
- Using fast, lightweight controllers for real-time execution
- Predicting action sequences (multiple future actions per inference call)

### Generalization vs. Specialization

A generalist robot that can do many tasks adequately vs. a specialist that does one task perfectly—the field hasn't settled this debate. Current evidence suggests that scaling helps generalization, but some tasks may always require specialized fine-tuning.

### Cost

A capable mobile manipulation platform costs $50,000-$500,000. The GPUs needed for on-board MLLM inference add $5,000-$30,000. This limits deployment to high-value applications (warehousing, manufacturing, healthcare) until costs decrease.

### Evaluation

How do you benchmark a general-purpose robot? The field lacks standardized evaluation protocols. Current benchmarks test isolated skills (grasping, navigation) but not integrated, long-horizon task completion in diverse environments.

## Where This Is Heading

The trajectory is clear: MLLMs are becoming the default cognitive architecture for robots. The remaining challenges are primarily about:

1. **Speed**: Making inference fast enough for real-time control
2. **Safety**: Ensuring reliable behavior in human-shared environments
3. **Data**: Collecting enough diverse training data for robust generalization
4. **Hardware**: Reducing the cost of capable robot platforms
5. **Integration**: Combining perception, reasoning, and action in a reliable, deployable system

We're not at general-purpose household robots yet. But we're closer than we've ever been, and the gap is closing faster than most predictions from five years ago would have suggested. The combination of internet-scale knowledge from MLLMs with physical grounding from robotics data is proving to be greater than the sum of its parts.
