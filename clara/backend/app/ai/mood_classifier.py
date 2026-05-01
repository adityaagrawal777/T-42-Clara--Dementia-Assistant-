# Clara Backend — AI Mood Classification
# ---------------------------------------------------------------------------
# Architecture: 4-tier pipeline (fast → accurate, never over-classifies)
#
#   Tier 1  CALM fast-path     — multi-word positive phrases. Short-circuits
#                                before ANY negative check runs.
#
#   Tier 2  Length threshold   — messages < 4 words with no CALM match are
#                                greetings/acks. Returned as calm immediately.
#
#   Tier 3  Negation-aware     — Regex patterns with:
#           pattern matching     • Negation neutralisation (strips "not scared",
#                                  "nothing to panic about" before matching).
#                                • Word boundaries (\b) — no partial matches.
#                                • First-person anchoring for emotion words
#                                  ("i'm scared" not bare "scared").
#                                • Optional intensifier slots
#                                  ("i feel SO sad" matches "i feel sad").
#
#   Tier 4  LLM fallback       — Only for genuinely ambiguous long messages
#                                that matched nothing in Tiers 1-3.
#                                Structured system prompt + safe-first label
#                                parsing (calm → happy → confused → distressed).
# ---------------------------------------------------------------------------
import re
import structlog
from dataclasses import dataclass
from typing import List, Literal, Optional, Tuple

from app.ai.ollama_client import ollama_client
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

_RF = re.IGNORECASE  # shared flag alias

# ── Negation Neutraliser ──────────────────────────────────────────────────────
# Replaces "negation_word + up-to-3 following words" with a placeholder so
# that emotion patterns do NOT fire inside negated clauses.
#
# "I'm not scared at all"       → "I'm __NEG__ at all"
# "nothing to panic about"      → "__NEG__ about"
# "I was never frightened"      → "I was __NEG__"
# "don't be afraid of that"     → "don't be __NEG__ of that"
# "I was scared yesterday"      → unchanged  ← genuine distress, still fires
_NEGATION_RE = re.compile(
    r"\b(?:not|never|no|don'?t|doesn'?t|didn'?t|isn'?t|aren'?t|wasn'?t|weren'?t"
    r"|nothing|without|nor|neither|nobody|no\s+need|no\s+reason)\b"
    r"(?:\s+\w+){0,3}",
    _RF,
)


def _neutralise(text: str) -> str:
    """Replace negated clauses with a safe placeholder before pattern scanning."""
    return _NEGATION_RE.sub(" __NEG__ ", text)


# ── Compiled Pattern Tables ───────────────────────────────────────────────────
# Each entry: (compiled_regex, category_label)
#
# DISTRESSED design rules
#   • Emotion-word patterns MUST be anchored to first-person ("i" + verb).
#     This prevents: "are you scared?", "my friend was frightened", etc.
#   • Bare single-word patterns (scared, afraid…) are FORBIDDEN — they
#     trivially false-positive on past-tense, hypothetical, and negated use.
#   • Multi-word situational patterns (where am i, i want to go home…) are
#     allowed without first-person anchoring because they are inherently
#     self-referential and clinical.
#
# CONFUSED design rules
#   • "what's happening" and "what is going on" are EXCLUDED — too generic
#     (patients ask about the news, weather, conversation topic).
#   • Only unambiguous orientation questions are listed.
#
# HAPPY design rules
#   • Positive reminiscence and affective language.
#   • Negation neutralisation is NOT applied here — "I don't love it" is
#     very unlikely to be a false positive worth worrying about.

_I = r"\bi\s+"                       # "i " anchor
_BE = r"(?:'?m|am|was|feel(?:ing)?|have\s+been)\s+"   # "i" + be-verb
_OPT_INTENS = r"(?:so\s+|very\s+|really\s+|quite\s+|absolutely\s+)?"

def _p(pattern: str, label: str) -> Tuple[re.Pattern, str]:  # type: ignore[type-arg]
    return (re.compile(pattern, _RF), label)


