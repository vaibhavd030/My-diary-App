# My Diary App - Production Deployment Architecture & Troubleshooting Guide

This document operates as a persistent reference guide for the "My Diary App" GCP Cloud Run deployment. It documents the exact steps, architectural decisions, and the major troubleshooting hurdles resolved to successfully transition the application from a local development environment into a production-grade Cloud Run environment.

---

## 1. Architecture Overview
- **Backend**: Python 3 (FastAPI, SQLAlchemy Async) running on **Google Cloud Run**
- **Frontend**: Next.js 14+ (React, Vanilla CSS) running on **Google Cloud Run**
- **Database**: PostgreSQL 15 on **Google Cloud SQL**
- **Hosting Project**: `my-tele-pa`

### Live Production Endpoints
- **Frontend App URL**: `https://diary-frontend-34833003999.europe-west2.run.app`
- **Backend API URL**: `https://diary-backend-34833003999.europe-west2.run.app`

---

## 2. Backend Deployment & Cloud SQL Integration

### The Cloud SQL "Connection Refused" Issue
Initially, the backend failed to start because it couldn't reach the Cloud SQL database, resulting in a persistent `ConnectionRefusedError`. 
**The Fix**: Cloud Run containers run on a public IP boundary by default, while Cloud SQL was configured with a Private Internal IP. We used a **Serverless VPC Access pipeline** (Direct VPC Egress) to bridge the Cloud Run container directly into the private VPC subnetwork, allowing it to seamlessly talk to the database securely.

### The Alembic Migration Crash
When the backend booted, `alembic upgrade head` crashed on syntax attempting to initialize the production database tables. 
**The Fix**: Within `alembic/versions/1552cc48a454_initial_schema.py`, a SQLAlchemy text column was incorrectly specified as `Text()` instead of the required `sa.Text()`. Fixing this single syntax error allowed the initial tables to generate successfully.

### Backend Deployment Command
When pushing updates to the backend, use this structure:
```bash
gcloud run deploy diary-backend \
  --source backend \
  --region europe-west2 \
  --project my-tele-pa \
  --allow-unauthenticated \
  --vpc-egress=private-ranges-only \
  --network=default \
  --set-env-vars="DIARY_ENVIRONMENT=production,DIARY_CORS_ORIGINS=https://diary-frontend-34833003999.europe-west2.run.app" \
  --set-secrets="DIARY_DATABASE_URL=DIARY_DATABASE_URL:latest,DIARY_JWT_SECRET=DIARY_JWT_SECRET:latest"
```

---

## 3. Frontend Deployment (Resolution of Major Hassles)

The Next.js frontend deployment was particularly tricky due to Next.js's dual runtime/build-time architecture. Below are the specific issues faced and how they were permanently fixed.

### Issue 1: TypeScript Crashing the Production Container
**Symptom**: The container deployed successfully but immediately crashed with `Error: Cannot find module 'typescript'`.
**Cause**: The Next.js configuration was written as `next.config.ts`. In a production Dockerbuild, `devDependencies` (which includes TypeScript) are stripped out to save space. When Next.js tried to boot `npm start`, it couldn't transpile its own `.ts` configuration.
**Fix**: 
1. Renamed `next.config.ts` to `next.config.mjs` (Vanilla Javascript).
2. Updated the `frontend/Dockerfile` to copy the `.mjs` file instead.

### Issue 2: Massive 725+ MB Upload Times
**Symptom**: Running `gcloud builds submit frontend` took a very long time, uploading a temporary archive of ~25,000 files totaling 725.9 MiB.
**Cause**: GCP Cloud Build uses a `.gcloudignore` file (not just `.dockerignore`) to filter what is sent to the cloud build cache. Without it, the entire local `node_modules/` and `.next/` debugging cache were being uploaded.
**Fix**: Added a `.gcloudignore` to the `frontend/` directory explicitly silencing `node_modules/` and `.next/`, reducing the upload to just a few megabytes.

### Issue 3: The Persistent 404 / 500 API Proxy Error (The Toughest Bug)
**Symptom**: Upon opening the live website and trying to register/login, a `500 Internal Server Error` was thrown, initially observed as a `404`.
**Cause**: 
- Next.js acts as a proxy for the backend to handle secure `SameSite=Lax` cookies without hitting Cross-Origin boundaries. 
- In development, it proxies `"http://localhost:8000"`.
- We attempted to make this dynamic by passing `NEXT_PUBLIC_API_URL` to Next.js via `.env` variables or Cloud Run `--set-env-vars`.
- **The Catch**: Next.js automatically caches and bakes its rewrites (`routes-manifest.json`) *statically at build time* (`npm run build`). Because Next.js doesn't reliably expose `.env` variables cleanly inside `next.config.mjs` during Docker builds, the destination quietly reverted to the fallback placeholder (`localhost:8000`). Once deployed, the frontend server couldn't connect to `localhost:8000` because the container was empty!

**The Master Fix**:
Rather than fighting the fragile `.env` variable ingestion through standard docker build arguments, we updated `next.config.mjs` to rely natively on the Node.js environment:
```javascript
const isProd = process.env.NODE_ENV === "production";
const backendUrl = isProd 
  ? "https://diary-backend-34833003999.europe-west2.run.app" 
  : "http://localhost:8000";
```
Because Next.js strictly guarantees `NODE_ENV = "production"` during its build phase, the compiler flawlessly bakes the hardcoded Cloud Run Backend URL into the API Proxy every time.

### Frontend Deployment Command
When pushing updates to the layout or frontend interface, use this sequential command to build and deploy:
```bash
gcloud builds submit frontend \
  --tag europe-west2-docker.pkg.dev/my-tele-pa/my-diary/frontend:latest \
  --project my-tele-pa && \
gcloud run deploy diary-frontend \
  --image europe-west2-docker.pkg.dev/my-tele-pa/my-diary/frontend:latest \
  --region europe-west2 \
  --project my-tele-pa \
  --allow-unauthenticated
```
