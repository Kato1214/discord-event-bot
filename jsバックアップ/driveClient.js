const { google } = require('googleapis');
const fs = require('fs');

// サービスアカウントの認証情報をBase64から復元
const credJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf8');
const credentials = JSON.parse(credJson);

// DriveファイルIDを .env から取得
const FILE_ID = process.env.DRIVE_FILE_ID;

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

// 認証済みの Drive クライアントを取得
async function getDriveClient() {
  const authClient = await auth.getClient();
  return google.drive({ version: 'v3', auth: authClient });
}

// 指定されたファイルIDをダウンロードして destPath に保存
async function downloadFile(fileId, destPath) {
  const drive = await getDriveClient();

  console.log('📥 Google Drive ダウンロード開始:', fileId);

  const timeout = setTimeout(() => {
    console.error('⏰ タイムアウト: Google Drive ダウンロードが完了しませんでした');
    process.exit(1);
  }, 10000); // 10秒タイムアウト

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  const dest = fs.createWriteStream(destPath);

  await new Promise((resolve, reject) => {
    dest.on('finish', () => {
      clearTimeout(timeout);
      console.log('✅ ダウンロード完了（finish）');
      resolve();
    });
    dest.on('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ 書き込みエラー:', err.message);
      reject(err);
    });

    res.data.pipe(dest);
  });
}

// 指定されたファイルパスを Drive 上の FILE_ID にアップロード（上書き）
async function uploadFile(filePath) {
  const drive = await getDriveClient();

  const media = {
    mimeType: 'application/json',
    body: fs.createReadStream(filePath),
  };

  await drive.files.update({
    fileId: FILE_ID,
    media,
  });

  console.log('✅ Google Drive に eventMappings.json をアップロードしました');
}

module.exports = {
  downloadFile,
  uploadFile,
};
