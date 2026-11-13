import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CompanyConfig(Base):
    __tablename__ = "company_configs"
    __table_args__ = (UniqueConstraint("organization_id", name="uq_company_config_organization"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"), index=True
    )
    template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("industry_templates.id"))
    template_version: Mapped[int] = mapped_column(Integer)
    config_snapshot_json: Mapped[dict] = mapped_column(JSON)
    company_profile_json: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

