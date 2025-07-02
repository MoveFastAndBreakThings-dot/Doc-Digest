import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../src/components/Home';
import '@testing-library/jest-dom';

// Mock framer-motion's motion.div to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

// Mock ThemeToggle to avoid unrelated logic
jest.mock('../src/components/ThemeToggle', () => () => <div data-testid="theme-toggle" />);

describe('Home Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('renders Home page UI', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => [],
      ok: true,
    } as any);
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    expect(screen.getByText(/Doc Digest/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByText(/Input Mode/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manual/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload pdf/i })).toBeInTheDocument();
    expect(screen.getByText(/Input Text/i)).toBeInTheDocument();
    expect(screen.getByText(/Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Ask a question/i)).toBeInTheDocument();
  });

  it('switches between manual and file input modes', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => [],
      ok: true,
    } as any);
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const manualBtn = screen.getByRole('button', { name: /manual/i });
    const fileBtn = screen.getByRole('button', { name: /upload pdf/i });
    fireEvent.click(fileBtn);
    expect(screen.getByText(/Click or drag here to upload PDF\/TXT files/i)).toBeInTheDocument();
    fireEvent.click(manualBtn);
    expect(screen.getByPlaceholderText(/enter your text here/i)).toBeInTheDocument();
  });

  it('summarizes input text and displays summary', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ json: async () => [], ok: true } as any) // users fetch
      .mockResolvedValueOnce({ json: async () => ({ summary: 'Short summary.' }), ok: true } as any); // summarize fetch
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    const textarea = screen.getByPlaceholderText(/enter your text here/i);
    fireEvent.change(textarea, { target: { value: 'This is a long text.' } });
    const summarizeBtn = screen.getByRole('button', { name: /summarize/i });
    fireEvent.click(summarizeBtn);
    await waitFor(() => expect(screen.getByText('Short summary.')).toBeInTheDocument());
  });

  it('copies summary to clipboard', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ json: async () => [], ok: true } as any) // users fetch
      .mockResolvedValueOnce({ json: async () => ({ summary: 'Short summary.' }), ok: true } as any); // summarize fetch
    const writeText = jest.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/enter your text here/i), { target: { value: 'Some text.' } });
    fireEvent.click(screen.getByRole('button', { name: /summarize/i }));
    await waitFor(() => expect(screen.getByText('Short summary.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith('Short summary.');
  });

  it('asks a question and displays answer', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ json: async () => [], ok: true } as any) // users fetch
      .mockResolvedValueOnce({ json: async () => ({ summary: 'Short summary.' }), ok: true } as any) // summarize fetch
      .mockResolvedValueOnce({ json: async () => ({ result: 'The answer.' }), ok: true } as any); // generate fetch
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/enter your text here/i), { target: { value: 'Some text.' } });
    fireEvent.click(screen.getByRole('button', { name: /summarize/i }));
    await waitFor(() => expect(screen.getByText('Short summary.')).toBeInTheDocument());
    const questionInput = screen.getByPlaceholderText(/type your question here/i);
    fireEvent.change(questionInput, { target: { value: 'What is this?' } });
    fireEvent.click(screen.getByRole('button', { name: /ask/i }));
    await waitFor(() => expect(screen.getByText('The answer.')).toBeInTheDocument());
  });

  it('logs out and navigates to login', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({ json: async () => [], ok: true } as any);
    window.localStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
    const navigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockImplementation(() => navigate);
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(window.localStorage.getItem('user')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  // You can add more tests for file upload and users panel if needed
});
