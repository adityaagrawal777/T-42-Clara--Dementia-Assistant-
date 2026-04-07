# Clara Backend — Repository Base Abstraction
import uuid
from typing import Generic, TypeVar, Type, Optional, List, Sequence
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    """
    Standardized, async CRUD interface for database persistence.
    Uses SQLAlchemy 2.0 select and type-safety.
    """
    def __init__(self, model: Type[ModelType], db_session: AsyncSession):
        self.model = model
        self.db = db_session

    async def get_by_id(self, entity_id: uuid.UUID) -> Optional[ModelType]:
        """Fetch a single record by its primary key UUID."""
        result = await self.db.execute(
            select(self.model).where(self.model.id == entity_id)
        )
        return result.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 100) -> Sequence[ModelType]:
        """Retrieve a paginated list of records."""
        result = await self.db.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def create(self, schema_data: dict) -> ModelType:
        """Add a new record based on provided schema dictionary."""
        db_obj = self.model(**schema_data)
        self.db.add(db_obj)
        await self.db.flush() # Ensure ID is generated
        return db_obj

    async def update(self, entity_id: uuid.UUID, data: dict) -> Optional[ModelType]:
        """Perform a partial update on a specific record."""
        stmt = (
            update(self.model)
            .where(self.model.id == entity_id)
            .values(**data)
            .returning(self.model)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def delete(self, entity_id: uuid.UUID) -> bool:
        """Remove a record permanently by its UUID."""
        stmt = delete(self.model).where(self.model.id == entity_id)
        result = await self.db.execute(stmt)
        return result.rowcount > 0
