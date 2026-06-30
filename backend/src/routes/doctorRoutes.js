const express = require('express');
const { searchDoctors, getDoctorById } = require('../controllers/doctorController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, searchDoctors);
router.get('/:id', protect, getDoctorById);

module.exports = router;
