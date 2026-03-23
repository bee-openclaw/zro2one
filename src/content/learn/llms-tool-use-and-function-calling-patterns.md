---
title: "LLM Tool Use and Function Calling: Patterns That Actually Work"
depth: technical
pillar: llms
topic: llms
tags: [llms, tool-use, function-calling, agents, reliability]
author: bee
date: "2026-03-23"
readTime: 12
description: "A practical guide to LLM tool use and function calling — covering schema design, error handling, multi-step orchestration, and the patterns that separate reliable tool-using systems from brittle demos."
related: [llms-agents-vs-chatbots-2026, llm-api-function-calling-guide, llms-routing-and-model-selection]
---

# LLM Tool Use and Function Calling: Patterns That Actually Work

Function calling transformed LLMs from text generators into systems that can act. Instead of describing what an API call would look like, the model produces structured calls that your code executes. But the gap between a working demo and a reliable production system is enormous.

This guide covers the patterns that bridge that gap.

## How Function Calling Works

At its core, function calling adds a structured output mode to LLM generation. You provide tool definitions (name, description, parameters), and the model can choose to emit a tool call instead of (or alongside) text.

The flow:

1. **Define tools** — JSON schemas describing available functions
2. **Send message + tools** — the model sees both the conversation and available tools
3. **Model responds** — either text, a tool call, or both
4. **Execute the call** — your code runs the actual function
5. **Return results** — feed the output back as a tool result message
6. **Model continues** — uses the result to generate a final response

Simple in theory. The complexity lives in steps 3–6.

## Schema Design: The Foundation

Bad schemas produce bad calls. This is the single highest-leverage thing you can get right.

### Be Specific in Descriptions

```json
{
  "name": "search_documents",
  "description": "Search internal company documents by semantic similarity. Returns top-k matches with relevance scores. Use when the user asks about company policies, procedures, or internal knowledge.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Natural language search query. Be specific — 'Q3 2025 revenue targets' works better than 'revenue'."
      },
      "limit": {
        "type": "integer",
        "description": "Number of results to return (1-20). Default 5.",
        "default": 5
      },
      "department": {
        "type": "string",
        "enum": ["engineering", "sales", "marketing", "hr", "finance", "all"],
        "description": "Filter by department. Use 'all' if the query spans multiple departments.",
        "default": "all"
      }
    },
    "required": ["query"]
  }
}
```

Key principles:

- **Descriptions guide behavior.** The model reads them. "Use when the user asks about company policies" is steering, not just documentation.
- **Enum values constrain outputs.** Fewer parsing errors, more predictable behavior.
- **Defaults reduce unnecessary calls.** If most queries don't need a department filter, don't force the model to specify one.

### The Right Number of Tools

More tools = more confusion. Models handle 5–10 tools reliably. Past 20, accuracy drops noticeably. Past 50, you need a routing layer.

If you have many tools, consider:

- **Tool groups** — present subsets based on context
- **Meta-tools** — a "search_tools" function that returns relevant tool definitions
- **Two-pass routing** — first call selects the tool category, second call uses specific tools

## Error Handling: The Part Everyone Skips

Tools fail. APIs timeout. Parameters are wrong. Your system needs to handle this gracefully.

### Structured Error Returns

Don't return raw error strings. Give the model structured information it can reason about:

```json
{
  "status": "error",
  "error_type": "rate_limit",
  "message": "Calendar API rate limit exceeded. Try again in 30 seconds.",
  "retry_after_seconds": 30,
  "suggestion": "Consider batching multiple calendar queries into one call."
}
```

The model can then decide: retry, try a different approach, or inform the user.

### Validation Before Execution

Validate tool calls before running them:

```python
def validate_tool_call(call):
    # Check required parameters
    schema = TOOL_SCHEMAS[call.name]
    for param in schema.get("required", []):
        if param not in call.arguments:
            return {"error": f"Missing required parameter: {param}"}
    
    # Type checking
    for param, value in call.arguments.items():
        expected_type = schema["properties"][param]["type"]
        if not isinstance(value, TYPE_MAP[expected_type]):
            return {"error": f"Parameter {param} should be {expected_type}, got {type(value).__name__}"}
    
    # Business logic validation
    if call.name == "send_email" and not call.arguments.get("confirmed"):
        return {"error": "Email sending requires explicit confirmation. Ask the user to confirm."}
    
    return None
```

### Retry Strategies

Not all failures deserve the same response:

