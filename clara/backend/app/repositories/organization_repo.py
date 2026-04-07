import uuid
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.organization import Organization

class OrganizationRepository:
    """
    Data access layer for tenants.
    Crucial for organization-level isolation and assistant branding.
    """
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, org_id: uuid.UUID) -> Optional[Organization]:
        """Fetch organization by unique UUID."""
        result = await self.db.execute(select(Organization).where(Organization.id == org_id))
        return result.scalars().first()

    async def get_by_slug(self, slug: str) -> Optional[Organization]:
        """Fetch organization by unique URL slug (e.g. for subdomains)."""
        result = await self.db.execute(select(Organization).where(Organization.slug == slug))
        return result.scalars().first()

    async def create(self, name: str, slug: str, admin_email: str, assistant_name: str = "Clara") -> Organization:
        """Provision a new clinical tenant."""
        org = Organization(
            name=name,
            slug=slug,
            admin_email=admin_email,
            assistant_name=assistant_name
        )
        self.db.add(org)
        await self.db.commit()
        await self.db.refresh(org)
        return org

    async def list_active(self) -> List[Organization]:
        """Fetch all non-suspended tenants."""
        result = await self.db.execute(select(Organization).where(Organization.is_active == True))
        return list(result.scalars().all())
