---
title: "MLLMs for Scientific Figures and Diagrams: Extracting Knowledge from Visual Research"
depth: technical
pillar: practice
topic: mllms
tags: [mllms, scientific-figures, research, visual-reasoning, data-extraction]
author: bee
date: "2026-03-24"
readTime: 10
description: "How multimodal large language models interpret scientific charts, diagrams, and figures, with practical applications and honest assessment of limitations."
related: [mllms-chart-and-data-understanding, mllms-document-understanding-playbook, mllms-grounding-and-visual-reasoning]
---

Scientific papers are full of visual information — bar charts, line plots, flowcharts, molecular diagrams, microscopy images, circuit schematics, phase diagrams. Extracting structured knowledge from these figures has traditionally required domain expertise and manual effort. Multimodal large language models (MLLMs) can now interpret many types of scientific figures, opening up practical applications for literature review, data extraction, and research summarization. But the capabilities are uneven, and the failure modes can be subtle.

## What MLLMs Can Do With Scientific Figures

### Charts and Plots

This is the strongest capability area. Modern MLLMs (GPT-4o, Claude 3.5+, Gemini 1.5+) can:

- **Read bar charts** — identify categories, approximate values, compare bars
- **Interpret line charts** — describe trends, identify inflection points, compare multiple series
- **Parse scatter plots** — describe distributions, identify clusters, note outliers
- **Read pie charts** — identify segments and approximate proportions
- **Extract data from tables in figure form** — convert image tables to structured data

For straightforward charts with clear labels and good resolution, MLLMs extract information at a level comparable to a careful human reader. They handle log scales, dual y-axes, and stacked bars with reasonable accuracy.

```python
import anthropic, base64

def analyze_figure(image_path, question):
    client = anthropic.Anthropic()
    with open(image_path, "rb") as f:
        image_data = base64.standard_b64encode(f.read()).decode("utf-8")

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": image_data,
                }},
                {"type": "text", "text": question},
            ],
        }],
    )
    return response.content[0].text

# Example usage
result = analyze_figure(
    "figure_3a.png",
    "Extract the approximate values for each bar in this chart. "
    "Return as a markdown table with columns: Category, Value, Unit."
)
```

### Flowcharts and Process Diagrams

MLLMs handle flowcharts well when the structure is clear:

- Identifying nodes and edges
- Describing the process flow
- Converting visual flowcharts to text descriptions or pseudocode
- Identifying decision points and branches

Performance degrades with complex diagrams that have many crossing edges, small text, or non-standard layouts.

### Molecular and Chemical Structures

MLLMs can identify common molecular structures and functional groups. They can often name simple molecules from 2D structural diagrams and describe bonding patterns. For complex molecules, they may identify the general class (e.g., "this appears to be a polycyclic aromatic compound") without fully resolving the structure.

Specialized tools like DECIMER and MolScribe still outperform general MLLMs for precise chemical structure recognition (SMILES string extraction, for example). MLLMs are better for qualitative description than quantitative extraction.

### Microscopy and Imaging

For microscopy images, MLLMs can:

- Describe visible structures at a general level ("cellular tissue with clear nuclear staining")
- Identify common staining patterns (H&E, immunofluorescence)
- Note morphological features (cell shape, tissue architecture)
- Compare images side-by-side

They cannot replace domain-expert analysis. An MLLM might note "increased cellular density in the left region" but won't make a histopathological diagnosis.

## Benchmarks for Scientific Figure Understanding

Several benchmarks assess MLLM performance on scientific figures:

| Benchmark | Focus | What It Tests |
|-----------|-------|---------------|
| **ChartQA** | Chart understanding | Questions about chart values, trends, comparisons |
| **SciGraphQA** | Scientific plots | Questions from real papers about their figures |
| **FigureQA** | Synthetic figures | Yes/no questions about figure properties |
| **MathVista** | Math-heavy figures | Reasoning about mathematical plots and diagrams |
| **AI2D** | Diagrams | Science diagram understanding (K-12 level) |

Current state (approximate, as of early 2026):

