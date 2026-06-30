const mongoose = require('mongoose');

/**
 * Status lifecycle:
 *   held       -> a short-lived reservation while the patient fills the symptom form / confirms.
 *                 Auto-expires via TTL index (heldExpiresAt) if not confirmed in time.
 *   confirmed  -> booking is final. Counted for double-booking prevention.
 *   completed  -> visit has happened, post-visit notes/summary added.
 *   cancelled  -> cancelled by patient, doctor, or system (e.g. doctor leave).
 *
 * Double-booking prevention strategy:
 *   A partial unique index on (doctor, slotStart) where status is in ['held','confirmed']
 *   guarantees at the DB level that two bookings can never coexist for the same doctor+slot,
 *   even under concurrent requests. The application layer also performs a pre-check, but the
 *   index is the actual safety net for race conditions.
 */
const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true },

    slotStart: { type: Date, required: true },
    slotEnd: { type: Date, required: true },

    status: {
      type: String,
      enum: ['held', 'confirmed', 'completed', 'cancelled'],
      default: 'held',
      required: true,
    },

    // Slot hold mechanism: held bookings expire automatically unless confirmed.
    heldExpiresAt: { type: Date },

    // Pre-visit symptom form
    symptoms: { type: String, trim: true },
    preVisitSummary: {
      urgencyLevel: { type: String, enum: ['Low', 'Medium', 'High'] },
      chiefComplaint: { type: String, trim: true },
      suggestedQuestions: { type: [String], default: [] },
      raw: { type: String }, // raw LLM output, kept for audit/debugging
      generatedAt: { type: Date },
      failed: { type: Boolean, default: false },
    },

    // Post-visit notes & summary
    doctorNotes: { type: String, trim: true },
    prescription: {
      medications: [
        {
          name: { type: String, trim: true },
          dosage: { type: String, trim: true },
          frequencyPerDay: { type: Number, min: 1, max: 12 },
          durationDays: { type: Number, min: 1 },
          notes: { type: String, trim: true },
        },
      ],
    },
    postVisitSummary: {
      text: { type: String, trim: true },
      generatedAt: { type: Date },
      failed: { type: Boolean, default: false },
    },

    cancellationReason: { type: String, trim: true },
    cancelledBy: { type: String, enum: ['patient', 'doctor', 'admin', 'system'] },

    // Google Calendar event ids (separate events for patient & doctor calendars)
    calendarEvents: {
      patientEventId: { type: String },
      doctorEventId: { type: String },
    },

    // Email notification audit trail (also used by retry job)
    notifications: [
      {
        type: { type: String, enum: ['booking_confirmation', 'reminder', 'cancellation', 'medication_reminder'] },
        recipient: { type: String, enum: ['patient', 'doctor'] },
        status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
        attempts: { type: Number, default: 0 },
        lastAttemptAt: { type: Date },
        error: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Partial unique index: only one held/confirmed appointment per doctor+slotStart at a time.
appointmentSchema.index(
  { doctor: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['held', 'confirmed'] } },
    name: 'uniq_doctor_slot_active',
  }
);

// TTL index: MongoDB automatically deletes documents once heldExpiresAt passes,
// but ONLY if status is still 'held' is enforced at the application layer before relying on this;
// we additionally run an active sweep job for safety (see jobs/expireHolds.js) since TTL deletion
// can lag by up to 60s and we don't want to silently lose records — see note below.
appointmentSchema.index({ heldExpiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'held' } });

appointmentSchema.index({ patient: 1, slotStart: -1 });
appointmentSchema.index({ doctor: 1, slotStart: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
