const { signupSchema, loginSchema, googleAuthSchema } = require('../utils/validator');
const authService = require('../services/authService');

async function registerUser(req, res) {
  const { error } = signupSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  try {
    const { firstName, lastName, email, password } = req.body;
    const existingUser = await authService.checkUserExists(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }
    const user = await authService.createUser({ firstName, lastName, email, password });
    res.status(201).json({ success: true, message: 'User registered successfully', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function loginUser(req, res) {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  try {
    const { email, password } = req.body;
    const user = await authService.checkUserExists(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const isPasswordValid = await authService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, message: 'Login successful', user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function googleAuthUser(req, res) {
  const { error } = googleAuthSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  try {
    const { token } = req.body;
    const user = await authService.handleGoogleAuth(token);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, message: 'Google login successful', user: userWithoutPassword });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid Google token' });
  }
}

module.exports = {
  registerUser,
  loginUser,
  googleAuthUser,
}; 