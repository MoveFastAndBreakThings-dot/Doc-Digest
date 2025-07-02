const Joi = require('joi');

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

module.exports = {
  signupSchema,
  loginSchema,
  googleAuthSchema,
}; 