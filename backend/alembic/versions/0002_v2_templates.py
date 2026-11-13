import sqlalchemy as sa

from alembic import op

revision = "0002_v2_templates"
down_revision = "0001_v1_auth_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "industry_templates",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("industry_key", sa.String(80), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("display_name", sa.String(160), nullable=False),
        sa.Column("config_json", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_industry_templates_industry_key", "industry_templates", ["industry_key"])
    op.create_index("ix_industry_templates_is_active", "industry_templates", ["is_active"])
    op.create_table(
        "company_configs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("template_id", sa.Uuid(), sa.ForeignKey("industry_templates.id"), nullable=False),
        sa.Column("template_version", sa.Integer(), nullable=False),
        sa.Column("config_snapshot_json", sa.JSON(), nullable=False),
        sa.Column("company_profile_json", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("organization_id", name="uq_company_config_organization"),
    )
    op.create_index("ix_company_configs_organization_id", "company_configs", ["organization_id"])


def downgrade() -> None:
    op.drop_table("company_configs")
    op.drop_index("ix_industry_templates_is_active", table_name="industry_templates")
    op.drop_index("ix_industry_templates_industry_key", table_name="industry_templates")
    op.drop_table("industry_templates")
