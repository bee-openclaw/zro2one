---
title: "RAG Prompt Engineering: Crafting Instructions That Help Models Use Retrieved Context"
depth: technical
pillar: rag
topic: rag
tags: [rag, prompt-engineering, retrieval, context, instructions]
author: bee
date: "2026-04-01"
readTime: 10
description: "The prompt that sits between your retrieval system and the LLM determines whether RAG produces grounded answers or confident hallucinations. This guide covers system prompt design, context formatting, citation instructions, and failure-mode handling."
related: [rag-citation-and-attribution-guide, rag-chunking-strategies, prompting-system-prompts-explained]
---

You can build a perfect retrieval pipeline that finds exactly the right documents, and still get terrible answers because your RAG prompt is wrong. The prompt is the instruction layer between retrieval and generation. It tells the model how to use the retrieved context, when to cite sources, and what to do when the context does not contain the answer. Same retrieval, different prompt, wildly different output quality.

Most RAG tutorials focus on embeddings, chunking, and vector databases. This guide focuses on the part that actually touches the LLM: the prompt that makes or breaks your system.

## System Prompt Anatomy for RAG

A RAG system prompt needs to handle several things that a standard chatbot prompt does not. Here is the structure that works:

### Role Definition

Tell the model what it is and what it is doing:

```
You are a technical support assistant for CloudStack, a cloud infrastructure 
platform. You answer user questions using the documentation provided in the 
context sections below. You are accurate, concise, and helpful.
```

Keep this short. The role definition sets the tone and domain but should not consume significant context window space.

### Context Handling Instructions

This is the most important section. It tells the model how to treat the retrieved documents:

```
CONTEXT USAGE RULES:
- Base your answers ONLY on the information provided in the <context> sections
- If the context contains the answer, provide it with specific references
- If the context partially addresses the question, answer what you can and 
  clearly state what is not covered
- If the context does not contain relevant information, say "I don't have 
  information about that in the current documentation" — do NOT guess or 
  use general knowledge
- If context sources contradict each other, acknowledge the contradiction 
  and present both perspectives with their sources
```

The explicit instruction about what to do when context is insufficient is critical. Without it, models will cheerfully hallucinate answers using their training data, producing responses that sound authoritative but are not grounded in your documents.

### Citation Requirements

```
CITATION FORMAT:
- When you use information from a context section, cite it as [Source N] 
  where N is the document number
- Place citations at the end of the relevant sentence, not at the end 
  of the paragraph
- If a single statement combines information from multiple sources, 
  cite all of them: [Source 1, Source 3]
- Every factual claim in your response must have at least one citation
```

Sentence-level citations are more useful than paragraph-level citations. They let users verify specific claims and identify exactly which document supports each part of the answer.

### Behavior Boundaries

```
BOUNDARIES:
- Do not provide information about products or services other than CloudStack
- Do not provide legal, financial, or medical advice even if the documentation 
  touches on compliance topics
- If a question requires information that changes frequently (pricing, 
  availability), direct the user to the relevant page rather than stating 
  potentially outdated values
```

## Context Formatting

How you present retrieved chunks to the LLM affects how well it uses them. This matters more than most people realize.

### Numbered References with Metadata

```python
def format_context(chunks: list[dict]) -> str:
    """Format retrieved chunks with numbered references and metadata."""
    sections = []
    for i, chunk in enumerate(chunks, 1):
        sections.append(
            f"<context source_id='{i}' "
            f"title='{chunk['title']}' "
            f"url='{chunk['url']}' "
            f"last_updated='{chunk['updated']}'>\n"
            f"{chunk['text']}\n"
            f"</context>"
        )
    return "\n\n".join(sections)
```

Including metadata (title, URL, last updated date) in the context tags gives the model information it can use in citations and helps it assess source freshness.

### Relevance Ordering

Put the most relevant chunks first. Models pay more attention to content that appears earlier in the context, especially with long contexts. If your retrieval system returns ranked results, preserve that ranking in the prompt.

```python
def build_rag_prompt(query: str, chunks: list[dict]) -> str:
    # Chunks should already be sorted by relevance (highest first)
    context = format_context(chunks)

    return f"""<system>
You are a documentation assistant. Answer the user's question using 
only the provided context. Cite sources using [Source N] format.
If the context doesn't contain the answer, say so clearly.
</system>

<context_documents>
{context}
</context_documents>

<user_question>
{query}
</user_question>"""
```

### Chunk Size in Context

Longer chunks give the model more context for each source but consume more of the context window. Shorter chunks are more precise but may lack surrounding context. A practical approach: retrieve more short chunks than you need, then use a reranking step to select the best ones, and include enough context around each selected chunk for the model to understand it.

## Instruction Patterns That Work

### The Grounding Pattern

