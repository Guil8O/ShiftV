import { auth } from './firebase-config.js';
import { 
    browserLocalPersistence,
    getRedirectResult,
    signInWithPopup, 
    signInWithRedirect,
    GoogleAuthProvider, 
    setPersistence,
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();

let authReadyResolve;
let authReadyResolved = false;
export const authReady = new Promise((res) => (authReadyResolve = res));

let initAuthPromise = null;

export async function initAuthOnce() {
    if (initAuthPromise) return initAuthPromise;

    initAuthPromise = (async () => {
        if (!auth) {
            if (!authReadyResolved) {
                authReadyResolved = true;
                authReadyResolve(null);
            }
            return;
        }

        await setPersistence(auth, browserLocalPersistence);

        try {
            await getRedirectResult(auth);
        } catch (e) {
            console.error('getRedirectResult:', e);
        }

        firebaseOnAuthStateChanged(auth, (user) => {
            if (!authReadyResolved) {
                authReadyResolved = true;
                authReadyResolve(user);
            }

            const post = sessionStorage.getItem('postLoginUrl');
            if (post) {
                sessionStorage.removeItem('postLoginUrl');
                sessionStorage.removeItem('redirectLoginTried');
                if (location.href !== post) location.replace(post);
            }
        });
    })();

    return initAuthPromise;
}

export async function signInWithGoogle() {
    try {
        if (!auth) {
            console.warn('[Auth] Firebase not configured; Google Sign-In disabled (local-only mode).');
            return null;
        }

        const isStandalone =
            window.matchMedia?.('(display-mode: standalone)')?.matches ||
            window.navigator.standalone === true;
        const isAndroid = /Android/i.test(navigator.userAgent);

        sessionStorage.setItem('postLoginUrl', location.href);

        if (isStandalone || isAndroid) {
            sessionStorage.setItem('redirectLoginTried', '1');
            return await signInWithRedirect(auth, googleProvider);
        }

        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (e) {
            if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/popup-closed-by-user') {
                sessionStorage.setItem('redirectLoginTried', '1');
                return await signInWithRedirect(auth, googleProvider);
            }
            throw e;
        }
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        throw error;
    }
}

export async function ensureLoginOrShowUI() {
    const user = await authReady;
    if (user) return true;

    if (!sessionStorage.getItem('redirectLoginTried')) {
        sessionStorage.setItem('redirectLoginTried', '1');
        sessionStorage.setItem('postLoginUrl', location.href);
        await signInWithRedirect(auth, googleProvider);
        return false;
    }

    return false;
}

export async function signInWithEmail(email, password) {
    try {
        if (!auth) {
            console.warn('[Auth] Firebase not configured; Email Sign-In disabled (local-only mode).');
            return null;
        }
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Email Sign-In Error:", error);
        throw error;
    }
}

export async function signUpWithEmail(email, password) {
    try {
        if (!auth) {
            console.warn('[Auth] Firebase not configured; Email Sign-Up disabled (local-only mode).');
            return null;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Email Sign-Up Error:", error);
        throw error;
    }
}

export async function signOut() {
    try {
        if (!auth) return;
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Sign-Out Error:", error);
        throw error;
    }
}

export function onAuthStateChanged(callback) {
    if (!auth) {
        queueMicrotask(() => callback(null));
        return () => {};
    }
    return firebaseOnAuthStateChanged(auth, callback);
}
