import { db, auth } from './firebase-config.js';
import { authReady } from './auth.js';
import { 
    doc, 
    getDoc, 
    setDoc, 
    serverTimestamp 
} from 'firebase/firestore';

const USERS_COL = 'users';

/* ==============================
   localStorage Key Constants
   Must match script.js exactly
   ============================== */
const PRIMARY_DATA_KEY = 'shiftV_Data_v1_1';     // {measurements[], targets{}, notes[]}
const SETTINGS_KEY     = 'shiftV_Settings_v1_0'; // {language, mode, theme, ...}
const DIARY_KEY        = 'shiftv_diary';          // {} date-keyed
const QUEST_KEY        = 'shiftv_quests';         // []
const SYNC_TS_KEY      = 'shiftV_lastSyncTs';    // number (epoch ms)

/* Profile & preference keys (individual localStorage keys) */
const PROFILE_KEYS = [
    'shiftV_accentColor',
    'shiftV_nickname',
    'shiftV_birthdate',
    'shiftV_goalText',
    'shiftV_reminderInterval',
    'shiftV_onboardingCompleted'
];

/* Keys that live INSIDE shiftV_Settings_v1_0 JSON blob, NOT as individual keys.
   sync.js reads them from the settings object, not from individual localStorage entries.
   This prevents the desync between sync.js and script.js. */
const SETTINGS_EMBEDDED_KEYS = ['language', 'mode', 'biologicalSex', 'theme'];

/* ==============================
   Read / Write Local Data
   ============================== */

function readAllLocal() {
    const primaryRaw = localStorage.getItem(PRIMARY_DATA_KEY);
    let primary = { measurements: [], targets: {}, notes: [] };
    if (primaryRaw) {
        try {
            const parsed = JSON.parse(primaryRaw);
            primary.measurements = Array.isArray(parsed.measurements) ? parsed.measurements : [];
            primary.targets = parsed.targets || {};
            primary.notes = Array.isArray(parsed.notes) ? parsed.notes : [];
        } catch { /* keep defaults */ }
    }

    const settingsRaw = localStorage.getItem(SETTINGS_KEY);
    let settings = {};
    if (settingsRaw) {
        try { settings = JSON.parse(settingsRaw); } catch { /* keep {} */ }
    }

    let diary = {};
    try { diary = JSON.parse(localStorage.getItem(DIARY_KEY) || '{}'); } catch { /* keep {} */ }

    let quests = [];
    try { quests = JSON.parse(localStorage.getItem(QUEST_KEY) || '[]'); } catch { /* keep [] */ }

    // Profile keys
    const profile = {};
    for (const key of PROFILE_KEYS) {
        const val = localStorage.getItem(key);
        if (val !== null) profile[key] = val;
    }

    const lastSync = parseInt(localStorage.getItem(SYNC_TS_KEY) || '0', 10);

    return {
        measurements: primary.measurements,
        targets: primary.targets,
        notes: primary.notes,
        settings,
        diary,
        quests,
        profile,
        _lastModified: lastSync
    };
}

function writeAllLocal(data) {
    // Primary data
    const primary = {
        measurements: data.measurements || [],
        targets: data.targets || {},
        notes: data.notes || []
    };
    localStorage.setItem(PRIMARY_DATA_KEY, JSON.stringify(primary));

    // Settings
    if (data.settings && Object.keys(data.settings).length > 0) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
    }

    // Diary
    if (data.diary && typeof data.diary === 'object') {
        localStorage.setItem(DIARY_KEY, JSON.stringify(data.diary));
    }

    // Quests
    if (Array.isArray(data.quests)) {
        localStorage.setItem(QUEST_KEY, JSON.stringify(data.quests));
    }

    // Profile keys
    if (data.profile && typeof data.profile === 'object') {
        for (const [key, val] of Object.entries(data.profile)) {
            if (val !== null && val !== undefined) {
                localStorage.setItem(key, val);
            }
        }
    }

    // Sync timestamp
    const now = Date.now();
    localStorage.setItem(SYNC_TS_KEY, now.toString());

    console.log('[Sync] Local storage updated');
}

