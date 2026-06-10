"""Lock in the flashcard JSON-parsing contract the bot delivery depends on.

The flashcard service asks the LLM for a JSON array of cards and parses it with
``_extract_json``. The LLM sometimes wraps the array in markdown fences, so these
tests guard that both the raw and fenced forms parse to the same cards.
"""

import pytest

from app.services.flashcard import _extract_json


def test_parses_raw_json_array():
    raw = '[{"front": "What is X?", "back": "X is Y", "concept": "X"}]'
    items = _extract_json(raw)
    assert items == [{"front": "What is X?", "back": "X is Y", "concept": "X"}]


def test_parses_json_wrapped_in_markdown_fences():
    fenced = '```json\n[{"front": "Term", "back": "Definition", "concept": "Term"}]\n```'
    items = _extract_json(fenced)
    assert len(items) == 1
    assert items[0]["front"] == "Term"
    assert items[0]["back"] == "Definition"


def test_tolerates_prose_around_the_array():
    noisy = 'Here are your cards:\n[{"front": "A", "back": "B", "concept": "c"}]\nEnjoy!'
    items = _extract_json(noisy)
    assert items[0]["concept"] == "c"


def test_raises_when_no_array_present():
    with pytest.raises(ValueError):
        _extract_json("Sorry, I could not generate flashcards.")
