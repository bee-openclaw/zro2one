---
title: "Structured Outputs from LLMs: JSON, Schemas, and When They Actually Work"
depth: technical
pillar: building
topic: llm-api-integration
tags: [llm-api, structured-outputs, json, schema, function-calling, output-parsing, reliability]
author: bee
date: "2026-03-10"
readTime: 9
description: "Getting reliable structured output from LLMs is harder than it looks. This guide covers the techniques, tradeoffs, and failure modes — from prompt-based JSON to constrained decoding."
related: [llm-api-function-calling-guide, llm-api-integration-guide, rag-production-architecture]
---

One of the earliest frustrations when building with LLMs is discovering that "return JSON" in the prompt doesn't reliably return JSON. Sometimes it does. Sometimes the model adds a preamble. Sometimes it adds backticks. Sometimes it returns a JSON-like structure with a subtle schema error.

This is the structured output problem, and it matters because most production systems need LLMs to produce output that other code can parse. This guide covers the landscape of techniques for getting reliable structured output — from simple prompting strategies to constrained generation.

## Why structured output is hard

LLMs are trained to predict probable next tokens given context. "Probable next tokens" are heavily influenced by training data — which contains vast amounts of human text where JSON appears in code blocks, with variable formatting, often with inline comments (technically invalid JSON), and surrounded by natural language explanations.

When you ask an LLM to "return JSON," you're competing against its training to produce natural human-like text. The model has to somehow suppress its default text-generation behavior and produce precisely formatted output. It can do this, but it's not the path of least resistance.

The more constrained the schema (many required fields, nested objects, specific enum values), the more opportunities for subtle errors.

## Technique 1: Prompt-based JSON (the naive approach)

The simplest approach: ask for JSON in the prompt.

```
Extract the following from the user message and return as JSON:
- name: string
- email: string or null
- intent: "question" | "complaint" | "feedback"

User message: {message}

Return only valid JSON with no additional text.
```

**When it works:** Simple schemas, lenient applications, frontier models (Claude, GPT-4 level and above), when an occasional parsing error is acceptable.

**When it fails:**
- Complex nested schemas with many fields
- Models that are less instruction-following
- High-throughput applications where 1-2% failure rate causes real downstream problems
- Schemas with strict enum constraints

**Improvements:**
- Add a few-shot example of the exact output format
- Put the JSON request at the end of the prompt (models attend more to recent context)
- Specify "Return only the JSON object. Do not include markdown, explanations, or additional text."
- Set temperature to 0 (reduces creative variation that can break format)

## Technique 2: Response format parameter (JSON mode)

Most major APIs now support a `response_format` parameter that constrains the model to produce valid JSON:

```python
# OpenAI
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": prompt}],
    response_format={"type": "json_object"}
)

# Anthropic (no native JSON mode — see technique 3)
```

JSON mode guarantees valid JSON but doesn't guarantee your schema. The model will produce some valid JSON; it won't necessarily produce the exact keys and types you asked for.

**Reliability:** High for producing parseable JSON; moderate for producing JSON that matches a specific schema.

**The gotcha:** If you don't tell the model what JSON to produce, it may produce something unpredictable. Always describe the expected schema in the prompt even when using JSON mode.

## Technique 3: Structured outputs with schema enforcement

OpenAI's `response_format` with a JSON Schema definition enforces at the API level that the output matches your schema exactly:

```python
from pydantic import BaseModel
from openai import OpenAI

class CalendarEvent(BaseModel):
    name: str
    date: str
    participants: list[str]

client = OpenAI()
completion = client.beta.chat.completions.parse(
    model="gpt-4o",
    messages=[...],
    response_format=CalendarEvent,
)
event = completion.choices[0].message.parsed
```

This uses constrained decoding — the model's token sampling is constrained so that the logits for tokens that would violate the schema are set to -infinity. The model literally cannot produce output that violates the schema.

**Reliability:** Very high — the schema is enforced at the generation level, not by parsing the output.

