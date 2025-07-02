const request = require('supertest');

// Mock environment variables before requiring server.js
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.PORT = 0; // Let the OS assign a free port

// Mock PrismaClient to avoid real DB connection
jest.mock('../generated/prisma', () => {
  return {
    PrismaClient: jest.fn(() => ({
      $connect: jest.fn().mockResolvedValue(),
      $disconnect: jest.fn().mockResolvedValue(),
    })),
  };
});

let server;

beforeAll((done) => {
  server = require('../server');
  server.on('listening', () => done());
});

afterAll((done) => {
  if (server && server.close) {
    server.close(done);
  } else {
    done();
  }
});

describe('server.js', () => {
  it('GET /api/health should return server status', async () => {
    const res = await request(server).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Server is running');
    expect(typeof res.body.timestamp).toBe('string');
  });
});