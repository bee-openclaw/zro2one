---
title: "Prompting for Code Generation: What Actually Works"
depth: applied
pillar: practice
topic: prompting
tags: [prompting, code-generation, coding, llm, software-engineering, prompt-engineering]
author: bee
date: "2026-03-10"
readTime: 8
description: "Code generation prompts that work aren't magic — they follow patterns. This is the applied guide to getting reliable, high-quality code from LLMs in real development workflows."
related: [prompting-few-shot-guide, prompting-system-prompts-explained, ai-workflows-code-review-automation]
---

Prompting for code generation is different from prompting for text. Code has a property that text doesn't: it's mechanically verifiable. Either it runs and does the right thing, or it doesn't. This changes the prompting dynamics significantly.

The good news: code is also more learnable territory for LLMs because there's clear feedback on quality. The bad news: getting that feedback requires running the code, which means bad prompting doesn't fail loudly — it produces code that *looks* right until you test it.

This guide is the applied approach: what works, what doesn't, and the patterns that reliably produce better code.

## The fundamental principle: be the senior engineer reviewing the work

The most useful mental model for code prompting: you're writing a specification that a capable engineer will implement, and you'll review the result. What would make that specification clear enough that a capable engineer could implement it correctly without asking 10 clarifying questions?

If you can answer that, you can write a good code prompt.

## Specifying context: what the model doesn't know

LLMs know a lot about general programming patterns. What they don't know is your specific context:

- Your language version and dependencies
- Your conventions and style preferences
- What the function needs to integrate with
- Constraints your system imposes
- What's already in scope

A prompt that provides this context produces dramatically better code than one that doesn't.

**Weak prompt:**
```
Write a function to parse emails.
```

**Better prompt:**
```
Write a Python function that parses email addresses from a string. Requirements:
- Use Python 3.11
- Handle multiple emails separated by commas, semicolons, or spaces
- Return a list of valid email strings
- Return empty list (not raise exception) if no valid emails are found
- Don't use any external libraries (only stdlib)

The function will be called from an input validation layer, so it should be fast and never raise exceptions.
```

The second prompt gives the model enough context to make the right choices about parsing, error handling, and implementation approach.

## The spec-first approach

For non-trivial functions, write the docstring before asking the model to write the implementation. This forces you to think through the spec, and it gives the model a precise spec to implement against.

```python
def extract_user_permissions(
    user_id: str, 
    resource_type: str, 
    context: Optional[dict] = None
) -> list[str]:
    """
    Return the list of permissions a user has for a given resource type.
    
    Args:
        user_id: The unique identifier for the user
        resource_type: The type of resource (e.g., "document", "project", "user")
        context: Optional additional context (e.g., {"org_id": "...", "workspace": "..."})
    
    Returns:
        List of permission strings (e.g., ["read", "write", "admin"]).
        Returns empty list if user has no permissions.
    
    Raises:
        UserNotFoundError: If user_id doesn't exist
        ValueError: If resource_type is not a valid type
    
    Note: This function hits the database. Do not call in a hot loop.
    """
    # Implement this function
```

Give the model this and ask it to implement. The signature and docstring constrain the implementation space to something specific and correct.

## Few-shot examples for style

If you want code in a particular style or pattern — your team's conventions, a specific library usage pattern, an error handling approach — include an example:

```
Here's an example of how we handle database operations in this codebase:

```python
async def get_user(user_id: str) -> Optional[User]:
    async with get_db_session() as session:
        try:
            result = await session.execute(
                select(User).where(User.id == user_id)
            )
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error("Database error fetching user", user_id=user_id, error=str(e))
            raise DatabaseError(f"Failed to fetch user: {user_id}") from e
```

Following this same pattern, write a function to get an organization by id.
```

Few-shot examples for code are extremely effective. The model will replicate your session handling, error logging format, exception chaining style, and type annotations because you showed it what you want.

## Specifying what to avoid

Sometimes what you don't want is as important as what you do:

