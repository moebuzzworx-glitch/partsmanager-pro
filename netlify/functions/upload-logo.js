const admin = require('firebase-admin');

let initialized = false;

function initAdmin() {
  if (initialized) return;
  const key = process.env.SERVICE_ACCOUNT_KEY;
  const bucketName = process.env.STORAGE_BUCKET;
  if (!key || !bucketName) {
    throw new Error('Missing SERVICE_ACCOUNT_KEY or STORAGE_BUCKET env vars');
  }
  const serviceAccount = JSON.parse(key);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: bucketName,
  });
  initialized = true;
}

exports.handler = async function (event) {
  try {
    initAdmin();
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    const body = JSON.parse(event.body || '{}');
    const { filename, contentType, data, uid } = body;
    if (!filename || !data) return { statusCode: 400, body: JSON.stringify({ error: 'filename and data required' }) };

    const buffer = Buffer.from(data, 'base64');
    const storage = admin.storage();
    const bucket = storage.bucket();
    const destPath = `logos/${uid || 'public'}/${Date.now()}_${filename}`;
    const file = bucket.file(destPath);

    await file.save(buffer, { resumable: false, metadata: { contentType } });

    // Make file publicly readable (optional). If your bucket policy forbids public, use signed URL instead.
    try {
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destPath}`;
      return { statusCode: 200, body: JSON.stringify({ url: publicUrl }) };
    } catch (e) {
      // Fall back to signed URL
      const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '03-01-2500' });
      return { statusCode: 200, body: JSON.stringify({ url: signedUrl }) };
    }
  } catch (error) {
    console.error('upload-logo error', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Server error' }) };
  }
};
