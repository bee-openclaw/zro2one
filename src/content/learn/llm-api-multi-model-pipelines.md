---
title: "LLM API Integration: Building Multi-Model Pipelines"
depth: technical
pillar: building
topic: llm-api-integration
tags: [llm-api-integration, multi-model, pipelines, orchestration, routing]
author: "bee"
date: "2026-03-14"
readTime: 10
description: "How to build production multi-model LLM pipelines—routing strategies, fallback chains, orchestration patterns, cost optimization, and practical implementation with code examples."
related: [llm-api-integration-guide, llm-api-fallbacks-and-failover-guide, llm-api-cost-optimization-guide]
---

## Why Multi-Model?

No single LLM is best at everything. GPT-5 excels at creative writing but costs more than you'd want for simple classification. Claude handles long documents well but might not be your first choice for code generation. Mistral is cost-effective for routine tasks but may lack the reasoning depth for complex analysis.

Multi-model pipelines let you use the right model for each step of a workflow, optimizing for quality, cost, latency, and reliability. This isn't theoretical—it's how most production AI systems work in 2026.

## Core Patterns

### Pattern 1: Router-Based Selection

Route each request to the most appropriate model based on task characteristics:

```python
class ModelRouter:
    def __init__(self):
        self.routes = {
            'classification': ModelConfig('gpt-4o-mini', max_tokens=100),
            'summarization': ModelConfig('claude-sonnet', max_tokens=1000),
            'code_generation': ModelConfig('gpt-5', max_tokens=4000),
            'translation': ModelConfig('mistral-large', max_tokens=2000),
            'simple_qa': ModelConfig('mistral-small', max_tokens=500),
        }
    
    def route(self, task_type: str, input_text: str) -> ModelConfig:
        # Complexity-based override
        if len(input_text) > 50000:
            return ModelConfig('claude-sonnet', max_tokens=4000)  # Long context
        
        return self.routes.get(task_type, self.routes['simple_qa'])
```

**When to use**: When you have distinct task types with known model strengths.

### Pattern 2: Cascade (Quality Escalation)

Start with a cheap, fast model. If confidence is low, escalate to a more capable (and expensive) model:

```python
async def cascade_query(prompt: str, confidence_threshold: float = 0.8):
    # Try the fast/cheap model first
    result = await call_model('mistral-small', prompt)
    
    if result.confidence >= confidence_threshold:
        return result
    
    # Escalate to mid-tier
    result = await call_model('gpt-4o-mini', prompt)
    
    if result.confidence >= confidence_threshold:
        return result
    
    # Final escalation to the best model
    return await call_model('gpt-5', prompt)
```

**When to use**: When most requests are simple (handled by cheap models) but some require more capability. Can reduce costs by 60-80% compared to always using the best model.

**The hard part**: Defining "confidence." Options include:
- Self-reported confidence ("Rate your confidence 1-10")
- Output structure validation (did it produce valid JSON?)
- Length heuristics (very short answers to complex questions may indicate failure)
- A separate classifier that evaluates response quality

### Pattern 3: Ensemble (Consensus)

Query multiple models and aggregate their outputs:

```python
async def ensemble_query(prompt: str, models: list[str]):
    results = await asyncio.gather(*[
        call_model(model, prompt) for model in models
    ])
    
    # For classification: majority vote
    if task_type == 'classification':
        return majority_vote(results)
    
    # For generation: use a judge model to pick the best
    judge_prompt = format_judge_prompt(prompt, results)
    return await call_model('gpt-5', judge_prompt)
```

**When to use**: High-stakes decisions where accuracy matters more than cost or latency. Common in content moderation, medical triage, and financial analysis.

### Pattern 4: Pipeline (Sequential Processing)

Each model handles one stage of a multi-step workflow:

```python
async def research_pipeline(question: str):
    # Step 1: Query decomposition (fast model)
    sub_questions = await call_model('gpt-4o-mini', 
        f"Break this into 3-5 sub-questions: {question}")
    
    # Step 2: Research each sub-question (parallel, mid-tier)
    research = await asyncio.gather(*[
        call_model('claude-sonnet', f"Research: {sq}") 
        for sq in sub_questions
    ])
    
    # Step 3: Synthesize (best model)
    synthesis = await call_model('gpt-5',
        f"Synthesize these findings into a comprehensive answer:\n"
        f"Original question: {question}\n"
        f"Research: {format_research(research)}")
    
    return synthesis
```

**When to use**: Complex workflows where different steps have different requirements.

## Orchestration Architecture

### The Router Layer

A central component that handles model selection, request formatting, and response normalization:

```python
class LLMOrchestrator:
    def __init__(self):
        self.providers = {
            'openai': OpenAIProvider(api_key=...),
            'anthropic': AnthropicProvider(api_key=...),
            'mistral': MistralProvider(api_key=...),
        }
        self.router = ModelRouter()
        self.fallback_chain = FallbackChain()
        self.rate_limiter = RateLimiter()
        self.metrics = MetricsCollector()
    
    async def query(self, prompt, task_type, **kwargs):
        model = self.router.route(task_type, prompt)
        
        await self.rate_limiter.acquire(model.provider)
        
        try:
            start = time.monotonic()
            result = await self.providers[model.provider].call(
                model=model.name, prompt=prompt, **kwargs
            )
            self.metrics.record(model, time.monotonic() - start, success=True)
            return result
            
        except (RateLimitError, TimeoutError, ServiceError) as e:
            self.metrics.record(model, 0, success=False, error=e)
            return await self.fallback_chain.execute(prompt, task_type, **kwargs)
```

