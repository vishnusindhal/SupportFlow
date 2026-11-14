import sqlalchemy as sa

from alembic import op

revision = "0004_v4_chat"
down_revision = "0003_v3_knowledge"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table, columns in {
        "conversations": [
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id"), nullable=False),
            sa.Column("channel", sa.String(30), nullable=False),
            sa.Column("status", sa.String(30), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        ],
        "messages": [
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id"), nullable=False),
            sa.Column("conversation_id", sa.Uuid(), sa.ForeignKey("conversations.id"), nullable=False),
            sa.Column("role", sa.String(20), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("metadata_json", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        ],
        "llm_usage": [
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id"), nullable=False),
            sa.Column("conversation_id", sa.Uuid(), sa.ForeignKey("conversations.id"), nullable=False),
            sa.Column("provider", sa.String(40), nullable=False),
            sa.Column("model", sa.String(120), nullable=False),
            sa.Column("prompt_tokens", sa.Integer(), nullable=True),
            sa.Column("completion_tokens", sa.Integer(), nullable=True),
            sa.Column("latency_ms", sa.Integer(), nullable=False),
            sa.Column("outcome", sa.String(30), nullable=False),
            sa.Column("retrieval_ids", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        ],
    }.items():
        op.create_table(table, *columns)
        op.create_index(f"ix_{table}_organization_id", table, ["organization_id"])
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("ix_llm_usage_conversation_id", "llm_usage", ["conversation_id"])


def downgrade() -> None:
    for table in ("llm_usage", "messages", "conversations"):
        op.drop_table(table)
