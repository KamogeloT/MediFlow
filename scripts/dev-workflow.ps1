# MediFlow Development Workflow Script (PowerShell)
# This script helps prevent breaking existing functionality when adding new features

Write-Host "🚀 Starting MediFlow Development Workflow..." -ForegroundColor Blue

# Step 1: Install dependencies
Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Step 2: Type checking
Write-Host "Step 2: Running TypeScript type checking..." -ForegroundColor Yellow
npm run build-no-errors
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ TypeScript compilation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ TypeScript compilation successful" -ForegroundColor Green

# Step 3: Linting
Write-Host "Step 3: Running ESLint..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ESLint failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ ESLint passed" -ForegroundColor Green

# Step 4: Run tests
Write-Host "Step 4: Running test suite..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ All tests passed" -ForegroundColor Green

# Step 5: Build verification
Write-Host "Step 5: Verifying production build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Production build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Production build successful" -ForegroundColor Green

Write-Host "🎉 Development Workflow Complete!" -ForegroundColor Green
Write-Host "✅ Ready to add new features!" -ForegroundColor Green
