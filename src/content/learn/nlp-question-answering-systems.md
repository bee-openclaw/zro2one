---
title: "Building Question Answering Systems: From Extractive to Generative"
depth: applied
pillar: foundations
topic: nlp
tags: [nlp, question-answering, rag, extractive-qa, generative-ai, information-retrieval, chatbots]
author: bee
date: "2026-03-10"
readTime: 9
description: "The engineering of question answering systems — from traditional extractive QA to modern RAG-based approaches. What each approach is good for, where they fail, and how to choose."
related: [rag-production-architecture, nlp-modern-landscape, ai-foundations-embeddings-explained]
---

Question answering (QA) is the canonical NLP task: given a question and (optionally) a context, produce the correct answer. The approaches to solving it have changed substantially over the past several years, and the best solution today depends heavily on the specific problem — the type of questions, the source of knowledge, the precision requirements, and the latency constraints.

This guide covers the landscape of QA approaches and when to use each.

## Types of question answering

**Closed-book QA:** The system must answer from its training knowledge, without access to external context. Classic format: "What year was the Eiffel Tower built?" — the answer should come from the model's parameters.

**Open-book (extractive) QA:** Given a document (or retrieved set of documents), find the answer span — the exact passage that contains the answer. The output is a substring of the input text.

**Generative QA:** Generate a natural language answer, potentially synthesizing information from multiple sources. The answer isn't necessarily a verbatim extract — it's a new sentence that correctly answers the question.

**Conversational QA:** Multi-turn question answering where the current question may depend on conversation history ("What did he say about X?" requires knowing who "he" is).

**Knowledge base QA:** Answer factual questions by querying a structured knowledge base (a graph or relational database), translating natural language to structured queries.

Modern production QA systems are almost always some form of open-book generative QA, implemented as retrieval-augmented generation (RAG). Understanding why requires tracing the evolution.

## Extractive QA: the BERT era

Before generative models, the dominant approach to document QA was extractive: given a question and a passage, predict the start and end token of the answer span within the passage.

The standard formulation: fine-tune a BERT-family model on the SQuAD dataset (Stanford Question Answering Dataset). The model learns to predict which tokens in the context are the answer to the question.

**Strengths of extractive QA:**
- **Verifiable.** The answer is a direct quote from the source. Hallucination is impossible — either the span is in the text or it's not.
- **Precise.** Extractive models can achieve near-human performance on well-formed, factual questions over well-written passages.
- **Latent.** Lightweight inference; no large generative model required.

**Limitations:**
- Requires the answer to be literally present in the context. If the question is "What is the annual revenue?" and the document says "Last year, the company earned $4.2 billion," an extractive model needs to learn that "$4.2 billion" is the correct span — and that learning may generalize poorly to paraphrases.
- Doesn't synthesize across multiple passages. If the answer requires combining information from two paragraphs, extractive models fail.
- Can't answer "list all X" questions — those require generation, not span extraction.
- Poor at questions requiring inference or calculation.

## The retrieval + reader pipeline

For QA over large document collections, extractive models are paired with a retriever:

1. **Retriever:** Given the question, find relevant passages from a large corpus (using BM25 keyword search, dense retrieval with embeddings, or hybrid).

2. **Reader:** Given the question and retrieved passages, predict the answer span.

This **retrieval + reader** architecture (Dense Passage Retrieval + extractive reader was the state of the art circa 2020-2021) remains useful for:
- Compliance applications requiring explicit source attribution
- Environments where hallucination is completely unacceptable
- High-throughput applications where smaller models are required

## Generative QA: why it won

Generative models (T5, GPT, and their descendants) changed the QA calculus in several ways:

**Synthesis capability.** A generative model can combine information from multiple passages into a coherent answer. "What are the main arguments made across these three documents?" is a generative task.

**Natural fluency.** The generated answer reads naturally; extractive spans often don't ("the revenue was 4.2 billion USD in" — cut off mid-sentence due to span extraction).

**Inference and calculation.** A generative model can reason about retrieved content, not just locate spans. "The document says the project was delayed by 3 months and was originally due in Q3 2024. When is it now expected?" — answering this requires arithmetic that extractive models can't perform.

