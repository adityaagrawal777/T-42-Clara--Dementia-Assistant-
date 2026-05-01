import aiosmtplib
import structlog
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, List
from app.config import get_settings

logger = structlog.get_logger()

# Severity display metadata — drives colour and language of every alert email.
_SEVERITY_META = {
    "critical": {
        "label": "CRITICAL — IMMEDIATE ACTION REQUIRED",
        "color": "#dc2626",
        "bg": "#fef2f2",
        "border": "#fca5a5",
        "icon": "🚨",
    },
    "high": {
        "label": "HIGH — URGENT SURVEILLANCE REQUIRED",
        "color": "#d97706",
        "bg": "#fffbeb",
        "border": "#fcd34d",
        "icon": "⚠️",
    },
    "medium": {
        "label": "MEDIUM — CAREGIVER ATTENTION NEEDED",
        "color": "#0284c7",
        "bg": "#f0f9ff",
        "border": "#7dd3fc",
        "icon": "ℹ️",
    },
}


class EmailService:
    """
    Clinical Alert Email Service — Gmail SMTP Transport.

    Sends caregiver safety notifications via Gmail SMTP using an App Password.
    No domain verification required. Works immediately on any Gmail account.

    Requires SMTP_USER and SMTP_PASSWORD (App Password) in .env.
    """

    @staticmethod
    async def send_clinical_alert(
        recipient_email: str,
        patient_name: str,
        alert_level: str,
        distress_categories: List[str],
        message_context: str,
        patient_id: Optional[str] = None,
    ) -> bool:
        """
        Compose and deliver a high-priority clinical safety email to a caregiver.

        Args:
            recipient_email:     Destination email address (caregiver or admin).
            patient_name:        Patient's display name shown in the email.
            alert_level:         Severity — "critical", "high", or "medium".
            distress_categories: List of clinical risk category labels.
            message_context:     The patient's raw message that triggered the alert.
            patient_id:          Optional UUID for the dashboard deep-link.

        Returns:
            True on successful delivery, False on any failure.
        """
        settings = get_settings()

        # Guard: credentials must be present before attempting a connection.
        if not settings.smtp_user or not settings.smtp_password:
            logger.error(
                "email_service_smtp_credentials_missing",
                detail="Set SMTP_USER and SMTP_PASSWORD (Gmail App Password) in .env.",
            )
            return False

        meta = _SEVERITY_META.get(alert_level.lower(), _SEVERITY_META["high"])

        # ── Build email content ───────────────────────────────────────────────

        categories_html = "".join(
            f"<li style='margin-bottom:6px;'>"
            f"<span style='display:inline-block;background:{meta['color']};color:#fff;"
            f"padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;"
            f"letter-spacing:0.05em;text-transform:uppercase;'>"
            f"{c.replace('_', ' ')}</span></li>"
            for c in distress_categories
        ) or "<li style='color:#6b7280;font-style:italic;'>No specific categories detected</li>"

        dashboard_path = f"/caregiver/patients/{patient_id}" if patient_id else "/caregiver"
        dashboard_url = f"{settings.frontend_url}{dashboard_path}"

        subject = f"{meta['icon']} URGENT — Distress Detected: {patient_name} ({alert_level.upper()})"

        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1.0">
          <title>Clara Clinical Alert</title>
        </head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f8fafc;padding:32px 16px;">
            <tr><td align="center">
              <table width="100%"
                     style="max-width:600px;background:#ffffff;border-radius:16px;
                            overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);
                            border:1px solid #e2e8f0;">

                <!-- Header bar -->
                <tr><td style="background:{meta['color']};padding:28px 32px;text-align:center;">
                  <p style="margin:0;font-size:36px;">{meta['icon']}</p>
                  <h1 style="margin:8px 0 4px;color:#ffffff;font-size:20px;font-weight:800;
                             letter-spacing:-0.02em;">Clara — Clinical Safety Alert</h1>
                  <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;
                            font-weight:600;text-transform:uppercase;
                            letter-spacing:0.1em;">{meta['label']}</p>
                </td></tr>

                <!-- Patient highlight -->
                <tr><td style="padding:24px 32px 0;">
                  <div style="background:{meta['bg']};border:1.5px solid {meta['border']};
                       border-radius:10px;padding:16px 20px;">
                    <p style="margin:0;font-size:12px;color:#6b7280;font-weight:700;
                              text-transform:uppercase;letter-spacing:0.1em;">Patient</p>
                    <p style="margin:4px 0 0;font-size:22px;font-weight:800;
                              color:#0f172a;">{patient_name}</p>
                  </div>
                </td></tr>

                <!-- Body -->
                <tr><td style="padding:24px 32px;">
                  <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">
                    An automated safety scan has detected
                    <strong>{alert_level.upper()}</strong>-level distress signals during
                    <strong>{patient_name}</strong>'s active session.
                    Immediate caregiver review is recommended.
                  </p>

                  <h3 style="margin:20px 0 10px;font-size:13px;color:#374151;
                             text-transform:uppercase;letter-spacing:0.08em;
                             font-weight:800;">Detected Risk Categories</h3>
                  <ul style="margin:0;padding:0 0 0 4px;list-style:none;">
                    {categories_html}
                  </ul>

                  <h3 style="margin:24px 0 10px;font-size:13px;color:#374151;
                             text-transform:uppercase;letter-spacing:0.08em;
                             font-weight:800;">Triggering Message</h3>
                  <div style="background:#f1f5f9;border-left:4px solid {meta['color']};
                       border-radius:0 8px 8px 0;padding:14px 18px;">
                    <p style="margin:0;font-style:italic;color:#334155;font-size:14px;
                              line-height:1.6;">"{message_context}"</p>
                  </div>

                  <!-- CTA button -->
                  <div style="margin-top:28px;text-align:center;">
                    <a href="{dashboard_url}"
                       style="display:inline-block;background:{meta['color']};
                              color:#ffffff;text-decoration:none;padding:14px 32px;
                              border-radius:8px;font-weight:800;font-size:14px;
                              letter-spacing:0.02em;">
                      Open Caregiver Dashboard →
                    </a>
                  </div>
                </td></tr>

                <!-- Footer -->
                <tr><td style="padding:20px 32px 28px;border-top:1px solid #f1f5f9;
                               text-align:center;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;">
                    This is an automated clinical safety notification from
                    <strong>Clara AI</strong>. Do not reply to this email.<br>
                    © 2026 Clara Memory AI — Dementia Care Technology
                  </p>
                </td></tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """

        # ── Compose MIME message ──────────────────────────────────────────────

        message = MIMEMultipart("alternative")
        message["From"] = settings.alert_email_from
        message["To"] = recipient_email
        message["Subject"] = subject
        # Attach HTML body (UTF-8 encoded for emoji and special chars)
        message.attach(MIMEText(html_content, "html", "utf-8"))

        # ── Deliver via Gmail SMTP (STARTTLS on port 587) ─────────────────────

        try:
            await aiosmtplib.send(
                message,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_user,
                password=settings.smtp_password,
                start_tls=True,
            )
            logger.info(
                "clinical_alert_email_sent",
                recipient=recipient_email,
                patient=patient_name,
                level=alert_level,
                smtp_host=settings.smtp_host,
            )
            return True

        except aiosmtplib.SMTPAuthenticationError as exc:
            logger.error(
                "email_smtp_auth_failed",
                error=str(exc),
                detail="Check SMTP_USER and SMTP_PASSWORD (App Password) in .env.",
                smtp_user=settings.smtp_user,
            )
            return False

        except aiosmtplib.SMTPException as exc:
            logger.error(
                "clinical_alert_email_smtp_error",
                error=str(exc),
                recipient=recipient_email,
                patient=patient_name,
            )
            return False

        except Exception as exc:
            logger.error(
                "clinical_alert_email_failed",
                error=str(exc),
                recipient=recipient_email,
                patient=patient_name,
            )
            return False
