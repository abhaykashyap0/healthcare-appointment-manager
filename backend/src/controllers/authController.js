const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const { signToken } = require('../utils/jwt');

async function register(req, res) {
  const { name, email, password, role, phone, dateOfBirth } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email and password are required' });
  }

  // Public registration is for patients only. Doctors/admins are created by admin.
  const allowedRole = 'patient';
  if (role && role !== 'patient') {
    return res.status(403).json({ message: 'Only patient accounts can self-register. Doctor and admin accounts are created by the clinic admin.' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }

  const user = await User.create({ name, email, password, role: allowedRole, phone, dateOfBirth });
  const token = signToken(user);
  res.status(201).json({ token, user: user.toSafeObject() });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: 'This account has been deactivated' });
  }

  const token = signToken(user);
  res.json({ token, user: user.toSafeObject() });
}

async function getMe(req, res) {
  let extra = {};
  if (req.user.role === 'doctor') {
    const profile = await DoctorProfile.findOne({ user: req.user._id });
    extra.doctorProfile = profile;
  }
  res.json({ user: req.user.toSafeObject(), ...extra });
}

module.exports = { register, login, getMe };
