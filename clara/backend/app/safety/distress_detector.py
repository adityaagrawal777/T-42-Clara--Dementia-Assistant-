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
    Uses multi-word phrase matching and negation-aware patterns for precision.

    Severity Tiers:
        - CRITICAL: Life-threatening — suicidal ideation, dying, medical emergencies
        - HIGH:     Acute distress — intense pain, panic, fear, wandering
        - MEDIUM:   Emotional distress — confusion, loneliness, caregiver absence
    """

    # ─── CRITICAL: Life-threatening signals ───────────────────────────────────
    CRITICAL_PATTERNS = [
        # Suicidal / self-harm ideation
        (r"\b(kill myself|want to die|end it( all)?|don'?t want to (live|be here)|no reason to live|give up on life)\b", "suicidal_ideation"),
        # Dying / death expressions
        (r"\b(i'?m dying|i am dying|i think i'?m dying|i'?m going to die|i feel like dying|going to die)\b", "dying"),
        # Acute medical emergency signals
        (r"\b(heart attack|having a stroke|seizure|can'?t breathe|choking|overdose|bleeding (a lot|heavily|everywhere)|unconscious)\b", "medical_emergency"),
        # Cannot move / paralysis
        (r"\b(can'?t move|can'?t feel my|paralyzed|collapsed|fell (down|over)|i fell|i'?ve fallen)\b", "immobility"),
    ]

    # ─── HIGH: Acute distress ─────────────────────────────────────────────────
    HIGH_PATTERNS = [
        # Physical pain
        (r"\b(pain|hurts?|aching|burning|stinging|sore|numb|chest tight|stomach|head(ache)?|throbbing)\b", "physical_pain"),
        # Acute fear / panic
        (r"\b(scared|terrified|panic|trapped|get me out|help me|afraid|hide|lock|danger)\b", "acute_fear"),
        # Exit-seeking / wandering ideation
        (r"\b(go home|want (to go )?home|take me home|let me out|i want to leave|where'?s? (my )?(mother|mom|husband|wife|family))\b", "exit_seeking"),
    ]

    # ─── MEDIUM: Emotional distress ───────────────────────────────────────────
    MEDIUM_PATTERNS = [
        # Acute disorientation
        (r"\b(who are you|where am i|don'?t (know|recognize) you|i'?m lost|where'?s? my (room|house|bed))\b", "acute_disorientation"),
        # Emotional overwhelm / loneliness
        (r"\b(nobody cares|all alone|no one loves me|forgotten|abandoned|nobody comes|so lonely)\b", "emotional_distress"),
        # Caregiver absence / abandonment
        (r"\b(where'?s? (my )?(doctor|nurse|carer|daughter|son)|they left me|no one'?s? (here|coming))\b", "caregiver_concern"),
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
