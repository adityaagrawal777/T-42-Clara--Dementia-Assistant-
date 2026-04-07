import httpx
import structlog
from typing import Any, Dict, Optional
from app.config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()

class FCMNotifier:
    def __init__(self):
        self.project_id = settings.firebase_project_id
        # In a real app, you'd get a proper Bearer token via Google Auth libraries.
        # For this implementation, we assume a server key or token is available in settings.
        self.server_key = settings.firebase_server_key

    async def send_alert(self, fcm_token: str, alert_data: Dict[str, Any]):
        if not fcm_token:
            logger.warning("fcm_token_missing", alert_id=alert_data.get("id"))
            return

        url = f"https://fcm.googleapis.com/v1/projects/{self.project_id}/messages:send"
        
        headers = {
            "Authorization": f"Bearer {self.server_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "message": {
                "token": fcm_token,
                "notification": {
                    "title": f"Clara Alert — {alert_data['severity'].upper()}",
                    "body": alert_data["trigger_phrase"][:100],
                },
                "data": {
                    "alert_id": str(alert_data["id"]),
                    "patient_id": str(alert_data["patient_id"]),
                    "severity": alert_data["severity"],
                    "timestamp": alert_data["timestamp"],
                }
            }
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    logger.error(
                        "fcm_delivery_failed",
                        status_code=response.status_code,
                        response=response.text,
                        alert_id=alert_data["id"]
                    )
                else:
                    logger.info("fcm_delivery_success", alert_id=alert_data["id"])
            except Exception as e:
                logger.error("fcm_delivery_exception", error=str(e), alert_id=alert_data["id"])
