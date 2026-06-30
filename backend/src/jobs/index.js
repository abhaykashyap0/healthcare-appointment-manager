const cron = require('node-cron');
const logger = require('../utils/logger');
const expireStaleHolds = require('./expireHolds');
const sendReminders = require('./sendReminders');
const retryFailedEmails = require('./retryFailedEmails');
const sendMedicationReminders = require('./medicationReminders');

function wrap(name, fn) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      logger.error(`Background job "${name}" failed: ${err.message}`, { stack: err.stack });
    }
  };
}

function startJobs() {
  // Slot holds expire fast, so sweep frequently regardless of the configured reminder cadence.
  cron.schedule('* * * * *', wrap('expireStaleHolds', expireStaleHolds));

  cron.schedule(process.env.REMINDER_CRON || '*/15 * * * *', wrap('sendReminders', sendReminders));
  cron.schedule(process.env.REMINDER_CRON || '*/15 * * * *', wrap('sendMedicationReminders', sendMedicationReminders));
  cron.schedule(process.env.EMAIL_RETRY_CRON || '*/5 * * * *', wrap('retryFailedEmails', retryFailedEmails));

  logger.info('Background jobs scheduled: expireStaleHolds, sendReminders, sendMedicationReminders, retryFailedEmails');
}

module.exports = startJobs;
