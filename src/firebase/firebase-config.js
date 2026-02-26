import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Firebase API 키가 없는 환경(GitHub Pages 배포 등)에서는 클라우드 기능 비활성화
const isConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

let app = null;
export let auth = null;
export let db = null;
export let storage = null;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log('[Firebase] Initialized successfully');
  } catch (e) {
    console.warn('[Firebase] Initialization failed:', e.message);
  }
} else {
  console.info('[Firebase] No API key – cloud features disabled (offline mode)');
}

export { isConfigured as isFirebaseConfigured };
export default app;
