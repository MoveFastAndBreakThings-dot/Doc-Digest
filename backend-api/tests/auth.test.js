const request = require('supertest');
const express = require('express');
const authRouter = require('../routes/auth');
const authService = require('../services/authService');
const validator = require('../utils/validator');

// Mock dependencies
jest.mock('../services/authService');
jest.mock('../utils/validator');

// Set up the Express app for testing
const app = express();
app.use(express.json());
app.use('/auth', authRouter);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/signup', () => {
    it('registers a user successfully', async () => {
      validator.signupSchema.validate.mockReturnValue({});
      authService.checkUserExists.mockResolvedValue(false);
      authService.createUser.mockResolvedValue({ id: 1, email: 'a@b.com' });

      const res = await request(app)
        .post('/auth/signup')
        .send({ firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'pw' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 if validation fails', async () => {
      validator.signupSchema.validate.mockReturnValue({ error: { details: [{ message: 'Invalid' }] } });

      const res = await request(app)
        .post('/auth/signup')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 if user exists', async () => {
      validator.signupSchema.validate.mockReturnValue({});
      authService.checkUserExists.mockResolvedValue(true);

      const res = await request(app)
        .post('/auth/signup')
        .send({ email: 'a@b.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in successfully', async () => {
      validator.loginSchema.validate.mockReturnValue({});
      const user = { id: 1, email: 'a@b.com', password: 'hashed' };
      authService.checkUserExists.mockResolvedValue(user);
      authService.comparePassword.mockResolvedValue(true);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'pw' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 if validation fails', async () => {
      validator.loginSchema.validate.mockReturnValue({ error: { details: [{ message: 'Invalid' }] } });

      const res = await request(app)
        .post('/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 if user not found', async () => {
      validator.loginSchema.validate.mockReturnValue({});
      authService.checkUserExists.mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'pw' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 if password invalid', async () => {
      validator.loginSchema.validate.mockReturnValue({});
      const user = { id: 1, email: 'a@b.com', password: 'hashed' };
      authService.checkUserExists.mockResolvedValue(user);
      authService.comparePassword.mockResolvedValue(false);

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'a@b.com', password: 'pw' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/google', () => {
    it('logs in with Google successfully', async () => {
      validator.googleAuthSchema.validate.mockReturnValue({});
      authService.handleGoogleAuth.mockResolvedValue({ id: 1, email: 'a@b.com', password: 'pw' });

      const res = await request(app)
        .post('/auth/google')
        .send({ token: 'tok' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 if validation fails', async () => {
      validator.googleAuthSchema.validate.mockReturnValue({ error: { details: [{ message: 'Invalid' }] } });

      const res = await request(app)
        .post('/auth/google')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 if Google token invalid', async () => {
      validator.googleAuthSchema.validate.mockReturnValue({});
      authService.handleGoogleAuth.mockRejectedValue(new Error('fail'));

      const res = await request(app)
        .post('/auth/google')
        .send({ token: 'tok' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
