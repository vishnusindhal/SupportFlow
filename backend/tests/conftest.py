import os

os.environ["DATABASE_URL"] = "sqlite:///./test_supportflow.db"
os.environ["JWT_SECRET_KEY"] = "test-secret-that-is-at-least-32-bytes-long"

import pytest
from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    return TestClient(app)
