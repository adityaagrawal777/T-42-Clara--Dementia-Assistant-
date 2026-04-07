# Clara Backend — Context Manager Unit Tests
import pytest
import uuid
import json
from unittest.mock import AsyncMock, patch
from app.ai.context_manager import ContextManager

@pytest.fixture
def context_manager():
    return ContextManager()

@pytest.mark.asyncio
async def test_load_empty_context(context_manager):
    session_id = uuid.uuid4()
    
    with patch("app.ai.context_manager.redis_client.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = None
        res = await context_manager.load_context(session_id)
        assert res == []

@pytest.mark.asyncio
async def test_load_existing_context(context_manager):
    session_id = uuid.uuid4()
    mock_data = json.dumps([{"role": "user", "content": "hi"}])
    
    with patch("app.ai.context_manager.redis_client.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_data
        res = await context_manager.load_context(session_id)
        assert len(res) == 1
        assert res[0]["role"] == "user"

@pytest.mark.asyncio
async def test_clear_context(context_manager):
    session_id = uuid.uuid4()
    with patch("app.ai.context_manager.redis_client.delete", new_callable=AsyncMock) as mock_del:
        await context_manager.clear_context(session_id)
        mock_del.assert_called_once()
