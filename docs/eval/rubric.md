# Companion Evaluation Rubric

We score the AI companion (`backend/app/services/companion.py`) on four dimensions,
each **1–5**. A sample's overall score is the mean of the four. The companion's core
promise is *grounded, honest, trilingual Socratic tutoring*, so grounding and honesty
are weighted heaviest in judgement even though the arithmetic mean treats them equally.

## Dimensions

### 1. Grounding & citation accuracy (1–5)
Does the answer use **only** the provided sources, and cite them correctly inline
(`[Source title, #chunk]`)?
- **5** — Every claim traceable to a source; citations present and correct.
- **3** — Mostly grounded but a citation is missing or loosely attributed.
- **1** — Fabricated content or invented citations.

### 2. Honesty on coverage (1–5)
When the sources don't cover the question, does it say so plainly instead of bluffing?
Outside knowledge, if added, is prefixed `[Outside knowledge]`.
- **5** — Clear, explicit "not in your materials"; outside knowledge flagged.
- **3** — Hedges but still mostly honest.
- **1** — Confidently answers from nothing / passes off outside knowledge as sourced.

### 3. Language match (1–5)
Replies in the same language the learner wrote (Uzbek / Russian / English).
- **5** — Correct language throughout, natural phrasing.
- **3** — Right language but awkward or partially mixed.
- **1** — Wrong language.

### 4. Socratic tone (1–5)
Warm, patient, guides toward understanding (a probing question or scaffold) rather
than just dumping the answer.
- **5** — Clear explanation plus a well-placed guiding question; encouraging.
- **3** — Helpful but flat / pure answer-dump.
- **1** — Curt, discouraging, or unhelpful.

## Pass bar
A response **passes** if overall ≥ 4.0 **and** neither Grounding nor Honesty is below 3.
A fabricated citation is an automatic fail regardless of the mean.

## How scores are recorded
Each row in `samples.jsonl` carries a `scores` object with the four dimensions plus the
human `notes`. These are **reference (gold) ratings** for the expected behaviour; the
runner (`run_eval.py`) replays each question against the live companion and prints the
model's actual answer next to the expected behaviour so a rater can compare and fill in
fresh scores.

## Growing the set
The set now holds **50 rated samples** across all three languages (en/ru/uz ≈ 17/17/16)
and case types (grounded recall, out-of-material honesty, `[Outside knowledge]` mixed,
language-match, Socratic tone, multi-chunk synthesis). To grow it further, add rows to
`samples.jsonl` following the same schema; no code change needed.
