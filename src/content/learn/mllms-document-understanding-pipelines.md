---
title: "Document Understanding with Multimodal LLMs: From PDFs to Structured Data"
depth: applied
pillar: practice
topic: mllms
tags: [mllms, document-understanding, ocr, extraction, multimodal]
author: bee
date: "2026-04-02"
readTime: 10
description: "Multimodal LLMs can read documents the way humans do — understanding layout, tables, and visual structure alongside text. Here's how to build document understanding pipelines that actually work."
related: [mllms-video-understanding-patterns, mllms-retail-product-recognition, multimodal-ai-grounding-and-alignment]
---

Document understanding has been transformed by multimodal LLMs. The old pipeline — OCR the text, parse the layout with heuristics, extract fields with regex — was fragile and required custom engineering for every document type. Modern multimodal models read documents more like humans do: they see the visual layout and understand the text simultaneously.

This is not just a technical improvement. It changes what is economically feasible. Extracting structured data from invoices, contracts, medical records, and government forms is now a prompting problem rather than a computer vision engineering problem.

## Why Multimodal Beats OCR-First

Traditional document processing:

1. Run OCR to extract text.
2. Lose all layout information (columns, tables, headers, visual hierarchy).
3. Attempt to reconstruct structure from text positions.
4. Write extraction rules for each document type.
5. Debug endlessly when a new document layout breaks your rules.

Multimodal approach:

1. Send the document image to the model.
2. Ask for the information you need.
3. The model reads the text, understands the layout, and extracts structured data.

The key advantage is that multimodal models understand visual structure natively. They know that the number next to the word "Total" at the bottom of a column of numbers is the total. They know that text in a header row describes the column below it. They know that a signature block at the bottom of a page has a different function than body text. This structural understanding is extremely difficult to replicate with OCR plus heuristics.

## Building the Pipeline

### Step 1: Document Ingestion

Convert documents to images. For PDFs, render each page as a high-resolution image (300 DPI is the sweet spot — high enough for text legibility, low enough to keep file sizes manageable). For multi-page documents, process each page independently or in small groups.

**Format considerations:**
- **PDFs with selectable text:** You can extract the text layer and use a text-only LLM, but you lose layout information. For documents where layout matters (forms, tables, invoices), the image approach is better.
- **Scanned documents:** Image quality matters. Apply pre-processing (deskewing, contrast adjustment, noise removal) for poor-quality scans before sending to the model.
- **Large documents:** Multimodal models have image resolution limits. For dense documents, consider tiling — splitting the page into overlapping regions and processing each separately.

### Step 2: Schema Definition

Define the output schema before prompting. Specify every field you want to extract, its type, and whether it is required or optional. Use the structured output techniques from your model provider.

For an invoice extraction:

```json
{
    "vendor_name": "string",
    "invoice_number": "string",
    "date": "string (YYYY-MM-DD)",
    "line_items": [
        {
            "description": "string",
            "quantity": "number",
            "unit_price": "number",
            "total": "number"
        }
    ],
    "subtotal": "number",
    "tax": "number | null",
    "total": "number"
}
```

### Step 3: Prompting

The prompt should include:

- **The task:** "Extract the following information from this invoice image."
- **The schema:** What fields to extract and their formats.
- **Handling instructions:** What to do when a field is not present, ambiguous, or partially visible. "If a field is not visible in the document, return null rather than guessing."
- **Format examples:** For complex extractions, a few-shot example of the expected output helps calibrate the model.

### Step 4: Post-Processing and Validation

Even with good models and structured output, validate:

- **Cross-field consistency.** Do the line item totals sum to the subtotal? Does the subtotal plus tax equal the total? These arithmetic checks catch extraction errors that are invisible to the model.
- **Format normalization.** Dates, currency amounts, and phone numbers come in many formats. Normalize to your target format after extraction.
- **Confidence filtering.** If your model provides confidence scores, route low-confidence extractions to human review rather than accepting them automatically.

## Handling Different Document Types

### Tables

Tables are where multimodal models shine compared to OCR. The model sees the visual grid structure and can extract tabular data with column headers correctly associated with values. For complex tables (merged cells, nested headers, spanning rows), include a prompt instruction like "parse the table preserving the header hierarchy."

### Forms

Fillable forms with label-value pairs are straightforward. The model identifies labels, associates them with their corresponding filled values, and extracts the pairs. Checkboxes and radio buttons are also handled well — the model can distinguish checked from unchecked states.

### Handwritten Content

Modern multimodal models read handwriting with reasonable accuracy, though not as reliably as printed text. For critical handwritten fields (signatures, handwritten notes, filled forms), consider flagging for human review when the content is ambiguous.

### Multi-Language Documents

Multimodal LLMs handle multilingual documents well — a form with headers in English and values in Japanese, or a contract mixing French and Arabic. The model processes each language without requiring language detection or separate OCR models.

## Production Considerations

**Cost.** Image-based processing is more expensive per request than text-only processing. For high-volume document processing, the cost of sending high-resolution images to a frontier model adds up. Consider using smaller, specialized models for routine document types and reserving frontier models for complex or novel layouts.

**Latency.** Processing a full-page image takes longer than processing extracted text. For real-time applications, pipeline the page processing and return results incrementally.

**Accuracy monitoring.** Establish a human-reviewed sample to continuously measure extraction accuracy. Document understanding quality varies significantly across document types, and you need to detect degradation early.

**Fallback paths.** For documents that the model consistently struggles with (extremely dense tables, poor scan quality, unusual layouts), have a fallback path to human review. Fully automated extraction with a 95% accuracy rate means 1 in 20 documents has errors — whether that is acceptable depends entirely on your use case.

The multimodal approach to document understanding is not perfect, but it has moved the field from "custom engineering per document type" to "prompting plus validation." For most document processing tasks, that shift makes the difference between a project that takes months and one that takes days.