- Top MLLMs score 80-90% on ChartQA — strong but not perfect
- SciGraphQA scores are lower (60-75%) — real-world scientific figures are messier than benchmarks
- Performance drops significantly on low-resolution images, small text, and complex multi-panel figures

## Practical Applications

### Literature Review Automation

Process a batch of papers and extract key results from their figures:

```python
def extract_key_results(figure_path, paper_context):
    prompt = f"""This figure is from a research paper. Context: {paper_context}

    1. What type of figure is this (bar chart, line plot, diagram, etc.)?
    2. What are the key findings shown?
    3. Extract any numerical results with their units.
    4. Note any statistical significance indicators.
    5. What are the axis labels and ranges?

    Be precise about numbers. If you cannot read a value clearly, say so
    rather than guessing."""

    return analyze_figure(figure_path, prompt)
```

This is useful for systematic reviews where you need to extract results from dozens or hundreds of papers. The MLLM output still needs human verification, but it reduces the work from "read every figure carefully" to "verify the extracted data."

### Data Extraction From Papers

When papers present data only in figures (no supplementary tables), MLLMs can reconstruct approximate data tables. This is inherently lossy — reading values from a bar chart introduces estimation error — but it's often better than nothing.

For critical applications, pair MLLM extraction with specialized chart digitization tools (WebPlotDigitizer, PlotDigitizer) that use pixel-level analysis for more precise value extraction.

### Research Summarization

Combining figure analysis with text understanding enables deeper paper summarization:

- "Summarize the key results from Figures 2-4 and how they support the paper's main claim"
- "Compare the experimental results in Figure 3 with the theoretical predictions in Figure 1"
- "Extract the performance comparison table from Figure 5 and identify which method performs best on each metric"

## Limitations and Failure Modes

### Hallucinated Data Points

The most dangerous failure mode. MLLMs sometimes report specific numerical values that are plausible but wrong. A bar that represents 47.3% might be reported as 52.1%. The value is in the right range, making the error hard to catch without checking the original figure.

Mitigation: always ask the model to express uncertainty. Prompt with "If you cannot read a value precisely, provide a range rather than a single number."

### Misread Axes

Log-scale axes, broken axes, and reversed axes are common sources of error. An MLLM might read a log-scale axis linearly, reporting values that are off by orders of magnitude.

### Complex Multi-Panel Figures

Scientific papers frequently use multi-panel figures (Figure 3a, 3b, 3c, etc.) with shared legends, nested insets, and annotations. MLLMs struggle with:

- Correctly associating panel labels with their content
- Reading small inset plots
- Following shared legends across panels
- Parsing dense annotations and callout lines

### Domain-Specific Notation

Feynman diagrams, crystallographic notation, electrical circuit symbols, and specialized notation systems are inconsistently recognized. The model might describe what it sees ("two lines meeting at a vertex with a wavy line") without understanding the domain meaning.

### Resolution Sensitivity

Low-resolution figures — common in older papers, compressed PDFs, and web-scraped images — significantly degrade performance. If the text in a figure is blurry to a human reader, expect the MLLM to struggle or hallucinate.

## Best Practices

1. **Use the highest resolution available.** Extract figures from PDFs at high DPI rather than screenshotting. Vector graphics (SVG) converted to high-res PNG outperform compressed JPEGs.

2. **Provide context.** Tell the model what field the figure is from, what the paper is about, and what you're looking for. "This is a dose-response curve from a pharmacology study" produces better analysis than "describe this figure."

3. **Ask specific questions.** "What is the value of the blue bar for condition B?" gets more accurate answers than "describe everything in this figure."

4. **Cross-validate critical values.** For any numerical value you plan to use in your own analysis, verify it against the original figure manually or with a second extraction method.

5. **Handle multi-panel figures by cropping.** Send individual panels as separate images rather than the entire multi-panel figure. This consistently improves accuracy.

6. **Be explicit about uncertainty.** Include instructions like "express uncertainty about any values you are not confident about" in your prompts.

MLLMs are a genuinely useful tool for working with scientific figures at scale. They won't replace careful reading of individual papers, but they make it feasible to process the visual information in hundreds of papers during a literature review. Use them for first-pass extraction and always verify the numbers that matter.
