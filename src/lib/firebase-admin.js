import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Lazily initialized so importing this module never touches credentials —
// Next.js executes route modules at build time to collect page metadata,
// which would otherwise crash the build on missing/placeholder env vars.
function adminApp() {
  if (getApps().length) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export function getAdminDb() {
  return getFirestore(adminApp());
}

export function getAdminAuth() {
  return getAuth(adminApp());
}
