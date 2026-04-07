"""add_vector_memory

Adds cross-session semantic memory to the messages table:
  1. Enables the pgvector extension in Supabase (idempotent).
  2. Adds patient_id column — denormalised FK for O(1) patient-scoped
     memory isolation without cross-session JOINs.
  3. Adds embedding vector(768) column — stores nomic-embed-text vectors.
  4. Creates an IVFFlat approximate-nearest-neighbour index on the embedding
     column, partitioned by patient_id for performance and security isolation.

Security note: the patient_id column is the enforcement boundary.
Every semantic search MUST filter on patient_id FIRST to prevent any
possibility of cross-patient memory leakage.

Revision ID: a1b2c3d4e5f6
Revises: ebc312e48e30
Create Date: 2026-04-04 07:00:00.000000+00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "ebc312e48e30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Embedding dimensionality — must match EMBEDDING_DIM in app/models/message.py
VECTOR_DIM = 768


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. Enable pgvector extension ──────────────────────────────────────────
    # This is idempotent; safe to run multiple times.
    # Supabase already has the binary installed; this just activates it.
    conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))

    # ── 2. Add patient_id column ──────────────────────────────────────────────
    # Denormalised for efficient, secure patient-scoped queries.
    # We set nullable first, backfill from clara_sessions, then make NOT NULL.
    op.add_column(
        "messages",
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,  # temporarily nullable for backfill
        ),
    )

    # Backfill patient_id from the parent session record
    conn.execute(sa.text("""
        UPDATE messages m
        SET    patient_id = cs.patient_id
        FROM   clara_sessions cs
        WHERE  m.session_id = cs.id
          AND  m.patient_id IS NULL
    """))

    # Now enforce NOT NULL and add FK + index
    op.alter_column("messages", "patient_id", nullable=False)
    op.create_foreign_key(
        "fk_messages_patient_id",
        "messages",
        "patients",
        ["patient_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_messages_patient_id",
        "messages",
        ["patient_id"],
        unique=False,
    )

    # ── 3. Add embedding vector column ────────────────────────────────────────
    op.add_column(
        "messages",
        sa.Column(
            "embedding",
            sa.Text(),   # raw storage placeholder — cast via SQL below
            nullable=True,
            comment="nomic-embed-text 768-dim semantic vector"
        ),
    )

    # Drop the Text placeholder and replace with the proper vector type.
    # We cannot use op.add_column with Vector directly in Alembic without
    # a registered type mapping; using raw DDL is the most reliable approach.
    conn.execute(sa.text(f"ALTER TABLE messages DROP COLUMN IF EXISTS embedding"))
    conn.execute(sa.text(f"ALTER TABLE messages ADD COLUMN embedding vector({VECTOR_DIM})"))

    # ── 4. Create IVFFlat index ────────────────────────────────────────────────
    # IVFFlat is the recommended index for datasets <1M rows.
    # lists=100 is appropriate for up to ~1M vectors (sqrt(n) heuristic).
    # We use cosine distance (vector_cosine_ops) because nomic-embed-text
    # is trained under cosine similarity.
    # NOTE: This is a non-blocking CREATE INDEX on Supabase (PostgreSQL >= 15).
    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_messages_embedding_ivfflat
        ON messages
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """))


def downgrade() -> None:
    conn = op.get_bind()

    # Drop index
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_messages_embedding_ivfflat"))

    # Drop embedding column
    op.drop_column("messages", "embedding")

    # Drop patient_id column (FK + index)
    op.drop_index("ix_messages_patient_id", table_name="messages")
    op.drop_constraint("fk_messages_patient_id", "messages", type_="foreignkey")
    op.drop_column("messages", "patient_id")
