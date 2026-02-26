import { storage } from './firebase-config.js';
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject,
    listAll 
} from 'firebase/storage';

/**
 * Upload a photo to Firebase Storage.
 * Path: users/{uid}/photos/{category}/{filename}
 * 
 * @param {string} uid - Firebase user ID
 * @param {string} category - Photo category ('face' | 'front' | 'side' | 'back' | 'other')
 * @param {Blob} blob - Compressed image blob
 * @returns {Promise<string>} Download URL
 */
export async function uploadPhoto(uid, category, blob) {
    if (!uid || !blob) throw new Error('uid and blob are required');
    
    const timestamp = Date.now();
    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const filename = `${timestamp}.${extension}`;
    const storagePath = `users/${uid}/photos/${category}/${filename}`;
    
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, blob, {
        contentType: blob.type || 'image/webp'
    });
    
    const url = await getDownloadURL(snapshot.ref);
    console.log(`[Storage] Uploaded: ${storagePath}`);
    return url;
}

/**
 * Delete a photo from Firebase Storage.
 * 
 * @param {string} uid - Firebase user ID (unused but kept for API consistency)
 * @param {string} url - Full download URL or storage path
 */
export async function deletePhoto(uid, url) {
    if (!url) throw new Error('url is required');
    
    try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
        console.log(`[Storage] Deleted: ${url}`);
    } catch (error) {
        // File might already be deleted
        if (error.code === 'storage/object-not-found') {
            console.warn(`[Storage] File not found (already deleted?): ${url}`);
        } else {
            throw error;
        }
    }
}

/**
 * Get all photo URLs for a specific measurement/category.
 * 
 * @param {string} uid - Firebase user ID
 * @param {string} category - Photo category
 * @returns {Promise<Array<{name: string, url: string}>>}
 */
export async function getPhotos(uid, category) {
    if (!uid) return [];
    
    const folderPath = `users/${uid}/photos/${category || ''}`;
    const folderRef = ref(storage, folderPath);
    
    try {
        const result = await listAll(folderRef);
        const photos = await Promise.all(
            result.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return { name: itemRef.name, url };
            })
        );
        return photos;
    } catch (error) {
        console.error(`[Storage] getPhotos error for ${folderPath}:`, error);
        return [];
    }
}

/**
 * Upload avatar image to Firebase Storage.
 * Path: users/{uid}/avatar/profile.webp  (overwrites previous)
 *
 * @param {string} uid  - Firebase user ID
 * @param {Blob}   blob - Compressed WebP blob (200×200 recommended)
 * @returns {Promise<string>} Public download URL
 */
export async function uploadAvatar(uid, blob) {
    if (!uid || !blob) throw new Error('[Storage] uploadAvatar: uid and blob are required');
    const storagePath = `users/${uid}/avatar/profile.webp`;
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, blob, { contentType: 'image/webp' });
    const url = await getDownloadURL(snapshot.ref);
    console.log(`[Storage] Avatar uploaded: ${storagePath}`);
    return url;
}

/**
 * Delete the user's avatar from Firebase Storage (called on account deletion).
 *
 * @param {string} uid - Firebase user ID
 */
export async function deleteUserAvatar(uid) {
    if (!uid) return;
    try {
        const storageRef = ref(storage, `users/${uid}/avatar/profile.webp`);
        await deleteObject(storageRef);
        console.log(`[Storage] Avatar deleted for uid: ${uid}`);
    } catch (err) {
        if (err.code !== 'storage/object-not-found') throw err;
    }
}
