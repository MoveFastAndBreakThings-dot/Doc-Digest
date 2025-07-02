import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import '@testing-library/jest-dom'

// Mock components that require auth or complex behavior
jest.mock('../src/components/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: any) => <>{children}</> // assume always authenticated
}))


jest.mock('../src/components/Home', () => () => <div>Home Page</div>)
jest.mock('../src/components/login', () => () => <div>Login Page</div>)
jest.mock('../src/components/signup', () => () => <div>Signup Page</div>)
describe('App Routing', () => {
  test('renders Login page at /login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/login page/i)).toBeInTheDocument()
  })

  test('renders Signup page at /signup', () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/signup page/i)).toBeInTheDocument()
  })

  test('renders Home page at /home (protected)', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/home page/i)).toBeInTheDocument()
  })

  test('navigates from / to /home by default', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/home page/i)).toBeInTheDocument()
  })
})
