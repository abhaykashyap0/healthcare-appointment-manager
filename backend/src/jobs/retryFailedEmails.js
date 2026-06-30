const Appointment = require('../models/Appointment');
const { sendEmail, templates } = require('../services/emailService');
const logger = require('../utils/logger');

const MAX_ATTEMPTS = 5;

/**
 * Scans appointments for failed notification entries and retries sending them,
 * up to MAX_ATTEMPTS, satisfying the "background job for email retries" requirement.
 * This keeps the notification subsystem resilient to transient SMTP outages.
 */
async function retryFailedEmails() {
  const appointments = await Appointment.find({ 'notifications.status': 'failed' })
    .populate('patient', 'name email')
    .populate('doctor', 'name email');

  let retried = 0;
  for (const appt of appointments) {
    let changed = false;

    for (const notification of appt.notifications) {
      if (notification.status !== 'failed' || notification.attempts >= MAX_ATTEMPTS) continue;

      const recipientUser = notification.recipient === 'patient' ? appt.patient : appt.doctor;
      const tpl = buildTemplate(notification.type, appt, recipientUser);
      if (!tpl) continue;

      const result = await sendEmail({ to: recipientUser.email, ...tpl });
      notification.attempts += 1;
      notification.lastAttemptAt = new Date();
      notification.status = result.success ? 'sent' : 'failed';
      notification.error = result.error;
      changed = true;
      retried += 1;
    }

    if (changed) await appt.save();
  }

  if (retried > 0) logger.info(`Retried ${retried} failed email notification(s)`);
}

function buildTemplate(type, appt, recipientUser) {
  const base = { name: recipientUser.name, doctorName: appt.doctor.name, slotStart: appt.slotStart };
  switch (type) {
    case 'booking_confirmation':
      return templates.bookingConfirmation(base);
    case 'reminder':
      return templates.reminder(base);
    case 'cancellation':
      return templates.cancellation({ ...base, reason: appt.cancellationReason });
    default:
      return null;
  }
}

module.exports = retryFailedEmails;
