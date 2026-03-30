---
title: "Validating Structured LLM Outputs in Production"
depth: technical
pillar: llm-api-integration
topic: llm-api-integration
tags: [llm-api-integration, structured-outputs, validation, json, production]
author: bee
date: "2026-03-30"
readTime: 9
description: "LLMs can generate structured data, but they make mistakes. This guide covers validation strategies — from JSON Schema to semantic validation — that make structured outputs reliable enough for production use."
related: [llm-api-structured-outputs-guide, llm-api-error-handling-retry-patterns, llm-api-function-calling-guide]
---

Getting an LLM to output JSON is solved. Getting it to output *correct* JSON — with valid values, proper relationships, and no hallucinated fields — is the real challenge. Production systems that consume LLM-generated structured data need validation layers that catch the mistakes models inevitably make.

## The Validation Stack

Think of validation in layers, from cheapest to most expensive:

### Layer 1: Syntax Validation

Is the output valid JSON/YAML/XML? With structured output modes (OpenAI's JSON mode, Anthropic's tool use), this is largely handled by the provider. But edge cases exist:

- Truncated output due to token limits
- Escaped characters that break parsing
- Unicode issues in field values

Always wrap parsing in try/catch and have a retry strategy for syntax failures.

```python
import json
from pydantic import BaseModel, ValidationError

class ExtractedEntity(BaseModel):
    name: str
    type: str
    confidence: float
    
def parse_response(raw: str) -> ExtractedEntity | None:
    try:
        data = json.loads(raw)
        return ExtractedEntity(**data)
    except (json.JSONDecodeError, ValidationError) as e:
        logger.warning(f"Parse failed: {e}")
        return None
```

### Layer 2: Schema Validation

Does the output match the expected structure? Pydantic (Python) or Zod (TypeScript) are the standard tools. Define your expected output as a typed model and validate against it.

What to check:
- Required fields are present
- Field types are correct (string where you expect string, number where you expect number)
- Enums contain valid values
- Arrays have the expected length or range
- Nested objects match their schemas

```python
from pydantic import BaseModel, Field, field_validator
from typing import Literal

class ProductReview(BaseModel):
    sentiment: Literal["positive", "negative", "neutral"]
    rating: float = Field(ge=1.0, le=5.0)
    summary: str = Field(min_length=10, max_length=500)
    topics: list[str] = Field(min_length=1, max_length=10)
    
    @field_validator("topics")
    @classmethod
    def validate_topics(cls, v):
        allowed = {"quality", "price", "shipping", "service", "design"}
        invalid = set(v) - allowed
        if invalid:
            raise ValueError(f"Invalid topics: {invalid}")
        return v
```

### Layer 3: Referential Validation

Do the values make sense in context? This is where simple schema validation falls short.

Examples:
- The model extracted a date, but is it within the expected range?
- The model identified a product category, but does that category exist in your system?
- The model generated an SQL query, but do the referenced tables and columns exist?

```python
def validate_entity_references(extracted: dict, database: Database) -> list[str]:
    errors = []
    
    if "product_id" in extracted:
        if not database.product_exists(extracted["product_id"]):
            errors.append(f"Unknown product_id: {extracted['product_id']}")
    
    if "category" in extracted:
        if extracted["category"] not in database.get_categories():
            errors.append(f"Unknown category: {extracted['category']}")
    
    return errors
```

### Layer 4: Semantic Validation

Is the content actually correct? This is the hardest layer because "correct" depends on domain knowledge.

**Cross-field consistency:** If the model extracted "sentiment: positive" and "rating: 1.5", something's wrong. If it extracted "country: France" and "currency: JPY", that's suspicious.

**Factual grounding:** If the model extracted information from a document, does the extraction actually match the source text? This requires comparing the output against the input, often using another LLM call or string matching.

**Business rules:** Domain-specific constraints that aren't captured by the schema. "Discount percentage can't exceed 50%," "shipping weight must be positive if physical product," "end date must be after start date."

```python
def semantic_validation(review: ProductReview, source_text: str) -> list[str]:
    warnings = []
    
    # Cross-field consistency
    if review.sentiment == "positive" and review.rating < 2.0:
        warnings.append("Sentiment-rating mismatch")
    if review.sentiment == "negative" and review.rating > 4.0:
        warnings.append("Sentiment-rating mismatch")
    
    # Source grounding (simplified)
    if review.summary.lower() not in source_text.lower():
        # Check if key claims in summary appear in source
        warnings.append("Summary may not be grounded in source text")
    
    return warnings
```

### Layer 5: LLM-as-Judge

Use a second LLM call to validate the first one's output. This is expensive but catches subtle errors that rule-based validation misses.

```python
def llm_validate(original_input: str, extracted: dict) -> dict:
    prompt = f"""Review this extraction for accuracy.
    
Original text: {original_input}
Extracted data: {json.dumps(extracted, indent=2)}

For each field, rate accuracy as: correct, plausible, incorrect, or unverifiable.
Explain any issues found."""
    
    response = llm.generate(prompt, model="fast-model")
    return parse_validation_response(response)
```

Use this selectively — for high-stakes extractions, random sampling for quality monitoring, or when cheaper validation layers flag warnings.

## Retry Strategies

When validation fails, retrying with feedback often fixes the issue:

```python
def extract_with_retry(text: str, max_retries: int = 3) -> ExtractedEntity | None:
    errors = []
    
    for attempt in range(max_retries):
        if errors:
            prompt = f"Previous extraction had errors: {errors}. Please fix."
        else:
            prompt = f"Extract entities from: {text}"
        
        response = llm.generate(prompt)
        result = parse_response(response)
        
        if result is None:
            errors = ["Failed to parse JSON"]
            continue
        
        validation_errors = validate_all(result)
        if not validation_errors:
            return result
        
        errors = validation_errors
    
    return None  # All retries exhausted
```

Key insight: include the specific validation errors in the retry prompt. "Field 'category' has invalid value 'electronics'" is much more actionable for the model than "validation failed."

## Monitoring in Production

Track these metrics:

- **Parse success rate** — percentage of responses that are valid JSON
- **Schema compliance rate** — percentage that pass schema validation
- **Semantic accuracy** — sampled human evaluation of extraction quality
- **Retry rate** — how often you need retries (and how many)
- **Validation failure distribution** — which fields fail most often (these need better prompting or constraints)

Set alerts on parse success rate (should be >99% with structured output modes) and schema compliance rate (should be >95%). Investigate drops immediately — they often indicate prompt regression or model updates.

## Best Practices

1. **Use provider-native structured outputs** when available — they constrain the model's output format at the decoding level, eliminating most syntax and schema issues
2. **Define strict Pydantic/Zod models** — be as specific as possible about field types, ranges, and allowed values
3. **Validate in layers** — cheap checks first, expensive checks only when needed
4. **Log everything** — store the raw LLM output alongside validation results for debugging and improvement
5. **Build a test suite** — collect real-world validation failures and build regression tests. This becomes your most valuable asset for prompt iteration
