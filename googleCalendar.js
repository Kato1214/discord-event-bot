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
<<<<<<< HEAD
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 開始から1時間枠
=======
  const end = new Date(start.getTime() + 60 * 60 * 1000);
>>>>>>> 828231e (Add Google Calendar integration and credentials)

  const calendarEvent = {
    summary: event.name,
    description: event.description || '',
<<<<<<< HEAD
    start: {
      dateTime: start.toISOString(),
      timeZone: 'Asia/Tokyo',
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: 'Asia/Tokyo',
    },
=======
    start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
    end: { dateTime: end.toISOString(), timeZone: 'Asia/Tokyo' },
>>>>>>> 828231e (Add Google Calendar integration and credentials)
  };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    resource: calendarEvent,
  });

  console.log('✅ Googleカレンダーに登録:', res.data.htmlLink);
  return res.data.id;
}

<<<<<<< HEAD
module.exports = {
  createCalendarEvent,
=======
async function updateCalendarEvent(googleEventId, newEvent) {
  const authClient = await auth.getClient();
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const start = new Date(newEvent.scheduledStartTimestamp);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const updatedEvent = {
    summary: newEvent.name,
    description: newEvent.description || '',
    start: { dateTime: start.toISOString(), timeZone: 'Asia/Tokyo' },
    end: { dateTime: end.toISOString(), timeZone: 'Asia/Tokyo' },
  };

  const res = await calendar.events.update({
    calendarId: 'primary',
    eventId: googleEventId,
    resource: updatedEvent,
  });

  console.log('🔁 Googleカレンダーを更新しました:', res.data.htmlLink);
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent
>>>>>>> 828231e (Add Google Calendar integration and credentials)
};
