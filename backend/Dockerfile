FROM python:3.12-slim
WORKDIR /app
COPY requirements-runtime.txt .
RUN pip install --no-cache-dir --disable-pip-version-check --default-timeout=180 --retries=5 -r requirements-runtime.txt
COPY app app
COPY alembic alembic
COPY alembic.ini .
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
