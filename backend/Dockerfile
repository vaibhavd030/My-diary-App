FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev

# Copy source code
COPY . .

# Environment defaults
ENV ENVIRONMENT production
ENV PORT 8080

EXPOSE 8080

# Run migrations and start API
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn my_diary.api.main:app --host 0.0.0.0 --port 8080"]
