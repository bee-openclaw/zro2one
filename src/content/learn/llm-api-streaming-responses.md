---
title: "Streaming LLM Responses: Why It Matters and How to Build It"
depth: technical
pillar: building
topic: llm-api-integration
tags: [llm-api, streaming, server-sent-events, sse, ux, latency, openai, anthropic]
author: bee
date: "2026-03-06"
readTime: 10
description: "Streaming is how ChatGPT displays text as it's generated. Here's how it works under the hood, why it dramatically improves perceived performance, and how to implement it with the OpenAI and Anthropic APIs."
related: [llm-api-integration-guide, api-integration-patterns-for-llms, rag-for-builders-mental-model]
---

One of the most impactful UX decisions in any LLM-powered application is whether to stream the response or wait for it to complete. ChatGPT's token-by-token text appearance is streaming. A spinner that shows for 8 seconds and then dumps an entire response is not.

Streaming dramatically improves perceived performance — users see progress immediately instead of waiting — and it's not particularly complex to implement once you understand how it works.

This guide covers the why, the how, and the edge cases.

## Why streaming matters

LLMs generate text one token at a time. A 500-token response at 50 tokens/second takes 10 seconds to generate. Without streaming:

1. User sends a request
2. LLM generates all 500 tokens (10 seconds)
3. Entire response is returned at once
4. User sees text appear after 10-second wait

With streaming:

1. User sends a request
2. First tokens arrive in 200-400ms (time-to-first-token)
3. Text appears word by word
4. User is reading while the model is still generating

The total wall-clock time is the same. But **perceived performance** is dramatically better. Users who see text appearing immediately tolerate much longer generation times than users staring at a loading state.

Research in human-computer interaction consistently shows that feedback within ~400ms feels "immediate." Streaming hits this threshold even for long responses.

Streaming also enables early exit: if the user can see the response is going in the wrong direction, they can stop it before the full generation completes.

## How streaming works technically

LLM APIs implement streaming via **Server-Sent Events (SSE)** — a standard HTTP mechanism for servers to push data to clients over a single long-lived connection.

The flow:
1. Client sends HTTP request with `stream: true` (or equivalent)
2. Server keeps the connection open and sends data incrementally
3. Each chunk is a small piece of text (typically 1-5 tokens)
4. The final chunk signals completion
5. Connection closes

SSE format looks like:

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"},"index":0}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","choices":[{"delta":{"content":" world"},"index":0}]}

data: [DONE]
```

Each line starting with `data:` is a JSON chunk containing the new tokens. The `[DONE]` sentinel signals the end of the stream.

## Implementation: OpenAI API

The OpenAI client libraries handle SSE parsing internally. Here's the pattern in Python:

```python
from openai import OpenAI

client = OpenAI()

# Non-streaming (for comparison)
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain transformers in 3 sentences."}]
)
print(response.choices[0].message.content)

# Streaming
with client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain transformers in 3 sentences."}],
    stream=True,
) as stream:
    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            print(delta.content, end="", flush=True)
```

The `flush=True` is important for terminal output — without it, Python's output buffering will hold text until it has a full buffer.

In Node.js:

```javascript
import OpenAI from 'openai';

const client = new OpenAI();

const stream = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Explain transformers in 3 sentences.' }],
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(delta);
}
```

## Implementation: Anthropic (Claude) API

Anthropic's streaming uses a similar SSE pattern but with a different event structure:

```python
import anthropic

client = anthropic.Anthropic()

