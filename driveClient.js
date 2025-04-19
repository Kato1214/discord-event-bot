const { google } = require('googleapis');
const fs = require('fs');

const credJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8');
const credentials = JSON.parse(credJson);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

async function getDriveClient() {
  const authClient = await auth.getClient();
  return google.drive({ version: 'v3', auth: authClient });
}

async function downloadFile(fileId, destPath) {
  const drive = await getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  const dest = fs.createWriteStream(destPath);
  await new Promise((resolve, reject) => {
    res.data.pipe(dest)
      .on('end', resolve)
      .on('error', reject);
  });
}

async function uploadFile(fileId, filePath) {
  const drive = await getDriveClient();
  const media = {
    mimeType: 'application/json',
    body: fs.createReadStream(filePath),
  };

  await drive.files.update({
    fileId,
    media,
  });

  console.log('✅ Google Drive に eventMappings.json をアップロードしました');
}

module.exports = {
  downloadFile,
  uploadFile,
};
