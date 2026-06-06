"""Lock in the MC grading contract the frontend depends on (B3).

The quiz UI sends the chosen option's letter (A/B/C/D, derived from its index), and
the backend grades by comparing leading letters case-insensitively. These tests guard
that contract so a future change can't silently break answer selection/scoring.
"""

from app.services.quiz import mc_is_correct


def test_matching_letters_are_correct():
    assert mc_is_correct("A", "A") is True
    assert mc_is_correct("D", "D") is True


def test_mismatched_letters_are_incorrect():
    assert mc_is_correct("B", "A") is False


def test_case_and_whitespace_insensitive():
    assert mc_is_correct(" a ", "A") is True
    assert mc_is_correct("c", "C") is True


def test_only_leading_letter_matters():
    # Backend tolerates a full "A) ..." string too, but the FE now sends just the letter.
    assert mc_is_correct("A) mitochondria", "A") is True
    assert mc_is_correct("B) nucleus", "A") is False
