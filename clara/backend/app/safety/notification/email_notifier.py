import resend
import structlog
from typing import Any, Dict
from app.config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()

class EmailNotifier:
    def __init__(self):
        resend.api_key = settings.resend_api_key

    def _get_severity_color(self, severity: str) -> str:
        colors = {
            "critical": "#ef4444", # rose-500
            "high": "#f59e0b",     # amber-500
            "medium": "#3b82f6",   # blue-500
            "low": "#64748b"       # slate-500
        }
        return colors.get(severity, "#64748b")

    async def send_alert_email(self, alert_data: Dict[str, Any], patient_data: Dict[str, Any]):
        severity = alert_data["severity"].upper()
        color = self._get_severity_color(alert_data["severity"])
        dashboard_url = f"{settings.frontend_url}/caregiver/patients/{patient_data['id']}"

        html_body = f"""
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: {color}; border-bottom: 2px solid {color}; padding-bottom: 10px;">
                [CLARA ALERT - {severity}] {patient_data['preferred_name']}
            </h2>
            <p style="margin-top: 20px; font-size: 16px;">
                Safety trigger detected for <strong>{patient_data['name']}</strong> at <strong>{alert_data['timestamp']}</strong>.
            </p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid {color};">
                <p style="margin-bottom: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b;">Trigger Message:</p>
                <p style="font-size: 18px; font-style: italic; color: #0f172a;">"{alert_data['trigger_phrase']}"</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Rule Name</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">{alert_data.get('rule_name', 'N/A')}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Detected Mood</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">{alert_data.get('mood', 'neutral')}</td>
                </tr>
            </table>
            
            <div style="margin-top: 30px;">
                <a href="{dashboard_url}" style="background-color: #3730A3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
                    View in Caregiver Dashboard
                </a>
            </div>
            <p style="margin-top: 40px; font-size: 12px; color: #94a3b8;">
                This is an automated safety alert from Clara AI Healthcare Companion.
            </p>
        </div>
        """

        try:
            params = {
                "from": f"Clara Alerts <{settings.alert_email_from}>",
                "to": [settings.alert_email_to],
                "subject": f"[CLARA ALERT - {severity}] {patient_data['preferred_name']}",
                "html": html_body,
            }

            # Resend SDK (blocking call, we wrap it)
            # resend.Emails.send() is a synchronous call.
            resend.Emails.send(params)
            logger.info("email_delivery_success", alert_id=alert_data["id"])
        except Exception as e:
            logger.error("email_delivery_exception", error=str(e), alert_id=alert_data["id"])
