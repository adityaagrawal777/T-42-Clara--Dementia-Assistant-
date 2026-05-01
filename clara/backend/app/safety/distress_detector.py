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

    # ─── CRITICAL: Life-threatening signals ───────────────────────────────────
    CRITICAL_PATTERNS = [
        # Suicidal / self-harm ideation
        (r"\b(kill myself|want to die|end it( all)?|don'?t want to (live|be here)|no reason to live|give up on life)\b", "suicidal_ideation"),
        # Dying / death expressions
        (r"\b(i'?m dying|i am dying|i think i'?m dying|i'?m going to die|i feel like dying|going to die)\b", "dying"),
        # Acute cardiac / respiratory medical emergencies
        # NOTE: "heart attack", "stroke", etc. are explicit; the second pattern
        # catches descriptive symptom language patients naturally use instead of
        # clinical terms (e.g. "my heartbeats are increasing", "chest is tight").
        (r"\b(heart attack|having a stroke|seizure|can'?t breathe|choking|overdose|bleeding (a lot|heavily|everywhere)|unconscious)\b", "medical_emergency"),
        (r"\b(heart(beat)?s? (is |are )?(racing|pounding|increasing|beating (too )?fast|going too fast)|chest (pain|tightness|pressure)|short(ness)? of breath|trouble breathing|difficulty breathing|can'?t catch my breath)\b", "cardiac_respiratory_emergency"),
        # Cannot move / paralysis
        (r"\b(can'?t move|can'?t feel my|paralyzed|collapsed|fell (down|over)|i fell|i'?ve fallen)\b", "immobility"),
    ]

    # ─── HIGH: Acute distress ─────────────────────────────────────────────────
    HIGH_PATTERNS = [
        # Physical pain signals (specific enough to avoid false positives)
        (r"\b(hurts?|aching|burning|stinging|sore|numb|chest tight|headache|throbbing)\b", "physical_pain"),
        (r"\b(i('?m| am) in pain|i have (a )?(bad |severe )?pain|it (really )?hurts)\b", "physical_pain"),
        # Acute fear / panic — NOTE: bare "help me" is deliberately excluded.
        # It matches benign sentences like "they help me relax" or
        # "music helps me sleep". Only unambiguous panic signals are listed.
        (r"\b(scared|terrified|panic(king)?|trapped|get me out|afraid|in danger|hide|lock (me|the door))\b", "acute_fear"),
        # Explicit cry for help — context-anchored so they cannot appear in
        # normal positive conversation.
        (r"\b(please help me|help me please|somebody help me|someone help me|help me i'?m|help me i am|help me get out|i need help( now)?|i need someone to help me)\b", "cry_for_help"),
        # Bare "help me" at the END of an utterance — e.g. "my heart is racing, help me".
        # This pattern is deliberately end-anchored (\s*[.!?]*\s*$) to avoid matching
        # mid-sentence benign uses like "music helps me relax" or "they help me cope".
        # It MUST come after the therapeutic CALM_PHRASES check in MoodClassifier Tier 1.
        (r"\bhelp\s+me[.!?]*\s*$", "cry_for_help_terminal"),
        # Dizziness / fainting — strong urgent-surveillance signal
        (r"\b(dizzy|dizziness|faint(ing)?|light[- ]?head(ed)?|blacking? out|losing consciousness|feel(ing)? sick|nauseated|vomiting|sweating (a lot|profusely|badly))\b", "physical_distress"),
        # Exit-seeking / wandering ideation
        (r"\b(go home|want (to go )?home|take me home|let me out|i want to leave|where'?s? (my )?(mother|mom|husband|wife|family))\b", "exit_seeking"),
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
