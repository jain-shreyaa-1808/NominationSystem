const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '8h' });

// POST /api/auth/signup  – user sets their own password (admin must create account first)
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: 'No account found for this email. Contact admin.' });
    if (user.passwordSet)
      return res.status(400).json({ message: 'Password already set. Please login instead.' });
    if (!user.isActive)
      return res.status(403).json({ message: 'Account is deactivated. Contact admin.' });

    user.password = password;
    user.passwordSet = true;
    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({
      _id: user._id, name: user.name, email: user.email, role: user.role, token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isActive)
      return res.status(403).json({ message: 'Account is deactivated. Contact admin.' });
    if (!user.passwordSet)
      return res.status(401).json({ message: 'Account not yet activated. Please sign up first.' });

    const match = await user.matchPassword(password);
    if (!match)
      return res.status(401).json({ message: 'Invalid email or password' });

    const token = generateToken(user._id);
    res.json({
      _id: user._id, name: user.name, email: user.email, role: user.role, token,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/change-password  (protected)
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both fields are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user._id);
    const match = await user.matchPassword(currentPassword);
    if (!match)
      return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json(req.user));

module.exports = router;