with client.messages.stream(
    model="claude-3-7-sonnet-20250219",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Explain transformers in 3 sentences."}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

Anthropic's SDK provides `stream.text_stream` which yields just the text deltas, abstracting the event structure. If you need more control (accessing thinking blocks, metadata):

```python
with client.messages.stream(...) as stream:
    for event in stream:
        if event.type == "content_block_delta":
            if event.delta.type == "text_delta":
                print(event.delta.text, end="", flush=True)
```

## Streaming to a web frontend

The most common production pattern: your backend forwards LLM stream chunks to the browser via SSE.

**Backend (Node.js / Express):**

```javascript
app.post('/chat', async (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: req.body.messages,
    stream: true,
  });
  
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) {
      // SSE format: data: <json>\n\n
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
  }
  
  // Signal completion
  res.write('data: [DONE]\n\n');
  res.end();
});
```

**Frontend (browser):**

```javascript
const eventSource = new EventSource('/chat', { 
  withCredentials: true 
});

// Note: native EventSource doesn't support POST
// For POST requests, use the Fetch API with ReadableStream instead:

async function streamChat(messages) {
  const response = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Process complete SSE events
    const lines = buffer.split('\n\n');
    buffer = lines.pop(); // Keep incomplete chunk
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        const { text } = JSON.parse(data);
        appendToChat(text); // Update UI
      }
    }
  }
}
```

## Vercel AI SDK: the practical shortcut

If you're building a Next.js or similar JS application, the **Vercel AI SDK** handles most of this complexity:

```javascript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// In a Next.js route handler:
export async function POST(req) {
  const { messages } = await req.json();
  
  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  });
  
  return result.toDataStreamResponse();
}
```

The client-side `useChat` hook then handles stream consumption automatically. For most applications building on Next.js or similar React frameworks, the AI SDK is the right starting point.

## Handling edge cases

**Connection drops:** SSE connections can be interrupted. Implement reconnection logic on the client, and consider adding a sequence ID to chunks so the client can resume from where it left off rather than starting over.

**Timeouts:** Some API gateways and load balancers kill long-lived connections after 30-60 seconds. Set appropriate timeout configurations. For responses that might take longer than 30 seconds, either accept the timeout risk or use a job queue pattern (webhook delivery instead of streaming).

**Error mid-stream:** An error partway through generation means you've already sent some tokens to the client. Handling this gracefully requires either:
- Sending an error SSE event that the client can display
- Gracefully terminating the partial response with a "[Error occurred]" suffix

**Rate limits and retries:** Stream retries are complex — you'd need to restart the generation from scratch or implement checkpoint logic. Consider catching stream errors before they start (validate input) rather than recovering from mid-stream failures.

**Tool calls / function calling in streams:** When using function calling, the streaming chunks deliver the function call arguments incrementally. The client needs to accumulate these before executing the function. Most SDKs handle this, but be aware of it when building raw.

## Measuring what matters

Two metrics define streaming performance:

**Time-to-first-token (TTFT):** How long between sending the request and receiving the first chunk. Typically 200-600ms for major APIs. This is what determines whether streaming "feels" responsive.

**Tokens per second:** The generation speed. At 50 tokens/second, a 500-token response streams in about 10 seconds. At 100 tokens/second (newer inference hardware), it's 5 seconds.

In your application, measure and log both. TTFT regressions often indicate networking or cold-start issues; tokens/second drops indicate model load or throttling.

## When not to stream

Streaming isn't always the right choice:

**Batch processing:** If you're generating hundreds of responses for offline processing, streaming adds complexity without UX benefit.

**Short responses:** For responses under ~50 tokens, the overhead of streaming may not be worth it — the non-streaming latency is already acceptable.

**Downstream processing required:** If you need the complete response before doing anything with it (e.g., parsing structured JSON output, extracting data), streaming the response incrementally doesn't help and may complicate parsing. For structured output, consider non-streaming with the response format set to JSON.

**Limited client support:** SSE doesn't work in all environments. In some webhook-based or serverless contexts, long-lived connections are expensive or impossible.

For user-facing chat interfaces: stream. For everything else: evaluate whether streaming adds enough value to justify the implementation complexity.

---

For a broader view of API integration patterns — authentication, rate limiting, prompt management, cost control — see the 🔵 Applied guide on LLM API integration.
