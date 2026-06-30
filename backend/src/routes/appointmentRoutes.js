const express = require('express');
const {
  getDoctorAvailability,
  holdSlot,
  confirmAppointment,
  listMyAppointments,
  getAppointment,
  submitPostVisit,
  cancelAppointment,
} = require('../controllers/appointmentController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/availability/:doctorId', getDoctorAvailability);
router.post('/hold', restrictTo('patient'), holdSlot);
router.post('/:id/confirm', restrictTo('patient'), confirmAppointment);
router.get('/', listMyAppointments);
router.get('/:id', getAppointment);
router.post('/:id/post-visit', restrictTo('doctor'), submitPostVisit);
router.post('/:id/cancel', cancelAppointment);

module.exports = router;
