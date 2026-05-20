from pathlib import Path


MOCKUP_PATH = Path("docs/mockups/phase6-portal-hybrid-reviewed.html")


def test_mockup_file_exists() -> None:
    assert MOCKUP_PATH.exists(), "Mockup artifact file is missing"


def test_mockup_contains_required_phase_sections() -> None:
    assert MOCKUP_PATH.exists(), "Mockup artifact file is missing"
    html = MOCKUP_PATH.read_text(encoding="utf-8")
    required_tokens = [
        "Overview",
        "Assessment",
        "Findings",
        "Readiness",
        "Compliance and Security",
        "Create finding",
        "Record retest",
        "Request review",
    ]
    for token in required_tokens:
        assert token in html, f"Missing required token: {token}"
