---
title: "Prompting for Structured Output: JSON, Tables, Lists, and Beyond"
depth: applied
pillar: practice
topic: prompting
tags: [prompting, structured-output, json, formatting, practical]
author: bee
date: "2026-03-17"
readTime: 8
description: "Getting AI to produce consistently formatted output is harder than it seems. This guide covers techniques for reliable JSON, markdown tables, structured lists, and other formatted outputs."
related: [llm-api-structured-outputs-guide, prompting-system-design-patterns, prompting-that-actually-works]
---

You need the model to return JSON. It returns JSON... most of the time. Sometimes it wraps it in markdown code blocks. Sometimes it adds a conversational preamble. Sometimes the keys are slightly different. Getting consistent structured output requires deliberate prompting.

## The fundamentals

### Be explicit about format

Don't just say "return JSON." Show exactly what you want:

```
Extract the following information and return it as a JSON object with exactly these keys:

{
  "name": "string - the person's full name",
  "email": "string - their email address or null if not found",
  "role": "string - their job title",
  "department": "string - their department"
}

Return ONLY the JSON object. No other text, no markdown formatting, no explanation.
```

### Provide examples

One-shot or few-shot examples are the most reliable way to establish format:

```
Input: "Sarah Chen is a Senior Engineer on the Platform team. Reach her at schen@example.com"
Output: {"name": "Sarah Chen", "email": "schen@example.com", "role": "Senior Engineer", "department": "Platform"}

Input: "Meeting with Director of Marketing, James Rivera, about Q2 plans"
Output: {"name": "James Rivera", "email": null, "role": "Director of Marketing", "department": "Marketing"}

Now process this input:
```

### Specify edge cases

Models handle ambiguity by guessing. Tell them what to do instead:

- "If a field is not found, use `null`, not an empty string"
- "If multiple values are possible, return the first one mentioned"
- "If the input is unclear, return `{"error": "ambiguous input", "candidates": [...]}`"

## JSON output techniques

### Use system prompts for format enforcement

```
System: You are a data extraction API. You ALWAYS respond with valid JSON. 
Never include explanatory text outside the JSON object.
Never wrap the JSON in markdown code blocks.
Your response must be parseable by JSON.parse() with no preprocessing.
```

### Leverage native structured output

Most major API providers now offer structured output modes:

**OpenAI:** `response_format: { type: "json_schema", json_schema: {...} }`
**Anthropic:** Tool use with a defined schema
**Google:** `response_mime_type: "application/json"` with schema

These are more reliable than prompting alone because the model's output is constrained at the token level.

### Handle common failures

Even with good prompts, validate the output:

```python
import json

def parse_llm_json(response_text: str) -> dict:
    # Strip markdown code blocks if present
    text = response_text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]  # Remove opening ```json
        text = text.rsplit("```", 1)[0]  # Remove closing ```
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON from conversational response
        import re
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise
```

## Tables and lists

### Markdown tables

Provide the header row as a template:

```
Format the results as a markdown table with these columns:

| Feature | Plan A | Plan B | Winner |
|---------|--------|--------|--------|
```

### Consistent lists

Specify the list format precisely:

```
Return each item as a bullet point in this format:
- **[Category]**: Description of the item (relevance: high/medium/low)

Do not number the items. Do not add sub-bullets. One line per item.
```

### Numbered steps

```
Return as numbered steps. Each step should be:
1. A single clear action
2. Written as an imperative ("Open the file" not "You should open the file")
3. No longer than one sentence
```

## Multi-part structured output

When you need multiple structured sections:

```
Return your analysis in exactly this format:

## Summary
[2-3 sentence summary]

## Key Findings
- Finding 1
- Finding 2
- Finding 3

## Risk Assessment
{"level": "low|medium|high", "factors": ["factor1", "factor2"], "recommendation": "string"}

## Next Steps
1. Step 1
2. Step 2
```

## Reliability tips

**Temperature 0 for structured output.** Higher temperatures increase format variance. For consistent JSON, use temperature 0.

**Shorter outputs are more reliable.** The longer the structured output, the more chances for format drift. For large extractions, process in chunks.

**Validate and retry.** Always validate structured output before using it. If validation fails, retry with the error message appended: "Your previous response was not valid JSON. The error was: [error]. Please try again."

**Test with adversarial inputs.** Feed your prompt edge cases: empty inputs, very long inputs, inputs in unexpected languages, inputs that look like prompt injections. Your format should hold.

The goal is output you can parse programmatically without human intervention, every time. That requires treating your prompt as an API contract, not a suggestion.
