import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import LandingPage from './LandingPage';

describe('LandingPage', () => {
  it('renders the hero heading', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('heading', {
        name: /Streamline Your Medical Practice/i,
      })
    ).toBeInTheDocument();
  });
});