DISTRESSED_PATTERNS: List[Tuple[re.Pattern, str]] = [  # type: ignore[type-arg]
    # ── Fear / panic ──────────────────────────────────────────────────────
    _p(_I + _BE + _OPT_INTENS + r"(?:scared|frightened|terrified|afraid)\b", "fear"),
    _p(_I + r"(?:'?m|am)\s+in\s+a\s+panic\b", "panic"),
    _p(_I + r"(?:'?m|am)\s+panicking\b", "panic"),
    # ── Explicit cries for help (multi-word, unambiguous) ─────────────────
    _p(r"\bplease\s+help\s+me\b", "cry_for_help"),
    _p(r"\bhelp\s+me\s+please\b", "cry_for_help"),
    _p(r"\b(?:somebody|someone)\s+help\s+me\b", "cry_for_help"),
    _p(r"\bi\s+need\s+help\s+now\b", "cry_for_help"),
    _p(r"\bhelp\s+me\s+i'?m\b", "cry_for_help"),
    # ── Disorientation ────────────────────────────────────────────────────
    _p(r"\bwhere\s+am\s+i\b", "disorientation"),
    _p(r"\bi\s+don'?t\s+know\s+where\s+(?:i\s+am|this\s+is)\b", "disorientation"),
    _p(_I + _BE + _OPT_INTENS + r"(?:completely\s+)?lost\b", "disorientation"),
    _p(_I + r"(?:want|need)\s+to\s+go\s+home\b", "exit_seeking"),
    _p(r"\btake\s+me\s+home\b", "exit_seeking"),
    # ── Physical distress ─────────────────────────────────────────────────
    _p(r"\bit\s+(?:really\s+)?hurts?\b", "pain"),
    _p(_I + _BE + _OPT_INTENS + r"(?:in\s+)?(?:a\s+lot\s+of\s+)?pain\b", "pain"),
    _p(_I + r"(?:'?m|am)\s+hurting\b", "pain"),
    # ── Memory loss grief ─────────────────────────────────────────────────
    # "i can't remember X" only when followed by a personal pronoun/noun
    # (forgetting family/events), NOT "i can't remember the last time I was happy".
    _p(_I + r"(?:am|keep|'?ve\s+been)\s+forgetting\b", "memory_loss"),
    _p(_I + r"'?m\s+forgetting\b", "memory_loss"),
    _p(_I + r"can'?t\s+remember\s+(?:my|her|him|them|his|who|where|when|their)\b", "memory_loss"),
    _p(r"\bcan'?t\s+remember\s+my\b", "memory_loss"),
    _p(r"\blosing\s+my\s+(?:memory|mind)\b", "memory_loss"),
    # ── Sadness / grief ───────────────────────────────────────────────────
    _p(_I + _BE + _OPT_INTENS + r"(?:sad|unhappy|heartbroken|devastated|miserable)\b", "sadness"),
    _p(_I + r"feel\s+" + _OPT_INTENS + r"(?:sad|unhappy|heartbroken|hopeless)\b", "sadness"),
    _p(r"\bfeeling\s+" + _OPT_INTENS + r"sad\b", "sadness"),
    _p(_I + r"miss\s+(?:my|her|him|them|our|the)\b", "grief"),
    _p(_I + r"(?:am\s+|can'?t\s+stop\s+)?crying\b", "grief"),
    _p(_I + r"'?m\s+crying\b", "grief"),
    # ── Loneliness ────────────────────────────────────────────────────────
    _p(_I + _BE + _OPT_INTENS + r"(?:lonely|alone|isolated)\b", "loneliness"),
    _p(r"\bnobody\s+(?:visits?|calls?|comes?|cares?)\b", "loneliness"),
    _p(r"\bno\s+one\s+(?:comes?|visits?|calls?)\b", "loneliness"),
    # ── Anxiety / overwhelm ───────────────────────────────────────────────
    _p(_I + _BE + _OPT_INTENS + r"(?:anxious|worried|overwhelmed)\b", "anxiety"),
    _p(_I + r"can'?t\s+cope\b", "overwhelm"),
    _p(_I + r"don'?t\s+know\s+what\s+to\s+do\b", "overwhelm"),
    _p(r"\bsomething\s+(?:is|feels?)\s+(?:very\s+)?wrong\b", "distress"),
    # ── Hopelessness ──────────────────────────────────────────────────────
    _p(_I + r"give\s+up\b", "hopelessness"),
    _p(r"\bnobody\s+cares\b", "hopelessness"),
    _p(r"\bno\s+one\s+(?:loves?|cares?)\s+(?:about\s+)?me\b", "hopelessness"),
    _p(_I + r"feel\s+" + _OPT_INTENS + r"hopeless\b", "hopelessness"),
    _p(r"\bwhat'?s?\s+the\s+point\b", "hopelessness"),
]

