# syntax=docker/dockerfile:1.7
FROM python:3.12-slim
WORKDIR /app
ENV PIP_REQUIRE_HASHES=0
COPY requirements-runtime.txt .
# Keep the pip download cache outside the image so source-only rebuilds do not
# redownload dependencies while the final image remains free of pip cache data.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --disable-pip-version-check --prefer-binary --default-timeout=600 --retries=10 -r requirements-runtime.txt
COPY app app
COPY alembic alembic
COPY alembic.ini .
CMD ["sh", "-c", "until alembic upgrade head; do echo 'Database not ready; retrying migrations...'; sleep 3; done; exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
