const { google } = require('googleapis');
const logger = require('../utils/logger');

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl(state) {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state,
  });
}

async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

function getCalendarClient(userTokens) {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(userTokens);
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Creates a calendar event for a user. Returns null on failure instead of throwing,
 * so booking flow continues even if the user hasn't connected Google Calendar
 * or the API call fails.
 */
async function createEvent(userTokens, { summary, description, start, end, attendeeEmail }) {
  if (!userTokens || !userTokens.access_token) {
    logger.warn('Skipping calendar event creation: user has not connected Google Calendar');
    return null;
  }
  try {
    const calendar = getCalendarClient(userTokens);
    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        start: { dateTime: new Date(start).toISOString() },
        end: { dateTime: new Date(end).toISOString() },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
        reminders: { useDefault: true },
      },
    });
    return res.data.id;
  } catch (err) {
    logger.error(`Google Calendar event creation failed: ${err.message}`);
    return null;
  }
}

async function updateEvent(userTokens, eventId, { summary, description, start, end }) {
  if (!userTokens || !userTokens.access_token || !eventId) return false;
  try {
    const calendar = getCalendarClient(userTokens);
    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: {
        summary,
        description,
        start: { dateTime: new Date(start).toISOString() },
        end: { dateTime: new Date(end).toISOString() },
      },
    });
    return true;
  } catch (err) {
    logger.error(`Google Calendar event update failed: ${err.message}`);
    return false;
  }
}

async function deleteEvent(userTokens, eventId) {
  if (!userTokens || !userTokens.access_token || !eventId) return false;
  try {
    const calendar = getCalendarClient(userTokens);
    await calendar.events.delete({ calendarId: 'primary', eventId });
    return true;
  } catch (err) {
    logger.error(`Google Calendar event deletion failed: ${err.message}`);
    return false;
  }
}

module.exports = { getAuthUrl, exchangeCodeForTokens, createEvent, updateEvent, deleteEvent };
