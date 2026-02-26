import { auth } from './firebase-config.js';
import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
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
    const unsubscribe = firebaseOnAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
    });
});

/**
 * 리다이렉트 로그인 결과 처리
 * 앱 초기화 직후 호출하여 리다이렉트 로그인 성공 여부를 감지합니다.
 * @returns {Promise<import('firebase/auth').User|null>} 로그인된 사용자 또는 null
 */
export async function handleRedirectResult() {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            console.log("리다이렉트 로그인 성공:", result.user.displayName || result.user.email);
            return result.user;
        }
        return null;
    } catch (error) {
        console.error("리다이렉트 로그인 실패:", error);
        return null;
    }
}

/**
 * 구글 로그인
 * 모바일/PWA 환경에서는 signInWithRedirect, 데스크탑에서는 signInWithPopup 사용
 */
export async function signInWithGoogle() {
    try {
        const isMobileOrPWA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true;

        if (isMobileOrPWA) {
            // 모바일/PWA: 리다이렉트 방식 (팝업 차단 회피)
            await signInWithRedirect(auth, googleProvider);
            // signInWithRedirect는 페이지를 떠나므로 여기서 return되지 않음
            return null;
        } else {
            // 데스크탑: 팝업 방식 (기존 동작 유지)
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        }
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        throw error;
    }
}

export async function signInWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Email Sign-In Error:", error);
        throw error;
    }
}

export async function signUpWithEmail(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Email Sign-Up Error:", error);
        throw error;
    }
}

export async function signOut() {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Sign-Out Error:", error);
        throw error;
    }
}

export function onAuthStateChanged(callback) {
    return firebaseOnAuthStateChanged(auth, callback);
}
