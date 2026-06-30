const DoctorProfile = require('../models/DoctorProfile');

async function searchDoctors(req, res) {
  const { specialisation } = req.query;
  const filter = { isAcceptingBookings: true };
  if (specialisation) filter.specialisation = new RegExp(specialisation, 'i');

  const doctors = await DoctorProfile.find(filter).populate('user', 'name email phone');
  res.json(doctors);
}

async function getDoctorById(req, res) {
  const profile = await DoctorProfile.findOne({ user: req.params.id }).populate('user', 'name email phone');
  if (!profile) return res.status(404).json({ message: 'Doctor not found' });
  res.json(profile);
}

module.exports = { searchDoctors, getDoctorById };
