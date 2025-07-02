const authController = require('../controllers/authController');
const authService = require('../services/authService');
const validator = require('../utils/validator');

jest.mock('../services/authService');
jest.mock('../utils/validator');

describe('authController', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // --- registerUser ---
  describe('registerUser', () => {
    it('should register user successfully', async () => {
      req.body = { firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'pw' };
      validator.signupSchema.validate.mockReturnValue({});
      authService.checkUserExists.mockResolvedValue(false);
      authService.createUser.mockResolvedValue({ id: 1, ...req.body });
      await authController.registerUser(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        user: { id: 1, ...req.body },
      });
    });

    it('should return 400 if validation fails', async () => {
      validator.signupSchema.validate.mockReturnValue({ error: { details: [{ message: 'Invalid' }] } });
      await authController.registerUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid' });
    });

    it('should return 400 if user exists', async () => {
      req.body = { email: 'a@b.com' };
      validator.signupSchema.validate.mockReturnValue({});
      authService.checkUserExists.mockResolvedValue(true);
      await authController.registerUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User with this email already exists' });
    });

    it('should return 500 on internal error', async () => {
      req.body = { email: 'a@b.com' };
      validator.signupSchema.validate.mockReturnValue({});
      authService.checkUserExists.mockRejectedValue(new Error('fail'));
      await authController.registerUser(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Internal server error' });
    });
  });

  // --- loginUser ---
  describe('loginUser', () => {
    it('should login successfully', async () => {
      req.body = { email: 'a@b.com', password: 'pw' };
      validator.loginSchema.validate.mockReturnValue({});
      const user = { id: 1, email: 'a@b.com', password: 'hashed' };
      authService.checkUserExists.mockResolvedValue(user);
      authService.comparePassword.mockResolvedValue(true);
      await authController.loginUser(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        user: { id: 1, email: 'a@b.com' },
      });
    });

    it('should return 400 if validation fails', async () => {
      validator.loginSchema.validate.mockReturnValue({ error: { details: [{ message: 'Invalid' }] } });
      await authController.loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid' });
    });

    it('should return 401 if user not found', async () => {
      req.body = { email: 'a@b.com', password: 'pw' };
      validator.loginSchema.validate.mockReturnValue({});
      authService.checkUserExists.mockResolvedValue(null);
      await authController.loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid email or password' });
    });

    it('should return 401 if password invalid', async () => {
      req.body = { email: 'a@b.com', password: 'pw' };
      validator.loginSchema.validate.mockReturnValue({});
      const user = { id: 1, email: 'a@b.com', password: 'hashed' };
      authService.checkUserExists.mockResolvedValue(user);
      authService.comparePassword.mockResolvedValue(false);
      await authController.loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid email or password' });
    });

    it('should return 500 on internal error', async () => {
      req.body = { email: 'a@b.com', password: 'pw' };
      validator.loginSchema.validate.mockReturnValue({});
      authService.checkUserExists.mockRejectedValue(new Error('fail'));
      await authController.loginUser(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Internal server error' });
    });
  });

  // --- googleAuthUser ---
  describe('googleAuthUser', () => {
    it('should login with Google successfully', async () => {
      req.body = { token: 'tok' };
      validator.googleAuthSchema.validate.mockReturnValue({});
      const user = { id: 1, email: 'a@b.com', password: 'pw' };
      authService.handleGoogleAuth.mockResolvedValue(user);
      await authController.googleAuthUser(req, res);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Google login successful',
        user: { id: 1, email: 'a@b.com' },
      });
    });

    it('should return 400 if validation fails', async () => {
      validator.googleAuthSchema.validate.mockReturnValue({ error: { details: [{ message: 'Invalid' }] } });
      await authController.googleAuthUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid' });
    });

    it('should return 401 if Google token invalid', async () => {
      req.body = { token: 'tok' };
      validator.googleAuthSchema.validate.mockReturnValue({});
      authService.handleGoogleAuth.mockRejectedValue(new Error('fail'));
      await authController.googleAuthUser(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid Google token' });
    });
  });
});
