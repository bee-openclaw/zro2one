---
title: "Negative Prompting: Telling AI What Not to Do"
depth: applied
pillar: applied
topic: prompting
tags: [prompting, negative-prompting, constraints, prompt-engineering, guardrails]
author: bee
date: "2026-03-28"
readTime: 8
description: "How to use negative instructions effectively in prompts — specifying what to avoid, exclude, or not do — and when this approach works better than positive-only prompting."
related: [prompting-constraint-design-guide, prompting-debugging-and-iteration, prompting-system-design-patterns]
---

# Negative Prompting: Telling AI What Not to Do

Most prompting advice focuses on what to tell the model to do. But some of the most effective prompting involves specifying what not to do. Negative constraints — exclusions, prohibitions, and anti-patterns — can dramatically improve output quality by eliminating the failure modes you have already identified.

This matters because LLMs have strong defaults. Without negative constraints, they will: use corporate filler language, hedge every statement, add unnecessary disclaimers, repeat the question back, pad responses with obvious context, and format everything in bullet points. If you have encountered these patterns and been frustrated, negative prompting is the tool to fix them.

## How Negative Prompting Works

The concept is simple: instead of only describing the desired output, you also describe the undesired output. This works because:

**Narrowing the output distribution.** An LLM's response is sampled from a probability distribution over possible outputs. Positive instructions push probability toward desired outputs. Negative instructions push probability away from undesired outputs. Together, they define a tighter target than either alone.

**Breaking defaults.** Models have strong priors from training data. "Write a blog post" activates a generic blog post template — introduction, three sections with headers, conclusion with a call to action. Negative constraints ("do not include a generic introduction or conclusion") break these defaults and force more original structure.

**Preventing known failure modes.** After iterating on a prompt, you learn what goes wrong. Encoding those failure modes as negative constraints is more reliable than trying to describe the positive space precisely enough to exclude them.

## Patterns That Work

### Excluding Specific Behaviors

The most direct form. Identify what the model does that you do not want, and explicitly prohibit it.

```
Write a product description for this camera.

Do not:
- Start with "Introducing" or "Meet the"
- Use superlatives like "best" or "revolutionary"
- Include a call to action
- Mention competitors
- Use more than 100 words
```

This is effective because each constraint eliminates a common LLM default for product descriptions. The resulting output is more distinctive and more useful.

### Anti-Examples

Show the model what bad output looks like, then ask for the opposite.

```
Explain what a database index is.

Bad explanation (do not write like this):
"A database index is like a book index. Just as a book index helps you find topics quickly, a database index helps the database find data quickly."

That explanation is overused and imprecise. Write an explanation that is technically accurate and does not use the book index analogy.
```

Anti-examples are powerful because they give the model a concrete representation of what to avoid, not just an abstract instruction.

### Tone and Style Exclusions

```
You are a technical writer. Your style rules:
- Never use "simply" or "just" (they minimize complexity)
- Never use "leverage" when you mean "use"
- Do not hedge with "it's worth noting that" or "it should be mentioned that"
- Do not start sentences with "So," or "Now,"
- Avoid passive voice unless the agent is genuinely unknown
```

These exclusions produce noticeably better technical writing because they target the specific verbal tics that make AI-generated text sound generic.

### Format Exclusions

```
Answer this question about machine learning.

Format rules:
- Do not use bullet points or numbered lists
- Do not use headers or subheaders
- Write in flowing paragraphs
- Do not bold key terms
```

Format exclusions are useful when you need prose-style responses and the model defaults to structured formats.

## Negative Prompting in Image Generation

The term "negative prompting" originated in image generation (Stable Diffusion, DALL-E) where it has a specific technical meaning: a separate text input that is actively pushed away from during the diffusion process.

```
Prompt: "professional portrait photo of a woman, studio lighting, sharp focus"
Negative prompt: "blurry, low quality, distorted face, extra fingers, watermark, text"
```

In image generation, the negative prompt directly modifies the denoising process — the model actively steers away from generating features described in the negative prompt. This is more mechanistically direct than negative instructions in text LLMs, which are processed as part of the overall instruction context.

Common negative prompts for image generation:
- Quality: "blurry, low quality, jpeg artifacts, noise, pixelated"
- Anatomy: "extra fingers, deformed hands, extra limbs, distorted face"
- Unwanted elements: "watermark, text, logo, border, frame"
- Style avoidance: "cartoon, anime, painting" (when you want photorealism)

## When Negative Prompting Fails

**Over-constraining.** Too many negative constraints leave no room for the model to generate useful output. If you prohibit every common pattern, the model may produce something worse — stilted, awkward, or incoherent. Strike a balance.

**Ironic focus effect.** Sometimes telling a model "do not mention X" causes it to think about X more, not less. This is more common with smaller models and with content-level prohibitions ("do not discuss politics") than with style-level ones ("do not use bullet points"). If you observe this, try rephrasing as a positive instruction instead.

**Conflicting constraints.** "Be comprehensive" + "Do not exceed 200 words" + "Do not use bullet points" can create an impossible constraint space. When constraints conflict, the model compromises unpredictably. Prioritize or reduce constraints.

**Cultural and context sensitivity.** "Do not be formal" means different things in different contexts. Be specific about what formality behaviors to avoid rather than using vague labels.

## Practical Recommendations

**Start with positive prompting.** Define what you want first. Add negative constraints only when the model's output consistently exhibits problems that positive instructions alone do not fix.

**Be specific.** "Do not be boring" is useless. "Do not start with a generic definition, do not use more than one analogy, do not repeat information" is actionable.

**Limit to 3–5 negative constraints.** More than that and you are probably over-constraining. If you need many exclusions, you may need a different prompt strategy entirely.

**Test removal.** After adding negative constraints, try removing them one at a time and see if the output degrades. Sometimes constraints that were necessary early in iteration become unnecessary as other parts of the prompt improve.

**Document your constraints.** Keep a running list of failure modes and the negative constraints that fix them. This becomes your prompt's institutional knowledge — when someone asks "why does the prompt say do not use bullet points?" the documentation explains which failure mode it addresses.

Negative prompting is not about being restrictive for its own sake. It is about precisely defining the output space by eliminating the known bad regions. When used well, it produces output that is more original, more focused, and more aligned with what you actually need — because you have told the model not just where to go, but which wrong turns to avoid.
