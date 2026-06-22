---
name: claude-api
description: Reference for the Claude API / Anthropic SDK — model ids, pricing, params, streaming, tool use, MCP, agents, caching, token counting, model migration.
---

# Claude API Skill

## Current Models (2026-06-04)
- **claude-fable-5** — Most capable, 1M context, $10/$50 per 1M tokens
- **claude-opus-4-8** — Default choice, 1M context, $5/$25 per 1M tokens
- **claude-sonnet-4-6** — Mid-tier, 1M context, $3/$15 per 1M tokens
- **claude-haiku-4-5-20251001** — Fast/cheap, 200K context, $1/$5 per 1M tokens

## Critical Defaults
- Always use `claude-opus-4-8` unless explicitly told otherwise
- Default to adaptive thinking: `thinking: { type: "adaptive" }`
- Default to streaming for long inputs/outputs
- Use official `@anthropic-ai/sdk`, not raw HTTP

## TypeScript Quick Start
```ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
const response = await client.messages.create({
  model: "claude-opus-4-8",
  max_tokens: 8096,
  thinking: { type: "adaptive" },
  messages: [{ role: "user", content: "..." }],
});
```

## Streaming
```ts
const stream = await client.messages.stream({ model: "claude-opus-4-8", max_tokens: 8096, messages: [...] });
for await (const chunk of stream) { /* handle */ }
```

## Common Pitfalls
- Don't truncate long inputs silently
- Fable 5 / Opus 4.8 use adaptive thinking only (no `budget_tokens`)
- No assistant prefill on newer models
- Check `stop_reason: "refusal"` before reading content
