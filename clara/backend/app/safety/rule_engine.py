from dataclasses import dataclass, field
from typing import List, Literal, Optional
import redis.asyncio as redis
import json
from app.db.redis import SESSION_SIGNALS_KEY, SESSION_TTL


@dataclass
class DistressSignal:
    """
    An individual distress signal from a single pattern match.
    Used by the RuleEngine to evaluate escalation patterns across a session.
    """
    severity: Literal["critical", "high", "medium", "low"]
    signal_type: str


@dataclass
class RuleResult:
    should_alert: bool
    alert_severity: Optional[str] = None
    rule_name: Optional[str] = None
    notify_channels: List[str] = field(default_factory=list)

class RuleEngine:
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client

    async def add_signals_to_history(self, session_id: str, signals: List[DistressSignal]):
        if not self.redis or not signals:
            return
        
        key = SESSION_SIGNALS_KEY.format(session_id=session_id)
        for sig in signals:
            # Store severity and timestamp
            await self.redis.lpush(key, json.dumps({
                "severity": sig.severity,
                "type": sig.signal_type
            }))
        
        await self.redis.ltrim(key, 0, 19)  # Keep last 20 signals
        await self.redis.expire(key, SESSION_TTL)

    async def evaluate(
        self, 
        session_id: str, 
        current_signals: List[DistressSignal],
        ai_detected_distress: bool = False
    ) -> RuleResult:
        
        # Rule 1: CRITICAL signal
        if any(s.severity == "critical" for s in current_signals):
            return RuleResult(
                should_alert=True,
                alert_severity="critical",
                rule_name="critical_safety_signal",
                notify_channels=["push", "email"]
            )
            
        # Rule 2: HIGH signal
        if any(s.severity == "high" for s in current_signals):
            return RuleResult(
                should_alert=True,
                alert_severity="high",
                rule_name="high_distress_signal",
                notify_channels=["push"]
            )

        # Signal history for ESCALATION
        if self.redis:
            key = SESSION_SIGNALS_KEY.format(session_id=session_id)
            history_data = await self.redis.lrange(key, 0, 9) # Last 10 signals
            history = [json.loads(s) for s in history_data]
            
            medium_count = sum(1 for s in history if s["severity"] == "medium")
            
            # Rule 3: ESCALATION (3+ medium signals in last 10)
            if medium_count >= 3:
                return RuleResult(
                    should_alert=True,
                    alert_severity="medium",
                    rule_name="escalating_distress_pattern",
                    notify_channels=["push"]
                )

        # Rule 4: AI_FLAG
        if ai_detected_distress:
            return RuleResult(
                should_alert=True,
                alert_severity="medium",
                rule_name="ai_distress_flag",
                notify_channels=["push"]
            )

        # Rule 5: REPEATED_QUESTION 
        if any(s.signal_type == "repeated_question" for s in current_signals):
            return RuleResult(
                should_alert=True,
                alert_severity="low",
                rule_name="repeated_orientation_question",
                notify_channels=[] # Log only
            )

        return RuleResult(should_alert=False, notify_channels=[])