- **Transient errors** (timeouts, rate limits) → retry with backoff
- **Parameter errors** → return error to model, let it fix the call
- **Permanent failures** (service down) → inform model, suggest alternatives
- **Safety violations** → block, log, don't retry

## Multi-Step Orchestration

Real tasks require multiple tool calls. A user asking "Schedule a meeting with the marketing team next Tuesday at 2pm" might need:

1. Look up marketing team members
2. Check everyone's availability Tuesday at 2pm
3. Find available rooms
4. Create the calendar event
5. Send invitations

### The Loop Pattern

```python
messages = [{"role": "user", "content": user_message}]
max_iterations = 10

for i in range(max_iterations):
    response = llm.chat(messages=messages, tools=tools)
    
    if response.finish_reason == "stop":
        break  # Model is done, has a text response
    
    if response.finish_reason == "tool_calls":
        messages.append(response.message)  # Add assistant message with tool calls
        
        for tool_call in response.tool_calls:
            result = execute_tool(tool_call)
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result)
            })
    
    if i == max_iterations - 1:
        messages.append({
            "role": "system",
            "content": "Maximum tool calls reached. Summarize what you've accomplished and what remains."
        })
```

### Parallel Tool Calls

Many providers support parallel tool calls — the model can request multiple tools in a single turn. This matters for latency:

```
Sequential: Tool A (500ms) → Tool B (300ms) → Tool C (400ms) = 1200ms
Parallel:   Tool A + B + C (max 500ms) = 500ms
```

Design your tools to be independent when possible. Instead of one tool that takes a list of IDs, consider letting the model call the same tool multiple times in parallel.

## Common Pitfalls

### The Hallucinated Parameter

Models sometimes invent parameter values that seem plausible but are wrong. A user says "check my calendar" and the model calls `get_events(user_id="user_123")` — where did `user_123` come from?

**Fix:** Inject known values via system message or provide a "get_current_user" tool. Don't rely on the model to know runtime context.

### The Infinite Loop

Model calls tool → gets result → calls same tool again → same result → calls again...

**Fix:** Track call history. If the same tool is called with identical parameters twice in a row, inject a message: "You already called this tool with these parameters. The result was: {result}. Please proceed with a different action."

### Over-Calling

The model uses tools when it doesn't need to. "What's 2 + 2?" triggers a calculator tool call.

**Fix:** System prompt guidance: "Only use tools when the task requires external data or actions you can't perform directly. For simple questions, answer directly."

### Under-Calling

The model tries to answer from its training data when it should use a tool. "What's our company's refund policy?" gets a hallucinated answer instead of a document search.

**Fix:** System prompt guidance with explicit triggers: "For any question about company policies, procedures, or internal data, ALWAYS use the search_documents tool first."

## Testing Tool-Using Systems

Traditional unit tests aren't enough. You need:

1. **Schema validation tests** — do your schemas parse correctly?
2. **Mock execution tests** — given these tool results, does the model produce correct final answers?
3. **End-to-end tests** — real tool calls, real results, real evaluation
4. **Adversarial tests** — what happens with malformed results, timeouts, contradictory data?
5. **Regression tests** — save interesting conversations and replay them after changes

### Eval Metrics

- **Tool selection accuracy** — did it pick the right tool?
- **Parameter accuracy** — were the arguments correct?
- **Completion rate** — did the multi-step task finish successfully?
- **Efficiency** — how many tool calls were needed vs. optimal?
- **Recovery rate** — when errors occurred, did the system recover?

## Production Checklist

Before deploying tool-using LLMs:

- [ ] Rate limiting on tool execution (not just API calls)
- [ ] Timeout on the entire tool-use loop (not just individual calls)
- [ ] Logging every tool call and result (you will need this for debugging)
- [ ] Cost tracking per tool (some tools are expensive)
- [ ] User confirmation for destructive actions
- [ ] Graceful degradation when tools are unavailable
- [ ] Input sanitization on tool parameters (SQL injection via LLM is real)

## What's Next

Tool use is converging toward a standard pattern across providers, but the details still vary. The Model Context Protocol (MCP) is pushing toward interoperability, letting models discover and use tools from any compliant server.

The bigger shift: as models get better at planning multi-step tool use, the line between "chatbot with tools" and "autonomous agent" continues to blur. The patterns in this guide apply to both — the difference is how much autonomy you grant the loop.

Start with constrained, well-validated tool use. Expand as you build confidence in your error handling and monitoring. The boring infrastructure work is what makes the impressive demos reliable.
