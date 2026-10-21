// Firebase browser SDK for the Flashcard Coach web app.
// Firebase web config is public app configuration; access is enforced by Auth and Firestore rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
    browserLocalPersistence,
    browserSessionPersistence,
    createUserWithEmailAndPassword,
    getAuth,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
    doc,
    getDoc,
    getFirestore,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC79TtKDZOjgiKyX2b5E4nfL85FgWSS3gA",
    authDomain: "alienchat-109f9.firebaseapp.com",
    projectId: "alienchat-109f9",
    storageBucket: "alienchat-109f9.firebasestorage.app",
    messagingSenderId: "98580972818",
    appId: "1:98580972818:web:b719a83df1d48892875fcb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function useRememberedSession(remember) {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}

export async function createAccount({ name, email, password, remember = true }) {
    await useRememberedSession(remember);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    try {
        await setDoc(doc(db, "users", credential.user.uid), {
            uid: credential.user.uid,
            displayName: name,
            email: credential.user.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        // Authentication still succeeds if Firestore hasn't been enabled/configured yet.
        console.warn("Could not create the optional Firestore profile document:", error);
    }
    return credential.user;
}

export async function signInAccount({ email, password, remember = true }) {
    await useRememberedSession(remember);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
}

export async function saveProfile(user, displayName, email) {
    if (displayName && user.displayName !== displayName) {
        await updateProfile(user, { displayName });
    }
    await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: displayName || user.displayName || "Student",
        email: email || user.email,
        updatedAt: serverTimestamp()
    }, { merge: true });
}

export async function getProfile(uid) {
    const snapshot = await getDoc(doc(db, "users", uid));
    return snapshot.exists() ? snapshot.data() : null;
}

export { sendPasswordResetEmail, signOut };

