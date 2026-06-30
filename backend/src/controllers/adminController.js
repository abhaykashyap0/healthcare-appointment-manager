const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const { sendEmail, templates } = require('../services/emailService');
const { deleteEvent } = require('../services/calendarService');
const logger = require('../utils/logger');

/**
 * Admin creates a doctor: a User with role=doctor plus an associated DoctorProfile
 * holding specialisation, working hours and slot duration.
 */
async function createDoctor(req, res) {
  const { name, email, password, specialisation, slotDurationMinutes, workingHours, bio, phone } = req.body;

  if (!name || !email || !password || !specialisation) {
    return res.status(400).json({ message: 'name, email, password and specialisation are required' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists' });
  }

  const user = await User.create({ name, email, password, role: 'doctor', specialisation, phone });

  const profile = await DoctorProfile.create({
    user: user._id,
    specialisation,
    slotDurationMinutes: slotDurationMinutes || 30,
    workingHours: workingHours || defaultWorkingHours(),
    bio,
  });

  res.status(201).json({ user: user.toSafeObject(), profile });
}

function defaultWorkingHours() {
  // Mon-Fri 09:00-17:00, weekend off, by default.
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
    startTime: '09:00',
    endTime: '17:00',
  }));
}

async function listDoctors(req, res) {
  const { specialisation } = req.query;
  const filter = specialisation ? { specialisation: new RegExp(specialisation, 'i') } : {};
  const profiles = await DoctorProfile.find(filter).populate('user', 'name email phone');
  res.json(profiles);
}

async function updateDoctorProfile(req, res) {
  const { id } = req.params;
  const updates = req.body;
  const profile = await DoctorProfile.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });
  res.json(profile);
}

/**
 * Marks a doctor on leave for a given date. Any existing held/confirmed appointments
 * on that date are cancelled, and affected patients are notified by email (and their
 * calendar events removed). This satisfies the requirement that "affected patients
 * must be notified" when a doctor goes on leave with existing bookings.
 */
async function markDoctorLeave(req, res) {
  const { id } = req.params; // doctor profile id
  const { date, reason } = req.body;

  if (!date) return res.status(400).json({ message: 'date is required' });

  const profile = await DoctorProfile.findById(id).populate('user');
  if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });

  const leaveDate = new Date(date);
  leaveDate.setHours(0, 0, 0, 0);

  const alreadyOnLeave = profile.leaves.some((l) => new Date(l.date).getTime() === leaveDate.getTime());
  if (!alreadyOnLeave) {
    profile.leaves.push({ date: leaveDate, reason });
  }
  await profile.save();

  // Find affected appointments for that day.
  const dayEnd = new Date(leaveDate);
  dayEnd.setHours(23, 59, 59, 999);

  const affected = await Appointment.find({
    doctor: profile.user._id,
    status: { $in: ['held', 'confirmed'] },
    slotStart: { $gte: leaveDate, $lte: dayEnd },
  }).populate('patient');

  const notifiedResults = [];
  for (const appt of affected) {
    appt.status = 'cancelled';
    appt.cancelledBy = 'system';
    appt.cancellationReason = reason || 'Doctor marked unavailable (leave) for this date';
    await appt.save();

    // Remove calendar events if present.
    if (appt.calendarEvents?.patientEventId && appt.patient.googleTokens?.access_token) {
      await deleteEvent(appt.patient.googleTokens, appt.calendarEvents.patientEventId);
    }
    if (appt.calendarEvents?.doctorEventId && profile.user.googleTokens?.access_token) {
      await deleteEvent(profile.user.googleTokens, appt.calendarEvents.doctorEventId);
    }

    const { subject, html } = templates.cancellation({
      name: appt.patient.name,
      doctorName: profile.user.name,
      slotStart: appt.slotStart,
      reason: appt.cancellationReason,
    });
    const result = await sendEmail({ to: appt.patient.email, subject, html });
    notifiedResults.push({ appointmentId: appt._id, patientEmail: appt.patient.email, emailSent: result.success });
    if (!result.success) {
      logger.warn(`Leave-cancellation email failed for appointment ${appt._id}, will be retried by background job`);
    }
  }

  res.json({
    message: `Doctor marked on leave for ${leaveDate.toDateString()}`,
    affectedAppointments: notifiedResults.length,
    notifications: notifiedResults,
  });
}

module.exports = { createDoctor, listDoctors, updateDoctorProfile, markDoctorLeave };
