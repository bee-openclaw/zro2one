---
title: "MLLMs for Code and Visual Reasoning: When Models Read Diagrams, Screenshots, and Whiteboards"
depth: technical
pillar: building
topic: mllms
tags: [mllms, code-generation, visual-reasoning, diagrams, screenshots, multimodal]
author: bee
date: "2026-03-20"
readTime: 10
description: "Multimodal LLMs can now look at a screenshot, diagram, or whiteboard sketch and generate working code or structured analysis. Here's what works, what doesn't, and how to build with it."
related: [mllms-ui-understanding, mllms-chart-and-data-understanding, mllms-grounded-ui-agents]
---

The most surprising capability of modern multimodal LLMs isn't understanding photographs — it's understanding *structured visual information*. Diagrams, wireframes, screenshots, architecture sketches, handwritten notes. Feed a whiteboard photo to Claude or GPT-4o and ask for working code. It works more often than you'd expect.

## What MLLMs Can See

Modern vision-language models process images at resolutions up to 2048x2048 (sometimes higher with tiling) and can identify:

- **UI elements:** Buttons, text fields, dropdowns, navigation, layout structure
- **Diagrams:** Flowcharts, architecture diagrams, sequence diagrams, entity-relationship diagrams
- **Handwriting:** Legible handwritten notes, equations, pseudocode
- **Code:** Screenshots of code editors, terminal output, error messages
- **Data visualization:** Charts, graphs, tables in screenshots

The accuracy depends heavily on image quality, clarity, and how conventionally the content is structured.

## Screenshot to Code

The most immediately useful application: turning a screenshot or mockup into working code.

### How It Works

```python
import anthropic

client = anthropic.Anthropic()

def screenshot_to_code(image_path: str, framework: str = "react") -> str:
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_data
                    }
                },
                {
                    "type": "text",
                    "text": f"""Convert this UI screenshot into a working {framework} 
                    component. Use Tailwind CSS for styling. Match the layout, 
                    colors, and spacing as closely as possible. Include all 
                    visible text content."""
                }
            ]
        }]
    )
    return response.content[0].text
```

### What Works Well

- **Marketing pages and landing pages** — relatively flat layouts with clear visual hierarchy
- **Form interfaces** — the model recognizes input fields, labels, and buttons reliably
- **Dashboard layouts** — cards, grids, sidebar navigation
- **Mobile app screens** — standard mobile UI patterns

### What Struggles

- **Pixel-perfect reproduction** — the model captures layout and intent, not exact pixels
- **Complex interactivity** — hover states, animations, drag-and-drop
- **Custom components** — the model defaults to standard UI patterns; highly custom designs get approximated
- **Dense data tables** — small text in screenshots may be misread

### Production Tips

1. **High-resolution screenshots.** The difference between a 720p and 1440p screenshot is dramatic for code quality.
2. **Annotate when possible.** Red circles, arrows, or text annotations help the model focus.
3. **Specify the tech stack explicitly.** "React with Tailwind" produces better results than "make a website."
4. **Iterate.** The first generation is a starting point. Paste the code back with the screenshot and ask for corrections.

## Diagram Understanding

### Architecture Diagrams

MLLMs can parse architecture diagrams and generate:
- Text descriptions of the system
- Infrastructure-as-code (Terraform, CloudFormation)
- API specifications
- Sequence diagrams in Mermaid/PlantUML

```
Input: Photo of whiteboard with boxes labeled "API Gateway", 
"Auth Service", "User DB", arrows showing request flow

Prompt: "Describe this architecture and generate a Mermaid 
sequence diagram for the main request flow."
```

The model handles standard diagramming conventions (boxes for services, arrows for data flow, cylinders for databases) well. Unusual or artistic diagram styles confuse it.

### Flowcharts to Code

Flowcharts map naturally to code. The model can follow decision diamonds, process boxes, and flow arrows to generate:

```python
# From a flowchart image showing order processing logic:

def process_order(order):
    if not validate_inventory(order):
        return notify_customer("out_of_stock")
    
    if order.total > 1000:
        if not fraud_check(order):
            return flag_for_review(order)
    
    payment = process_payment(order)
    if payment.success:
        fulfill_order(order)
        send_confirmation(order)
    else:
        return retry_payment(order, max_attempts=3)
```

The accuracy is highest for simple, well-drawn flowcharts and degrades with complexity.

### Entity-Relationship Diagrams

ERDs to SQL schema is a natural fit:

```
Input: ER diagram photo showing Users, Orders, Products with relationships

Output:
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Error Message Analysis

A underappreciated use case: screenshot an error message (terminal output, browser console, stack trace) and ask the MLLM to diagnose it.

This works better than pasting text for several reasons:
- Terminal screenshots capture colors and formatting that indicate severity
- Browser devtools screenshots show the network tab, console, and DOM simultaneously
- Stack traces in IDEs include syntax highlighting that helps identify the relevant frames

```
Prompt: "Here's a screenshot of my terminal after running the deploy 
script. Identify the root cause of the failure and suggest a fix."
```

## Whiteboard to Specification

Perhaps the highest-leverage use case for teams: photograph a whiteboard after a planning session and generate a structured specification.

```
Prompt: "This whiteboard photo is from our sprint planning. 
Extract all the user stories, acceptance criteria, and 
technical notes. Format as a structured document I can 
paste into our project tracker."
```

The model handles legible handwriting surprisingly well. Messy handwriting or overlapping notes still cause errors, but for reasonably neat whiteboard content, extraction accuracy is 80-90%.

## Building Reliable Visual Reasoning Pipelines

For production use, add verification layers:

```python
async def visual_reasoning_pipeline(image: bytes, task: str) -> dict:
    # Step 1: Describe what the model sees
    description = await mllm.describe(image)
    
    # Step 2: Generate the output
    output = await mllm.generate(image, task)
    
    # Step 3: Self-verify
    verification = await mllm.verify(
        image, output,
        prompt="Compare this output against the original image. "
               "List any discrepancies."
    )
    
    # Step 4: Flag low-confidence results
    if verification.has_discrepancies:
        output.confidence = "low"
        output.issues = verification.discrepancies
    
    return output
```

The self-verification step catches many errors. The model is often better at identifying mistakes in generated output than at getting it right the first time.

## Limitations

- **Spatial reasoning is approximate.** The model understands relative positioning (left of, above, inside) but struggles with precise spatial relationships.
- **Small text is unreliable.** Anything below ~10px in a screenshot may be misread or ignored.
- **Complex diagrams with many elements.** Beyond ~20-30 distinct elements, the model starts dropping or confusing items.
- **Handwriting quality matters enormously.** Neat printing: 90%+ accuracy. Cursive or messy: 50-70%.

## The Practical Impact

Visual reasoning turns MLLMs from text tools into general-purpose understanding tools. The ability to point a model at a screenshot, diagram, or whiteboard and get structured output is genuinely new and genuinely useful.

The teams getting the most value are treating it as a first-draft tool: generate, verify, refine. The model does in seconds what would take minutes or hours of manual transcription or coding. The human provides the judgment that the model can't.
