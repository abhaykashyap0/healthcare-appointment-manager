const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const { getAvailableSlots } = require('../services/slotService');
const { generatePreVisitSummary, generatePostVisitSummary } = require('../services/llmService');
const { sendEmail, templates } = require('../services/emailService');
const { createEvent, deleteEvent } = require('../services/calendarService');

const HOLD_TTL_MINUTES = Number(process.env.SLOT_HOLD_TTL_MINUTES || 5);

async function getDoctorAvailability(req, res) {
  const { doctorId } = req.params;
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'date query param (YYYY-MM-DD) is required' });

  const profile = await DoctorProfile.findOne({ user: doctorId });
  if (!profile) return res.status(404).json({ message: 'Doctor not found' });

  const slots = await getAvailableSlots(profile, date);
  res.json({ doctor: doctorId, date, slots });
}

/**
 * Step 1 of booking: HOLD a slot.
 *
 * Concurrency safety: relies on the partial unique index on (doctor, slotStart)
 * for status in [held, confirmed]. If two patients race for the same slot,
 * MongoDB rejects the second insert with a duplicate-key error (code 11000),
 * which the global error handler converts into a clean 409 response. This makes
 * the booking safe under simultaneous requests without needing distributed locks.
 */
async function holdSlot(req, res) {
  const { doctorId, slotStart } = req.body;
  if (!doctorId || !slotStart) {
    return res.status(400).json({ message: 'doctorId and slotStart are required' });
  }

  const profile = await DoctorProfile.findOne({ user: doctorId });
  if (!profile) return res.status(404).json({ message: 'Doctor not found' });
  if (!profile.isAcceptingBookings) {
    return res.status(400).json({ message: 'This doctor is not currently accepting bookings' });
  }

  const start = new Date(slotStart);
  const end = new Date(start.getTime() + profile.slotDurationMinutes * 60000);

  const conflict = await Appointment.findOne({
    doctor: doctorId,
    slotStart: start,
    status: { $in: ['held', 'confirmed'] },
  });
  if (conflict) {
    return res.status(409).json({ message: 'This slot is no longer available. Please pick another.' });
  }

  const heldExpiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60000);

  try {
    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      doctorProfile: profile._id,
      slotStart: start,
      slotEnd: end,
      status: 'held',
      heldExpiresAt,
    });
    res.status(201).json({ appointment, holdExpiresAt: heldExpiresAt });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This slot was just taken by another patient. Please pick another slot.' });
    }
    throw err;
  }
}

/**
 * Step 2 of booking: patient submits symptoms and confirms.
 * Generates the pre-visit LLM summary, flips status to confirmed,
 * sends confirmation emails, and creates calendar events (best-effort).
 */
async function confirmAppointment(req, res) {
  const { id } = req.params;
  const { symptoms } = req.body;

  const appointment = await Appointment.findById(id).populate('doctor').populate('patient');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (String(appointment.patient._id) !== String(req.user._id)) {
    return res.status(403).json({ message: 'You can only confirm your own appointment' });
  }
  if (appointment.status !== 'held') {
    return res.status(400).json({ message: `Cannot confirm an appointment with status "${appointment.status}". It may have expired.` });
  }
  if (appointment.heldExpiresAt && appointment.heldExpiresAt < new Date()) {
    appointment.status = 'cancelled';
    appointment.cancelledBy = 'system';
    appointment.cancellationReason = 'Hold expired before confirmation';
    await appointment.save();
    return res.status(410).json({ message: 'Your slot hold expired. Please select the slot again.' });
  }

  const preVisitSummary = await generatePreVisitSummary(symptoms || 'No symptoms provided');

  appointment.symptoms = symptoms;
  appointment.preVisitSummary = preVisitSummary;
  appointment.status = 'confirmed';
  appointment.heldExpiresAt = undefined;
  await appointment.save();

  await notifyBooking(appointment);

  const patientEventId = await createEvent(appointment.patient.googleTokens, {
    summary: `Appointment with Dr. ${appointment.doctor.name}`,
    description: `Healthcare appointment. Urgency: ${preVisitSummary.urgencyLevel}`,
    start: appointment.slotStart,
    end: appointment.slotEnd,
    attendeeEmail: appointment.doctor.email,
  });
  const doctorEventId = await createEvent(appointment.doctor.googleTokens, {
    summary: `Appointment with ${appointment.patient.name}`,
    description: `Chief complaint: ${preVisitSummary.chiefComplaint}`,
    start: appointment.slotStart,
    end: appointment.slotEnd,
    attendeeEmail: appointment.patient.email,
  });
  appointment.calendarEvents = { patientEventId, doctorEventId };
  await appointment.save();

  res.json({ appointment });
}

