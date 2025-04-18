const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'credentials.json'),
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

async function createCalendarEvent(event) {
  const authClient = await auth.getClient();
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const start = new Date(event.scheduledStartTimestamp);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 開始から1時間枠

  const calendarEvent = {
    summary: event.name,
    description: event.description || '',
    start: {
      dateTime: start.toISOString(),
      timeZone: 'Asia/Tokyo',
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: 'Asia/Tokyo',
    },
  };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    resource: calendarEvent,
  });

  console.log('✅ Googleカレンダーに登録:', res.data.htmlLink);
  return res.data.id;
}

module.exports = {
  createCalendarEvent,
};
