from fastapi import FastAPI
from sqlalchemy import select

from app.api.routes import auth, onboarding, organizations
from app.db.session import SessionLocal
from app.fixtures import NORTHSTAR_TEMPLATE
from app.models import IndustryTemplate

app = FastAPI(title="SupportFlow API", version="0.1.0")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(organizations.router, prefix="/api/v1")
app.include_router(onboarding.router, prefix="/api/v1")


@app.on_event("startup")
def seed_templates() -> None:
    db = SessionLocal()
    try:
        exists = db.scalar(
            select(IndustryTemplate).where(
                IndustryTemplate.industry_key == "ecommerce",
                IndustryTemplate.version == 1,
            )
        )
        if not exists:
            db.add(
                IndustryTemplate(
                    industry_key="ecommerce",
                    version=1,
                    display_name="E-commerce — Northstar Store",
                    config_json=NORTHSTAR_TEMPLATE,
                    is_active=True,
                )
            )
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
