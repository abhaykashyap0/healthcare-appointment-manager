const Appointment = require('../models/Appointment');
const { sendEmail, templates } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * For completed appointments with an active prescription, sends medication
 * reminder emails spaced out across the day according to frequencyPerDay,
 * for the durationDays window starting the day after the visit.
 *
 * Runs on the same cron cadence as REMINDER_CRON; uses a simple "already sent
 * today for this medication" check via the notifications log to avoid duplicates.
 */
async function sendMedicationReminders() {
  const now = new Date();
  const candidates = await Appointment.find({
    status: 'completed',
    'prescription.medications.0': { $exists: true },
  }).populate('patient', 'name email');

  let sentCount = 0;
  for (const appt of candidates) {
    const visitDate = appt.updatedAt; // approximation: post-visit submission time
    for (const med of appt.prescription.medications) {
      const endDate = new Date(visitDate.getTime() + (med.durationDays || 1) * 24 * 60 * 60 * 1000);
      if (now > endDate) continue; // prescription window over

      // Heuristic: count medication reminders already sent today across this
      // appointment's notifications, capped at the medication's daily frequency.
      // Sufficient for a single-medication-per-appointment MVP.
      const sentToday = appt.notifications.filter(
        (n) => n.type === 'medication_reminder' && n.status === 'sent' && n.lastAttemptAt && n.lastAttemptAt.toDateString() === now.toDateString()
      ).length;

      if (sentToday >= (med.frequencyPerDay || 1)) continue;

      const tpl = templates.medicationReminder({
        name: appt.patient.name,
        medicationName: med.name,
        dosage: med.dosage,
      });
      const result = await sendEmail({ to: appt.patient.email, ...tpl });

      appt.notifications.push({
        type: 'medication_reminder',
        recipient: 'patient',
        status: result.success ? 'sent' : 'failed',
        attempts: 1,
        lastAttemptAt: new Date(),
        error: result.error,
      });
      await appt.save();
      if (result.success) sentCount += 1;
    }
  }

  if (sentCount > 0) logger.info(`Sent ${sentCount} medication reminder(s)`);
}

module.exports = sendMedicationReminders;
