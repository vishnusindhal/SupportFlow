import os

os.environ["DATABASE_URL"] = "sqlite:///./test_supportflow.db"
os.environ["JWT_SECRET_KEY"] = "test-secret-that-is-at-least-32-bytes-long"
# Tests never call Gemini: no API key, offline hash embeddings. Model calls are
# replaced with `FakeChains` where a test needs an answer.
os.environ["GEMINI_API_KEY"] = ""
os.environ["EMBEDDING_PROVIDER"] = "hash"

import pytest
from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.fixtures import NORTHSTAR_TEMPLATE
from app.main import app
from app.models import IndustryTemplate
from app.services.ai.chains import AnswerResult, GroundedAnswer


class FakeChains:
    """Stands in for `SupportChains` (the two LangChain model calls)."""

    def __init__(self, answer="Grounded answer.", answerable=True, rewrites=None, fail=False):
        self.answer_text = answer
        self.answerable = answerable
        self.rewrites = rewrites or {}
        self.fail = fail
        self.condense_calls = []
        self.answer_calls = []

    async def condense(self, question, history):
        self.condense_calls.append({"question": question, "history": list(history)})
        return self.rewrites.get(question, question)

    async def answer(self, *, company, standalone_question, evidence):
        self.answer_calls.append({"standalone_question": standalone_question, "evidence": evidence})
        if self.fail:
            raise RuntimeError("provider down")
        return AnswerResult(
            answer=GroundedAnswer(answer=self.answer_text, answerable=self.answerable, used_sources=[1]),
            model="fake-model",
        )


@pytest.fixture
def fake_chains(monkeypatch):
    def install(**kwargs):
        chains = FakeChains(**kwargs)
        monkeypatch.setattr("app.services.ai.graph.get_support_chains", lambda: chains)
        return chains

    return install


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add(IndustryTemplate(industry_key="ecommerce", version=1, display_name="Northstar Store", config_json=NORTHSTAR_TEMPLATE, is_active=True))
        db.commit()
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    return TestClient(app)
