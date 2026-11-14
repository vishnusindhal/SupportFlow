import sqlalchemy as sa

from alembic import op

revision = "0005_v5_flows"
down_revision = "0004_v4_chat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "conversation_flows",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("flow_json", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_conversation_flows_organization_id", "conversation_flows", ["organization_id"])
    op.add_column("conversations", sa.Column("current_state", sa.String(80), nullable=False, server_default="start"))
    op.add_column("conversations", sa.Column("context_json", sa.JSON(), nullable=False, server_default="{}"))
    op.add_column("messages", sa.Column("intent", sa.String(80), nullable=True))
    op.add_column("messages", sa.Column("entities", sa.JSON(), nullable=False, server_default="{}"))
    op.add_column("messages", sa.Column("sentiment", sa.String(30), nullable=True))


def downgrade() -> None:
    op.drop_column("messages", "sentiment")
    op.drop_column("messages", "entities")
    op.drop_column("messages", "intent")
    op.drop_column("conversations", "context_json")
    op.drop_column("conversations", "current_state")
    op.drop_index("ix_conversation_flows_organization_id", table_name="conversation_flows")
    op.drop_table("conversation_flows")