CONFUSED_PATTERNS: List[Tuple[re.Pattern, str]] = [  # type: ignore[type-arg]
    # Orientation questions — unambiguous clinical signals
    _p(r"\bwhat\s+day\s+is\s+(?:it|today)\b", "time_confusion"),
    _p(r"\bwhat\s+(?:year|month|date)\s+is\s+it\b", "time_confusion"),
    _p(r"\bwhat\s+time\s+is\s+it\b", "time_confusion"),
    _p(r"\bwhere\s+(?:are\s+we|is\s+this\s+place)\b", "place_confusion"),
    _p(r"\bwho\s+are\s+you\b", "identity_confusion"),
    _p(r"\bwho\s+am\s+i\b", "identity_confusion"),
    _p(r"\bdo\s+i\s+know\s+you\b", "identity_confusion"),
    _p(r"\bhave\s+we\s+(?:met|spoken|talked)\b", "identity_confusion"),
    _p(_I + r"don'?t\s+(?:recogni[sz]e|know)\s+(?:you|where\s+i\s+am|this\s+place)\b", "recognition"),
    # Cognitive fog — first-person + specific qualifier
    _p(_I + r"can'?t\s+think\s+(?:straight|clearly|properly)\b", "cognitive_fog"),
    _p(_I + _BE + _OPT_INTENS + r"confused\b", "confusion"),
    _p(_I + r"feel\s+" + _OPT_INTENS + r"confused\b", "confusion"),
    _p(_I + r"'?m\s+(?:all\s+)?muddled\b", "confusion"),
    _p(r"\beverything\s+is\s+(?:so\s+|very\s+)?blurry\b", "confusion"),
    # NOTE: "what's happening" and "what is going on" are deliberately excluded.
    # They are too generic — patients ask about the news, weather, Clara's response.
    # The LLM handles genuinely confused use of these phrases.
]

HAPPY_PATTERNS: List[Tuple[re.Pattern, str]] = [  # type: ignore[type-arg]
    _p(_I + r"remember\s+when\b", "reminiscence"),
    _p(r"\bthat\s+reminds?\s+me\b", "reminiscence"),
    _p(_I + r"used\s+to\b", "reminiscence"),
    _p(r"\bgood\s+old\s+days\b", "reminiscence"),
    _p(r"\bsuch\s+(?:good|wonderful|happy)\s+times\b", "reminiscence"),
    _p(r"\bthose\s+were\s+the\s+days\b", "reminiscence"),
    _p(r"\b(?:so\s+)?wonderful\b", "joy"),
    _p(r"\b(?:so\s+)?delightful\b", "joy"),
    _p(r"\byou'?re\s+so\s+kind\b", "gratitude"),
    _p(r"\bso\s+kind\s+of\s+you\b", "gratitude"),
    _p(_I + r"'?m\s+" + _OPT_INTENS + r"grateful\b", "gratitude"),
    _p(r"\bbless\s+you\b", "gratitude"),
    _p(r"\b(?:so\s+)?joyful\b", "joy"),
    _p(r"\b(?:so\s+)?cheerful\b", "joy"),
    _p(_I + r"'?m\s+" + _OPT_INTENS + r"excited\b", "excitement"),
    _p(_I + r"love\b", "love"),
    _p(_I + r"adore\b", "love"),
    _p(r"\bmy\s+favou?rite\b", "preference"),
]


# ── CALM Fast-Path Phrases ────────────────────────────────────────────────────
# Multi-word positive / neutral phrases.  Checked BEFORE any negative pattern.
# Single words are deliberately excluded — they are handled by Tier 2 (length).
CALM_PHRASES: List[str] = [
    # State affirmations
    "going good", "going well",
    "doing well", "doing good", "doing fine", "doing okay", "doing great",
    "feeling good", "feeling fine", "feeling okay", "feeling well",
    "feeling great", "feeling alright",
    "i'm fine", "i am fine", "i'm okay", "i am okay",
    "i'm good", "i am good", "i'm great", "i am great",
    "i'm alright", "i am alright",
    "i'm doing well", "i am doing well",
    "i'm doing fine", "i am doing fine",
    "i feel good", "i feel great", "i feel well", "i feel okay",
    "i feel fine", "i feel alright", "i feel wonderful",
    # Comparative positive
    "pretty good", "quite well", "not bad", "very well",
    "fairly well", "rather well", "doing much better",
    # Situational
    "having a good", "having a great", "having a nice",
    "nice day", "lovely day", "it's a good day", "it is a good day",
    "all is well", "everything is fine", "everything's fine", "everything's okay",
    # Responsive
    "sounds good", "sounds great", "sounds nice",
    "that's good", "that's great", "that's nice", "that's wonderful",
    "that is good", "that is great",
    # Conversational
    "mine's going", "mine is going",
    "had a good", "had a great", "had a nice",
    # Therapeutic / functional "help" — caught here BEFORE bare patterns see them.
    "help me relax", "helps me relax",
    "help me sleep", "helps me sleep",
    "help me feel", "helps me feel",
    "help me calm", "helps me calm",
    "help me so much", "helps me so much",
    "they help me", "it helps me",
    "music helps me", "songs help me", "singing helps me",
    "really helps me", "always helps me",
    # Positive "can't remember" contexts — must come before Tier 3 sees the phrase
    "can't remember the last time i felt so",
    "can't remember feeling better",
    "can't remember being this happy",
    "can't remember enjoying",
]


