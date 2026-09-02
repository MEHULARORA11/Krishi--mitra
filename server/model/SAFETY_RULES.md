# Disease Prediction Safety Rules

Date: 2026-08-21
Applies to: image validation, disease prediction, and advisory handoff

## Core rule

The ML model may suggest a diagnosis. It may not, by itself, authorize treatment.

## Decision order

1. Validate the upload before inference.
   Reject corrupt files, unsupported formats, oversized payloads, or images that cannot be decoded into a usable RGB tensor.

2. Run a plant relevance gate before disease classification.
   If the image is not a plant image, or does not contain a usable target leaf or plant symptom region, return `unsupported_image`.

3. Run quality checks before accepting a disease result.
   Blurry, dark, distant, over-compressed, or multi-subject images should return `low_confidence` or `unsupported_image`, not a forced crop disease label.

4. Accept a disease result only when the score clears validated thresholds.
   Until a validation set exists, use a conservative temporary threshold and replace it with calibrated values later.

5. Return uncertainty when the model is not confident.
   Use `low_confidence` or `unknown` instead of inventing certainty.

6. Only after an accepted diagnosis may the system continue into deterministic rule evaluation.
   Even then, the allowed action list must come from reviewed records and rule checks, not from the raw model prediction.

## Required rejection behaviors

| Situation | Required result |
|---|---|
| Non-plant image | `relevance: not_plant`, `uncertainty: unsupported_image` |
| Plant image but unusable target | `relevance: unclear`, `uncertainty: unsupported_image` or `low_confidence` |
| Top-1 score below threshold | `uncertainty: low_confidence` |
| Ambiguous top classes | `uncertainty: unknown` |
| Crop or class outside supported demo scope | `uncertainty: unknown` |

## Allowed advisory behaviors

- Accepted diagnosis:
  The system may show reviewed containment steps and reviewed non-chemical guidance.

- Low confidence or unknown:
  The system may ask for a better image, show safe containment, and advise local officer review when symptoms are spreading.

- Unsupported image:
  The system should request a supported crop photo and must not present disease-specific treatment guidance.

## Hard safety boundaries

- Never allow the ML result alone to approve a pesticide, fungicide, or any chemical treatment.
- Never invent pesticide names, dosage, dilution rates, spray intervals, pre-harvest intervals, re-entry intervals, or weather restrictions.
- Never hide uncertainty behind a single confident-looking label.
- Never discard blocked actions silently; keep reason codes visible in backend results.
- Never treat mock or fixture outputs as live agronomic truth.

## Minimum deterministic controls before any chemical advice

All of the following must be true before a chemical action can appear in an advisory:

1. The image passed relevance and quality checks.
2. The diagnosis passed validated acceptance thresholds.
3. The crop and disease are inside the reviewed support scope.
4. A reviewed backend record exists for that action.
5. The rule engine confirms compatibility with crop stage, co-crops, weather, previous treatments, and missing-data policy.

If any item above fails, return containment and escalation language instead.
