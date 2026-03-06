---
title: "LLM API Integration: A Complete Developer Guide"
depth: technical
pillar: building
topic: llm-api-integration
tags: [llm-api, developer, integration, openai, anthropic, api, technical]
author: bee
date: "2026-03-05"
readTime: 13
description: "Everything you need to integrate LLM APIs into real applications: authentication, request patterns, streaming, error handling, cost management, and production best practices."
related: [api-integration-patterns-for-llms, rag-for-builders-mental-model, how-llms-work-technical]
---

## What this guide covers

This is a practical guide for developers integrating LLM APIs — specifically OpenAI and Anthropic (Claude), the two most commonly used in production. By the end, you'll understand:

- Core API concepts: messages, tokens, system prompts, parameters
- Streaming responses
- Structured output / JSON mode
- Retry logic and error handling
- Cost optimization
- Production patterns: rate limiting, caching, observability
- Choosing between providers

Code examples use Python. The patterns apply to Node.js and other languages with straightforward adaptation.

---

## 1. Setup and authentication

### Install SDKs

```bash
pip install openai anthropic
```

### Authentication

```python
# OpenAI
from openai import OpenAI
client = OpenAI(api_key="sk-...")  # Or set OPENAI_API_KEY env var

# Anthropic
import anthropic
client = anthropic.Anthropic(api_key="sk-ant-...")  # Or ANTHROPIC_API_KEY
```

**Never hardcode API keys.** Use environment variables or a secrets manager. If you accidentally commit a key to Git, rotate it immediately — scrapers watch for exposed keys.

---

## 2. Basic chat completion

### OpenAI

```python
from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant specializing in Python."},
        {"role": "user", "content": "Explain list comprehensions with 3 examples."}
    ],
    temperature=0.7,
    max_tokens=1000
)

print(response.choices[0].message.content)
print(f"Tokens used: {response.usage.total_tokens}")
```

### Anthropic (Claude)

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-3-7-sonnet-20250219",
    max_tokens=1000,
    system="You are a helpful assistant specializing in Python.",
    messages=[
        {"role": "user", "content": "Explain list comprehensions with 3 examples."}
    ]
)

print(message.content[0].text)
print(f"Input tokens: {message.usage.input_tokens}")
print(f"Output tokens: {message.usage.output_tokens}")
```

**Key difference:** Anthropic separates `system` as a top-level parameter; OpenAI includes it as a message with `role: "system"`.

---

## 3. Conversation management (multi-turn)

LLM APIs are **stateless** — each request is independent. To maintain a conversation, you must send the full history with every request:

```python
class Conversation:
    def __init__(self, system_prompt: str):
        self.system = system_prompt
        self.messages = []
    
    def chat(self, user_message: str) -> str:
        self.messages.append({
            "role": "user",
            "content": user_message
        })
        
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=2000,
            system=self.system,
            messages=self.messages
        )
        
        assistant_message = response.content[0].text
        
        self.messages.append({
            "role": "assistant",
            "content": assistant_message
        })
        
        return assistant_message
    
    def token_estimate(self) -> int:
        """Rough estimate: 1 token ≈ 4 chars"""
        total_chars = sum(len(m["content"]) for m in self.messages)
        return total_chars // 4


