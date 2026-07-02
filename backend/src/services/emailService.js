const logger = require('../utils/logger');

/**
 * Sends email via Brevo (formerly Sendinblue) HTTP API.
 * Works on Render free tier, sends to any email address without domain verification.
 * Free tier: 300 emails/day.
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) throw new Error('BREVO_API_KEY is not configured');

    const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.BREVO_SENDER_EMAIL;
    const fromName = process.env.EMAIL_FROM_NAME || 'Clinic Appointments';

    if (!fromEmail) throw new Error('BREVO_SENDER_EMAIL is not configured');

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html || `<p>${text || ''}</p>`,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Brevo API error ${response.status}: ${err}`);
    }

    logger.info(`Email sent to ${to}: ${subject}`);
    return { success: true };
  } catch (err) {
    logger.error(`Email send failed to ${to}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

const templates = {
  bookingConfirmation: ({ name, doctorName, slotStart }) => ({
    subject: 'Appointment Confirmed',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#2F6F5E">Appointment Confirmed</h2>
        <p>Hi ${name},</p>
        <p>Your appointment with <strong>Dr. ${doctorName}</strong> on <strong>${new Date(slotStart).toLocaleString()}</strong> is confirmed.</p>
        <p>You will receive a reminder closer to the time. Please arrive a few minutes early.</p>
        <p style="color:#888;font-size:13px">Clinic Connect — Healthcare Appointment Manager</p>
      </div>`,
  }),
  doctorBookingNotice: ({ doctorName, patientName, slotStart }) => ({
    subject: 'New Appointment Booked',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#2F6F5E">New Appointment</h2>
        <p>Hi Dr. ${doctorName},</p>
        <p><strong>${patientName}</strong> has booked an appointment with you on <strong>${new Date(slotStart).toLocaleString()}</strong>.</p>
        <p>Log in to view the patient's pre-visit symptom summary before the appointment.</p>
        <p style="color:#888;font-size:13px">Clinic Connect — Healthcare Appointment Manager</p>
      </div>`,
  }),
  reminder: ({ name, doctorName, slotStart }) => ({
    subject: 'Appointment Reminder',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#2F6F5E">Appointment Reminder</h2>
        <p>Hi ${name},</p>
        <p>This is a reminder that your appointment with <strong>Dr. ${doctorName}</strong> is coming up on <strong>${new Date(slotStart).toLocaleString()}</strong>.</p>
        <p>Please arrive a few minutes early and bring any relevant documents or previous prescriptions.</p>
        <p style="color:#888;font-size:13px">Clinic Connect — Healthcare Appointment Manager</p>
      </div>`,
  }),
  cancellation: ({ name, doctorName, slotStart, reason }) => ({
    subject: 'Appointment Cancelled — Please Rebook',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#B3463B">Appointment Cancelled</h2>
        <p>Hi ${name},</p>
        <p>We're sorry, but your appointment with <strong>Dr. ${doctorName}</strong> on <strong>${new Date(slotStart).toLocaleString()}</strong> has been cancelled.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Please visit our platform to <strong>book a new appointment</strong> on another available date. We apologise for the inconvenience.</p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/doctors" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#2F6F5E;color:white;border-radius:6px;text-decoration:none;font-weight:bold">Book a new appointment</a>
        <p style="color:#888;font-size:13px;margin-top:20px">Clinic Connect — Healthcare Appointment Manager</p>
      </div>`,
  }),
  medicationReminder: ({ name, medicationName, dosage }) => ({
    subject: 'Medication Reminder',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#2F6F5E">Medication Reminder</h2>
        <p>Hi ${name},</p>
        <p>This is a reminder to take your medication: <strong>${medicationName}</strong> (${dosage}).</p>
        <p>If you have any concerns about your medication, please contact your doctor.</p>
        <p style="color:#888;font-size:13px">Clinic Connect — Healthcare Appointment Manager</p>
      </div>`,
  }),
};

module.exports = { sendEmail, templates };