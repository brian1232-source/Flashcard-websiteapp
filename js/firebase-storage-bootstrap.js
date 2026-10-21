import { auth, db } from "./firebase.js";
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    setDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";

const SESSION_KEY = "flashcardCoachSession";
const COLLECTION_KEYS = new Map([
    ["flashcardCoachFlashcards", "flashcards"],
    ["flashcardCoachStudyStats", "studyStats"],
    ["flashcardCoachQuizHistory", "quizHistory"]
]);
const DAILY_GOAL_KEY = "flashcardCoachDailyGoal";
const SETTINGS_PREFIX = "flashcardCoachSettings:";

function readSession() {
    try {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || "null");
    } catch {
        return null;
    }
}

function waitForAuth() {
    return new Promise(resolve => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            unsubscribe();
            resolve(user);
        }, () => resolve(null));
    });
}

function createId() {
    return typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function recordDocumentId(record, index) {
    const value = String(record.id || `record-${index}-${createId()}`);
    return encodeURIComponent(value).slice(0, 1400);
}

async function readCollection(uid, collectionName) {
    const snapshot = await getDocs(collection(db, "users", uid, collectionName));
    return snapshot.docs.map(item => ({ ...item.data(), id: item.data().id || item.id, userId: uid }));
}

async function writeCollection(uid, collectionName, records) {
    const collectionRef = collection(db, "users", uid, collectionName);
    const existing = await getDocs(collectionRef);
    const normalized = records
        .filter(record => record && typeof record === "object" && (!record.userId || record.userId === uid))
        .map((record, index) => ({ ...record, id: String(record.id || `record-${index}-${createId()}`), userId: uid }));
    const nextIds = new Set(normalized.map((record, index) => recordDocumentId(record, index)));
    const operations = [];

    normalized.forEach((record, index) => {
        operations.push({ type: "set", ref: doc(collectionRef, recordDocumentId(record, index)), data: record });
    });
    existing.docs.forEach(item => {
        if (!nextIds.has(item.id)) operations.push({ type: "delete", ref: item.ref });
    });

    for (let offset = 0; offset < operations.length; offset += 450) {
        const batch = writeBatch(db);
        operations.slice(offset, offset + 450).forEach(operation => {
            if (operation.type === "delete") batch.delete(operation.ref);
            else batch.set(operation.ref, operation.data);
        });
        await batch.commit();
    }
}

async function readPreferences(uid) {
    const snapshot = await getDocs(collection(db, "users", uid, "preferences"));
    return snapshot.docs[0]?.data() || null;
}

async function writePreferences(uid) {
    const settingsKey = `${SETTINGS_PREFIX}${uid}`;
    let settings = {};
    try { settings = JSON.parse(localStorage.getItem(settingsKey) || "{}"); } catch { /* use defaults */ }
    const dailyGoal = Number(localStorage.getItem(DAILY_GOAL_KEY)) || 20;
    await setDoc(doc(db, "users", uid, "preferences", "main"), { ...settings, dailyGoal, updatedAt: new Date().toISOString() }, { merge: true });
}

function installStorageSync(uid) {
    const originalSetItem = Storage.prototype.setItem;
    const pendingWrites = new Map();
    let preferenceTimer = null;

    Storage.prototype.setItem = function(key, value) {
        originalSetItem.call(this, key, value);
        if (this !== window.localStorage) return;

        const collectionName = COLLECTION_KEYS.get(key);
        if (collectionName) {
            try {
                const parsed = JSON.parse(value);
                if (!Array.isArray(parsed)) return;
                const normalized = parsed
                    .filter(record => record && typeof record === "object" && (!record.userId || record.userId === uid))
                    .map(record => ({ ...record, id: String(record.id || createId()), userId: uid }));
                originalSetItem.call(this, key, JSON.stringify(normalized));
                const previous = pendingWrites.get(key) || Promise.resolve();
                const next = previous
                    .catch(() => {})
                    .then(() => writeCollection(uid, collectionName, normalized))
                    .catch(error => {
                        console.error(`Could not sync ${collectionName} to Firestore:`, error);
                        window.dispatchEvent(new CustomEvent("firebase-storage-error", { detail: error }));
                    });
                pendingWrites.set(key, next);
            } catch (error) {
                console.error(`Could not prepare ${collectionName} for Firestore:`, error);
            }
            return;
        }

        if (key === DAILY_GOAL_KEY || key === `${SETTINGS_PREFIX}${uid}`) {
            window.clearTimeout(preferenceTimer);
            preferenceTimer = window.setTimeout(() => {
                writePreferences(uid).catch(error => {
                    console.error("Could not sync study preferences to Firestore:", error);
                    window.dispatchEvent(new CustomEvent("firebase-storage-error", { detail: error }));
                });
            }, 150);
        }
    };
}

async function hydrate() {
    const session = readSession();
    const uid = session?.id || session?.uid;
    if (!uid) return { synced: false, reason: "no-session" };

    const user = await waitForAuth();
    if (!user || user.uid !== uid) return { synced: false, reason: "auth-session-mismatch" };

    for (const [key, collectionName] of COLLECTION_KEYS) {
        let localRecords = [];
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || "[]");
            if (Array.isArray(parsed)) localRecords = parsed;
        } catch { /* start empty */ }

        const cloudRecords = await readCollection(uid, collectionName);
        const merged = cloudRecords.length
            ? cloudRecords
            : localRecords
                .filter(record => record && typeof record === "object" && (!record.userId || record.userId === uid))
                .map(record => ({ ...record, id: String(record.id || createId()), userId: uid }));
        localStorage.setItem(key, JSON.stringify(merged));
        if (!cloudRecords.length && merged.length) await writeCollection(uid, collectionName, merged);
    }

    const preferences = await readPreferences(uid);
    const settingsKey = `${SETTINGS_PREFIX}${uid}`;
    if (preferences) {
        localStorage.setItem(DAILY_GOAL_KEY, String(preferences.dailyGoal || 20));
        const { dailyGoal, updatedAt, ...settings } = preferences;
        localStorage.setItem(settingsKey, JSON.stringify(settings));
    } else {
        await writePreferences(uid);
    }

    installStorageSync(uid);
    return { synced: true, uid };
}

window.firebaseStorageReady = hydrate().catch(error => {
    console.error("Firestore data sync could not start; continuing with browser storage:", error);
    return { synced: false, error };
});
