# Companion Evaluation

A lightweight harness to check that the AI companion stays grounded, honest, and
trilingual as the prompt and model evolve.

## Files
- **`rubric.md`** — the four scoring dimensions (1–5) and the pass bar.
- **`samples.jsonl`** — rated samples. One JSON object per line:
  ```json
  {
    "id": "en-grounded-photosynthesis",
    "language": "en",
    "material_context": [{"title": "...", "chunk_index": 2, "content": "..."}],
    "question": "...",
    "expected_behavior": "...",
    "scores": {"grounding": 5, "honesty": 5, "language_match": 5, "socratic": 4},
    "notes": "..."
  }
  ```
- **`run_eval.py`** — replays each sample's question against the live companion,
  building `RetrievedChunk`s from `material_context` (no Postgres/pgvector needed).

## Running
From the repo root with the backend venv active:

```bash
# Dry run — no API calls, prints the plan and gold scores
python docs/eval/run_eval.py --dry-run

# Live run — needs ANTHROPIC_API_KEY; prints each model answer + tokens
ANTHROPIC_API_KEY=sk-... python docs/eval/run_eval.py
```

Without `ANTHROPIC_API_KEY` the script automatically falls back to a dry run.

## Scoring
For a live run, compare each printed **Model answer** to the sample's
**Expected behavior** and assign 1–5 per `rubric.md`. The `scores` already in
`samples.jsonl` are reference/gold ratings for the intended behaviour.

## Status / next steps
This is a **starter set (~6 samples)** spanning English, Russian, and Uzbek, and both
the grounded and out-of-material (honesty) cases. The Phase 9 goal is **≥50 rated
samples** — expand by appending rows to `samples.jsonl` (no code change required),
keeping the languages and the grounded-vs-honest split balanced.
