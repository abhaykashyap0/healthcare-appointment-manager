const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/healthcare_appointments';
    await mongoose.connect(uri);
    logger.info(`MongoDB connected: ${uri}`);
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
