import resend
import structlog
import asyncio
from typing import Optional
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

# Configure Resend with the provided API Key
if settings.resend_api_key:
    resend.api_key = settings.resend_api_key

class EmailService:
    """
    Professional Mailing System for Clara AI.
    Dispatches clinical alerts and session summaries.
    """
    
    @staticmethod
    async def send_clinical_alert(
        recipient_email: str,
        patient_name: str,
        alert_level: str,
        distress_categories: list,
        message_context: str
    ) -> bool:
        """
        Sends a high-priority safety email to the medical team.
        """
        if not settings.resend_api_key:
            logger.error("resend_api_missing", detail="Email skipped")
            return False

        categories_html = "".join([f"<li style='color: #8b0000; font-weight: bold;'>{c.replace('_', ' ').capitalize()}</li>" for c in distress_categories])
        
        html_content = f"""
        <div style="font-family: 'Inter', sans-serif, Arial; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; color: #333;">
            <div style="text-align: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">
                <h1 style="color: #2c3e50; font-size: 24px; margin: 0;">Clara AI — Clinical Alert</h1>
                <p style="color: #c0392b; font-weight: bold; text-transform: uppercase; margin: 5px 0;">Level: {alert_level}</p>
            </div>
            
            <div style="padding: 20px 0;">
                <p>Hello,</p>
                <p>An automated safety scan has detected potential acute distress for patient <strong>{patient_name}</strong> during their recent active session.</p>
                
                <h3 style="color: #2c3e50; font-size: 16px; margin-top: 20px;">Detected Risks:</h3>
                <ul>
                    {categories_html}
                </ul>
                
                <h3 style="color: #2c3e50; font-size: 16px;">Interaction Snippet:</h3>
                <div style="background-color: #f9f9f9; border-left: 4px solid #3498db; padding: 15px; font-style: italic;">
                    "{message_context}"
                </div>
                
                <p style="margin-top: 20px;">Please check the <a href="{settings.frontend_url}/dashboard" style="color: #3498db; text-decoration: none;">Caregiver Dashboard</a> for the full session context.</p>
            </div>
            
            <div style="border-top: 1px solid #f0f0f0; padding-top: 20px; font-size: 12px; color: #7f8c8d; text-align: center;">
                <p>This is an automated clinical safety notification from <strong>Clara</strong>.</p>
                <p>&copy; 2026 Clara Memory AI</p>
            </div>
        </div>
        """

        try:
            params = {
                "from": settings.alert_email_from or "Clara <alerts@clara-ai.com>",
                "to": [recipient_email],
                "subject": f"🚨 URGENT: Clinical Distress Detected - {patient_name}",
                "html": html_content
            }
            
            # Using asyncio.to_thread to offload the synchronous blocking resend API
            await asyncio.to_thread(resend.Emails.send, params)
            logger.info("email_sent_successfully", recipient=recipient_email, patient=patient_name)
            return True
        except Exception as e:
            logger.error("email_dispatch_failed", error=str(e))
            return False

