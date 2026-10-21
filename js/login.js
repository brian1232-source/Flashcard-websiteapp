import {
    auth,
    createAccount,
    getProfile,
    saveProfile,
    sendPasswordResetEmail,
    signInAccount
} from "./firebase.js";

"use strict";

const SESSION_KEY = "flashcardCoachSession";
const loginView = document.getElementById("loginView");
const registerView = document.getElementById("registerView");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginMessage = document.getElementById("loginMessage");
const registerMessage = document.getElementById("registerMessage");
const rememberMe = document.getElementById("rememberMe");

document.getElementById("currentYear").textContent = new Date().getFullYear();

function showMessage(element, message, type = "error") {
    element.textContent = message;
    element.className = `message ${type}`;
    element.hidden = false;
}

function hideMessage(element) {
    element.textContent = "";
    element.className = "message";
    element.hidden = true;
}

function setLoading(button, loading, text) {
    const label = button.querySelector("span");
    if (loading) {
        button.dataset.originalText = label?.textContent || "Continue";
        if (label) label.textContent = text;
        button.disabled = true;
    } else {
        if (label && button.dataset.originalText) label.textContent = button.dataset.originalText;
        button.disabled = false;
    }
}

function saveLocalSession(user, remember) {
    const profile = {
        id: user.uid,
        name: user.displayName || user.email?.split("@")[0] || "Student",
        email: user.email,
        loggedInAt: new Date().toISOString()
    };
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(profile));
    return profile;
}

function authErrorMessage(error, action) {
    const messages = {
        "auth/email-already-in-use": "An account with this email already exists. Please sign in.",
        "auth/invalid-email": "Enter a valid email address.",
        "auth/invalid-credential": "The email or password is incorrect.",
        "auth/user-not-found": "No account was found with that email. Please register first.",
        "auth/wrong-password": "The email or password is incorrect.",
        "auth/weak-password": "Choose a stronger password with at least 8 characters.",
        "auth/too-many-requests": "Too many attempts. Wait a little and try again.",
        "auth/network-request-failed": "Could not reach Firebase. Check your internet connection.",
        "auth/operation-not-allowed": "Email and password sign-in is not enabled in Firebase Authentication yet."
    };
    return messages[error.code] || error.message || `${action} failed. Please try again.`;
}

document.getElementById("showRegister").addEventListener("click", () => {
    loginView.hidden = true;
    registerView.hidden = false;
    hideMessage(loginMessage);
    hideMessage(registerMessage);
    registerForm.reset();
});

document.getElementById("showLogin").addEventListener("click", () => {
    loginView.hidden = false;
    registerView.hidden = true;
    hideMessage(loginMessage);
    hideMessage(registerMessage);
    loginForm.reset();
});

document.querySelectorAll("[data-toggle-password]").forEach(button => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.togglePassword);
        if (!input) return;
        const reveal = input.type === "password";
        input.type = reveal ? "text" : "password";
        button.querySelector("i").className = reveal ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    });
});

registerForm.addEventListener("submit", async event => {
    event.preventDefault();
    hideMessage(registerMessage);
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const button = registerForm.querySelector('button[type="submit"]');

    if (name.length < 2) return showMessage(registerMessage, "Please enter your full name.");
    if (password.length < 8) return showMessage(registerMessage, "Your password must contain at least 8 characters.");
    if (password !== confirmPassword) return showMessage(registerMessage, "Your passwords do not match. Please try again.");
    if (!document.getElementById("acceptTerms").checked) return showMessage(registerMessage, "Please accept the acknowledgement before continuing.");

    setLoading(button, true, "Creating account...");
    try {
        const user = await createAccount({ name, email, password, remember: true });
        saveLocalSession(user, true);
        showMessage(registerMessage, "Account created. Opening your dashboard...", "success");
        registerForm.reset();
        window.setTimeout(() => { window.location.href = "pages/dashboard.html"; }, 600);
    } catch (error) {
        console.error("Firebase registration error:", error);
        showMessage(registerMessage, authErrorMessage(error, "Account creation"));
    } finally {
        setLoading(button, false);
    }
});

loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    hideMessage(loginMessage);
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const remember = rememberMe.checked;
    const button = loginForm.querySelector('button[type="submit"]');
    setLoading(button, true, "Signing in...");
    try {
        const user = await signInAccount({ email, password, remember });
        try {
            const profile = await getProfile(user.uid);
            if (profile?.displayName && profile.displayName !== user.displayName) {
                await saveProfile(user, profile.displayName, user.email);
            }
        } catch (profileError) {
            console.warn("Could not load the optional profile document:", profileError);
        }
        saveLocalSession(user, remember);
        showMessage(loginMessage, `Welcome back, ${user.displayName || "Student"}! Opening your dashboard...`, "success");
        loginForm.reset();
        window.setTimeout(() => { window.location.href = "pages/dashboard.html"; }, 600);
    } catch (error) {
        console.error("Firebase login error:", error);
        showMessage(loginMessage, authErrorMessage(error, "Sign in"));
    } finally {
        setLoading(button, false);
    }
});

document.getElementById("forgotPassword").addEventListener("click", async () => {
    hideMessage(loginMessage);
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    if (!email) {
        showMessage(loginMessage, "Enter your email address first, then choose Forgot password.", "info");
        document.getElementById("loginEmail").focus();
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage(loginMessage, "Password reset email sent. Check your inbox.", "success");
    } catch (error) {
        console.error("Password reset error:", error);
        showMessage(loginMessage, authErrorMessage(error, "Password reset"));
    }
});
