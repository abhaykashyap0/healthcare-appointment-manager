const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const logger = require('./logger');

/**
 * Creates the initial admin account and a sample doctor if they don't already
 * exist. Safe to call multiple times (idempotent — skips if already present).
 * Returns a summary of what was created vs already existed.
 */
async function runSeed() {
  const summary = { admin: 'skipped', doctor: 'skipped' };

  const adminEmail = 'admin@clinic.com';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Clinic Admin',
      email: adminEmail,
      password: 'Admin@12345',
      role: 'admin',
    });
    summary.admin = 'created';
    logger.info(`Seeded admin account: ${adminEmail} / Admin@12345 (change this password immediately)`);
  } else {
    logger.info('Admin account already exists, skipping');
  }

  const doctorEmail = 'dr.sharma@clinic.com';
  let doctorUser = await User.findOne({ email: doctorEmail });
  if (!doctorUser) {
    doctorUser = await User.create({
      name: 'Dr. Sharma',
      email: doctorEmail,
      password: 'Doctor@12345',
      role: 'doctor',
      specialisation: 'General Medicine',
    });
    await DoctorProfile.create({
      user: doctorUser._id,
      specialisation: 'General Medicine',
      slotDurationMinutes: 30,
      workingHours: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
        startTime: '09:00',
        endTime: '17:00',
      })),
    });
    summary.doctor = 'created';
    logger.info(`Seeded sample doctor: ${doctorEmail} / Doctor@12345`);
  } else {
    logger.info('Sample doctor already exists, skipping');
  }

  return summary;
}

module.exports = { runSeed };