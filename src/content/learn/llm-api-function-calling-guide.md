---
title: "LLM Function Calling and Tool Use: A Developer's Guide"
depth: technical
pillar: building
topic: llm-api-integration
tags: [llm-api, function-calling, tool-use, agents, structured-outputs, openai, anthropic]
author: bee
date: "2026-03-08"
readTime: 10
description: "Function calling lets LLMs trigger real actions instead of just generating text. Here's how it works across major APIs, patterns that work, and pitfalls to avoid."
related: [llm-api-streaming-responses, api-integration-patterns-for-llms, llm-api-integration-guide]
---

Function calling is the capability that turns an LLM from a text generator into an action-taking agent. Instead of just answering "The weather in Chicago is 34°F and cloudy," a model with function calling can *actually call your weather API*, retrieve real-time data, and then answer accurately.

Understanding how function calling works — and how to use it well — is one of the most important skills in modern AI development.

## The core idea

When you use function calling, you tell the model about functions it can invoke. The model decides when a function is needed, generates a structured call with appropriate arguments, and then *stops* — waiting for you to execute the function and return the result.

The sequence:
1. You send the model a user message + a list of available tools (function definitions)
2. The model generates a tool call (or calls) with arguments
3. Your code executes the function with those arguments
4. You send the result back to the model
5. The model generates a final response incorporating the tool result(s)

This loop can repeat multiple times. The model can call multiple tools in sequence, processing results from one to inform the next call.

## How it looks in code (OpenAI API)

```python
import openai
import json

client = openai.OpenAI()

# Define your tools
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a location. Use this when the user asks about weather conditions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City and state, e.g. 'Chicago, IL' or 'London, UK'"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Temperature unit"
                    }
                },
                "required": ["location"]
            }
        }
    }
]

def get_weather(location: str, unit: str = "fahrenheit") -> dict:
    # Your actual weather API call here
    return {"temperature": 34, "conditions": "cloudy", "location": location}

# Initial request
messages = [{"role": "user", "content": "What's the weather in Chicago?"}]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto"  # Let the model decide when to use tools
)

# Check if the model wants to call a function
message = response.choices[0].message
if message.tool_calls:
    # Add the assistant's message (with tool call) to conversation
    messages.append(message)
    
    # Execute each tool call
    for tool_call in message.tool_calls:
        function_name = tool_call.function.name
        arguments = json.loads(tool_call.function.arguments)
        
        # Call the function
        if function_name == "get_weather":
            result = get_weather(**arguments)
        
        # Add the tool result to conversation
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(result)
        })
    
    # Get final response
    final_response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools
    )
    print(final_response.choices[0].message.content)
```

## Anthropic API (Claude)

Claude uses a similar pattern with slightly different naming:

```python
import anthropic
import json

client = anthropic.Anthropic()

tools = [
    {
        "name": "get_weather",
        "description": "Get the current weather for a location.",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "City and state or country"
                }
            },
            "required": ["location"]
        }
    }
]

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "What's the weather in Chicago?"}]
)

# Handle tool use blocks
if response.stop_reason == "tool_use":
    tool_use_block = next(b for b in response.content if b.type == "tool_use")
    tool_result = get_weather(**tool_use_block.input)
    
    # Continue the conversation with tool result
    final = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        tools=tools,
        messages=[
            {"role": "user", "content": "What's the weather in Chicago?"},
            {"role": "assistant", "content": response.content},
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use_block.id,
                        "content": json.dumps(tool_result)
                    }
                ]
            }
        ]
    )
```

## Writing good function descriptions

**The description is the most important part.** The model uses your function descriptions — not just the name and parameters — to decide when and how to call a function. Vague descriptions produce unreliable tool selection.

**Good description:**
```json
{
    "name": "search_products",
    "description": "Search the product catalog for items matching a query. Use this when the user is looking for specific products, asking about availability, or comparing product options. Returns a list of matching products with prices and availability."
}
```

**Poor description:**
```json
{
    "name": "search_products",
    "description": "Search for products"
}
```

Rules for good descriptions:
- Describe *when* to call the function, not just what it does
- Describe what the function returns (helps the model use the result correctly)
- Be specific about the scope — what kinds of queries this handles
- Note any important limitations ("only returns in-stock items", "limited to the US catalog")

