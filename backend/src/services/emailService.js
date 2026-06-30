const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Sends an email. Never throws — returns { success, error } so callers
 * (controllers and the retry job) can record notification status without
 * the request/job crashing on an email outage.
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP credentials not configured');
    }
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });
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
    html: `<p>Hi ${name},</p><p>Your appointment with Dr. ${doctorName} on <b>${new Date(slotStart).toLocaleString()}</b> is confirmed.</p><p>You will receive a reminder closer to the time.</p>`,
  }),
  doctorBookingNotice: ({ doctorName, patientName, slotStart }) => ({
    subject: 'New Appointment Booked',
    html: `<p>Hi Dr. ${doctorName},</p><p>${patientName} has booked an appointment with you on <b>${new Date(slotStart).toLocaleString()}</b>.</p>`,
  }),
  reminder: ({ name, doctorName, slotStart }) => ({
    subject: 'Appointment Reminder',
    html: `<p>Hi ${name},</p><p>Reminder: your appointment with Dr. ${doctorName} is on <b>${new Date(slotStart).toLocaleString()}</b>.</p>`,
  }),
  cancellation: ({ name, doctorName, slotStart, reason }) => ({
    subject: 'Appointment Cancelled',
    html: `<p>Hi ${name},</p><p>Your appointment with Dr. ${doctorName} on <b>${new Date(slotStart).toLocaleString()}</b> has been cancelled.${reason ? ` Reason: ${reason}` : ''}</p>`,
  }),
  medicationReminder: ({ name, medicationName, dosage }) => ({
    subject: 'Medication Reminder',
    html: `<p>Hi ${name},</p><p>This is a reminder to take your medication: <b>${medicationName}</b> (${dosage}).</p>`,
  }),
};

module.exports = { sendEmail, templates };
