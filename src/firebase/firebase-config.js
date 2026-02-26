import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

function isFirebaseConfigured(cfg) {
  const apiKey = (cfg?.apiKey ?? '').trim();
  const authDomain = (cfg?.authDomain ?? '').trim();
  const projectId = (cfg?.projectId ?? '').trim();

  if (!apiKey || !authDomain || !projectId) return false;
  if (apiKey === 'your_api_key_here') return false;
  return true;
}

export const firebaseEnabled = isFirebaseConfigured(firebaseConfig);

let app = null;
export let auth = null;
export let db = null;
export let storage = null;

if (firebaseEnabled) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  console.warn('[Firebase] Disabled (missing VITE_FIREBASE_* env). Running in local-only mode.');
}

export default app;
