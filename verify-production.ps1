# Step 13 - Local Production Verification
$ErrorActionPreference = "Stop"

Write-Host "1. Installing backend dependencies..."
npm install --prefix backend

Write-Host "2. Installing frontend dependencies..."
npm install --prefix frontend

Write-Host "3. Running backend deterministic CI test..."
npm run test:ci --prefix backend

Write-Host "4. Running frontend tests..."
npm run test:run --prefix frontend

Write-Host "5. Building React production bundle..."
npm run build --prefix frontend

Write-Host ""
Write-Host "Verification complete."
Write-Host "Run: npm start --prefix backend"
Write-Host "Then open: http://localhost:3000"
