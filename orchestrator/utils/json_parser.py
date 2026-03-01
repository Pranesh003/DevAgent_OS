"""
Robust JSON parser for LLM outputs.
Handles common issues: markdown fences, trailing commas, unterminated strings, etc.
"""
import json
import re


def parse_llm_json(content: str) -> dict:
    """
    Parse JSON from LLM output, handling common formatting issues:
    - Markdown code fences (```json ... ```)
    - Trailing commas
    - Unterminated strings
    - Extra text before/after JSON
    """
    content = content.strip()

    # Step 1: Strip markdown code fences
    if "```" in content:
        # Find JSON block inside fences
        fence_pattern = r'```(?:json)?\s*\n?(.*?)\n?```'
        match = re.search(fence_pattern, content, re.DOTALL)
        if match:
            content = match.group(1).strip()
        else:
            # Simple fence stripping
            parts = content.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("{") or part.startswith("["):
                    content = part
                    break

    # Step 2: Extract JSON object/array from surrounding text
    if not content.startswith("{") and not content.startswith("["):
        match = re.search(r'(\{.*\}|\[.*\])', content, re.DOTALL)
        if match:
            content = match.group(1)

    # Step 3: Try direct parse
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # Step 4: Fix trailing commas (e.g., [item,] or {key: val,})
    fixed = re.sub(r',\s*([}\]])', r'\1', content)
    try:
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    # Step 5: Fix unterminated strings by closing them
    # Find the last valid JSON structure
    depth = 0
    last_valid = 0
    in_string = False
    escape = False
    for i, c in enumerate(content):
        if escape:
            escape = False
            continue
        if c == '\\':
            escape = True
            continue
        if c == '"' and not escape:
            in_string = not in_string
            continue
        if in_string:
            continue
        if c in '{[':
            depth += 1
        elif c in '}]':
            depth -= 1
            if depth == 0:
                last_valid = i + 1
                break

    if last_valid > 0:
        truncated = content[:last_valid]
        try:
            return json.loads(truncated)
        except json.JSONDecodeError:
            pass

    # Step 6: Try to repair by adding missing closing brackets
    try:
        # Count unmatched brackets
        open_braces = content.count('{') - content.count('}')
        open_brackets = content.count('[') - content.count(']')
        repaired = content
        # Close any open strings
        if repaired.count('"') % 2 != 0:
            repaired += '"'
        repaired += ']' * max(0, open_brackets)
        repaired += '}' * max(0, open_braces)
        # Remove trailing commas before closing
        repaired = re.sub(r',\s*([}\]])', r'\1', repaired)
        return json.loads(repaired)
    except json.JSONDecodeError:
        pass

    # Step 7: Last resort — try to find any valid JSON object
    for match in re.finditer(r'\{[^{}]*\}', content):
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            continue

    raise ValueError(f"Could not parse JSON from LLM output (length={len(content)})")
