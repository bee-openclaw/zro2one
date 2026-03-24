---
title: "LLM Structured Generation: Constrained Decoding and Grammar-Guided Outputs"
depth: technical
pillar: building
topic: llms
tags: [llms, structured-output, constrained-decoding, json, grammar]
author: bee
date: "2026-03-24"
readTime: 10
description: "How constrained decoding and grammar-guided generation force LLMs to produce valid structured output, and when to use each approach."
related: [llm-api-structured-outputs-guide, llms-tool-use-and-function-calling-patterns, llms-temperature-and-sampling-explained]
---

Most production LLM applications need structured output -- JSON, XML, SQL, or domain-specific formats. The naive approach is prompting the model to "return JSON" and hoping for the best. The engineered approach is constrained decoding: intervening in the generation process itself to guarantee valid output.

This guide covers how constrained decoding works, the major approaches and tools, and the trade-offs you'll face when choosing between them.

## How constrained decoding works

During standard LLM generation, the model produces a probability distribution over all tokens at each step. The highest-probability token (or a sampled token) is selected, and generation continues.

Constrained decoding adds a filter before token selection. At each step, a validator checks which tokens would keep the output on a valid path according to some grammar or schema. Invalid tokens get their probabilities set to zero (or negative infinity in logit space). The model then samples only from valid continuations.

The key insight: you're not changing what the model wants to say. You're restricting how it can say it. The model still provides the semantic content; the constraint engine ensures structural validity.

## Token masking: the core mechanism

Token masking is the implementation detail that makes constrained decoding work. Here's the process:

1. The model produces logits (raw scores) for all vocabulary tokens
2. A constraint checker evaluates which tokens are valid given the current generation state
3. Invalid token logits are set to -infinity
4. Softmax is applied to the remaining logits to get a valid probability distribution
5. Sampling proceeds as normal from the masked distribution

This happens at every generation step. For JSON output, the constraint checker tracks whether you're inside a string, expecting a key, need a comma, etc. It's essentially running a parser in parallel with generation.

## Grammar-guided generation: CFG and PEG approaches

The most flexible form of constrained decoding uses formal grammars to define valid output.

**Context-Free Grammars (CFGs)** define valid output through production rules. A JSON grammar, for example, specifies that a value can be a string, number, boolean, null, array, or object -- and recursively defines each. At each generation step, the system checks which tokens are consistent with at least one valid parse continuation.

**Parsing Expression Grammars (PEGs)** are similar but use ordered choice instead of ambiguous alternatives. They're deterministic by construction, which can simplify the constraint checking logic.

In practice, most tools use a variant of CFG-based checking, often compiled into a finite-state machine for the non-recursive parts and using a pushdown automaton for nested structures.

```python
# Example: Defining a grammar for constrained generation with Outlines
from outlines import models, generate

model = models.transformers("mistralai/Mistral-7B-v0.3")

# JSON schema constraint
schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "sentiment": {"enum": ["positive", "negative", "neutral"]},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1}
    },
    "required": ["name", "sentiment", "confidence"]
}

generator = generate.json(model, schema)
result = generator("Analyze the sentiment of: 'The product is decent but overpriced.'")
# result is guaranteed to be valid JSON matching the schema
```

## Major tools and frameworks

**Outlines** (github.com/outlines-dev/outlines) is the most mature open-source library for constrained generation. It supports JSON Schema, regex, and custom CFG constraints. It precompiles grammars into efficient index structures so the per-token overhead is minimal. Works with Hugging Face Transformers and vLLM.

**Guidance** (github.com/guidance-ai/guidance) takes a template-based approach where you interleave fixed text with model-generated sections. It supports constrained generation but focuses more on controlling the overall generation flow.

**llama.cpp GBNF grammars** support grammar-guided generation natively in the llama.cpp ecosystem. You define a GBNF grammar file, and the engine applies token masking during generation. Efficient for local deployment.

**vLLM** has integrated Outlines-based structured generation directly into its serving engine, making constrained decoding available via API without code changes.

```python
# Example: Regex-constrained generation with Outlines
from outlines import models, generate

model = models.transformers("mistralai/Mistral-7B-v0.3")

# Force output to match an ISO date format
date_generator = generate.regex(model, r"\d{4}-\d{2}-\d{2}")
date = date_generator("Today's date is ")

# Force output to match a phone number pattern
phone_generator = generate.regex(model, r"\(\d{3}\) \d{3}-\d{4}")
phone = phone_generator("The customer's phone number is ")
```

## Native API structured output vs custom constrained decoding

Most major API providers (OpenAI, Anthropic, Google) now offer structured output modes. When should you use those vs rolling your own?

| Factor | Native API structured output | Custom constrained decoding |
|---|---|---|
| Setup effort | Minimal -- pass a schema | Significant -- need model hosting |
| Schema flexibility | JSON Schema only (usually) | Any grammar, regex, or custom logic |
| Latency overhead | Minimal (optimized internally) | Varies; 5-20% overhead typical |
| Output quality | High (models fine-tuned for it) | Depends on model and constraint complexity |
| Cost | API pricing applies | Inference compute cost |
| Control | Limited to provider's options | Full control over decoding |

**Use native API structured output when:** You're using a hosted model, your schema fits JSON Schema, and you don't need custom grammar constraints.

**Use custom constrained decoding when:** You're self-hosting, need non-JSON formats, want fine-grained control over generation, or need to enforce constraints that go beyond JSON Schema (regex patterns, co-occurrence rules, domain-specific grammars).

## Trade-offs: quality vs constraint strictness

Constrained decoding is not free. Important considerations:

**Quality degradation under tight constraints.** When you heavily mask the token distribution, the model may be forced into low-probability tokens. A model that "wants" to write a nuanced explanation might produce awkward phrasing when constrained to a strict enum. The tighter the constraint, the further the output can diverge from what the unconstrained model would produce.

**Latency overhead.** Grammar checking at every token adds computation. For simple schemas, the overhead is negligible (under 5%). For complex nested grammars, it can reach 15-20%. Precompilation helps significantly.

**Interaction with sampling temperature.** Low temperatures work better with constrained decoding because the model's probability mass is already concentrated. High temperatures spread probability across many tokens, and after masking, you may be sampling from a very flat distribution over the remaining valid tokens, producing less coherent output.

**Schema complexity limits.** Some constraints are easy to express as grammars (JSON format, date patterns) and some are hard (semantic constraints like "the summary must be shorter than the input"). Constrained decoding handles syntactic constraints well but cannot enforce semantic ones.

## Practical recommendations

1. **Start with native API structured output** if you're using a hosted model. It's the lowest-effort path and works well for most use cases.

2. **Move to Outlines or equivalent** when you need custom formats, self-host your models, or need deterministic schema compliance without retries.

3. **Precompile your grammars.** The per-request overhead of grammar compilation can exceed the generation time for short outputs. Compile once, reuse across requests.

4. **Test output quality, not just validity.** Valid JSON is necessary but not sufficient. Compare the semantic quality of constrained vs unconstrained outputs to ensure the constraints aren't degrading the useful content.

5. **Use the simplest constraint that works.** If a regex suffices, don't use a full CFG. If an enum works, don't use a regex. Simpler constraints mean less masking and better output quality.

Structured generation has matured rapidly. What was a research curiosity in 2024 is production infrastructure in 2026. The core question has shifted from "can we get valid output?" to "what's the right constraint granularity for this use case?"
