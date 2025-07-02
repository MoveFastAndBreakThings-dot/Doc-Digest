const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

async function checkUserExists(email, googleId = null) {
  if (googleId) {
    return await prisma.users.findFirst({
      where: {
        OR: [
          { email: email },
          { googleId: googleId }
        ]
      }
    });
  } else {
    return await prisma.users.findUnique({
      where: { email: email }
    });
  }
}

async function createUser({ firstName, lastName, email, password }) {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  try {
    const newUser = await prisma.users.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        created_at: true,
      },
    });
    return newUser;
  } catch (error) {
    throw error;
  }
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function handleGoogleAuth(token) {
  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { sub, email, name } = payload;
  let user;
  try {
    user = await checkUserExists(email, sub);
    if (!user) {
      user = await prisma.users.create({
        data: {
          firstName: name.split(' ')[0],
          lastName: name.split(' ')[1] || '',
          email,
          googleId: sub,
        },
      });
    } else {
      user = await prisma.users.update({
        where: { id: user.id },
        data: { googleId: sub },
      });
    }
    return user;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  checkUserExists,
  createUser,
  comparePassword,
  handleGoogleAuth,
}; 