- "Don't use classes — this should be a set of pure functions"
- "Don't use any async — this runs synchronously"
- "Don't import anything not already in the existing file"
- "Avoid nested ternaries — we prioritize readability over cleverness"
- "No try-except at this layer — let exceptions propagate to the middleware"

Constraints are often more useful than positive descriptions because they prune the space of plausible implementations the model might choose.

## Asking for tests alongside code

Ask for tests in the same prompt, not as an afterthought:

```
Write a function that validates a credit card number using the Luhn algorithm.

Also write pytest unit tests that cover:
- Valid Luhn card numbers (at least 3 examples)
- Invalid card numbers (wrong last digit)
- Edge cases: empty string, non-numeric characters, too short, too long
```

When the model writes code and tests together, the tests actually match the implementation's behavior. Tests written after-the-fact (by you or the model) often have subtle mismatches.

## Iterative refinement patterns

Code generation rarely produces perfect output on the first pass. The prompting pattern that matters:

**Run it first.** Before asking the model to refine, actually test the output. The most common mistake is asking for refinements based on reading the code rather than running it.

**Report the exact error.** "This doesn't work" gets worse refinements than the full error message. Paste the complete stack trace.

**Include what you've already tried.** "I changed the retry logic to X, but it still fails with Y" helps the model not suggest X again.

**For logic errors, describe the expected vs. actual behavior concretely:**

```
The function produces the wrong output for this input:
- Input: parse_date("2026-03-10")
- Expected: datetime(2026, 3, 10, 0, 0, 0, tzinfo=UTC)
- Actual: datetime(2026, 3, 10, 0, 0, 0)  # no timezone

Please fix the timezone handling.
```

## Prompting for code review / understanding

Code generation is only one side of LLM-assisted coding. Prompting for understanding often has higher ROI:

**Explain unfamiliar code:**
```
Explain what this function does, in plain English:
[code block]

Specifically:
- What is the purpose of the outer loop?
- Why is the index shifted by 1?
- What edge case does the early return handle?
```

**Review for issues:**
```
Review this function for:
1. Potential bugs or edge cases not handled
2. Performance issues
3. Security concerns (this function processes user-provided input)
4. Clarity issues that would confuse a new team member

Be specific — point to line numbers or code spans.
```

**Explain a complex expression:**
```
Explain what this regex does, and give 3 examples of strings it matches and 2 it doesn't:
^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$
```

## Language and framework-specific prompting

Different ecosystems have different idioms. When prompting for code in a specific framework, name the specific version and idioms you want:

- "Use React 19 with the App Router (not pages router)"
- "Use SQLAlchemy 2.0 async style (not the legacy 1.x API)"
- "Use Rust idioms — prefer Result<> over panics, use iterators instead of explicit loops"
- "Use Go channels for concurrency, not goroutines with mutexes"

Framework-specific guidance prevents the model from using deprecated APIs or the wrong mental model for your stack.

## The things that still require you

Code generation is genuinely impressive but reliably fails at:

**Architecture decisions.** The model doesn't know whether a new feature should be a new service or a module in the existing service, because it doesn't know your deployment constraints, team structure, or future plans.

**Performance at your specific scale.** The model can generate performant code for typical cases. It can't optimize for your specific access patterns, your database's quirks, or your hardware configuration.

**Security at depth.** The model knows common security patterns and will implement them if asked. It doesn't know your threat model, your compliance requirements, or the specific ways your application's context creates unusual attack surfaces.

**Integration correctness.** Generated code that calls your internal APIs will often call them with wrong parameters or wrong assumptions about their behavior, because the model doesn't have access to your internal documentation.

---

Better code prompts produce better code — this is reliably true. But the improvements come from being more specific, not from prompt magic. Provide context, spec precisely, show examples of your conventions, ask for tests, and review the output by running it rather than reading it.

The model is a capable engineer who doesn't know your system. Write specifications that would make sense to such an engineer, and the outputs will be worth building on.