/* ==============================
   Cloud Operations
   ============================== */

async function uploadToCloud(uid, data) {
    const userDocRef = doc(db, USERS_COL, uid);
    await setDoc(userDocRef, {
        measurements: data.measurements || [],
        targets: data.targets || {},
        notes: data.notes || [],
        settings: data.settings || {},
        diary: data.diary || {},
        quests: data.quests || [],
        profile: data.profile || {},
        _lastModified: serverTimestamp(),
        _syncedAt: serverTimestamp()
    });
    console.log('[Sync] Uploaded to cloud');
}

async function downloadFromCloud(uid) {
    const userDocRef = doc(db, USERS_COL, uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
        measurements: Array.isArray(d.measurements) ? d.measurements : [],
        targets: d.targets || {},
        notes: Array.isArray(d.notes) ? d.notes : [],
        settings: d.settings || {},
        diary: d.diary || {},
        quests: Array.isArray(d.quests) ? d.quests : [],
        profile: d.profile || {},
        _lastModified: d._lastModified?.toMillis?.() || d._lastModified || 0
    };
}

/* ==============================
   Merge Strategy
   ============================== */

/**
 * Merge local and cloud data.
 * - measurements: union by date (cloud wins on conflict via timestamp)
 * - notes: union by date
 * - diary: per-date merge (latest wins per entry)
 * - quests: union by id
 * - settings, targets, profile: cloud wins if cloud is newer, else local wins
 */
function mergeData(local, cloud) {
    if (!cloud) return { ...local, _source: 'local_only' };
    if (!local || (!local.measurements?.length && !Object.keys(local.settings || {}).length)) {
        return { ...cloud, _source: 'cloud_only' };
    }

    const localTs = local._lastModified || 0;
    const cloudTs = cloud._lastModified || 0;
    const cloudIsNewer = cloudTs > localTs;

    // --- Measurements: union by date key ---
    const mMap = new Map();
    for (const m of (local.measurements || [])) {
        if (m.date) mMap.set(m.date, m);
    }
    for (const m of (cloud.measurements || [])) {
        if (!m.date) continue;
        const existing = mMap.get(m.date);
        if (!existing) {
            mMap.set(m.date, m);
        } else {
            // Per-record: cloud timestamp wins, or cloud if newer overall
            const eTs = existing.timestamp || existing._updatedAt || 0;
            const cTs = m.timestamp || m._updatedAt || 0;
            if (cTs > eTs) mMap.set(m.date, m);
        }
    }
    const measurements = Array.from(mMap.values()).sort((a, b) => {
        return (a.timestamp || 0) - (b.timestamp || 0);
    });

    // --- Notes: union by date ---
    const nMap = new Map();
    for (const n of (local.notes || [])) {
        if (n.date) nMap.set(n.date, n);
    }
    for (const n of (cloud.notes || [])) {
        if (!n.date) continue;
        const existing = nMap.get(n.date);
        if (!existing) {
            nMap.set(n.date, n);
        } else {
            const eTs = existing.timestamp || 0;
            const cTs = n.timestamp || 0;
            if (cTs > eTs) nMap.set(n.date, n);
        }
    }
    const notes = Array.from(nMap.values());

    // --- Diary: per-date key merge ---
    const diary = { ...(local.diary || {}) };
    if (cloud.diary) {
        for (const [date, entry] of Object.entries(cloud.diary)) {
            if (!diary[date]) {
                diary[date] = entry;
            } else {
                // Cloud entry wins if it has more recent data
                const localEntry = diary[date];
                const cloudEntry = entry;
                if ((cloudEntry.updatedAt || 0) > (localEntry.updatedAt || 0)) {
                    diary[date] = cloudEntry;
                }
            }
        }
    }

    // --- Quests: union by id ---
    const qMap = new Map();
    for (const q of (local.quests || [])) {
        if (q.id) qMap.set(q.id, q);
    }
    for (const q of (cloud.quests || [])) {
        if (!q.id) continue;
        const existing = qMap.get(q.id);
        if (!existing) {
            qMap.set(q.id, q);
        } else {
            // Prefer whichever has more progress / later update
            if ((q.updatedAt || 0) > (existing.updatedAt || 0)) {
                qMap.set(q.id, q);
            }
        }
    }
    const quests = Array.from(qMap.values());

    // --- Settings, targets, profile: latest wins ---
    const settings = cloudIsNewer ? { ...(local.settings || {}), ...(cloud.settings || {}) } : { ...(cloud.settings || {}), ...(local.settings || {}) };
    const targets = cloudIsNewer ? { ...(local.targets || {}), ...(cloud.targets || {}) } : { ...(cloud.targets || {}), ...(local.targets || {}) };
    const profile = cloudIsNewer ? { ...(local.profile || {}), ...(cloud.profile || {}) } : { ...(cloud.profile || {}), ...(local.profile || {}) };

    return {
        measurements,
        targets,
        notes,
        settings,
        diary,
        quests,
        profile,
        _lastModified: Math.max(localTs, cloudTs),
        _source: 'merged'
    };
}