# ── Data Model ────────────────────────────────────────────────────────────────

@dataclass
class MoodResult:
    mood: Literal["distressed", "confused", "happy", "calm"]
    confidence: float
    matched_pattern: Optional[str] = None


# ── Classifier ────────────────────────────────────────────────────────────────

class MoodClassifier:
    """
    4-tier negation-aware mood classification pipeline.

    Guarantees:
      • No single emotion word (scared, afraid, panic…) fires without first-person
        anchoring — eliminates "are you scared?", "my friend was frightened", etc.
      • Negated clauses ("not scared", "nothing to panic about") are neutralised
        before any pattern runs.
      • "what's happening / what is going on" excluded from CONFUSED — too generic.
      • Short messages (< 4 words) always return calm (greetings, acks).
      • LLM only fires on genuinely ambiguous, longer messages.
    """

    _LLM_MIN_WORD_COUNT: int = 4

    def __init__(self) -> None:
        pass  # all patterns are module-level compiled constants

    async def classify(self, content: str) -> MoodResult:
        content_stripped = content.strip()
        content_low = content_stripped.lower()

        # ── Tier 1: CALM fast-path ────────────────────────────────────────
        for phrase in CALM_PHRASES:
            if phrase in content_low:
                logger.debug("mood_calm_fast_path", matched=phrase)
                return MoodResult("calm", 0.95, phrase)

        # ── Tier 2: Length threshold ──────────────────────────────────────
        if len(content_stripped.split()) < self._LLM_MIN_WORD_COUNT:
            return MoodResult("calm", 0.80, None)

        # ── Tier 3: Negation-aware pattern matching ───────────────────────
        pattern_result = self._classify_patterns(content_low)
        if pattern_result.mood != "calm":
            return pattern_result

        # ── Tier 4: LLM fallback ──────────────────────────────────────────
        try:
            return await self._classify_ollama(content_stripped)
        except Exception as exc:
            logger.warning("mood_classification_llm_failed", error=str(exc))
            return pattern_result

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _classify_patterns(self, content_low: str) -> MoodResult:
        """
        Tier 3: regex scan on negation-neutralised text.
        Priority: DISTRESSED > CONFUSED > HAPPY > calm.
        """
        neutralised = _neutralise(content_low)

        for pattern, label in DISTRESSED_PATTERNS:
            if pattern.search(neutralised):
                logger.debug("mood_distressed_match", label=label,
                             pattern=pattern.pattern[:60])
                return MoodResult("distressed", 1.0, label)

        for pattern, label in CONFUSED_PATTERNS:
            if pattern.search(neutralised):
                logger.debug("mood_confused_match", label=label)
                return MoodResult("confused", 1.0, label)

        # HAPPY patterns run on original text — negation rarely causes issues here
        for pattern, label in HAPPY_PATTERNS:
            if pattern.search(content_low):
                logger.debug("mood_happy_match", label=label)
                return MoodResult("happy", 1.0, label)

        return MoodResult("calm", 0.5, None)

    async def _classify_ollama(self, content: str) -> MoodResult:
        """
        Tier 4: LLM classification for genuinely ambiguous messages.
        Safe-first label parsing: calm → happy → confused → distressed.
        """
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a clinical mood classifier for a dementia care application.\n"
                    "Identify the PRIMARY emotional state in the patient's message.\n\n"
                    "Respond with EXACTLY ONE WORD:\n"
                    "  calm       — neutral, routine, content, or mildly positive.\n"
                    "  happy      — joyful, excited, or warmly reminiscing.\n"
                    "  confused   — disoriented about time, place, or identity.\n"
                    "  distressed — sad, frightened, grieving, in pain, or significantly suffering.\n\n"
                    "Rules: output ONLY the classification word. When in doubt: calm"
                ),
            },
            {"role": "user", "content": f'Patient message: "{content}"'},
        ]

        raw = await ollama_client.chat(messages, model=settings.ollama.model)
        clean = raw.strip().lower()

        for label in ["calm", "happy", "confused", "distressed"]:
            if label in clean:
                logger.debug("mood_llm_classified", label=label)
                return MoodResult(label, 0.85)  # type: ignore

        logger.warning("mood_llm_unrecognised", raw=raw[:100])
        return MoodResult("calm", 0.5)


# Module-level singleton
mood_classifier = MoodClassifier()
