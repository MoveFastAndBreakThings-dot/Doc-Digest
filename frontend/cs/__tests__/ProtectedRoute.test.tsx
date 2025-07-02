import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProtectedRoute from '../src/components/ProtectedRoute';

// Mock Navigate only, re-export the rest
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }) => <div data-testid="navigate">Redirected to {to}</div>,
  };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('renders children if user is in localStorage', () => {
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com' }));
    render(
      <ProtectedRoute>
        <div data-testid="protected-child">Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('protected-child')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('redirects to /login if user is not in localStorage', () => {
    render(
      <ProtectedRoute>
        <div data-testid="protected-child">Protected Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByTestId('navigate')).toHaveTextContent('Redirected to /login');
    expect(screen.queryByTestId('protected-child')).not.toBeInTheDocument();
  });
});
