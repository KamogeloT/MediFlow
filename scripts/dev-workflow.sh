#!/bin/bash

# MediFlow Development Workflow Script
echo "🚀 Starting MediFlow Development Workflow..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Install dependencies
print_status "Step 1: Installing dependencies..."
npm install

# Step 2: Type checking
print_status "Step 2: Running TypeScript type checking..."
if npm run build-no-errors; then
    print_success "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed"
    exit 1
fi

# Step 3: Linting
print_status "Step 3: Running ESLint..."
if npm run lint; then
    print_success "ESLint passed"
else
    print_error "ESLint failed"
    exit 1
fi

# Step 4: Run tests
print_status "Step 4: Running test suite..."
if npm test; then
    print_success "All tests passed"
else
    print_error "Tests failed"
    exit 1
fi

# Step 5: Build verification
print_status "Step 5: Verifying production build..."
if npm run build; then
    print_success "Production build successful"
else
    print_error "Production build failed"
    exit 1
fi

echo "🎉 Development Workflow Complete!"
echo "✅ Ready to add new features!"