conv = Conversation("You are a helpful Python tutor.")
print(conv.chat("What are decorators?"))
print(conv.chat("Can you show me a practical example?"))
print(f"Estimated tokens in context: {conv.token_estimate()}")
```

**Context window management:** When conversations get long, you need a strategy:

```python
def trim_messages(messages: list, max_tokens: int = 8000) -> list:
    """Keep the most recent messages within token budget."""
    # Simple approach: keep last N messages
    # Better: summarize old messages before dropping
    
    estimated_tokens = sum(len(m["content"]) // 4 for m in messages)
    
    while estimated_tokens > max_tokens and len(messages) > 2:
        # Remove oldest non-system message
        messages.pop(0)
        estimated_tokens = sum(len(m["content"]) // 4 for m in messages)
    
    return messages
```

---

## 4. Streaming responses

Streaming delivers tokens as they're generated, dramatically improving perceived latency for users:

### Anthropic streaming

```python
with client.messages.stream(
    model="claude-3-7-sonnet-20250219",
    max_tokens=1000,
    messages=[{"role": "user", "content": "Write a haiku about programming"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
    
    # Final message with usage stats
    final = stream.get_final_message()
    print(f"\n\nTokens: {final.usage.input_tokens} in, {final.usage.output_tokens} out")
```

### OpenAI streaming

```python
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Write a haiku about programming"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

### Server-sent events for web applications

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/chat")
async def chat_stream(message: str):
    async def generate():
        with client.messages.stream(
            model="claude-3-7-sonnet-20250219",
            max_tokens=1000,
            messages=[{"role": "user", "content": message}]
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {text}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

---

## 5. Structured output (JSON mode)

For applications that need structured data, not prose:

### OpenAI JSON mode

```python
response = client.chat.completions.create(
    model="gpt-4o",
    response_format={"type": "json_object"},
    messages=[
        {"role": "system", "content": "Return valid JSON only."},
        {"role": "user", "content": """
            Extract the following from this text: name, company, email.
            Text: "Hi, I'm Jane Smith from Acme Corp, reach me at jane@acme.com"
        """}
    ]
)

import json
data = json.loads(response.choices[0].message.content)
print(data)  # {"name": "Jane Smith", "company": "Acme Corp", "email": "jane@acme.com"}
```

### Pydantic + structured output (recommended pattern)

```python
from pydantic import BaseModel
from openai import OpenAI

client = OpenAI()

class ContactInfo(BaseModel):
    name: str
    company: str
    email: str
    phone: str | None = None

response = client.beta.chat.completions.parse(
    model="gpt-4o-2024-08-06",
    messages=[
        {"role": "user", "content": "Extract contact: Jane Smith, Acme Corp, jane@acme.com"}
    ],
    response_format=ContactInfo
)

contact = response.choices[0].message.parsed
print(contact.name)   # Jane Smith
print(contact.email)  # jane@acme.com
```

### Anthropic with schema in prompt

```python
import json

schema = {
    "name": "string - person's full name",
    "company": "string - company name",
    "email": "string - email address",
    "phone": "string or null - phone number if present"
}

message = client.messages.create(
    model="claude-3-7-sonnet-20250219",
    max_tokens=500,
    messages=[{
        "role": "user",
        "content": f"""
            Extract contact information from this text.
            Return ONLY valid JSON matching this schema:
            {json.dumps(schema, indent=2)}
            
            Text: "Hi, I'm Jane Smith from Acme Corp, reach me at jane@acme.com"
        """
    }]
)

result = json.loads(message.content[0].text)
```

---

## 6. Error handling and retry logic

LLM APIs fail for various reasons: rate limits, timeouts, server errors. Robust production code handles these gracefully:

```python
import time
import random
from openai import OpenAI, RateLimitError, APITimeoutError, APIConnectionError

client = OpenAI()

def chat_with_retry(
    messages: list,
    model: str = "gpt-4o",
    max_retries: int = 3,
    base_delay: float = 1.0,
    **kwargs
) -> str:
    """Chat completion with exponential backoff retry."""
    
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                **kwargs
            )
            return response.choices[0].message.content
        
        except RateLimitError as e:
            if attempt == max_retries - 1:
                raise
            # Parse retry-after header if available
            retry_after = float(e.response.headers.get("retry-after", base_delay * (2 ** attempt)))
            jitter = random.uniform(0, 0.5)
            wait_time = retry_after + jitter
            print(f"Rate limited. Waiting {wait_time:.1f}s (attempt {attempt + 1}/{max_retries})")
            time.sleep(wait_time)
        
        except (APITimeoutError, APIConnectionError) as e:
            if attempt == max_retries - 1:
                raise
            wait_time = base_delay * (2 ** attempt) + random.uniform(0, 0.5)
            print(f"Connection error. Retrying in {wait_time:.1f}s")
            time.sleep(wait_time)
    
    raise RuntimeError("Should not reach here")
```

---

## 7. Cost optimization

LLM costs are token-based. Key levers for cost control:

### Model selection by task

Not every task needs the most capable model:

```python
def select_model(task_type: str) -> str:
    """Route to cost-appropriate model based on task complexity."""
    routing = {
        "simple_classification": "gpt-4o-mini",      # $0.15/1M tokens
        "summarization": "gpt-4o-mini",              # Fast, cheap, sufficient
        "complex_reasoning": "gpt-4o",               # $2.50/1M tokens
        "code_generation": "claude-3-7-sonnet",      # Strong at code
        "long_document_analysis": "claude-3-7-sonnet"  # 200K context
    }
    return routing.get(task_type, "gpt-4o-mini")
```

### Prompt caching (Anthropic)

Anthropic supports **prompt caching** — marking parts of your prompt to be cached across requests:

```python
import anthropic

client = anthropic.Anthropic()

# Long system prompt that doesn't change
SYSTEM_PROMPT = """[Your 2000-word system prompt here]"""

message = client.messages.create(
    model="claude-3-7-sonnet-20250219",
    max_tokens=1000,
    system=[
        {
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"}  # Cache this for 5 minutes
        }
    ],
    messages=[{"role": "user", "content": user_message}]
)

# Cached input tokens cost 10% of normal; cache writes cost 25%
# If your system prompt is 2000 tokens and you make 100 requests/5min:
# Without caching: 200,000 tokens
# With caching: 2,000 (cache write) + 99 * 200 (cache hits) = 21,800 tokens
# ~90% savings on repeated system prompt tokens
```

### Semantic caching

For applications where users often ask similar questions, cache at the semantic level:

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer('all-MiniLM-L6-v2')
cache = {}  # In production: use Redis or a vector DB

def semantic_cache_lookup(query: str, threshold: float = 0.95):
    """Return cached response if a semantically similar query was seen."""
    if not cache:
        return None
    
    query_embedding = model.encode(query)
    
    for cached_query, (cached_embedding, response) in cache.items():
        similarity = np.dot(query_embedding, cached_embedding) / (
            np.linalg.norm(query_embedding) * np.linalg.norm(cached_embedding)
        )
        if similarity > threshold:
            return response
    
    return None

def cached_completion(query: str) -> str:
    # Check semantic cache
    cached = semantic_cache_lookup(query)
    if cached:
        return cached
    
    # Call API
    response = chat_with_retry([{"role": "user", "content": query}])
    
    # Store in cache
    query_embedding = model.encode(query)
    cache[query] = (query_embedding, response)
    
    return response
```

---

## 8. Production patterns

### Observability: logging requests and responses

```python
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

def instrumented_completion(messages: list, **kwargs) -> dict:
    """API call with full observability."""
    request_id = str(uuid.uuid4())
    start_time = datetime.now()
    
    logger.info(f"[{request_id}] LLM request started", extra={
        "request_id": request_id,
        "model": kwargs.get("model", "unknown"),
        "message_count": len(messages),
        "timestamp": start_time.isoformat()
    })
    
    try:
        response = client.chat.completions.create(
            messages=messages,
            **kwargs
        )
        
        duration_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        logger.info(f"[{request_id}] LLM request completed", extra={
            "request_id": request_id,
            "duration_ms": duration_ms,
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
            "cost_estimate": estimate_cost(response.usage, kwargs.get("model"))
        })
        
        return {
            "content": response.choices[0].message.content,
            "usage": response.usage,
            "request_id": request_id,
            "duration_ms": duration_ms
        }
    
    except Exception as e:
        logger.error(f"[{request_id}] LLM request failed: {str(e)}")
        raise
```

### Rate limiting

```python
from asyncio import Semaphore
import asyncio

class RateLimitedClient:
    """Limit concurrent LLM requests to avoid rate limit errors."""
    
    def __init__(self, max_concurrent: int = 10, requests_per_minute: int = 60):
        self.semaphore = Semaphore(max_concurrent)
        self.rpm_limit = requests_per_minute
        self._request_times = []
    
    async def complete(self, messages: list, **kwargs) -> str:
        async with self.semaphore:
            # Simple RPM rate limiting
            now = asyncio.get_event_loop().time()
            self._request_times = [t for t in self._request_times if now - t < 60]
            
            if len(self._request_times) >= self.rpm_limit:
                wait_time = 60 - (now - self._request_times[0])
                await asyncio.sleep(wait_time)
            
            self._request_times.append(now)
            
            # Make request (async version)
            # ... implement with async client
```

---

## 9. Choosing between providers

| Factor | OpenAI | Anthropic |
|---|---|---|
| **Context window** | 128K (GPT-4o) | 200K (Claude 3.7) |
| **Code quality** | Very strong | Excellent (often preferred) |
| **Instruction following** | Strong | Strong (often more precise) |
| **Tool/function calling** | Mature, well-documented | Strong, well-designed |
| **JSON mode** | Native support | Via prompt engineering |
| **Streaming** | Yes | Yes |
| **Prompt caching** | No | Yes (significant cost savings) |
| **Pricing (flagship)** | $2.50-15/1M tokens | $3-15/1M tokens |
| **SDK quality** | Excellent | Excellent |
| **Developer community** | Largest | Growing fast |

**Pragmatic recommendation:**
- Default to OpenAI if you want the largest community and most integrations
- Prefer Anthropic for long-document tasks, precise instruction following, or when prompt caching is valuable
- Benchmark both on your specific task before committing — performance varies by use case

---

## 10. A minimal production template

```python
import os
import logging
from typing import Generator
import anthropic
from anthropic import APIError, RateLimitError, APITimeoutError
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

SYSTEM_PROMPT = """You are a helpful assistant. Be concise and accurate."""

def complete(
    user_message: str,
    conversation_history: list = None,
    stream: bool = False,
    max_retries: int = 3
) -> str | Generator:
    """
    Send a message to Claude with retry logic.
    Returns string or generator (if stream=True).
    """
    messages = (conversation_history or []) + [
        {"role": "user", "content": user_message}
    ]
    
    for attempt in range(max_retries):
        try:
            if stream:
                return client.messages.stream(
                    model="claude-3-7-sonnet-20250219",
                    max_tokens=2048,
                    system=SYSTEM_PROMPT,
                    messages=messages
                )
            else:
                response = client.messages.create(
                    model="claude-3-7-sonnet-20250219",
                    max_tokens=2048,
                    system=SYSTEM_PROMPT,
                    messages=messages
                )
                return response.content[0].text
        
        except RateLimitError:
            wait = 2 ** attempt
            logger.warning(f"Rate limited, retrying in {wait}s")
            time.sleep(wait)
        
        except APITimeoutError:
            wait = 2 ** attempt
            logger.warning(f"Timeout, retrying in {wait}s")
            time.sleep(wait)
        
        except APIError as e:
            logger.error(f"API error: {e}")
            raise
    
    raise RuntimeError(f"Failed after {max_retries} retries")
```

This template handles the 80% case. Extend it with caching, observability, and cost tracking as your application matures.