**Parameter descriptions matter equally:**
```json
"location": {
    "type": "string",
    "description": "City and country in the format 'City, Country'. Examples: 'Paris, France', 'Tokyo, Japan'. Do not use abbreviations."
}
```

Format hints in parameter descriptions significantly reduce argument parsing errors.

## Tool choice control

All major APIs let you control how the model uses tools:

- **`auto`**: Model decides when to use tools (most common)
- **`none`**: Force text-only response, ignore tools
- **`required`**: Model must call at least one tool
- **Specific tool**: Force the model to call a specific function

Use `required` when you need structured data extraction — you're essentially using function calling as a structured output mechanism, not an action mechanism.

```python
# Force the model to call a specific extraction function
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Extract info from this receipt: ..."}],
    tools=tools,
    tool_choice={"type": "function", "function": {"name": "extract_receipt_data"}}
)
```

## Structured outputs via function calling

One of the most reliable ways to get consistently structured JSON output is to define a "function" that doesn't actually do anything — it's just a schema definition. Force the model to call it, and the arguments are your structured output.

```python
extraction_tool = {
    "type": "function",
    "function": {
        "name": "extract_data",
        "description": "Extract the requested information from the provided text.",
        "parameters": {
            "type": "object",
            "properties": {
                "company_name": {"type": "string"},
                "revenue": {"type": "number", "description": "Revenue in USD"},
                "employees": {"type": "integer"},
                "founded_year": {"type": "integer"}
            },
            "required": ["company_name", "revenue"]
        }
    }
}

# Use tool_choice to force this function
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": f"Extract company info from: {text}"}],
    tools=[extraction_tool],
    tool_choice={"type": "function", "function": {"name": "extract_data"}}
)

# The arguments are your structured output — guaranteed to match the schema
extracted = json.loads(response.choices[0].message.tool_calls[0].function.arguments)
```

This is more reliable than `response_format: { type: "json_object" }` for complex schemas because the model is constrained to match your schema exactly.

## Parallel function calling

Models can call multiple functions in a single response. This is useful when multiple independent lookups are needed:

```
User: "Compare the weather in Chicago and New York"
Model: [calls get_weather("Chicago") AND get_weather("New York") simultaneously]
```

When handling parallel calls, execute them concurrently and return all results before asking for the final response:

```python
import asyncio

if message.tool_calls:
    messages.append(message)
    
    # Execute all tool calls in parallel
    async def execute_tool(tool_call):
        args = json.loads(tool_call.function.arguments)
        result = await async_get_weather(**args)  # Your async implementation
        return tool_call.id, result
    
    results = await asyncio.gather(*[execute_tool(tc) for tc in message.tool_calls])
    
    for tool_call_id, result in results:
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": json.dumps(result)
        })
```

## Common pitfalls

**Inconsistent argument formats:** The model will generate arguments based on your description. If you say "ISO 8601 date format" but don't validate, you'll occasionally get other formats. Always validate and sanitize function arguments before executing.

**Trusting tool results blindly:** The model will incorporate tool results into its reasoning. If your tool returns incorrect or unexpected data, the model will reason from it confidently. Validate tool outputs before returning them.

**Too many tools:** Providing 20+ tools leads to poor tool selection. Group related functionality or use routing logic to provide only relevant tools for a given context.

**Missing error handling in tool results:** Tell the model when a tool fails:
```python
try:
    result = get_weather(**args)
except Exception as e:
    result = {"error": str(e), "status": "failed"}
```
The model can then handle errors gracefully rather than reasoning from an empty result.

**Security — LLM injection through tool results:** If tool results include content from external sources (web pages, user-submitted data), that content can contain prompt injections that alter the model's behavior. Sanitize or isolate external content in tool results.

## Function calling as an agent framework

The agentic loop — model → tools → model → tools → ... — is the foundation of modern AI agents. Libraries like LangChain, LlamaIndex, and Anthropic's own agent tooling are built on exactly this pattern.

For simple agents (1-3 tools, clear task boundaries), building the loop yourself is often cleaner than adopting a framework. For complex multi-agent systems with many tools, routing logic, and state management, frameworks start to earn their weight.

Understanding the raw API mechanics gives you the foundation to use any framework effectively — and to debug it when it doesn't work the way you expect.
