# Clara Backend — WebSocket Chat Endpoint
import asyncio
import uuid
import json
import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.auth_service import auth_service
from app.services.chat_service import ChatService
from app.ai.exceptions import ClaraAIError
from app.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

router = APIRouter(prefix="/chat", tags=["Real-time Chat"])

@router.websocket("/{session_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    session_id: uuid.UUID,
    token: str = Query(...)
):
    """
    Main real-time communication channel for Clara.
    Ensures end-to-end security through organizational scoping and role-based checks.
    """
    # 1. Signature & Expiry Validation
    user = auth_service.decode_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid credentials")
        return

    await websocket.accept()
    
    # 2. Setup database and services for this connection
    from app.db.session import async_session_factory
    from app.db.redis import redis_client
    
    async with async_session_factory() as db:
        chat_service = ChatService(db, redis_client)
        
        # Verify organizational isolation: session must exist and belong to user's org
        session = await chat_service.session_repo.get_by_id_scoped(session_id, user.organization_id)
        if not session:
            logger.warning("websocket_unauthorized_access", session_id=str(session_id), org_id=str(user.organization_id))
            await websocket.send_json({"type": "error", "message": "Access denied: Unauthorized session."})
            await websocket.close(code=4002)
            return

        # Role-based restriction: patient role must match the specific session patient
        if user.role == "patient_session" and user.patient_id != session.patient_id:
             await websocket.send_json({"type": "error", "message": "Access denied: Patient mismatch."})
             await websocket.close(code=4003)
             return

        # Load patient bio ensuring strict organizational isolation
        patient = None
        try:
            patient = await asyncio.wait_for(
                chat_service.get_patient_profile(session.patient_id, user.organization_id),
                timeout=settings.chat.patient_load_timeout
            )
        except asyncio.TimeoutError:
            logger.warning("websocket_patient_load_timeout", patient_id=str(session.patient_id))
        except Exception as load_err:
            logger.error("websocket_patient_load_error", error=str(load_err))

        if not patient:
            await websocket.send_json({
                "type": "error",
                "code": "PATIENT_NOT_FOUND",
                "message": "Unable to load patient profile. Please try reconnecting."
            })
            await websocket.close(code=4004)
            return

        # Secure Connection Acknowledgement
        await websocket.send_json({
            "type": "connection_ack",
            "session_id": str(session_id),
            "patient_name": patient.preferred_name or patient.name
        })

        # 3. Message Loop
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    msg = json.loads(data)
                    msg_type = msg.get("type", "message")
                    if msg_type not in ("message", None):
                        continue
                        
                    content = msg.get("content", "").strip()
                    mode = msg.get("input_mode", msg.get("inputMode", "chat"))
                    
                    if not content:
                        continue
                        
                    # Process and stream tokens back ensuring tenant isolation continues in handle_message
                    async for chunk in chat_service.handle_message(
                        session_id=session_id,
                        patient=patient,
                        content=content,
                        mode=mode
                    ):
                        await websocket.send_json(chunk)
                        
                except json.JSONDecodeError:
                    await websocket.send_json({"type": "error", "message": "Malformed JSON request."})
                except ClaraAIError as ai_err:
                    await websocket.send_json({
                        "type": "error", 
                        "code": ai_err.__class__.__name__,
                        "message": ai_err.user_safe_message
                    })
                except Exception as e:
                    logger.error("websocket_internal_error", error=str(e), session_id=str(session_id))
                    await websocket.send_json({"type": "error", "message": "An unexpected error occurred."})
                    
        except WebSocketDisconnect:
            pass
