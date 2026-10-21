"use strict";

const SESSION_KEY = "flashcardCoachSession";
const ACCOUNTS_KEY = "flashcardCoachAccounts";
const DAILY_GOAL_KEY = "flashcardCoachDailyGoal";
const SETTINGS_PREFIX = "flashcardCoachSettings:";

function readJSON(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.error(`Unable to read ${key}:`, error);
        return fallback;
    }
}

function getSession() {
    try {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || "null");
    } catch (error) {
        return null;
    }
}

let session = null;
document.addEventListener("DOMContentLoaded", async () => {
    await (window.firebaseStorageReady || Promise.resolve());
    session = getSession();
    if (!session || !session.id || !session.email) window.location.replace("../index.html");
    else initialiseSettings();
});

function initials(name) {
    return (name || "Student").trim().split(/\s+/).slice(0, 2).map(part => part[0].toUpperCase()).join("");
}

function initialiseSettings() {
    const profile = readJSON(ACCOUNTS_KEY, []).find(account => account.id === session.id) || session;
    const profileForm = document.getElementById("profileForm");
    const preferencesForm = document.getElementById("preferencesForm");
    const userName = profile.name || session.name || "Student";
    document.getElementById("displayName").value = userName;
    document.getElementById("emailAddress").value = profile.email || session.email;
    document.getElementById("topUserName").textContent = userName;
    document.getElementById("topAvatar").textContent = initials(userName);
    document.getElementById("todayDate").textContent = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date());

    const savedGoal = Number(localStorage.getItem(DAILY_GOAL_KEY));
    document.getElementById("dailyGoal").value = Number.isFinite(savedGoal) && savedGoal > 0 ? savedGoal : 20;
    const preferenceKey = `${SETTINGS_PREFIX}${session.id}`;
    const preferences = readJSON(preferenceKey, {});
    document.getElementById("cardOrder").value = preferences.cardOrder === "shuffle" ? "shuffle" : "sequential";
    document.getElementById("reminders").checked = preferences.reminders === true;
    updateReminderMessage(preferences.reminders === true);

    profileForm.addEventListener("submit", event => {
        event.preventDefault();
        const name = document.getElementById("displayName").value.trim();
        const email = document.getElementById("emailAddress").value.trim().toLowerCase();
        const accounts = readJSON(ACCOUNTS_KEY, []);
        if (!name || !email) return;
        if (accounts.some(account => account.id !== session.id && account.email.toLowerCase() === email)) {
            setMessage("profileMessage", "That email address is already in use.", true);
            return;
        }
        const account = accounts.find(item => item.id === session.id);
        if (account) {
            account.name = name;
            account.email = email;
            try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); }
            catch (error) { setMessage("profileMessage", "Could not save your profile in browser storage.", true); return; }
        }
        session.name = name;
        session.email = email;
        try {
            if (localStorage.getItem(SESSION_KEY)) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            if (sessionStorage.getItem(SESSION_KEY)) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch (error) { console.error("Unable to update session:", error); }
        document.getElementById("topUserName").textContent = name;
        document.getElementById("topAvatar").textContent = initials(name);
        setMessage("profileMessage", "Profile saved.");
    });

    preferencesForm.addEventListener("submit", event => {
        event.preventDefault();
        const goal = Number(document.getElementById("dailyGoal").value);
        if (!Number.isInteger(goal) || goal < 1 || goal > 500) {
            setMessage("preferencesMessage", "Choose a goal between 1 and 500 cards.", true);
            return;
        }
        const current = readJSON(preferenceKey, {});
        const next = { ...current, cardOrder: document.getElementById("cardOrder").value };
        try {
            localStorage.setItem(DAILY_GOAL_KEY, String(goal));
            localStorage.setItem(preferenceKey, JSON.stringify(next));
            setMessage("preferencesMessage", "Study preferences saved.");
        } catch (error) { setMessage("preferencesMessage", "Could not save preferences in browser storage.", true); }
    });

    document.getElementById("reminders").addEventListener("change", event => {
        const current = readJSON(preferenceKey, {});
        current.reminders = event.target.checked;
        try {
            localStorage.setItem(preferenceKey, JSON.stringify(current));
            updateReminderMessage(event.target.checked);
        } catch (error) { updateReminderMessage(false, "Could not save this preference."); }
    });

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const menu = document.getElementById("menuToggle");
    const closeMenu = () => { sidebar.classList.remove("open"); overlay.classList.remove("visible"); menu.setAttribute("aria-expanded", "false"); };
    menu.addEventListener("click", () => { const open = sidebar.classList.toggle("open"); overlay.classList.toggle("visible", open); menu.setAttribute("aria-expanded", String(open)); });
    overlay.addEventListener("click", closeMenu);
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });
    document.getElementById("logoutButton").addEventListener("click", () => {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        window.location.replace("../index.html");
    });
}

function setMessage(id, message, isError = false) {
    const element = document.getElementById(id);
    element.textContent = message;
    element.classList.toggle("error", isError);
}

function updateReminderMessage(enabled, message) {
    document.getElementById("reminderMessage").textContent = message || (enabled ? "Reminder enabled for your next visit." : "Reminders are off.");
}