**Limitations:**
- Not all schema features are supported (recursive schemas, some complex constraints)
- Available on OpenAI GPT-4o family; Anthropic and other providers have different approaches
- Constrained generation can reduce model quality for reasoning tasks (the model is forced into the schema even if it would "want" to produce different text)

## Technique 4: Tool/function calling

Structuring LLM output as a tool call is a reliable alternative to JSON mode:

```python
tools = [{
    "type": "function",
    "function": {
        "name": "extract_contact_info",
        "description": "Extract contact information from text",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "email": {"type": "string"},
                "phone": {"type": "string", "nullable": True}
            },
            "required": ["name"]
        }
    }
}]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[...],
    tools=tools,
    tool_choice={"type": "function", "function": {"name": "extract_contact_info"}}
)
```

Setting `tool_choice` to force the specific function guarantees the model produces a function call with that schema.

**Reliability:** High — function calling is specifically trained and constrained.

**Advantages over JSON mode:**
- The function description provides semantic context about what the fields mean
- The model is trained to produce function calls reliably
- Works well for extraction tasks where describing the function makes the task clearer

**Availability:** OpenAI, Anthropic (via tools API), Google Gemini, and most major providers support function calling.

## Technique 5: Constrained generation at inference time (local models)

For locally deployed models (via llama.cpp, Ollama, vLLM), you can apply grammar-constrained generation:

**llama.cpp grammar:** Define a BNF grammar that constrains the model's output. The sampling step only considers tokens that could be a valid continuation of the grammar.

```
root   ::= object
object ::= "{" ws members ws "}"
members ::= pair ("," ws pair)*
pair   ::= string ws ":" ws value
...
```

**outlines:** Python library that wraps any model (local or API) with regex or Pydantic schema constrained generation:

```python
import outlines

model = outlines.models.transformers("mistralai/Mistral-7B-v0.1")
generator = outlines.generate.json(model, MySchema)
result = generator(prompt)
```

**Reliability:** Near-100% structural validity (the grammar enforces it), but schema adherence only covers structure, not semantic correctness.

## Choosing between techniques

| Technique | Reliability | Flexibility | Provider Support | Complexity |
|---|---|---|---|---|
| Prompt-based JSON | Low-Medium | High | Universal | Low |
| JSON mode | Medium | Medium | OpenAI, some others | Low |
| Structured outputs / schema | High | Medium | OpenAI primarily | Medium |
| Function calling | High | High | Most major providers | Medium |
| Grammar-constrained | Very high | Low | Local models | High |

For most production use cases: **function calling is the most reliable, portable approach** across providers. Structured outputs (with schema) is better if you're OpenAI-specific and need absolute schema guarantees.

## Parsing and error handling

Even with schema enforcement, build robust parsing:

```python
import json
from typing import Optional

def parse_llm_json(output: str, schema: dict) -> Optional[dict]:
    # Strip common model artifacts
    cleaned = output.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    
    try:
        parsed = json.loads(cleaned)
        # Validate against schema
        validate(parsed, schema)
        return parsed
    except json.JSONDecodeError as e:
        # Log and handle
        logger.warning(f"JSON parse error: {e}, output: {output[:200]}")
        return None
    except ValidationError as e:
        logger.warning(f"Schema validation error: {e}")
        return None
```

**Retry strategies:** On parse failure, retry with the failed output included in the prompt ("Your previous response was not valid JSON. Here is what you returned: [output]. Please return only valid JSON matching the schema."). This works surprisingly well.

## Performance and cost considerations

Structured output constraints change the model's generation behavior:
- Constrained decoding is slightly slower (computing valid next tokens at each step)
- For complex schemas with many fields, constrained generation can force the model down paths that produce lower-quality semantic content
- Long, deeply nested schemas significantly increase token usage

For high-throughput applications: benchmark whether structured outputs save more on post-processing error handling than they cost in generation latency.

---

Structured output from LLMs is solvable. The hierarchy of reliability: grammar-constrained generation > schema-enforced structured outputs > function calling > JSON mode > prompt-based. Pick the level of reliability your application needs and use the simplest technique that achieves it. Always build parsing and error handling regardless of technique — even constrained generation can produce semantically incorrect output.
