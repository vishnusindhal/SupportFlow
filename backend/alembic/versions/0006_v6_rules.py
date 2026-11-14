import sqlalchemy as sa

from alembic import op

revision = "0006_v6_rules"
down_revision = "0005_v5_flows"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "company_rules",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("conditions_json", sa.JSON(), nullable=False),
        sa.Column("logic", sa.String(10), nullable=False),
        sa.Column("action_json", sa.JSON(), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_company_rules_organization_id", "company_rules", ["organization_id"])
    op.create_table(
        "rule_execution_logs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("conversation_id", sa.Uuid(), sa.ForeignKey("conversations.id"), nullable=True),
        sa.Column("rule_id", sa.Uuid(), sa.ForeignKey("company_rules.id"), nullable=False),
        sa.Column("matched", sa.Boolean(), nullable=False),
        sa.Column("result_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_rule_execution_logs_organization_id", "rule_execution_logs", ["organization_id"])
    op.create_index("ix_rule_execution_logs_conversation_id", "rule_execution_logs", ["conversation_id"])
    op.create_index("ix_rule_execution_logs_rule_id", "rule_execution_logs", ["rule_id"])


def downgrade() -> None:
    op.drop_table("rule_execution_logs")
    op.drop_table("company_rules")
