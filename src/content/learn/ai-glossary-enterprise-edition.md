---
title: "AI Glossary: Enterprise Edition"
depth: applied
pillar: practice
topic: ai-glossary
tags: [glossary, enterprise, ai-adoption, governance, risk, procurement, mlops]
author: bee
date: "2026-03-10"
readTime: 9
description: "The AI terms that actually come up in enterprise contexts — procurement conversations, governance committees, vendor evaluations, and cross-functional AI initiatives."
related: [ai-glossary-builders-edition, ai-glossary-operators-edition, ai-tools-stack-by-job-function]
---

Enterprise AI conversations have their own vocabulary — a mix of technical terms from ML, governance language from risk and compliance, and vendor terminology that often obscures more than it reveals. This glossary covers the terms that actually come up in procurement decisions, steering committees, and cross-functional AI initiatives.

---

**AI Governance:** The set of policies, processes, and accountability structures that guide how an organization develops, deploys, and monitors AI systems. Includes who can approve AI use cases, how models are evaluated for risk, what documentation is required, and how incidents are escalated. Often conflated with AI policy (which is typically narrower — specific rules for specific use cases).

**AI Policy:** A specific document or set of rules governing AI use in an organization. Typically covers: acceptable use cases, data handling requirements, disclosure obligations (when must users be told they're interacting with AI?), prohibited uses, and approval workflows. Different from AI governance (the broader system) and AI strategy (the roadmap).

**AI Readiness:** An organization's capacity to effectively deploy AI. Covers data infrastructure, technical talent, governance structures, and change management capability. Often the real bottleneck — organizations purchase AI capabilities before they've built the readiness to use them well.

**AI Risk:** The set of potential harms associated with an AI system. Typically categorized along dimensions of probability (how likely is the harm?), severity (how bad if it happens?), and reversibility (can it be undone?). Key risk categories: accuracy risk (wrong outputs), reliability risk (inconsistent performance), safety risk (physical or financial harm), fairness risk (disparate impact), privacy risk (data exposure), and reputational risk.

**AI Steering Committee:** Cross-functional body (IT, legal, compliance, business units, often CISO) that reviews and approves AI initiatives, sets policy, and monitors adoption. The governance authority for AI in organizations that have moved beyond ad hoc adoption.

**Auditability:** The degree to which a model's decisions can be examined after the fact. Auditability requirements vary by use case — regulated industries (financial services, healthcare) typically require high auditability; internal productivity tools typically require low auditability. Auditability is related to but distinct from explainability (which is about understanding why a decision was made, not just what it was).

**Bring Your Own Model (BYOM):** Enterprise platforms that allow customers to use their own AI models instead of (or in addition to) platform-native models. The enterprise version of "model flexibility" — relevant for organizations with proprietary models, specific performance requirements, or data residency constraints that prevent use of third-party model APIs.

**Change Management (AI context):** The organizational work required to move from awareness of AI capabilities to effective, sustained adoption. Often significantly underestimated relative to technical implementation. Includes training, process redesign, incentive alignment, and managing resistance. Many enterprise AI projects fail at the change management layer, not the technical layer.

**Compliance-Ready AI:** Marketing term (use with appropriate skepticism) describing AI systems built with features that make regulatory compliance easier — audit logs, configurable content policies, data residency options, SOC 2 / ISO 27001 certifications, etc. Not a guarantee of compliance; it means the vendor has thought about compliance requirements.

**Data Residency:** Requirement that data (including prompts sent to AI systems and AI outputs) be stored and processed within a specific geographic region, typically for regulatory or sovereignty reasons. Relevant for EU organizations under GDPR, government contractors, healthcare organizations, and multi-national companies operating in jurisdictions with strong data localization requirements.

**Enterprise Agreement (EA):** Multi-year, volume-based contract with an AI vendor, typically providing lower per-unit costs in exchange for committed spend. EAs often include additional enterprise features (SSO, audit logs, enhanced SLAs, dedicated support). Typically negotiated when annual AI spend reaches a threshold that justifies the procurement overhead.

**EU AI Act Classification:** Under the EU AI Act, AI systems are classified by risk level: *Unacceptable risk* (prohibited — e.g., social scoring systems), *High risk* (regulated, with conformity requirements — e.g., credit scoring, hiring systems, critical infrastructure), *Limited risk* (transparency obligations — e.g., chatbots must disclose they're AI), *Minimal risk* (no specific obligations — e.g., spam filters). Most enterprise AI products fall in the Limited or High risk categories depending on the use case.

**Explainability:** The ability to provide human-understandable reasons for why an AI system produced a specific output. Technically distinct from interpretability (understanding the model's internal workings). For most enterprise applications, explainability means "can you give the user or auditor a plausible account of why this output was generated?" rather than a full mechanistic explanation. Often required for high-stakes decisions (loan approval, medical recommendations, hiring).

**Foundation Model:** A large model trained on broad data and intended to be adapted (via prompting, fine-tuning, or RAG) for a wide range of tasks. Contrast with task-specific models trained for a single application. The enterprise adoption of foundation models (via APIs or self-hosted deployment) is the dominant AI procurement pattern in 2026.

**Guardrails:** Constraints applied to AI systems to prevent undesired outputs. Implemented as input filters (screen the user's message), output filters (screen the model's response), or both. Common enterprise guardrails: topic restrictions (the model won't discuss competitors), toxicity filters, PII detection, and factual grounding requirements (the model must cite a source).

**Human in the Loop (HITL):** A system design where humans review or approve AI outputs before they take effect. Degree varies: in a high-HITL system, humans approve every AI decision; in a low-HITL system, humans only review flagged or low-confidence cases. Most regulated enterprise applications require some form of HITL for high-stakes decisions.

**LLM Gateway / AI Gateway:** Enterprise middleware that sits between applications and AI model APIs. Provides centralized logging, rate limiting, access control, cost management, model routing, and content filtering. Increasingly common in organizations with multiple teams using multiple AI providers. Examples: LiteLLM, Portkey, Kong AI Gateway.

**Model Cards:** Documentation artifact describing a machine learning model's intended use, performance characteristics, limitations, training data, and evaluation results. Increasingly expected by enterprise buyers as part of model procurement. Major model providers publish model cards; enterprise buyers are beginning to require them for internally developed models.

**MLOps:** The operational discipline for managing machine learning models in production — training pipelines, deployment, monitoring, versioning, and retraining. The enterprise version of DevOps applied to ML systems. Key concerns: model drift (performance degradation over time), A/B testing for model updates, reproducibility, and cost management.

**Model Drift:** Degradation in a model's performance over time as the real-world distribution it encounters diverges from the distribution it was trained on. Causes: changed user behavior, changes in the data the model processes, or (for LLM-based systems) changes in the underlying model via provider updates. Monitoring for drift is a core MLOps responsibility.

**Model Risk Management (MRM):** The formal discipline (required in financial services by OCC/Fed guidance) of assessing, mitigating, and controlling risks associated with model use. For traditional ML models, MRM frameworks are well-established. Extending MRM to LLMs is an active area of work — the validation and ongoing monitoring approaches for generative AI are less mature than for predictive models.

**Private Deployment / Self-hosted LLM:** Running AI models on your own infrastructure rather than via a cloud provider's API. Motivations: data security, customization, cost at scale, or regulatory requirements. Requires significant infrastructure investment and ML engineering capacity. Increasingly viable as open-weight models (LLaMA, Mistral, Qwen, Gemma) improve.

**Prompt Injection:** An attack where malicious content in the data a model processes overrides its instructions. Enterprise concern: an LLM-powered system that reads emails, documents, or web content could be manipulated by an attacker who embeds instructions in that content ("Ignore previous instructions and..."). Defense involves input sanitization, privilege separation, and careful system design.

**RAG (Retrieval-Augmented Generation):** Architecture where an AI system retrieves relevant information from a knowledge base at query time and includes it in the prompt before generating a response. The standard enterprise approach for building AI systems that answer questions about company-specific documents and data. See the RAG series for technical detail.

**SLA (Service Level Agreement) — AI context:** Contract terms defining acceptable model behavior and availability. For AI, this includes: uptime guarantees, response latency commitments, model consistency (will the same prompt give the same answer?), and sometimes accuracy guarantees. AI SLAs are less mature than SLAs for traditional software and often require careful negotiation.

**Total Cost of Ownership (TCO) — AI context:** The full cost of an AI initiative beyond licensing: implementation costs, integration engineering, training, ongoing prompt/model maintenance, human review workflows, and the cost of errors. API pricing is often a small fraction of AI TCO. Organizations that only compare API costs often underestimate what AI actually costs to deploy well.

---

*The AI vocabulary is still being standardized — terms mean different things to different vendors and practitioners. When in doubt, ask for the specific definition in context.*
