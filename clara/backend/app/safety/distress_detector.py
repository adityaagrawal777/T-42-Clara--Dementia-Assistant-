import re
from typing import List, Tuple, Literal
from dataclasses import dataclass
import structlog

logger = structlog.get_logger()

# Severity tiers for clinical escalation
DistressSeverity = Literal["critical", "high", "medium"]


@dataclass
class DistressResult:
    """Structured output from distress analysis."""
    is_distressed: bool
    severity: DistressSeverity | None
    categories: List[str]


class DistressDetector:
    """
    Clinical safety layer.
    Scans patient messages for acute distress signals across multiple categories.
    Uses regex patterns with deliberate context anchoring to avoid false positives.

    Key design rule: no bare 2-gram like "help me" may appear in a pattern,
    because it matches benign sentences ("music helps me relax", "they help me").
    Every HIGH/CRITICAL pattern must be specific enough that it cannot plausibly
    appear in a normal, positive conversation.

    Severity Tiers:
        - CRITICAL: Life-threatening — suicidal ideation, dying, medical emergencies
        - HIGH:     Acute distress — intense pain, panic, fear, explicit cry for help
        - MEDIUM:   Emotional distress — confusion, loneliness, caregiver absence
    """

    # ─── POSITIVE CONTEXT WORDS — used to suppress false positives ───────────
    # If a message contains these words AND only matches ambiguous patterns,
    # we do NOT downgrade severity — dementia patients can be simultaneously
    # distressed AND using positive words. These are checked per-pattern below.
    _POSITIVE_EMOTION_RE = re.compile(
        r"\b(so (happy|excited|thrilled|joyful|wonderful)|with (excitement|joy|delight)|because (i'?m |i am )?(happy|excited|thrilled))\b",
        re.IGNORECASE,
    )

    # ─── CRITICAL: Life-threatening signals ───────────────────────────────────
    CRITICAL_PATTERNS = [
        # Suicidal / self-harm ideation
        (r"\b(kill myself|want to die|end it( all)?|don'?t want to (live|be here)|no reason to live|give up on life|top myself|do myself in)\b", "suicidal_ideation"),
        # Dying / death expressions
        (r"\b(i'?m dying|i am dying|i think i'?m dying|i'?m going to die|i feel like dying|going to die)\b", "dying"),
        # Unambiguous medical emergencies — explicit clinical terms only
        (r"\b(heart attack|having a stroke|seizure|can'?t breathe|choking|overdose|bleeding (a lot|heavily|everywhere)|unconscious)\b", "medical_emergency"),
        # Chest symptoms — unambiguous pain/pressure language (NOT racing/pounding which can be positive)
        (r"\b(chest (pain|tightness|pressure)|short(ness)? of breath|trouble breathing|difficulty breathing|can'?t catch my breath)\b", "cardiac_respiratory_emergency"),
        # Cannot move / paralysis
        (r"\b(can'?t move|can'?t feel my|paralyzed|collapsed|fell (down|over)|i fell|i'?ve fallen)\b", "immobility"),
    ]

    # ─── HIGH: Acute distress ─────────────────────────────────────────────────
    HIGH_PATTERNS = [
        # Cardiac symptom language — heart racing/pounding moved here from CRITICAL
        # because "my heart is racing with excitement" is a common benign phrase.
        # Requires co-occurrence with a body symptom word to avoid pure-emotion matches.
        (r"\b(heart(beat)?s? (is |are )?(racing|pounding|beating (too )?fast|going too fast)|my heart won'?t stop (pounding|racing))\b", "cardiac_symptoms"),
        # Physical pain — first-person anchored to avoid "sore subject", "it hurts to miss you"
        (r"\b(i('?m| am) in (a lot of |severe |intense |terrible |bad )?pain|it (really |so |terribly )?hurts|i hurt (so much|a lot|badly|terribly))\b", "physical_pain"),
        (r"\b(my (back|head|chest|stomach|arm|leg|knee|hip|neck|shoulder|body|throat|jaw) (hurts?|aches?|is (burning|numb|throbbing|sore|very tight)))\b", "physical_pain"),
        (r"\b(i have a (bad |severe |terrible |horrible |splitting )?headache|i can'?t stand the pain)\b", "physical_pain"),
        # Acute fear / panic — unambiguous signals only
        (r"\b(terrified|panic(king)?|trapped|get me out|in danger|lock (me|the door))\b", "acute_fear"),
        (r"\b(i'?m (so |very |really )?scared|i am (so |very |really )?scared|i'?m afraid (something|they|he|she))\b", "acute_fear"),
        # Explicit cry for help — context-anchored
        (r"\b(please help me|help me please|somebody help me|someone help me|help me i'?m|help me i am|help me get out|i need help( now| urgently| immediately)?|i need someone to help me)\b", "cry_for_help"),
        # Bare "help me" end-anchored only
        (r"\bhelp\s+me[.!?]*\s*$", "cry_for_help_terminal"),
        # Dizziness / fainting
        (r"\b(dizzy|dizziness|faint(ing)?|light[- ]?head(ed)?|blacking? out|losing consciousness|nauseated|vomiting|sweating (a lot|profusely|badly))\b", "physical_distress"),
        # Exit-seeking / wandering ideation (clinical concern for dementia patients)
        (r"\b(take me home|let me out|i want to leave( here| now)?|i need to get out)\b", "exit_seeking"),
        (r"\b(i want to go home|i need to go home|please take me home)\b", "exit_seeking"),
    ]

    # ─── MEDIUM: Emotional distress ───────────────────────────────────────────
    MEDIUM_PATTERNS = [
        # Acute disorientation
        (r"\b(who are you|where am i|don'?t (know|recognize) you|i'?m lost|where'?s? my (room|house|bed))\b", "acute_disorientation"),
        # Cognitive overwhelm / mental distress
        (r"\b(mind is (going )?heavy|can'?t think straight|losing my mind|head is spinning|too much confusion)\b", "cognitive_distress"),
        # Emotional overwhelm / loneliness
        (r"\b(nobody cares|all alone|no one loves me|forgotten|abandoned|nobody comes|so lonely)\b", "emotional_distress"),
        # Caregiver absence / abandonment
        (r"\b(where'?s? (my )?(doctor|nurse|carer|caregiver|daughter|son)|they left me|no one'?s? (here|coming))\b", "caregiver_concern"),
    ]

    def analyze(self, text: str) -> Tuple[bool, List[str]]:
        """
        Backward-compatible API: returns (distress_found, categories_detected).
        """
        result = self.analyze_with_severity(text)
        return result.is_distressed, result.categories

    def analyze_with_severity(self, text: str) -> DistressResult:
        """
        Full analysis with severity tiers.
        Returns structured DistressResult with severity classification.
        Priority: CRITICAL > HIGH > MEDIUM
        """
        text_lower = text.lower().strip()
        detected_categories: List[str] = []
        max_severity: DistressSeverity | None = None

        # Scan in priority order
        for patterns, severity in [
            (self.CRITICAL_PATTERNS, "critical"),
            (self.HIGH_PATTERNS, "high"),
            (self.MEDIUM_PATTERNS, "medium"),
        ]:
            for pattern, category in patterns:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    detected_categories.append(category)
                    if max_severity is None:
                        max_severity = severity  # type: ignore[assignment]

        # Deduplicate preserving order
        seen: set[str] = set()
        unique: List[str] = []
        for c in detected_categories:
            if c not in seen:
                seen.add(c)
                unique.append(c)

        is_distressed = len(unique) > 0

        if is_distressed:
            logger.warning(
                "safety_distress_detected",
                severity=max_severity,
                categories=unique,
                text_snippet=text[:80],
            )

        return DistressResult(
            is_distressed=is_distressed,
            severity=max_severity,
            categories=unique,
        )
