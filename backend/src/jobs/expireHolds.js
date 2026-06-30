const Appointment = require('../models/Appointment');
const logger = require('../utils/logger');

/**
 * MongoDB's TTL index will eventually delete expired 'held' documents, but TTL
 * sweeps run roughly every 60s and we don't want the application to ever rely on
 * a hard delete for business logic. This job actively flips status to 'cancelled'
 * (audit trail preserved) as soon as heldExpiresAt passes, freeing the slot for
 * other patients well before the TTL deletion would occur.
 */
async function expireStaleHolds() {
  const now = new Date();
  const result = await Appointment.updateMany(
    { status: 'held', heldExpiresAt: { $lte: now } },
    { $set: { status: 'cancelled', cancelledBy: 'system', cancellationReason: 'Slot hold expired' } }
  );
  if (result.modifiedCount > 0) {
    logger.info(`Expired ${result.modifiedCount} stale slot hold(s)`);
  }
}

module.exports = expireStaleHolds;
