import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '../src/components/login';
import { BrowserRouter } from 'react-router-dom';

// Mock useNavigate and Link only, re-export the rest
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: jest.fn(),
    Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  };
});

// Mock GoogleLogin
jest.mock('@react-oauth/google', () => ({
  GoogleLogin: (props) => (
    <button onClick={() => props.onSuccess && props.onSuccess({ credential: 'test-token' })} data-testid="google-login">Google Login</button>
  ),
}));

// Helper to render with router
const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    global.fetch = jest.fn();
    localStorage.clear();
  });

  it('renders login form fields and Google login button', () => {
    renderWithRouter(<Login />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByTestId('google-login')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    renderWithRouter(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    renderWithRouter(<Login />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    renderWithRouter(<Login />);
    const passwordInput = screen.getByLabelText(/password/i);
    const toggleBtn = screen.getByRole('button', { name: '' }); // SVG button has no accessible name
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('shows API error on failed login', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Login failed' }),
    });
    renderWithRouter(<Login />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/login failed/i)).toBeInTheDocument();
  });

  it('stores user and navigates on successful login', async () => {
    const user = { id: 1, email: 'test@example.com' };
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user }),
    });
    const navigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(navigate);
    renderWithRouter(<Login />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(localStorage.getItem('user')).toEqual(JSON.stringify(user));
      expect(navigate).toHaveBeenCalledWith('/home');
    });
  });

  it('handles Google login success', async () => {
    const user = { id: 2, email: 'google@example.com' };
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user }),
    });
    const navigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(navigate);
    renderWithRouter(<Login />);
    fireEvent.click(screen.getByTestId('google-login'));
    await waitFor(() => {
      expect(localStorage.getItem('user')).toEqual(JSON.stringify(user));
      expect(navigate).toHaveBeenCalledWith('/home');
    });
  });

  it('handles Google login error', async () => {
    // Remock GoogleLogin to call onError
    jest.doMock('@react-oauth/google', () => ({
      GoogleLogin: (props: any) => (
        <button onClick={() => props.onError && props.onError()} data-testid="google-login">Google Login</button>
      ),
    }));
    // Re-import Login with new mock
    const LoginWithError = require('../src/components/login').default;
    renderWithRouter(<LoginWithError />);
    fireEvent.click(screen.getByTestId('google-login'));
    expect(await screen.findByText(/google login failed/i)).toBeInTheDocument();
  });
});
