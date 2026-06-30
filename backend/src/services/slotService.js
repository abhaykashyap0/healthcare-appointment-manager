const Appointment = require('../models/Appointment');

/**
 * Computes available slots for a doctor on a given date, based on:
 *  - the doctor's working hours for that weekday
 *  - whether the doctor is on leave that date
 *  - existing held/confirmed appointments on that date (excluded from availability)
 *
 * Returns an array of { start, end } Date pairs.
 */
async function getAvailableSlots(doctorProfile, dateStr) {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const dayOfWeek = date.getDay();

  const isOnLeave = doctorProfile.leaves.some((leave) => isSameDay(new Date(leave.date), date));
  if (isOnLeave) return [];

  const workingHour = doctorProfile.workingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
  if (!workingHour || !workingHour.isWorkingDay) return [];

  const slotDuration = doctorProfile.slotDurationMinutes;
  const [startH, startM] = workingHour.startTime.split(':').map(Number);
  const [endH, endM] = workingHour.endTime.split(':').map(Number);

  const dayStart = new Date(date);
  dayStart.setHours(startH, startM, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(endH, endM, 0, 0);

  const allSlots = [];
  let cursor = new Date(dayStart);
  while (cursor < dayEnd) {
    const slotEnd = new Date(cursor.getTime() + slotDuration * 60000);
    if (slotEnd <= dayEnd) {
      allSlots.push({ start: new Date(cursor), end: slotEnd });
    }
    cursor = slotEnd;
  }

  // Exclude slots that already have an active (held/confirmed) appointment.
  const dayEndExclusive = new Date(date);
  dayEndExclusive.setHours(23, 59, 59, 999);

  const existing = await Appointment.find({
    doctor: doctorProfile.user,
    status: { $in: ['held', 'confirmed'] },
    slotStart: { $gte: dayStart, $lte: dayEndExclusive },
  }).select('slotStart');

  const bookedTimes = new Set(existing.map((a) => a.slotStart.getTime()));

  return allSlots.filter((slot) => !bookedTimes.has(slot.start.getTime()));
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

module.exports = { getAvailableSlots, isSameDay };
