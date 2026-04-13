.PHONY: setup db backend frontend dev stop test

setup:
	@echo "Setting up dependencies..."
	cd backend && uv sync
	cd frontend && npm install
	npm install

db:
	@echo "Starting Database..."
	@-(docker-compose up -d postgres 2>/dev/null || docker compose up -d postgres 2>/dev/null || echo "⚠️ Docker not found/running, falling back to local SQLite...")

backend:
	@echo "Starting Backend..."
	cd backend && uv run uvicorn my_diary.api.main:app --reload

frontend:
	@echo "Starting Frontend..."
	cd frontend && npm run dev

dev:
	@echo "Launching full stack..."
	npm run dev

stop:
	@echo "Stopping services..."
	docker compose down

test:
	@echo "Running backend tests..."
	cd backend && uv run pytest