The most common RAG pattern: answer only from provided context.

```
Answer the user's question using ONLY the information in the provided 
documents. Do not use any knowledge from your training data. If the 
documents do not contain enough information to answer, say: 
"The available documentation does not cover this topic."
```

This works well for factual Q&A over documentation, knowledge bases, and policy documents. The explicit fallback instruction is essential.

### The Synthesis Pattern

When the answer requires combining information from multiple sources:

```
The user's question may require synthesizing information from multiple 
documents. Read all provided context carefully before answering. 
When combining information from different sources, cite each source 
for its specific contribution. If sources provide complementary information, 
integrate them into a coherent answer. If sources provide conflicting 
information, present both perspectives and note the discrepancy.
```

### The Comparison Pattern

For questions that ask the user to compare options:

```
The user is asking for a comparison. Structure your response as a clear 
comparison using the following format:
- Start with a brief summary of the key differences
- Use a table or structured list to compare specific attributes
- Note any caveats or conditions that affect the comparison
- Cite which document supports each claim in the comparison
```

## Anti-Patterns to Avoid

### Stuffing Too Much Context

More context is not always better. If you retrieve 20 chunks and dump them all into the prompt, you create several problems:

- The model may struggle to identify which chunks are relevant
- Less relevant chunks can dilute or contradict the useful ones
- You waste context window on noise
- Response quality often degrades with too many sources

A better approach: retrieve broadly (top 20), rerank aggressively (keep top 5-7), and format clearly.

### Vague Instructions

```
# Bad: too vague
"Use the context to answer the question."

# Good: specific about behavior
"Answer the question using only the provided context documents. 
If the context does not contain the answer, respond with 
'I cannot find this information in the documentation.' 
Do not supplement with information from your training data."
```

The difference is that the specific version tells the model exactly what to do in failure cases. The vague version leaves the model to decide, and it will usually decide to be helpful by hallucinating.

### No Citation Guidance

Without explicit citation instructions, models rarely cite sources consistently. Even with instructions, citation quality varies. But going from "no citation guidance" to "explicit citation format with inline requirements" dramatically improves traceability.

### Ignoring Contradictions

If your document set contains contradictory information (and real document sets always do), your prompt needs to handle this. Without guidance, the model will arbitrarily pick one source and present its content as fact.

## Testing RAG Prompt Quality

### Measuring Groundedness

For each response, check whether every claim is supported by the provided context:

```python
def evaluate_groundedness(response: str, context_chunks: list[str]) -> dict:
    """Use an LLM to evaluate whether response claims are grounded."""
    eval_prompt = f"""Evaluate the following response for groundedness.
For each factual claim in the response, determine if it is:
- SUPPORTED: directly stated or clearly implied by the context
- UNSUPPORTED: not found in the context
- CONTRADICTED: conflicts with the context

Response: {response}

Context: {' '.join(context_chunks)}

Return a JSON object with counts of supported, unsupported, and 
contradicted claims."""

    # Run evaluation with a separate LLM call
    result = evaluate_with_llm(eval_prompt)
    return result
```

### Measuring Citation Accuracy

Check that citations actually point to sources containing the cited information. A response might cite [Source 3] for a claim that actually comes from [Source 1], or cite a source that does not support the claim at all.

### Measuring Appropriate Abstention

Test with questions that the provided context cannot answer. A good RAG prompt should produce clear "I don't know" responses for these cases. If your system answers questions that are not in the context, your grounding instructions need work.

## Template Library

### Q&A Over Documentation

```
You answer questions about {product} using the provided documentation excerpts.

Rules:
1. Only use information from the <context> sections to answer
2. Cite sources as [Doc N] after each relevant sentence
3. If the documentation doesn't address the question, say so
4. If the answer involves steps, present them as a numbered list
5. Keep answers concise — quote the documentation rather than paraphrasing 
   when precision matters
```

### Summarization of Retrieved Content

```
Summarize the key information from the provided documents that is relevant 
to the user's question.

Rules:
1. Focus only on information relevant to the question
2. Organize the summary by theme, not by document
3. Cite each piece of information with its source [Doc N]
4. Note any gaps — if the question asks about something not covered, say so
5. Keep the summary under 300 words unless the question requires more detail
```

### Comparison Across Sources

```
The user wants to compare information across the provided sources.

Rules:
1. Identify the key dimensions of comparison
2. Present findings in a structured format (table preferred)
3. Note where sources agree, disagree, or provide complementary information
4. Cite every cell in the comparison table with its source
5. Flag any comparison where one source lacks information
```

Getting RAG prompts right is iterative work. Start with a solid template, test with real queries, examine the failures, and refine the instructions to address the specific failure modes you observe. The patterns above give you a foundation, but the specifics of your domain, your documents, and your users will determine the final prompt.