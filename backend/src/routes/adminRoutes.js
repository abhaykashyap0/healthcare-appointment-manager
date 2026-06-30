const express = require('express');
const { createDoctor, listDoctors, updateDoctorProfile, markDoctorLeave } = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.post('/doctors', createDoctor);
router.get('/doctors', listDoctors);
router.patch('/doctors/:id', updateDoctorProfile);
router.post('/doctors/:id/leave', markDoctorLeave);

module.exports = router;
