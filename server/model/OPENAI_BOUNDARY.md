# Phase 3 OpenAI Boundary

Date: 2026-08-21
Status: draft for backend AI integration

## Source rules

- OpenAI receives approved backend facts only.
- OpenAI does not decide which actions are safe.
- OpenAI explains approved actions, blocked actions, uncertainty, and escalation in farmer-friendly language.
- OpenAI must not invent pesticide dosage, dilution, spray timing, waiting periods, or new chemical products.

## Model selection

- The model name must come from `OPENAI_MODEL`.
- Do not hard-code an OpenAI model slug in runtime code, prompts, or fixtures.
- As of 2026-08-21, current official OpenAI guidance recommends the Responses API for reasoning, tool-calling, and multi-turn workflows, and recommends Structured Outputs over JSON mode when possible.

## Request boundary

Use a backend-owned grounded packet similar to the Phase 3 contract:

- `diagnosis`
- `fieldFacts`
- `weatherFacts`
- `approvedActions`
- `blockedActions`
- `missingData`
- `requestedLanguage`

The packet should contain reviewed facts and stable identifiers only. It should not contain open-ended instructions like "recommend a pesticide" or "choose the best dosage".

## Response boundary

Use the JSON schema in `server/model/openai-structured-output.schema.json`.

The schema intentionally excludes:

- dosage fields
- dilution fields
- spray interval fields
- waiting-period fields
- product-selection fields
- source-id generation fields

If dosage or product details are ever shown later, they must come from deterministic reviewed backend records, not from model-generated text.

## Validation rules

Reject or fall back if any of the following occurs:

1. The response is not valid JSON matching the schema.
2. `actionId` references are not a subset of backend-provided IDs.
3. The model adds treatment claims that are not present in approved backend facts.
4. The request times out, is refused, or returns incomplete structured output.

Fallback behavior:

- Return deterministic approved actions and deterministic notices.
- Keep uncertainty and escalation visible.
- Do not substitute free-form chemical advice.

## Recommended API shape

Use the Responses API with Structured Outputs. For text generation, prefer a strict JSON schema response shape rather than plain JSON mode.

Example request shape:

```json
{
  "model": "process.env.OPENAI_MODEL",
  "input": [
    {
      "role": "system",
      "content": "Explain approved backend facts only. Do not invent dosage or new treatment products."
    },
    {
      "role": "user",
      "content": "Grounded advisory packet goes here."
    }
  ],
  "text": {
    "format": {
      "type": "json_schema",
      "name": "grounded_advisory_explanation",
      "strict": true,
      "schema": "server/model/openai-structured-output.schema.json"
    }
  }
}
```

## Notes for implementation

- Keep prompt versioning separate from `OPENAI_MODEL`.
- Store prompt version, schema version, and model name in advisory provenance.
- Treat refusals and incomplete outputs as normal failure modes, not exceptional edge cases.
