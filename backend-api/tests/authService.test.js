const authService = require('../services/authService');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { PrismaClient } = require('../generated/prisma');

jest.mock('bcryptjs');
jest.mock('google-auth-library');

const mockPrisma = {
  users: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../generated/prisma', () => {
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkUserExists', () => {
    it('should call findFirst with email and googleId if googleId is provided', async () => {
      mockPrisma.users.findFirst.mockResolvedValue({ id: 1 });
      const result = await authService.checkUserExists('test@example.com', 'google123');
      expect(mockPrisma.users.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: 'test@example.com' },
            { googleId: 'google123' },
          ],
        },
      });
      expect(result).toEqual({ id: 1 });
    });

    it('should call findUnique with email if googleId is not provided', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({ id: 2 });
      const result = await authService.checkUserExists('test2@example.com');
      expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
        where: { email: 'test2@example.com' },
      });
      expect(result).toEqual({ id: 2 });
    });
  });

  describe('createUser', () => {
    it('should hash password and create user', async () => {
      bcrypt.hash.mockResolvedValue('hashedpw');
      mockPrisma.users.create.mockResolvedValue({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        created_at: '2024-01-01',
      });
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'pw',
      };
      const result = await authService.createUser(userData);
      expect(bcrypt.hash).toHaveBeenCalledWith('pw', 10);
      expect(mockPrisma.users.create).toHaveBeenCalledWith({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'hashedpw',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          created_at: true,
        },
      });
      expect(result).toEqual({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        created_at: '2024-01-01',
      });
    });

    it('should throw error if prisma create fails', async () => {
      bcrypt.hash.mockResolvedValue('hashedpw');
      mockPrisma.users.create.mockRejectedValue(new Error('DB error'));
      await expect(
        authService.createUser({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          password: 'pw',
        })
      ).rejects.toThrow('DB error');
    });
  });

  describe('comparePassword', () => {
    it('should call bcrypt.compare and return result', async () => {
      bcrypt.compare.mockResolvedValue(true);
      const result = await authService.comparePassword('plain', 'hash');
      expect(bcrypt.compare).toHaveBeenCalledWith('plain', 'hash');
      expect(result).toBe(true);
    });
  });

  describe('handleGoogleAuth', () => {
    const mockVerifyIdToken = jest.fn();
    const mockGetPayload = jest.fn();
    const mockTicket = { getPayload: mockGetPayload };
    const OLD_ENV = process.env;

    beforeAll(() => {
      OAuth2Client.mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
      }));
    });
    beforeEach(() => {
      process.env = { ...OLD_ENV, GOOGLE_CLIENT_ID: 'test-client-id' };
    });
    afterAll(() => {
      process.env = OLD_ENV;
    });

    it('should create a new user if not found', async () => {
      mockVerifyIdToken.mockResolvedValue(mockTicket);
      mockGetPayload.mockReturnValue({
        sub: 'googleid',
        email: 'g@example.com',
        name: 'Google User',
      });
      mockPrisma.users.findFirst.mockResolvedValue(null);
      mockPrisma.users.create.mockResolvedValue({ id: 1, email: 'g@example.com' });
      const result = await authService.handleGoogleAuth('token');
      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: 'token',
        audience: 'test-client-id',
      });
      expect(mockPrisma.users.create).toHaveBeenCalledWith({
        data: {
          firstName: 'Google',
          lastName: 'User',
          email: 'g@example.com',
          googleId: 'googleid',
        },
      });
      expect(result).toEqual({ id: 1, email: 'g@example.com' });
    });

    it('should update user if found', async () => {
      mockVerifyIdToken.mockResolvedValue(mockTicket);
      mockGetPayload.mockReturnValue({
        sub: 'googleid',
        email: 'g2@example.com',
        name: 'Google User2',
      });
      mockPrisma.users.findFirst.mockResolvedValue({ id: 2 });
      mockPrisma.users.update.mockResolvedValue({ id: 2, email: 'g2@example.com', googleId: 'googleid' });
      const result = await authService.handleGoogleAuth('token2');
      expect(mockPrisma.users.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { googleId: 'googleid' },
      });
      expect(result).toEqual({ id: 2, email: 'g2@example.com', googleId: 'googleid' });
    });

    it('should throw error if something fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Google error'));
      await expect(authService.handleGoogleAuth('badtoken')).rejects.toThrow('Google error');
    });
  });
});
