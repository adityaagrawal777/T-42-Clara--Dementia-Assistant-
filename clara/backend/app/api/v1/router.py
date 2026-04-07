# Clara Backend — V1 Root Router
from fastapi import APIRouter
from app.api.v1 import auth, patients, sessions, caregiver, chat, patient_auth

api_router = APIRouter()

# Register sub-modules with appropriate prefixes and tags
api_router.include_router(auth.router)
api_router.include_router(patient_auth.router)
api_router.include_router(patients.router)
api_router.include_router(sessions.router)
api_router.include_router(caregiver.router)
api_router.include_router(chat.router)

