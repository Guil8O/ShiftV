import { db } from './firebase-config.js';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';

// ============================================================
// MEASUREMENTS COLLECTION
// Path: users/{uid}/measurements/{docId}
// ============================================================

/**
 * Save a measurement record. 
 * Uses date as document ID for easy date-based upsert.
 * @param {string} uid 
 * @param {Object} data - Must include `date` (YYYY-MM-DD)
 */
export async function saveMeasurement(uid, data) {
    if (!uid || !data?.date) throw new Error('uid and data.date are required');
    
    const docRef = doc(db, 'users', uid, 'measurements', data.date);
    await setDoc(docRef, {
        ...data,
        _updatedAt: serverTimestamp()
    }, { merge: true });
    return docRef.id;
}

/**
 * Get all measurements for a user, ordered by date.
 * @param {string} uid 
 * @returns {Promise<Array>}
 */
export async function getMeasurements(uid) {
    if (!uid) return [];
    
    const q = query(
        collection(db, 'users', uid, 'measurements'),
        orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get a single measurement by date.
 * @param {string} uid 
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Object|null>}
 */
export async function getMeasurementByDate(uid, date) {
    if (!uid || !date) return null;
    
    const docRef = doc(db, 'users', uid, 'measurements', date);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Delete a measurement by its document ID (date).
 * @param {string} uid 
 * @param {string} id - Document ID (typically YYYY-MM-DD)
 */
export async function deleteMeasurement(uid, id) {
    if (!uid || !id) throw new Error('uid and id are required');
    
    const docRef = doc(db, 'users', uid, 'measurements', id);
    await deleteDoc(docRef);
}


// ============================================================
// DIARY COLLECTION
// Path: users/{uid}/diary/{date}
// Document ID = date (YYYY-MM-DD)
// ============================================================

/**
 * Save/update a diary entry. Uses merge to allow partial updates.
 * @param {string} uid 
 * @param {Object} entry - Must include `date` (YYYY-MM-DD)
 */
export async function saveDiaryEntry(uid, entry) {
    if (!uid || !entry?.date) throw new Error('uid and entry.date are required');
    
    const docRef = doc(db, 'users', uid, 'diary', entry.date);
    await setDoc(docRef, {
        ...entry,
        _updatedAt: serverTimestamp()
    }, { merge: true });
    return entry.date;
}

/**
 * Get a single diary entry by date.
 * @param {string} uid 
 * @param {string} date - YYYY-MM-DD
 * @returns {Promise<Object|null>}
 */
export async function getDiaryEntry(uid, date) {
    if (!uid || !date) return null;
    
    const docRef = doc(db, 'users', uid, 'diary', date);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Get all diary entries for a specific month (for calendar rendering).
 * @param {string} uid 
 * @param {number} year 
 * @param {number} month - 1-12
 * @returns {Promise<Array>}
 */
export async function getDiaryMonth(uid, year, month) {
    if (!uid) return [];
    
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    
    const q = query(
        collection(db, 'users', uid, 'diary'),
        where('date', '>=', startDate),
        where('date', '<', endDate),
        orderBy('date', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Delete a diary entry.
 * @param {string} uid 
 * @param {string} date - YYYY-MM-DD
 */
export async function deleteDiaryEntry(uid, date) {
    if (!uid || !date) throw new Error('uid and date are required');
    
    const docRef = doc(db, 'users', uid, 'diary', date);
    await deleteDoc(docRef);
}


// ============================================================
// QUESTS COLLECTION
// Path: users/{uid}/quests/{questId}
// ============================================================

/**
 * Save a quest (create or overwrite).
 * @param {string} uid 
 * @param {Object} quest - Quest data
 * @returns {Promise<string>} questId
 */
export async function saveQuest(uid, quest) {
    if (!uid || !quest) throw new Error('uid and quest are required');
    
    if (quest.id) {
        // Update existing
        const docRef = doc(db, 'users', uid, 'quests', quest.id);
        await setDoc(docRef, {
            ...quest,
            _updatedAt: serverTimestamp()
        });
        return quest.id;
    } else {
        // Create new
        const colRef = collection(db, 'users', uid, 'quests');
        const docRef = await addDoc(colRef, {
            ...quest,
            createdAt: serverTimestamp(),
            _updatedAt: serverTimestamp()
        });
        return docRef.id;
    }
}

/**
 * Append a progress entry to a quest's history array.
 * @param {string} uid 
 * @param {string} questId 
 * @param {number} newValue 
 * @param {string} date - YYYY-MM-DD
 */
export async function updateQuestProgress(uid, questId, newValue, date) {
    if (!uid || !questId) throw new Error('uid and questId are required');
    
    const docRef = doc(db, 'users', uid, 'quests', questId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Quest not found');
    
    const data = snap.data();
    const history = Array.isArray(data.history) ? [...data.history] : [];
    history.push({ value: newValue, date, recordedAt: new Date().toISOString() });
    
    await updateDoc(docRef, {
        history,
        currentValue: newValue,
        _updatedAt: serverTimestamp()
    });
}

/**
 * Get all quests for a user.
 * @param {string} uid 
 * @returns {Promise<Array>}
 */
export async function getQuests(uid) {
    if (!uid) return [];
    
    const q = query(collection(db, 'users', uid, 'quests'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Update quest metadata (pinned, favorited, status, etc.).
 * @param {string} uid 
 * @param {string} questId 
 * @param {Object} fields - Partial fields to update
 */
export async function updateQuestMeta(uid, questId, fields) {
    if (!uid || !questId) throw new Error('uid and questId are required');
    
    const docRef = doc(db, 'users', uid, 'quests', questId);
    await updateDoc(docRef, {
        ...fields,
        _updatedAt: serverTimestamp()
    });
}

/**
 * Delete a quest.
 * @param {string} uid 
 * @param {string} questId 
 */
export async function deleteQuest(uid, questId) {
    if (!uid || !questId) throw new Error('uid and questId are required');
    
    const docRef = doc(db, 'users', uid, 'quests', questId);
    await deleteDoc(docRef);
}


// ============================================================
// COMMON: Custom Actions & AI Cache
// ============================================================

/**
 * Save a custom action (user-edited recommendation card).
 * @param {string} uid 
 * @param {string} category - 'exercise' | 'diet' | 'habits'
 * @param {string} text 
 */
export async function saveCustomAction(uid, category, text) {
    if (!uid) throw new Error('uid is required');
    
    const colRef = collection(db, 'users', uid, 'customActions');
    await addDoc(colRef, {
        category,
        text,
        createdAt: serverTimestamp()
    });
}

/**
 * Save an AI response to cache with TTL.
 * @param {string} uid 
 * @param {string} key - Cache key
 * @param {string} response - AI response text
 * @param {number} ttl - Time-to-live in milliseconds (default 24h)
 */
export async function saveAICache(uid, key, response, ttl = 86400000) {
    if (!uid || !key) throw new Error('uid and key are required');
    
    const docRef = doc(db, 'users', uid, 'aiCache', key);
    await setDoc(docRef, {
        response,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + ttl).toISOString()
    });
}
