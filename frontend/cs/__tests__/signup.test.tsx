import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Signup from '../src/components/signup';
// Polyfill for TextEncoder in Jest environment
import { TextEncoder } from 'util';
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

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

const renderWithRouter = (ui) => {
  const { BrowserRouter } = require('react-router-dom');
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Signup Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    global.fetch = jest.fn();
    localStorage.clear();
  });

  it('renders all signup fields and Google login button', () => {
    renderWithRouter(<Signup />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByTestId('google-login')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    renderWithRouter(<Signup />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/last name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/please confirm your password/i)).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    renderWithRouter(<Signup />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
  });

  it('shows validation error for weak password', async () => {
    renderWithRouter(<Signup />);
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
  });

  it('shows validation error for password mismatch', async () => {
    renderWithRouter(<Signup />);
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Abcdef1!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Different1!' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('shows password strength indicator', () => {
    renderWithRouter(<Signup />);
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Abcdef1!' } });
    expect(screen.getByText(/strong|good|fair|weak|very weak/i)).toBeInTheDocument();
  });

  it('toggles password and confirm password visibility', () => {
    renderWithRouter(<Signup />);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const toggleBtns = screen.getAllByRole('button', { name: '' });
    // First is password, second is confirm password
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggleBtns[0]);
    expect(passwordInput).toHaveAttribute('type', 'text');
    fireEvent.click(toggleBtns[0]);
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggleBtns[1]);
    expect(confirmInput).toHaveAttribute('type', 'text');
    fireEvent.click(toggleBtns[1]);
    expect(confirmInput).toHaveAttribute('type', 'password');
  });

  it('shows API error on failed signup', async () => {
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Signup failed' }),
    });
    renderWithRouter(<Signup />);
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Abcdef1!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Abcdef1!' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/signup failed/i)).toBeInTheDocument();
  });

  it('stores user and navigates on successful signup', async () => {
    const user = { id: 1, email: 'john@example.com' };
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user }),
    });
    const navigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(navigate);
    renderWithRouter(<Signup />);
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Abcdef1!' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Abcdef1!' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(localStorage.getItem('user')).toEqual(JSON.stringify(user));
      expect(navigate).toHaveBeenCalledWith('/home');
    });
  });

  it('handles Google signup success', async () => {
    const user = { id: 2, email: 'google@example.com' };
    // @ts-ignore
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user }),
    });
    const navigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(navigate);
    renderWithRouter(<Signup />);
    fireEvent.click(screen.getByTestId('google-login'));
    await waitFor(() => {
      expect(localStorage.getItem('user')).toEqual(JSON.stringify(user));
      expect(navigate).toHaveBeenCalledWith('/home');
    });
  });

  it('handles Google signup error', async () => {
    // Remock GoogleLogin to call onError
    jest.doMock('@react-oauth/google', () => ({
      GoogleLogin: (props: any) => (
        <button onClick={() => props.onError && props.onError()} data-testid="google-login">Google Login</button>
      ),
    }));
    // Re-import Signup with new mock
    const SignupWithError = require('../src/components/signup').default;
    renderWithRouter(<SignupWithError />);
    fireEvent.click(screen.getByTestId('google-login'));
    expect(await screen.findByText(/google login failed/i)).toBeInTheDocument();
  });
});
