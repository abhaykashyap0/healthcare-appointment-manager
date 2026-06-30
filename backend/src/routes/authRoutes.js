const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

/**
 * One-time setup route for hosts without shell access (e.g. Render free tier).
 * Protected by SEED_KEY env var — set it, call this once, then remove SEED_KEY
 * (or just leave it; the underlying seed logic is idempotent and safe to call
 * again, but you should still rotate/remove the key once you're done so this
 * endpoint can't be triggered by anyone who guesses the URL).
 */
router.post('/seed', async (req, res) => {
  const providedKey = req.headers['x-seed-key'] || req.query.key;
  if (!process.env.SEED_KEY || providedKey !== process.env.SEED_KEY) {
    return res.status(403).json({ message: 'Forbidden: invalid or missing seed key' });
  }
  const { runSeed } = require('../utils/seedLogic');
  const summary = await runSeed();
  res.json({ message: 'Seed complete', summary });
});

module.exports = router;