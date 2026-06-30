const express = require('express');
const { getConnectUrl, oauthCallback } = require('../controllers/calendarController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/connect', protect, getConnectUrl);
router.get('/oauth/callback', oauthCallback); // Google calls this directly, no Authorization header

module.exports = router;
