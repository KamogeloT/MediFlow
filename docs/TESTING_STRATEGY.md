# Testing Strategy for MediFlow

This document outlines our comprehensive testing strategy to prevent breaking existing functionality when adding new features.

## 🎯 Testing Philosophy

Our testing approach follows these core principles:

1. **Test First**: Write tests before or alongside new code
2. **Comprehensive Coverage**: Test both new and existing functionality
3. **Regression Prevention**: Ensure new changes don't break existing features
4. **Real-world Scenarios**: Test realistic user interactions and data
5. **Performance Awareness**: Monitor performance impact of changes

## 🏗️ Testing Architecture

### Test Types

#### 1. Unit Tests
- **Purpose**: Test individual functions, components, and utilities in isolation
- **Coverage**: Aim for 80%+ code coverage
- **Tools**: Vitest + React Testing Library
- **Location**: `src/**/__tests__/`

#### 2. Integration Tests
- **Purpose**: Test how components work together and with external services
- **Coverage**: Critical user workflows and API integrations
- **Tools**: Vitest + React Testing Library + MSW (Mock Service Worker)
- **Location**: `src/**/__tests__/integration/`

#### 3. End-to-End Tests
- **Purpose**: Test complete user journeys from start to finish
- **Coverage**: Critical business workflows
- **Tools**: Playwright or Cypress (future implementation)
- **Location**: `tests/e2e/`

#### 4. Visual Regression Tests
- **Purpose**: Detect unintended UI changes
- **Coverage**: Key UI components and pages
- **Tools**: Storybook + Chromatic (future implementation)
- **Location**: `src/**/stories/`

## 🛠️ Testing Tools & Setup

### Core Testing Stack
```bash
# Testing framework
npm install -D vitest @vitest/ui

# React testing utilities
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Mocking utilities
npm install -D msw jsdom
```

### Configuration Files
- `vitest.config.ts` - Test runner configuration
- `src/test/setup.ts` - Global test setup and mocks
- `.husky/pre-commit` - Pre-commit hooks

## 📝 Writing Tests

### Component Testing Pattern

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  const mockProps = {
    // Define test props
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<YourComponent {...mockProps} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const mockOnClick = vi.fn();
    render(<YourComponent {...mockProps} onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Best Practices

#### 1. Test Structure
- Use descriptive test names that explain the expected behavior
- Group related tests using `describe` blocks
- Follow the AAA pattern: Arrange, Act, Assert

#### 2. Mocking Strategy
- Mock external dependencies (APIs, databases, etc.)
- Use consistent mock data across tests
- Mock at the right level (service layer vs component level)

#### 3. Assertions
- Test behavior, not implementation details
- Use semantic queries (getByRole, getByLabelText)
- Assert on user-visible outcomes

#### 4. Async Testing
- Use `waitFor` for asynchronous operations
- Handle loading states and error states
- Test both success and failure scenarios

## 🔍 Testing Checklist

### Before Writing Code
- [ ] Understand the existing test coverage
- [ ] Identify what needs to be tested
- [ ] Plan test scenarios and edge cases

### While Writing Code
- [ ] Write tests alongside new functionality
- [ ] Test error handling and edge cases
- [ ] Ensure tests are deterministic and fast

### Before Committing
- [ ] All tests pass locally
- [ ] New tests provide meaningful coverage
- [ ] Existing tests still pass
- [ ] No console.log statements in production code

## 🚀 Running Tests

### Development
```bash
# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run specific test file
npm test -- src/components/YourComponent.test.tsx

# Run tests matching pattern
npm test -- --grep "user login"
```

### CI/CD
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run pre-commit checks
npm run pre-commit

# Full validation
npm run validate
```

## 📊 Test Coverage

### Coverage Goals
- **Statements**: 80%+
- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html
```

## 🧪 Testing Common Patterns

### API Calls
```tsx
// Mock Supabase calls
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: mockData,
          error: null
        }))
      }))
    }))
  }
}));
```

### User Events
```tsx
import userEvent from '@testing-library/user-event';

it('handles form submission', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);
  
  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.type(screen.getByLabelText('Password'), 'password123');
  await user.click(screen.getByRole('button', { name: /sign in/i }));
  
  expect(screen.getByText('Welcome!')).toBeInTheDocument();
});
```

### Async Operations
```tsx
it('loads data on mount', async () => {
  render(<DataComponent />);
  
  // Show loading state
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
  
  // Loading state should be gone
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});
```

## 🚨 Common Testing Pitfalls

### ❌ Don't Do This
- Test implementation details instead of behavior
- Use brittle selectors (class names, IDs)
- Forget to test error states
- Test multiple things in one test
- Ignore async operations

### ✅ Do This Instead
- Test user-visible outcomes
- Use semantic queries (getByRole, getByLabelText)
- Test both success and failure paths
- Write focused, single-purpose tests
- Properly handle async operations with waitFor

## 🔧 Testing Utilities

### Custom Test Helpers
```tsx
// src/test/helpers.ts
export const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <Provider store={store}>
      <Router>
        {ui}
      </Router>
    </Provider>
  );
};

export const mockApiResponse = (data: any, error: any = null) => ({
  data,
  error
});
```

### Test Data Factories
```tsx
// src/test/factories.ts
export const createMockPatient = (overrides = {}) => ({
  id: 'patient-1',
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  ...overrides
});

export const createMockAppointment = (overrides = {}) => ({
  id: 'appointment-1',
  patient_id: 'patient-1',
  department_id: 'dept-1',
  appointment_date: '2024-01-15',
  appointment_time: '09:00',
  status: 'scheduled',
  ...overrides
});
```

## 📚 Resources

### Documentation
- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Docs](https://vitest.dev/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

### Examples
- `src/components/dashboard/__tests__/FrontDeskDashboard.test.tsx`
- `src/components/__tests__/ComponentTestTemplate.test.tsx`

### Tools
- `npm run test:watch` - Interactive testing
- `npm run test:ui` - Visual test runner
- `npm run test:coverage` - Coverage reports

---

**Remember**: Good tests are an investment in code quality and developer productivity. They help you move fast without breaking things.
