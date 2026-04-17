# Clara Backend — Interest Extraction from Patient Messages
"""
Extracts explicit interest/preference statements from patient messages and
returns individual, clean topic strings ready for profile persistence.

Design goals
───────────
• Comprehensive: covers all natural ways patients state preferences
  ("I love X", "I have interests in X", "My interests are X", etc.)
• Handles compound lists: "cars and music" → ["Cars", "Music"]
• Conservative: never returns vague stopwords or fragments > 45 chars
• Zero external dependencies: regex only, runs synchronously
"""
from __future__ import annotations
import re
from typing import List

# ── Constants ─────────────────────────────────────────────────────────────────

_MIN_LEN = 2
_MAX_LEN = 45

_STOPWORDS = {
    "i", "it", "that", "this", "things", "stuff", "everything", "nothing",
    "them", "him", "her", "you", "me", "us", "we", "they", "what",
    "how", "when", "where", "who", "which", "a", "an", "the", "some",
    "many", "more", "much", "all", "any", "both", "each", "few",
}

# ── Clause-boundary look-ahead ─────────────────────────────────────────────────
# Pattern ends here — stops matching when it hits a clause connector or punctuation.
# Capturing is done separately (see PHRASE_RE below).
_CLAUSE_END = (
    r"(?=\s*(?:[\.!\?\n]|$"
    r"|\bwhen\b|\bwhile\b|\bif\b|\bbecause\b|\bthough\b|\balthough\b"
    r"|\bsince\b|\buntil\b|\bunless\b|\bso\b|\bwhere\b|\bwhich\b"
    r"|\bbut\b|\bhowever\b"
    r"))"
)

# ── Patterns that capture the phrase after the trigger verb/phrase ─────────────
# Group 1 is always the raw interest phrase (may be a compound list).
_PATTERNS: list[re.Pattern[str]] = [

    # "I love / like / enjoy / adore / am into / am fond of jazz music"
    re.compile(
        r"\bi (?:really |always |do )?(?:love|like|enjoy|adore|am into|am fond of)\s+"
        r"([\w][\w\s,&]*?)" + _CLAUSE_END,
        re.I,
    ),

    # "I have interests in / an interest in cars and music"
    re.compile(
        r"\bi (?:have|had) (?:an? )?interest(?:s)? in\s+"
        r"([\w][\w\s,&]*?)" + _CLAUSE_END,
        re.I,
    ),

    # "I am interested in / passionate about / fond of / crazy about cricket"
    re.compile(
        r"\bi(?:'m| am| was) (?:really |very |so |quite )?"
        r"(?:interested in|passionate about|fond of|crazy about|keen on|into)\s+"
        r"([\w][\w\s,&]*?)" + _CLAUSE_END,
        re.I,
    ),

    # "my favourite / favorite food is / was biryani"
    re.compile(
        r"\bmy (?:favourite|favorite|most loved?) (?:\w+ )?(?:is|are|was|were|would be)\s+"
        r"([\w][\w\s,&]*?)" + _CLAUSE_END,
        re.I,
    ),

    # "my interests are / include / were cars and music"
    re.compile(
        r"\bmy (?:interests|hobbies|passions|loves?) (?:are|were|include|included|have always been)\s+"
        r"([\w][\w\s,&]*?)" + _CLAUSE_END,
        re.I,
    ),

    # "I used to love / enjoy gardening"
    re.compile(
        r"\bi (?:used to|always used to) (?:love|like|enjoy|adore)\s+"
        r"([\w][\w\s,&]*?)" + _CLAUSE_END,
        re.I,
    ),

    # "I've / I have always loved / enjoyed cooking"
    re.compile(
        r"\bi(?:'ve| have) always (?:loved|liked|enjoyed|adored)\s+"
        r"([\w][\w\s,&]*?)" + _CLAUSE_END,
        re.I,
    ),

    # "I told you about my interest in / love for X"
    re.compile(
        r"\bi (?:told|mentioned|shared|talked) (?:you |to you )?about (?:my )?"
        r"(?:interest in|love for|passion for|enjoy(?:ment of)?)\s+"
        r"([\w][\w\s,&]*?)" + _CLAUSE_END,
        re.I,
    ),
]

# Matches "and", ",", "&" as list separators within a phrase
_SEP_RE = re.compile(r"\s*(?:,|&|\band\b)\s*", re.I)


# ── Public API ────────────────────────────────────────────────────────────────

def extract_interests(text: str) -> List[str]:
    """
    Return a deduplicated, capitalised list of interest/topic strings
    extracted from *text*. Returns [] when nothing clear is found.
    """
    seen: set[str] = set()
    results: List[str] = []

    for pattern in _PATTERNS:
        for match in pattern.finditer(text):
            raw_phrase = match.group(1).strip().rstrip(" .,!?").strip()
            for item in _split_compound(raw_phrase):
                _try_add(item, seen, results)

    return results


# ── Internal helpers ──────────────────────────────────────────────────────────

def _split_compound(phrase: str) -> List[str]:
    """
    Split a compound phrase like "cars and music" or "cricket, cars, and music"
    into individual items ["cars", "music"] / ["cricket", "cars", "music"].
    If no separator is found, returns the phrase as a single-element list.
    """
    parts = _SEP_RE.split(phrase)
    cleaned: List[str] = []
    for part in parts:
        part = part.strip().rstrip(".,!? ").strip()
        if part:
            cleaned.append(part)
    return cleaned if cleaned else [phrase]


def _try_add(raw: str, seen: set[str], results: List[str]) -> None:
    """Validate and add *raw* to results if it passes all guards."""
    raw = raw.strip()
    if not (_MIN_LEN <= len(raw) <= _MAX_LEN):
        return
    normalised = raw.lower()
    if normalised in _STOPWORDS:
        return
    if normalised in seen:
        return
    # Reject phrases that start with a function word (likely a parsing artifact)
    first_word = normalised.split()[0]
    if first_word in _STOPWORDS:
        return
    seen.add(normalised)
    capitalised = raw[0].upper() + raw[1:]
    results.append(capitalised)
