import json
from pathlib import Path

FIXTURES = Path(__file__).parents[2] / "docs" / "fixtures" / "northstar_store"


def test_evaluation_fixture_has_supported_sources_or_safe_fallbacks():
    questions = json.loads((FIXTURES / "evaluation_questions.json").read_text())
    assert 20 <= len(questions) <= 30
    for question in questions:
        if question["supported"]:
            assert question["expected_source"].startswith("policies/")
        else:
            assert question["expected_behavior"] == "safe_fallback"

