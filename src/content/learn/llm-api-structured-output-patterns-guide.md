---
title: "Structured Output Patterns for LLM APIs: Getting Reliable JSON, Every Time"
depth: applied
pillar: building
topic: llm-api-integration
tags: [llm-api-integration, structured-output, json, api-patterns, reliability]
author: bee
date: "2026-04-02"
readTime: 9
description: "Getting LLMs to produce valid, parseable structured output is critical for building reliable applications. Here are the patterns that work across different API providers."
related: [llm-api-webhooks-and-async-jobs-guide, llm-api-ab-testing-guide, prompting-system-prompt-design-guide]
---

Most LLM-powered applications need structured output. Not prose — JSON, XML, or some other machine-parseable format that downstream code can consume. Getting this reliably from LLMs has gone from painful to mostly solved, but the techniques differ across providers and the edge cases still matter.

## The Reliability Spectrum

There are three levels of structured output reliability, from least to most:

**Prompt-based.** Ask the model to output JSON in your prompt. Works most of the time. Fails unpredictably — the model may include markdown formatting, add explanatory text before or after the JSON, or produce syntactically invalid JSON.

**JSON mode.** API-level enforcement that guarantees valid JSON. The output will parse as JSON, but the schema is not enforced — you might get valid JSON with unexpected fields, missing fields, or wrong types.

**Schema-constrained.** API-level enforcement of both valid JSON and conformance to a specific JSON schema. This guarantees you get exactly the structure you specified, with the right fields and types.

Always use the strongest enforcement available for your provider. Prompt-based JSON extraction is acceptable for prototyping; it is not acceptable for production.

## Provider-Specific Implementation

### OpenAI

OpenAI offers structured outputs through the `response_format` parameter:

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Extract the person's name and age"}],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "person",
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "age": {"type": "integer"}
                },
                "required": ["name", "age"]
            }
        }
    }
)
```

This guarantees the output matches your schema. The model's generation is constrained at the token level — it literally cannot produce tokens that would violate the schema.

### Anthropic

Anthropic's tool use feature provides structured output through tool definitions:

```python
response = client.messages.create(
    model="claude-sonnet-4-6-20250514",
    messages=[{"role": "user", "content": "Extract the person's name and age"}],
    tools=[{
        "name": "extract_person",
        "description": "Extract person information",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"}
            },
            "required": ["name", "age"]
        }
    }],
    tool_choice={"type": "tool", "name": "extract_person"}
)
```

By forcing tool choice, the model must produce output conforming to the tool's input schema. This is reliable and well-tested for structured extraction tasks.

### Open Models (via vLLM, llama.cpp)

For self-hosted models, constrained decoding enforces structure at the token level. Libraries like Outlines and guidance implement grammar-based sampling that only allows tokens consistent with a target schema.

```python
from outlines import models, generate

model = models.transformers("meta-llama/Llama-3-8B-Instruct")
generator = generate.json(model, schema)
result = generator(prompt)
```

This approach works with any model but adds latency from the constraint checking at each generation step.

## Patterns for Complex Structures

### Nested Objects

For deeply nested schemas, break the extraction into steps rather than asking for everything at once. A single prompt extracting a 10-level nested structure is more likely to produce errors than three prompts each extracting a simpler structure that you compose programmatically.

### Arrays of Variable Length

When extracting lists of items (entities, events, line items), set reasonable bounds in your schema using `minItems` and `maxItems`. Without bounds, the model may generate extremely long arrays that blow your token budget or produce diminishing quality.

### Optional Fields

Use nullable types or union types for fields that may not be present in the source data. Forcing the model to always produce a value for optional fields leads to hallucinated defaults. Better to let it explicitly return null when a field is not present.

```json
{
    "phone": {"type": ["string", "null"]}
}
```

### Enums and Constrained Values

For fields with a fixed set of valid values, use JSON Schema enums. This is one of the highest-value constraints — it eliminates the common problem of the model inventing categories or misspelling values.

```json
{
    "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"]}
}
```

## Error Handling

Even with schema-constrained output, you need error handling:

**Semantic errors.** The output is valid JSON matching your schema, but the values are wrong. The model extracted the wrong name, hallucinated an age, or misclassified a category. Schema enforcement does not prevent semantic errors — validate against your domain logic.

**Refusals.** Some providers return a refusal instead of structured output when the model declines to answer. Check for refusal responses before parsing.

**Truncation.** If the output exceeds the maximum token limit, it may be truncated mid-JSON. Check the `finish_reason` — if it is `length` rather than `stop`, the output is likely incomplete and should be retried with a higher token limit or simplified schema.

## The Practical Pattern

For production applications, the recommended pattern is:

1. **Define your schema** as a JSON Schema or Pydantic model.
2. **Use the strongest constraint** your provider supports (schema-constrained > JSON mode > prompt-based).
3. **Parse and validate** the output against your schema, even when using constrained generation. Belt and suspenders.
4. **Implement retry logic** for the rare cases where output is truncated or the provider returns an error.
5. **Monitor output quality** in production. Track the rate of semantic errors (valid structure but wrong values) separately from structural errors (invalid JSON).

Structured output has gone from "a clever hack" to "a standard API feature" in the past year. Use the native capabilities of your provider rather than rolling your own parsing and validation. The reliability improvement is significant, and it eliminates an entire category of production bugs.