/* ==============================
   SyncManager — Public API
   ============================== */

export class SyncManager {
    /**
     * Full bidirectional sync:
     * 1. Read local data (correct keys)
     * 2. Download cloud data
     * 3. Merge (per-record for arrays, latest-wins for scalars)
     * 4. Write merged data back to local
     * 5. Upload merged data to cloud
     * 6. Reload page
     */
    async syncAll() {
        await authReady;
        const user = auth.currentUser;
        if (!user) throw new Error('User not logged in');

        console.log('[Sync] Starting full sync for', user.uid);

        const localData = readAllLocal();
        const cloudData = await downloadFromCloud(user.uid);
        const merged = mergeData(localData, cloudData);

        console.log('[Sync] Merge result:', merged._source,
            `local=${localData.measurements?.length || 0}m`,
            `cloud=${cloudData?.measurements?.length || 0}m`,
            `merged=${merged.measurements?.length || 0}m`);

        writeAllLocal(merged);
        await uploadToCloud(user.uid, merged);

        console.log('[Sync] Sync complete — reloading');
        window.location.reload();
    }

    /**
     * Download-only: fetch cloud data and merge into local.
     * Called automatically after login if cloud data exists.
     * Does NOT reload — caller handles UI updates.
     */
    async pullFromCloud() {
        await authReady;
        const user = auth.currentUser;
        if (!user) return null;

        console.log('[Sync] Pull from cloud for', user.uid);

        const cloudData = await downloadFromCloud(user.uid);
        if (!cloudData) {
            console.log('[Sync] No cloud data found');
            return null;
        }

        const localData = readAllLocal();
        const merged = mergeData(localData, cloudData);

        writeAllLocal(merged);
        console.log('[Sync] Pull complete:', merged._source,
            `${merged.measurements?.length || 0} measurements`);

        return merged;
    }

    /**
     * Upload-only: push local data to cloud.
     * Called periodically or before logout.
     */
    async pushToCloud() {
        await authReady;
        const user = auth.currentUser;
        if (!user) return;

        const localData = readAllLocal();
        await uploadToCloud(user.uid, localData);
        console.log('[Sync] Push complete');
    }

    /**
     * Check if cloud data exists for current user.
     */
    async hasCloudData() {
        await authReady;
        const user = auth.currentUser;
        if (!user) return false;

        const userDocRef = doc(db, USERS_COL, user.uid);
        const snap = await getDoc(userDocRef);
        return snap.exists() && (snap.data().measurements?.length > 0 || Object.keys(snap.data().settings || {}).length > 0);
    }
}

/* Export individual functions for use elsewhere */
export { syncToCloud, fetchFromCloud, mergeData };

/* Legacy-compatible named exports */
async function syncToCloud(uid, localData) {
    await uploadToCloud(uid, localData);
}

async function fetchFromCloud(uid) {
    return downloadFromCloud(uid);
}
