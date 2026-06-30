require('dotenv').config();
const mongoose = require('mongoose');
const { runSeed } = require('./seedLogic');
const logger = require('./logger');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  await runSeed();
  await mongoose.disconnect();
}

main().catch((err) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});