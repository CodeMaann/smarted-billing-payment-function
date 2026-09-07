import admin from 'firebase-admin';

let initialized = false;

export function getFirestore() {
  if (!initialized) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
  }
  return admin.firestore();
}
