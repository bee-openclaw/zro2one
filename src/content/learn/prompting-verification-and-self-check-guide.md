---
title: "Verification Prompting: Getting LLMs to Check Their Own Work"
depth: applied
pillar: practice
topic: prompting
tags: [prompting, verification, self-check, accuracy, reliability, hallucination]
author: bee
date: "2026-03-25"
readTime: 9
description: "Practical techniques for prompting LLMs to verify, critique, and correct their own outputs — reducing errors and hallucinations through structured self-checking patterns."
related: [prompting-self-consistency-guide, prompting-chain-of-thought, prompting-debugging-and-iteration]
---

# Verification Prompting: Getting LLMs to Check Their Own Work

LLMs make mistakes. They hallucinate facts, miscalculate numbers, misinterpret instructions, and generate plausible-sounding nonsense. You cannot eliminate these errors, but you can significantly reduce them by prompting the model to verify its own outputs before presenting them.

Verification prompting is a family of techniques where you explicitly ask the model to review, critique, and correct its initial response. It works because LLMs are often better at evaluating answers than generating them — the same way a student might catch errors when reviewing their test, even if they made those errors the first time.

## The Basic Pattern

The simplest version: generate first, then verify.

**Step 1 — Generate:**
```
Solve this problem: [problem]
```

**Step 2 — Verify:**
```
Review your answer above. Check for:
- Mathematical errors
- Logical inconsistencies
- Unsupported claims
- Missing steps

If you find errors, provide a corrected answer. If the answer is correct, confirm why.
```

This two-step approach catches a surprising number of errors. The key is that the verification step forces the model to re-engage with the problem from a critical perspective rather than simply continuing to generate.

## Structured Self-Critique

More powerful than "check your work" is giving the model a specific critique framework:

```
You generated the following analysis: [previous output]

Critique this analysis using the following checklist:

1. FACTUAL ACCURACY: Are all stated facts verifiable? Flag any claims 
   that might be hallucinated.
2. LOGICAL CONSISTENCY: Does each conclusion follow from the stated 
   premises? Are there logical gaps?
3. COMPLETENESS: Are there important considerations that were missed?
4. BIAS: Does the analysis show unwarranted assumptions or one-sided 
   reasoning?
5. SPECIFICITY: Are claims specific enough to be useful, or vague 
   enough to be unfalsifiable?

For each issue found, provide: the specific problem, why it matters, 
and a corrected version.
```

The structure matters. Without it, models tend to rubber-stamp their own work ("The analysis appears comprehensive and well-reasoned"). A specific checklist forces genuine evaluation.

## Numerical Verification

LLMs are notoriously unreliable with math. For any output involving numbers, add explicit verification:

```
Now verify every numerical calculation in your response:
- Recompute each calculation step by step
- Check that percentages sum correctly where applicable
- Verify that comparisons (greater than, less than) are accurate
- Confirm unit conversions are correct

Show your verification work.
```

For complex calculations, an even stronger pattern:

```
Solve this problem using two different methods. If the results disagree, 
identify which approach has the error and provide the correct answer.
```

Two independent solution paths that converge give much higher confidence than a single chain of reasoning.

## Source Verification

For factual claims, prompt the model to assess its own confidence:

```
For each factual claim in your response, rate your confidence:
- HIGH: You are very confident this is accurate
- MEDIUM: You believe this is correct but are not certain
- LOW: This is your best understanding but could be wrong
- UNSURE: You are not confident in this claim

For any claim rated MEDIUM or below, note what would need to be verified 
and suggest how to check it.
```

This does not prevent hallucination, but it surfaces the model's uncertainty — which is often calibrated better than you might expect. Claims the model rates as LOW confidence deserve external verification.

## The Adversarial Reviewer Pattern

Ask the model to argue against its own conclusion:

```
You concluded that [conclusion]. Now argue the opposite position as 
strongly as you can. What evidence or reasoning would support the 
opposite conclusion?

After making the counter-argument, assess: does your original 
conclusion still hold, should it be modified, or should it be reversed?
```

This is particularly effective for analytical and strategic questions where the model might have latched onto the first plausible answer. Forcing a counter-argument often surfaces genuine weaknesses in the original reasoning.

## Multi-Perspective Verification

Generate multiple responses and compare:

```
Approach this problem from three different angles:
1. [Perspective A — e.g., conservative analysis]
2. [Perspective B — e.g., optimistic analysis]
3. [Perspective C — e.g., contrarian analysis]

Then synthesize: where do all three perspectives agree? Where do they 
disagree? What does the disagreement tell us about the uncertainty in 
this problem?
```

Agreement across perspectives increases confidence. Disagreement highlights genuine uncertainty — which is valuable information in itself.

## Verification for Code Generation

Code has a special advantage: it can be checked mechanically. But prompting helps too:

```
Review the code you generated:
1. Trace through it with a simple example input. What is the output?
2. What happens with edge cases: empty input, very large input, 
   negative numbers, null values?
3. Are there any off-by-one errors in loops or array indexing?
4. Does the code handle errors gracefully?
5. Is there a simpler way to achieve the same result?

If you find issues, provide corrected code.
```

For critical code, combine prompted self-review with actual execution (if your environment supports it).

## When Verification Prompting Fails

Verification is not magic. It fails when:

**The model does not know it is wrong.** If the model's training data contains incorrect information, it will confidently generate and confidently verify the wrong answer. Verification catches reasoning errors, not knowledge gaps.

**The verification is too vague.** "Check your work" without specific criteria produces superficial verification. Always provide a concrete checklist.

**The model has already committed.** Some research suggests models are biased toward confirming their initial output. The adversarial pattern (argue against yourself) partially addresses this, but the bias exists.

**The task is beyond the model's capability.** Verification does not make a model smarter — it makes it more careful. If the task requires knowledge or reasoning the model does not have, verification will not help.

## Cost and Latency Trade-offs

Verification prompting roughly doubles your token usage and latency (generate + verify). For many applications, this is a worthwhile trade:

- **High-stakes outputs** (financial analysis, medical information, legal summaries): Always verify. The cost of an error far exceeds the cost of extra tokens.
- **Customer-facing content**: Usually worth verifying. Errors damage trust.
- **Internal drafts**: Verify selectively — for complex analyses but not for routine summaries.
- **High-volume, low-stakes**: Skip verification. The cost does not justify the quality improvement for throwaway content.

## Implementation Tips

1. **Separate the generation and verification into distinct API calls** when possible. This prevents the model from "seeing" its verification prompt while generating, which can subtly affect the initial output.

2. **Use a different temperature** for verification. Generate at temperature 0.7 for creativity; verify at temperature 0 for precision.

3. **Log verification results.** Track how often verification catches errors, what types of errors, and whether the corrections are actually better. This data helps you calibrate when verification is worth the cost.

4. **Combine with external checks.** Verification prompting works best alongside programmatic validation — JSON schema checking, unit tests for code, fact-checking against databases.

The fundamental insight: asking an LLM to think twice is cheap and effective. Build it into any workflow where accuracy matters.
