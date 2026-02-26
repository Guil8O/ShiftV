import { auth } from './firebase-config.js';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

/**
 * 인증 상태가 최초로 확정될 때까지 대기하는 Promise
 * sync.js 등에서 await authReady 로 사용
 */
export const authReady = new Promise((resolve) => {
    if (!auth) { resolve(null); return; }
    const unsubscribe = firebaseOnAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
    });
});

/**
 * 리다이렉트 로그인 결과 처리 (레거시 호환 - 더 이상 redirect 사용 안 함)
 */
export async function handleRedirectResult() {
    return null;
}

/**
 * 구글 로그인
 * signInWithPopup 사용 (signInWithRedirect는 SW 캐시와 충돌하여 사용 불가)
 * COOP 경고가 콘솔에 뜨지만 실제 동작에는 영향 없음
 */
export async function signInWithGoogle() {
    if (!auth) throw new Error('Firebase not configured');
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
}

export async function signInWithEmail(email, password) {
    if (!auth) throw new Error('Firebase not configured');
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Email Sign-In Error:", error);
        throw error;
    }
}

export async function signUpWithEmail(email, password) {
    if (!auth) throw new Error('Firebase not configured');
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Email Sign-Up Error:", error);
        throw error;
    }
}

export async function signOut() {
    if (!auth) return;
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Sign-Out Error:", error);
        throw error;
    }
}

export function onAuthStateChanged(callback) {
    if (!auth) { callback(null); return () => {}; }
    return firebaseOnAuthStateChanged(auth, callback);
}
