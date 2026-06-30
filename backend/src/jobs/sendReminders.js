const Appointment = require('../models/Appointment');
const { sendEmail, templates } = require('../services/emailService');
const logger = require('../utils/logger');

const REMINDER_WINDOW_HOURS = 24;
const REMINDER_WINDOW_MS = REMINDER_WINDOW_HOURS * 60 * 60 * 1000;

/**
 * Sends a reminder email roughly REMINDER_WINDOW_HOURS before each confirmed
 * appointment, exactly once per appointment (tracked via the notifications array).
 */
async function sendReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const candidates = await Appointment.find({
    status: 'confirmed',
    slotStart: { $gte: now, $lte: windowEnd },
  })
    .populate('patient', 'name email')
    .populate('doctor', 'name email');

  let sentCount = 0;
  for (const appt of candidates) {
    const alreadyReminded = appt.notifications.some((n) => n.type === 'reminder' && n.recipient === 'patient' && n.status === 'sent');
    if (alreadyReminded) continue;

    const tpl = templates.reminder({
      name: appt.patient.name,
      doctorName: appt.doctor.name,
      slotStart: appt.slotStart,
    });
    const result = await sendEmail({ to: appt.patient.email, ...tpl });

    appt.notifications.push({
      type: 'reminder',
      recipient: 'patient',
      status: result.success ? 'sent' : 'failed',
      attempts: 1,
      lastAttemptAt: new Date(),
      error: result.error,
    });
    await appt.save();
    if (result.success) sentCount += 1;
  }

  if (sentCount > 0) logger.info(`Sent ${sentCount} appointment reminder(s)`);
}

module.exports = sendReminders;
