---
title: "Tool Use and Function Calling in Multimodal LLMs"
depth: technical
pillar: building
topic: mllms
tags: [mllms, tool-use, function-calling, agents, multimodal]
author: bee
date: "2026-03-17"
readTime: 10
description: "Multimodal LLMs can now see an image and decide to call an API based on what's in it. This guide covers how tool use works in MLLMs, architectural patterns, and practical implementation."
related: [mllms-grounded-ui-agents, llm-api-function-calling-guide, mllms-in-practice-2026]
---

A user uploads a photo of their broken appliance. The MLLM identifies it as a dishwasher, reads the model number from the label in the image, calls your product database to look up the warranty status, and responds with repair instructions specific to that model. This isn't hypothetical — it's a workflow you can build today.

## What makes MLLM tool use different

Text-only LLMs with tool use are already powerful. MLLMs add a critical capability: **the model can extract information from visual input and use it to parameterize tool calls.**

Instead of the user typing "look up warranty for model DW-4521," they snap a photo. The model reads the model number, understands the context (a broken appliance), and calls the right function with the right arguments — all from a single image.

This creates new categories of applications:

- **Visual search and lookup** — Photograph a product, get pricing, reviews, or specifications
- **Document processing** — Upload a form, extract fields, call APIs to process the data
- **UI automation** — Screenshot of an interface, model identifies elements and performs actions
- **Physical world interaction** — Camera feed analysis triggering real-world actions (robotics, IoT)

## Architecture patterns

### Sequential: perceive, then act

The simplest pattern. The MLLM processes the image first, extracting relevant information into structured data. Then it decides which tools to call based on extracted information.

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a product support assistant. Identify products from images and look up their details."},
        {"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": image_url}},
            {"type": "text", "text": "What's the warranty status of this product?"}
        ]}
    ],
    tools=[{
        "type": "function",
        "function": {
            "name": "lookup_product",
            "parameters": {
                "type": "object",
                "properties": {
                    "model_number": {"type": "string"},
                    "brand": {"type": "string"},
                    "category": {"type": "string"}
                }
            }
        }
    }]
)
```

### Iterative: look, act, look again

For complex tasks, the model may need multiple rounds of visual analysis and tool calls. Example: analyzing a complex diagram, querying a database about one component, then re-examining the diagram in light of the query results.

### Multi-image with tools

Process multiple images in sequence, using tool calls to connect information across them. "Compare these two product labels and check if both are available in our inventory."

## Grounding tool calls in visual evidence

A key challenge: how do you verify that the model's tool call arguments actually correspond to what's in the image? If the model reads a serial number wrong, the downstream tool call will fail or return wrong results.

Strategies:
- **Ask the model to cite visual evidence.** Include in the system prompt: "Before calling a tool, state what you see in the image that justifies the call."
- **Structured extraction first.** Run a dedicated extraction step that pulls text/numbers from the image with high confidence before allowing tool calls.
- **Confidence thresholds.** Have the model express confidence in its visual reading. Low confidence → ask the user to confirm rather than calling the tool with uncertain parameters.
- **Validation after retrieval.** Cross-reference tool call results with visual information. If the product lookup returns "Washing Machine" but the image clearly shows a dishwasher, flag the discrepancy.

## UI agents: a special case

MLLM-powered UI agents are a rapidly evolving application of visual tool use. The model:

1. Receives a screenshot of an application
2. Identifies interactive elements (buttons, fields, menus)
3. Decides what action to take
4. Calls a tool that performs the UI action (click, type, scroll)
5. Receives the resulting screenshot
6. Repeats

This is fundamentally visual tool use in a loop. The challenges are unique: pixel-precise localization, understanding UI state, handling loading states and animations, and recovering from errors.

## Error handling

Tool use with visual input adds new failure modes:

- **Misread visual information** — OCR errors, wrong object identification
- **Ambiguous images** — Multiple products in frame, blurry text, poor lighting
- **Visual hallucination** — Model "sees" text or objects that aren't there
- **Context mismatch** — Image shows one thing, user asks about another

Build your error handling to expect these:

```python
# Validate tool arguments against visual extraction
extracted = extract_text_from_image(image)
if tool_args["model_number"] not in extracted["text_regions"]:
    # Model may have hallucinated the model number
    return ask_user_to_confirm(tool_args["model_number"])
```

## What's next

The trajectory is clear: MLLMs are becoming general-purpose agents that perceive the world through cameras and screens and act through tool calls. The current limitation is reliability — visual grounding errors cascade into wrong tool calls. As models improve at precise visual understanding, the range of automatable visual workflows will expand significantly.

For now, build with guardrails. Validate visual extractions, confirm before high-stakes tool calls, and always give users a way to correct the model's interpretation.
