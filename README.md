# Step 13 — Production Architecture, GitHub CI/CD & Render Deployment

## Objective

Convert the completed Step-11 full-stack RAG app into a production-ready single-service deployment:

```text
React source
   -> Vite production build
   -> frontend/dist
   -> Express static serving
   -> one Render Web Service
```

The production server also exposes:

```text
GET  /health
POST /ingest
POST /query
```

## Part 1 — Production Architecture & Local Verification

### Local development

Use two terminals as before:

```powershell
# Terminal 1
cd backend
npm start
```

```powershell
# Terminal 2
cd frontend
npm run dev
```

Vite proxies `/health`, `/ingest`, and `/query` to Express.

### Local production topology

Build the React app:

```powershell
npm run build --prefix frontend
```

Then run only Express:

```powershell
npm start --prefix backend
```

Open:

```text
http://localhost:3000
```

Express now serves both the React production bundle and the RAG API.

### Full local verification

From the project root:

```powershell
.\verify-production.ps1
```

Equivalent commands:

```powershell
npm install --prefix backend
npm install --prefix frontend
npm run test:ci --prefix backend
npm run test:run --prefix frontend
npm run build --prefix frontend
```

Then:

```powershell
npm start --prefix backend
```

Verify:

```text
✓ http://localhost:3000 loads React
✓ /health returns status=ok
✓ PDF/TXT upload works
✓ vector store rebuilds
✓ RAG query works
✓ retrieved evidence is shown
✓ Step-11 timing metrics remain visible
✓ browser refresh still loads the React SPA
```

## Part 2 — Final Step-13 Production Files

### Root files

```text
.github/workflows/ci.yml
.gitignore
package.json
render.yaml
verify-production.ps1
STEP-13-README.md
```

### Backend files to replace/update

```text
backend/index.js
backend/package.json
backend/.env.example
```

Add:

```text
backend/test-ci.js
```

Keep your working Step-11 files such as:

```text
backend/pipeline.js
backend/generate.js
backend/ingest.js
backend/store.js
backend/store.json
```

### Frontend files to replace/update

```text
frontend/package.json
frontend/vite.config.js
frontend/.env.example
frontend/src/api.js
```

Keep your Step-11 UI files:

```text
frontend/src/App.jsx
frontend/src/App.css
frontend/src/App.test.jsx
frontend/src/main.jsx
frontend/src/testSetup.js
```

### Why relative API URLs now matter

The browser uses:

```text
/health
/ingest
/query
```

During local Vite development, Vite proxies them to Express.

During Render production, Express serves them directly from the same origin.

This removes the need to hard-code `http://localhost:3000` into the production bundle.

### CI design

GitHub Actions uses deterministic checks only:

```text
backend-ci
  -> install backend
  -> npm run test:ci

frontend-ci
  -> install frontend
  -> npm run test:run
  -> npm run build
```

The CI workflow intentionally does not make live Hugging Face or OpenRouter calls.

## Part 3 — GitHub feature → develop → main → Render

### 1. Initialize GitHub repository

If starting from a non-Git project:

```powershell
git init

git add .
git commit -m "chore: initialize RAG application repository"

git branch -M main

git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

### 2. Create develop

```powershell
git checkout -b develop
git push -u origin develop
```

### 3. Create final feature branch

```powershell
git checkout -b feature/rag-app-final-version
```

### 4. Integrate Step 13 and verify locally

```powershell
.\verify-production.ps1
```

Then verify the one-process production topology:

```powershell
npm start --prefix backend
```

Open:

```text
http://localhost:3000
```

### 5. Commit feature branch

```powershell
git status
git add .
git commit -m "feat: prepare RAG app for production deployment"
git push -u origin feature/rag-app-final-version
```

### 6. Pull Request #1

Create:

```text
feature/rag-app-final-version
        ->
      develop
```

Require these CI checks:

```text
backend-ci
frontend-ci
```

Merge only after both pass.

Then:

```powershell
git checkout develop
git pull origin develop
```

### 7. Pull Request #2

Create:

```text
develop
  ->
main
```

Again require:

```text
backend-ci
frontend-ci
```

Merge only after both pass.

Then:

```powershell
git checkout main
git pull origin main
```

### 8. Recommended branch protection

Protect:

```text
develop
main
```

Recommended settings:

```text
Require pull request before merging
Require status checks before merging
Require branches to be up to date before merging
Block force pushes
```

Required checks:

```text
backend-ci
frontend-ci
```

### 9. Deploy with Render Blueprint

In Render:

```text
New
  -> Blueprint
  -> Connect GitHub repository
  -> Select the repository containing render.yaml
```

The Blueprint configures one Node web service with:

```text
Build:
  install backend dependencies
  install frontend dependencies
  build React

Start:
  npm start --prefix backend

Health check:
  /health

Auto deploy:
  checksPass
```

When prompted, supply these secrets in Render:

```text
HF_API_KEY
OPENROUTER_API_KEY
```

Do not commit the secret values to GitHub.

### 10. End-to-end production verification

After Render reports a successful deployment:

```text
1. Open the onrender.com URL.
2. Confirm the React UI loads.
3. Open /health and verify status=ok.
4. Upload a TXT document.
5. Upload the Circuit Stream PDF.
6. Ask: "What does the AI Systems in Production module teach?"
7. Confirm a grounded answer is returned.
8. Confirm retrieved evidence, cosine scores, and timing metrics are visible.
9. Ask an unrelated question and inspect fallback behavior.
10. Refresh the browser and confirm the React SPA still loads.
11. Push another small change through feature -> develop -> main.
12. Confirm Render deploys the new main commit after CI checks pass.
```

## Important persistence note

The current app writes `store.json` to local disk.

Render's default service filesystem is ephemeral, so a store created from an uploaded document can be lost on redeploy or restart.

For a bootcamp demo, this is acceptable if documented.

For persistent production use, move the vector store to one of:

```text
Render persistent disk
managed database / object storage
managed vector database
```

## Final architecture

```text
Developer
   ↓
feature/rag-app-final-version
   ↓
Pull Request
   ↓
GitHub Actions
   ├── backend-ci
   └── frontend-ci
   ↓
develop
   ↓
Pull Request
   ↓
GitHub Actions
   ↓
main
   ↓
Render auto deploy after checks pass
   ↓
Vite production build
   ↓
Express serves frontend/dist + RAG API
   ↓
One Render Web Service
   ↓
Production RAG application
```
