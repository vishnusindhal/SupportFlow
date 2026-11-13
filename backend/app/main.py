from fastapi import FastAPI

from app.api.routes import auth, organizations

app = FastAPI(title="SupportFlow API", version="0.1.0")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(organizations.router, prefix="/api/v1")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

