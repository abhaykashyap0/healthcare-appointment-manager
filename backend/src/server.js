require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const startJobs = require('./jobs');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  startJobs();
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start();

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled rejection: ${err.message}`, { stack: err.stack });
});
