require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
const Joi = require('joi');
const { PrismaClient } = require('./generated/prisma');

const app = express();
const PORT = process.env.PORT;

// Ensure required environment variables are set
const requiredEnv = ['GOOGLE_CLIENT_ID'];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Validation Schemas
const signupSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

const googleAuthSchema = Joi.object({
  token: Joi.string().required(),
});

// Routes
app.use('/api/auth', require('./routes/auth'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

(async () => {
  try {
    await prisma.$connect();
    console.log('Successfully connected to the database via Prisma');
  } catch (err) {
    console.error('Prisma database connection error:', err.message);
    process.exit(1);
  }
})();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = server;