const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/google', authController.googleAuthUser);

module.exports = router; 