# --- Stage 1: Frontend Build ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Set production environment for Next.js build
ENV NODE_ENV production
RUN npm run build

# --- Stage 2: Backend & Final Runner ---
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies (including Node.js for Next.js runtime)
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install uv for fast backend management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy Backend files
COPY backend/pyproject.toml backend/uv.lock ./backend/
WORKDIR /app/backend
RUN uv sync --frozen --no-dev
COPY backend/ ./
WORKDIR /app

# Copy Built Frontend
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY --from=frontend-builder /app/frontend/next.config.ts ./frontend/
# Install only production dependencies for frontend runtime
WORKDIR /app/frontend
RUN npm install --omit=dev
WORKDIR /app

# Copy root runner setup
COPY package.json ./
RUN npm install -g concurrently

# Create final startup script
COPY <<EOF /app/start.sh
#!/bin/bash
# Run migrations before starting
cd /app/backend && PYTHONPATH=src uv run alembic upgrade head
cd /app
concurrently "cd backend && PYTHONPATH=src uv run uvicorn my_diary.api.main:app --host 0.0.0.0 --port 8000" "cd frontend && npm start"
EOF
RUN chmod +x /app/start.sh

# Production Env Defaults
ENV ENVIRONMENT production
ENV PORT 3000

EXPOSE 3000 8000
CMD ["/app/start.sh"]
