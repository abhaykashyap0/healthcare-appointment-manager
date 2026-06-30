const mongoose = require('mongoose');

/**
 * Working hours are defined per weekday (0=Sunday..6=Saturday).
 * Each day can have a start/end time (24h "HH:mm") or be marked unavailable.
 */
const workingHourSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    isWorkingDay: { type: Boolean, default: true },
    startTime: { type: String, default: '09:00' }, // HH:mm
    endTime: { type: String, default: '17:00' }, // HH:mm
  },
  { _id: false }
);

const leaveSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true }, // stored at 00:00:00 UTC for the leave day
    reason: { type: String, trim: true },
    notifiedPatients: { type: Boolean, default: false },
  },
  { _id: false }
);

const doctorProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialisation: { type: String, required: true, trim: true, index: true },
    slotDurationMinutes: { type: Number, required: true, default: 30, min: 5, max: 180 },
    workingHours: { type: [workingHourSchema], default: [] },
    leaves: { type: [leaveSchema], default: [] },
    bio: { type: String, trim: true },
    isAcceptingBookings: { type: Boolean, default: true },
  },
  { timestamps: true }
);

doctorProfileSchema.index({ specialisation: 1 });

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