**Handling no-answer cases.** When no relevant passage is found, a generative model can say "I don't have enough information to answer this question" — a coherent refusal that extractive models handle poorly.

The tradeoff: generative models can hallucinate — produce confident, fluent, wrong answers. This is the core engineering challenge of generative QA systems.

## RAG architecture for production QA

The dominant production pattern is retrieval-augmented generation:

1. **Index time:** Chunk documents, embed chunks, store in vector database
2. **Query time:**
   a. Encode the question
   b. Retrieve top-K relevant chunks
   c. Construct a prompt: `[Context: {retrieved chunks}] [Question: {question}] [Answer:]`
   d. Generate the answer

The quality of a RAG QA system depends on:

**Retrieval quality.** If the relevant information isn't retrieved, the generator can't use it. This is where most RAG systems fail in practice. Improvements: hybrid search (BM25 + dense), query rewriting, HyDE (generate a hypothetical answer and retrieve against that), multi-hop retrieval.

**Chunk quality.** How documents are divided into chunks fundamentally affects retrieval quality. Chunks too large: irrelevant content drowns the signal. Chunks too small: individual chunks lack enough context to be useful.

**Generator faithfulness.** Prompting the model to "only answer based on the provided context" and "say I don't know if the answer isn't in the context" reduces hallucination. Adding citations ("answer with the source chunk for each claim") allows downstream verification.

**Context window management.** When K retrieved chunks are large, they may overflow the model's context window or dilute the relevant signal. Reranking (select the most relevant N of K retrieved chunks before generation) helps.

## Evaluating QA systems

**For extractive QA:**
- **Exact Match (EM):** Is the predicted span exactly equal to the ground truth? Strict.
- **F1 score:** Token overlap between predicted span and ground truth. Partial credit for partially correct answers.

**For generative QA:**
- **ROUGE/BLEU:** N-gram overlap with reference answers. Unreliable for QA because correct paraphrases score low.
- **BERTScore:** Semantic similarity between generated answer and reference. Better than ROUGE.
- **Human evaluation:** For production systems, periodic human rating of answer accuracy and completeness. Labor-intensive but most reliable.
- **LLM-as-judge:** Use a frontier LLM to score answer accuracy given the question, context, and generated answer. Increasingly standard for automated evaluation.
- **Faithfulness:** Does the answer contain only claims supported by the retrieved context? Can be evaluated with an NLI (natural language inference) model that checks whether each claim in the answer is entailed by the retrieved passages.

## Conversational QA: the additional complexity

Conversational QA (chatbots that maintain context over multiple turns) adds two complexity layers:

**Coreference resolution.** "What did she say about the deadline?" — resolving "she" requires conversational context. Solutions: include recent conversation history in the retrieval query, or explicitly resolve references before retrieval.

**Context accumulation.** The model may need to track information across many turns. Solutions: maintain a running summary of the conversation, use a long-context model, or implement session memory.

**Query evolution.** Users often start with a broad question and refine: "Tell me about the merger." → "What were the financial terms?" → "What's the timeline?" Each refinement is a new retrieval query that may need context from prior answers.

## Choosing the right approach

**Use extractive QA when:**
- Source attribution and verifiability are non-negotiable
- Questions are factoid and answers are explicitly stated in text
- Latency or cost requires a small model
- The domain is narrow enough that span extraction generalizes well

**Use generative RAG when:**
- Questions require synthesis across passages
- Natural language fluency matters
- The question set is diverse and unpredictable
- You need to handle "no answer" cases gracefully

**Use closed-book LLM QA when:**
- Questions are about well-established, widely-documented facts
- Real-time retrieval is too slow for the application
- The knowledge domain matches what frontier models were trained on

---

Question answering is now one of the most mature production AI applications. The shift from extractive models to generative RAG was driven by real capability improvements — synthesis, inference, fluency. The engineering discipline around retrieval quality, chunk design, and evaluation is what separates QA systems that serve users well from ones that confidently hallucinate.
