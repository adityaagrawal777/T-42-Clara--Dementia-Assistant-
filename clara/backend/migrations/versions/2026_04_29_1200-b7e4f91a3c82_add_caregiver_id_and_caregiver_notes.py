"""Add caregiver_id FK to patients and create caregiver_notes table.

Priority 1 — Fix assignment architecture:
  Adds `caregiver_id` as a proper indexed FK on `patients`, replacing the
  fragile JSON-array lookup on `caregivers.associated_patient_ids`.
  Data is backfilled from the existing JSON arrays atomically.

Priority 6 — Caregiver Notes:
  Creates `caregiver_notes` table for private caregiver observations that
  are never exposed to patients or injected into AI system prompts.

Revision ID: b7e4f91a3c82
Revises: a1b2c3d4e5f6
Create Date: 2026-04-29 12:00:00
"""
from __future__ import annotations

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b7e4f91a3c82"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Add caregiver_id to patients ───────────────────────────────────────
    op.add_column(
        "patients",
        sa.Column(
            "caregiver_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_patients_caregiver_id",
        "patients",
        "caregivers",
        ["caregiver_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_patients_caregiver_id", "patients", ["caregiver_id"])

    # ── 2. Backfill caregiver_id from existing JSON arrays ────────────────────
    # Read every caregiver's associated_patient_ids JSON array and write the
    # FK on each patient row.  Runs as a single pass — safe for any size data.
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT id, associated_patient_ids FROM caregivers "
            "WHERE associated_patient_ids IS NOT NULL"
        )
    ).fetchall()

    for caregiver_id, patient_ids_raw in rows:
        if not patient_ids_raw:
            continue
        try:
            patient_ids = (
                json.loads(patient_ids_raw)
                if isinstance(patient_ids_raw, str)
                else patient_ids_raw
            )
        except (json.JSONDecodeError, TypeError):
            continue

        for pid in patient_ids:
            try:
                conn.execute(
                    sa.text(
                        "UPDATE patients "
                        "SET caregiver_id = :cid "
                        "WHERE id = :pid AND caregiver_id IS NULL"
                    ),
                    {"cid": str(caregiver_id), "pid": str(pid)},
                )
            except Exception:
                # Skip any malformed UUIDs without aborting the migration
                pass

    # ── 3. Create caregiver_notes table ───────────────────────────────────────
    op.create_table(
        "caregiver_notes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        # TenantMixin
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        # TimestampMixin
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Core columns
        sa.Column("caregiver_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        # Foreign key constraints
        sa.ForeignKeyConstraint(
            ["organization_id"], ["organizations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["caregiver_id"], ["caregivers.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"], ["patients.id"], ondelete="CASCADE"
        ),
    )
    op.create_index(
        "ix_caregiver_notes_patient_id", "caregiver_notes", ["patient_id"]
    )
    op.create_index(
        "ix_caregiver_notes_caregiver_id", "caregiver_notes", ["caregiver_id"]
    )
    op.create_index(
        "ix_caregiver_notes_organization_id",
        "caregiver_notes",
        ["organization_id"],
    )


def downgrade() -> None:
    # Reverse in opposite order
    op.drop_index("ix_caregiver_notes_organization_id", table_name="caregiver_notes")
    op.drop_index("ix_caregiver_notes_caregiver_id", table_name="caregiver_notes")
    op.drop_index("ix_caregiver_notes_patient_id", table_name="caregiver_notes")
    op.drop_table("caregiver_notes")

    op.drop_index("ix_patients_caregiver_id", table_name="patients")
    op.drop_constraint("fk_patients_caregiver_id", "patients", type_="foreignkey")
    op.drop_column("patients", "caregiver_id")
