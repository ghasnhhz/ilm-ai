"""Replay companion eval samples and print model answers next to expected behaviour.

Usage (from repo root, with the backend venv active):

    python docs/eval/run_eval.py            # live run (needs ANTHROPIC_API_KEY)
    python docs/eval/run_eval.py --dry-run  # no API calls; just show the plan

Each sample's `material_context` is turned into RetrievedChunk objects and passed
straight to `companion.answer`, so we exercise the real grounding/citation prompt
without needing Postgres or pgvector. Fill in fresh scores by comparing each printed
answer to the sample's `expected_behavior` using `rubric.md`.
"""

import argparse
import json
import os
import sys
import uuid
from pathlib import Path

# Make `app...` importable when run from the repo root.
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

SAMPLES = Path(__file__).resolve().parent / "samples.jsonl"


def load_samples() -> list[dict]:
    rows = []
    for line in SAMPLES.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def to_chunks(material_context: list[dict]):
    from app.services.rag import RetrievedChunk

    return [
        RetrievedChunk(
            material_id=uuid.uuid4(),
            material_title=c["title"],
            chunk_index=c["chunk_index"],
            content=c["content"],
            distance=0.0,
        )
        for c in material_context
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the companion eval set.")
    parser.add_argument("--dry-run", action="store_true", help="Don't call the model.")
    args = parser.parse_args()

    samples = load_samples()
    has_key = bool(os.environ.get("ANTHROPIC_API_KEY"))
    dry = args.dry_run or not has_key

    print(f"Loaded {len(samples)} eval samples from {SAMPLES.name}")
    if dry:
        reason = "--dry-run" if args.dry_run else "ANTHROPIC_API_KEY not set"
        print(f"DRY RUN ({reason}) — showing the planned run without calling the model.\n")
    else:
        print("LIVE RUN — calling the companion for each sample.\n")

    if not dry:
        from app.services import companion

    for s in samples:
        print("=" * 72)
        print(f"[{s['id']}]  lang={s['language']}")
        print(f"Q: {s['question']}")
        print(f"Expected: {s['expected_behavior']}")
        print(f"Gold scores: {s['scores']}")
        if dry:
            print("Model answer: <skipped>")
        else:
            chunks = to_chunks(s["material_context"])
            result, citations = companion.answer(s["question"], [], chunks)
            print(f"Model answer: {result.text}")
            print(f"Citations: {[c['material_title'] for c in citations]}")
            print(f"Tokens: in={result.input_tokens} out={result.output_tokens}")
        print()

    print("=" * 72)
    print("Compare each model answer to 'Expected' using rubric.md and record scores.")
    print("Target for full evaluation: >=50 rated samples (see rubric.md).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
