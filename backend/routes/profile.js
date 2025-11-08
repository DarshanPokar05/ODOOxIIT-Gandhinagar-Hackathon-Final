const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Get user profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, profile_picture, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile (name and profile picture)
router.put('/', authenticateToken, upload.single('profilePicture'), [
  body('first_name').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('last_name').trim().isLength({ min: 1 }).withMessage('Last name is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name } = req.body;
    let updateQuery = 'UPDATE users SET first_name = $1, last_name = $2';
    let queryParams = [first_name, last_name];

    // Handle profile picture upload
    if (req.file) {
      // Delete old profile picture if exists
      const oldProfileResult = await pool.query(
        'SELECT profile_picture FROM users WHERE id = $1',
        [req.user.id]
      );
      
      if (oldProfileResult.rows[0]?.profile_picture) {
        const oldPath = path.join(__dirname, '..', oldProfileResult.rows[0].profile_picture);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      updateQuery += ', profile_picture = $3 WHERE id = $4 RETURNING id, email, first_name, last_name, role, profile_picture, created_at';
      queryParams.push(req.file.path.replace(/\\/g, '/'), req.user.id);
    } else {
      updateQuery += ' WHERE id = $3 RETURNING id, email, first_name, last_name, role, profile_picture, created_at';
      queryParams.push(req.user.id);
    }

    const result = await pool.query(updateQuery, queryParams);
    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request password change OTP
router.post('/change-password-request', authenticateToken, async (req, res) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      'UPDATE users SET otp = $1, otp_expires = $2 WHERE id = $3',
      [otp, otpExpires, req.user.id]
    );

    // Get user email
    const userResult = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    // Send OTP email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Change Verification',
      html: `
        <h2>Password Change Request</h2>
        <p>Hello ${user.first_name},</p>
        <p>You have requested to change your password. Please use the following OTP to verify:</p>
        <h3 style="color: #007bff; font-size: 24px; letter-spacing: 2px;">${otp}</h3>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this change, please ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Password change request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password with OTP verification
router.post('/change-password', authenticateToken, [
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { otp, newPassword } = req.body;

    // Verify OTP
    const result = await pool.query(
      'SELECT otp, otp_expires FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > user.otp_expires) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear OTP
    await pool.query(
      'UPDATE users SET password = $1, otp = NULL, otp_expires = NULL WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;