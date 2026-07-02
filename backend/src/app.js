require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1); // trust Render/Vercel/Railway reverse proxy

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/calendar', calendarRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;