require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const logger = require('./logger');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const adminEmail = 'admin@clinic.com';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Clinic Admin',
      email: adminEmail,
      password: 'Admin@12345',
      role: 'admin',
    });
    logger.info(`Seeded admin account: ${adminEmail} / Admin@12345 (change this password immediately)`);
  } else {
    logger.info('Admin account already exists, skipping');
  }

  // Optional sample doctor for local testing.
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
    logger.info(`Seeded sample doctor: ${doctorEmail} / Doctor@12345`);
  } else {
    logger.info('Sample doctor already exists, skipping');
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});