### Fallback Chains

Every production system needs fallback logic:

```python
class FallbackChain:
    def __init__(self):
        self.chains = {
            'code_generation': ['gpt-5', 'claude-sonnet', 'mistral-large'],
            'summarization': ['claude-sonnet', 'gpt-4o-mini', 'mistral-large'],
            'classification': ['gpt-4o-mini', 'mistral-small', 'local-model'],
        }
    
    async def execute(self, prompt, task_type, **kwargs):
        chain = self.chains.get(task_type, self.chains['classification'])
        
        for model in chain:
            try:
                return await call_model(model, prompt, **kwargs)
            except Exception:
                continue
        
        raise AllModelsFailedError()
```

### Response Normalization

Different providers return different response formats. Normalize everything:

```python
@dataclass
class NormalizedResponse:
    content: str
    model: str
    provider: str
    usage: TokenUsage
    latency_ms: float
    finish_reason: str
    raw_response: Any  # Keep the original for debugging
```

## Cost Optimization

### Token-Level Routing

For chat applications, route based on conversation complexity:

- **Turn 1-2** (greeting, simple questions): Cheapest model
- **Complex reasoning detected**: Upgrade to capable model
- **Code blocks requested**: Route to code-specialized model

### Prompt Caching

Both OpenAI and Anthropic now support prompt caching. For multi-model pipelines:

- Cache system prompts and common prefixes
- When falling back between providers, you lose the cache—factor this into latency estimates
- Prefix-based caching works best when requests share long common contexts (RAG, few-shot examples)

### Batching

For non-real-time workloads, batch requests to take advantage of batch pricing (typically 50% cheaper):

```python
async def batch_process(items: list[str], model: str):
    batch = create_batch(items, model)
    batch_id = await submit_batch(batch)
    
    # Poll for completion (batch jobs can take minutes to hours)
    while not (result := await check_batch(batch_id)).is_complete:
        await asyncio.sleep(30)
    
    return result.responses
```

### Cost Tracking

Track cost per request, per model, per task type:

```python
def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    pricing = {
        'gpt-5':           {'input': 10.00, 'output': 30.00},  # per 1M tokens
        'gpt-4o-mini':     {'input': 0.15,  'output': 0.60},
        'claude-sonnet':   {'input': 3.00,  'output': 15.00},
        'mistral-small':   {'input': 0.10,  'output': 0.30},
    }
    p = pricing[model]
    return (input_tokens * p['input'] + output_tokens * p['output']) / 1_000_000
```

## Monitoring and Observability

### Essential Metrics

- **Latency (p50, p95, p99)** per model and task type
- **Error rate** per model and error type
- **Cost** per request, per model, per task type
- **Quality scores** (if you have automated evaluation)
- **Fallback rate**: How often are fallbacks triggered?
- **Route distribution**: What percentage of traffic goes to each model?

### Alerting

- Alert on error rate spikes (a provider might be degraded)
- Alert on latency increases (model serving issues)
- Alert on cost anomalies (a routing bug might send everything to the expensive model)
- Alert on quality degradation (if you have automated evals)

## Implementation Libraries

### LiteLLM

Unified API across 100+ LLM providers. Handles authentication, rate limiting, and response normalization:

```python
from litellm import completion

# Same interface, different providers
response = completion(model="gpt-4o-mini", messages=[...])
response = completion(model="claude-3-5-sonnet", messages=[...])
response = completion(model="mistral/mistral-large", messages=[...])
```

### LangChain / LangGraph

For complex orchestration with state management, tool use, and multi-step workflows. Heavier but more structured.

### Custom Lightweight Router

For simpler needs, a custom router with httpx and asyncio is often cleaner than a framework:

```python
import httpx

class LLMClient:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30)
        self.endpoints = {...}
    
    async def call(self, model, messages, **kwargs):
        endpoint = self.endpoints[model]
        response = await self.client.post(endpoint.url, json={...})
        return self.normalize(response, model)
```

## Practical Recommendations

1. **Start with two models**: One capable (GPT-5 or Claude Sonnet) and one cheap (GPT-4o-mini or Mistral Small). Add more only when you have clear evidence of need.
2. **Build the abstraction layer first**: Normalize responses across providers before building routing logic.
3. **Instrument everything**: You can't optimize what you can't measure.
4. **Test fallbacks regularly**: Don't wait for a real outage to discover your fallback chain is broken.
5. **Version your prompts per model**: The same prompt optimized for GPT-5 may underperform on Claude. Maintain model-specific prompt variants.
6. **Keep a human-reviewable audit trail**: For debugging and compliance, log the model used, the routing decision, and the full response for every request.

Multi-model pipelines add complexity. That complexity pays for itself when your system is more reliable, more cost-effective, and better matched to the diverse tasks it handles. Start simple, measure, and evolve.
