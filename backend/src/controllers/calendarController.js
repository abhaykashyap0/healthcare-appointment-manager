const User = require('../models/User');
const { getAuthUrl, exchangeCodeForTokens } = require('../services/calendarService');
const { signToken, verifyToken } = require('../utils/jwt');

/**
 * Returns the Google OAuth consent URL. We pass the user's JWT as `state` so the
 * callback (which Google calls directly, without our normal auth header) knows
 * which user to attach the tokens to.
 */
function getConnectUrl(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Not authorized' });
  const url = getAuthUrl(token);
  res.json({ url });
}

async function oauthCallback(req, res) {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('Missing code or state');

  try {
    const decoded = verifyToken(state);
    const tokens = await exchangeCodeForTokens(code);
    await User.findByIdAndUpdate(decoded.id, { googleTokens: tokens });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${clientUrl}/settings?calendarConnected=true`);
  } catch (err) {
    res.status(500).send(`Calendar connection failed: ${err.message}`);
  }
}

module.exports = { getConnectUrl, oauthCallback };