async function notifyBooking(appointment) {
  const patientTpl = templates.bookingConfirmation({
    name: appointment.patient.name,
    doctorName: appointment.doctor.name,
    slotStart: appointment.slotStart,
  });
  const patientResult = await sendEmail({ to: appointment.patient.email, ...patientTpl });

  const doctorTpl = templates.doctorBookingNotice({
    doctorName: appointment.doctor.name,
    patientName: appointment.patient.name,
    slotStart: appointment.slotStart,
  });
  const doctorResult = await sendEmail({ to: appointment.doctor.email, ...doctorTpl });

  appointment.notifications.push(
    {
      type: 'booking_confirmation',
      recipient: 'patient',
      status: patientResult.success ? 'sent' : 'failed',
      attempts: 1,
      lastAttemptAt: new Date(),
      error: patientResult.error,
    },
    {
      type: 'booking_confirmation',
      recipient: 'doctor',
      status: doctorResult.success ? 'sent' : 'failed',
      attempts: 1,
      lastAttemptAt: new Date(),
      error: doctorResult.error,
    }
  );
  await appointment.save();
}

async function listMyAppointments(req, res) {
  const filter = req.user.role === 'doctor' ? { doctor: req.user._id } : { patient: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const appointments = await Appointment.find(filter)
    .populate('patient', 'name email phone')
    .populate('doctor', 'name email specialisation')
    .sort({ slotStart: -1 });
  res.json(appointments);
}

async function getAppointment(req, res) {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patient', 'name email phone')
    .populate('doctor', 'name email specialisation');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

  const isParty =
    String(appointment.patient._id) === String(req.user._id) ||
    String(appointment.doctor._id) === String(req.user._id);
  if (!isParty && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  res.json(appointment);
}

/**
 * Doctor submits post-visit notes + prescription -> LLM generates patient-friendly summary.
 */
async function submitPostVisit(req, res) {
  const { id } = req.params;
  const { doctorNotes, medications } = req.body;

  const appointment = await Appointment.findById(id).populate('patient').populate('doctor');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (String(appointment.doctor._id) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Only the assigned doctor can submit post-visit notes' });
  }
  if (!doctorNotes) return res.status(400).json({ message: 'doctorNotes is required' });

  const postVisitSummary = await generatePostVisitSummary(doctorNotes);

  appointment.doctorNotes = doctorNotes;
  appointment.prescription = { medications: medications || [] };
  appointment.postVisitSummary = postVisitSummary;
  appointment.status = 'completed';
  await appointment.save();

  res.json({ appointment });
}

/**
 * Cancellation by patient, doctor, or admin. Cleans up calendar events
 * and sends notification email.
 */
async function cancelAppointment(req, res) {
  const { id } = req.params;
  const { reason } = req.body;

  const appointment = await Appointment.findById(id).populate('patient').populate('doctor');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

  const isOwner =
    String(appointment.patient._id) === String(req.user._id) ||
    String(appointment.doctor._id) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (['cancelled', 'completed'].includes(appointment.status)) {
    return res.status(400).json({ message: `Cannot cancel an appointment with status "${appointment.status}"` });
  }

  appointment.status = 'cancelled';
  appointment.cancelledBy = req.user.role;
  appointment.cancellationReason = reason;
  await appointment.save();

  if (appointment.calendarEvents?.patientEventId) {
    await deleteEvent(appointment.patient.googleTokens, appointment.calendarEvents.patientEventId);
  }
  if (appointment.calendarEvents?.doctorEventId) {
    await deleteEvent(appointment.doctor.googleTokens, appointment.calendarEvents.doctorEventId);
  }

  const tpl = templates.cancellation({
    name: appointment.patient.name,
    doctorName: appointment.doctor.name,
    slotStart: appointment.slotStart,
    reason,
  });
  const result = await sendEmail({ to: appointment.patient.email, ...tpl });
  appointment.notifications.push({
    type: 'cancellation',
    recipient: 'patient',
    status: result.success ? 'sent' : 'failed',
    attempts: 1,
    lastAttemptAt: new Date(),
    error: result.error,
  });
  await appointment.save();

  res.json({ appointment });
}

module.exports = {
  getDoctorAvailability,
  holdSlot,
  confirmAppointment,
  listMyAppointments,
  getAppointment,
  submitPostVisit,
  cancelAppointment,
};
