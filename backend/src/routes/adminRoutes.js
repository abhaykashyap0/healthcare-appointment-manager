const express = require('express');
const { createDoctor, listDoctors, updateDoctorProfile, markDoctorLeave } = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.post('/doctors', createDoctor);
router.get('/doctors', listDoctors);
router.patch('/doctors/:id', updateDoctorProfile);
router.post('/doctors/:id/leave', markDoctorLeave);

// Admin: view all appointments across all doctors and patients
router.get('/appointments', async (req, res) => {
  const Appointment = require('../models/Appointment');
  const { status } = req.query;
  const filter = status ? { status } : {};
  const appointments = await Appointment.find(filter)
    .populate('patient', 'name email phone')
    .populate('doctor', 'name email specialisation')
    .sort({ slotStart: -1 });
  res.json(appointments);
});

module.exports = router;