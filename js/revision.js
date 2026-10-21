"use strict";

const CARDS_KEY = "flashcardCoachFlashcards";
const SESSION_KEY = "flashcardCoachSession";
const STATS_KEY = "flashcardCoachStudyStats";
const DAY = 24 * 60 * 60 * 1000;
let session;
let queue = [];
let index = 0;
let revealed = false;
let reviewed = 0;

function readJSON(key, fallback) {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch (error) { console.error(`Unable to read ${key}:`, error); return fallback; }
}

function init() {
    try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || "null"); }
    catch { session = null; }
    if (!session || !session.id || !session.email) { window.location.replace("../index.html"); return; }

    const name = session.name || "Student";
    document.getElementById("topUserName").textContent = name;
    document.getElementById("topAvatar").textContent = name.trim().split(/\s+/).slice(0, 2).map(part => part[0].toUpperCase()).join("");
    document.getElementById("todayDate").textContent = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date());

    const allCards = readJSON(CARDS_KEY, []);
    const cards = Array.isArray(allCards) ? allCards.filter(card => card && (card.question || card.title) && card.answer && (!card.userId || card.userId === session.id)) : [];
    const now = Date.now();
    const due = cards.filter(card => isDue(card, now));
    const weak = due.filter(card => Number(card.incorrectCount) > 0 && Number(card.incorrectCount) >= Number(card.correctCount || 0));
    queue = due.sort((a, b) => priority(b) - priority(a));
    document.getElementById("queueCount").textContent = `${queue.length} ${queue.length === 1 ? "card" : "cards"} ready`;
    document.getElementById("queueDescription").textContent = due.length ? `${due.length} cards are due based on your study history.` : "Your next review dates are based on your study history.";
    document.getElementById("dueCount").textContent = due.length;
    document.getElementById("weakCount").textContent = weak.length;

    if (queue.length) {
        document.getElementById("revisionPanel").hidden = false;
        renderCard();
        document.querySelectorAll("[data-rating]").forEach(button => button.addEventListener("click", () => rateCard(button.dataset.rating)));
        document.getElementById("flashcard").addEventListener("click", flipCard);
        document.addEventListener("keydown", event => {
            if (event.code === "Space" && !event.repeat && event.target.tagName !== "BUTTON") { event.preventDefault(); flipCard(); }
        });
    } else {
        document.getElementById("emptyState").hidden = false;
        if (!cards.length) {
            document.getElementById("emptyTitle").textContent = "Build your revision queue";
            document.getElementById("emptyDescription").textContent = "Create a few flashcards, then study them. Cards you struggle with and cards due for review will appear here.";
        }
    }
    setupNavigation();
    document.getElementById("logoutButton").addEventListener("click", logout);
}

function intervalFor(card) {
    const correct = Math.max(0, Number(card.correctCount) || 0);
    const incorrect = Math.max(0, Number(card.incorrectCount) || 0);
    if (incorrect > correct) return 0;
    if (correct <= 1) return 1;
    if (correct === 2) return 3;
    if (correct === 3) return 7;
    return Math.min(30, 7 * 2 ** (correct - 3));
}

function isDue(card, now) {
    if (!card.lastStudiedAt) return true;
    const studied = Date.parse(card.lastStudiedAt);
    if (!Number.isFinite(studied)) return true;
    if ((Number(card.incorrectCount) || 0) > (Number(card.correctCount) || 0)) return true;
    return now - studied >= intervalFor(card) * DAY;
}

function priority(card) {
    const incorrect = Number(card.incorrectCount) || 0;
    const correct = Number(card.correctCount) || 0;
    const age = card.lastStudiedAt ? Math.max(0, Date.now() - Date.parse(card.lastStudiedAt)) / DAY : 365;
    return (incorrect > correct ? 100 : 0) + incorrect * 4 - correct + Math.min(30, age);
}

function renderCard() {
    if (index >= queue.length) { finishQueue(); return; }
    const card = queue[index];
    revealed = false;
    const cardButton = document.getElementById("flashcard");
    cardButton.setAttribute("aria-pressed", "false");
    cardButton.setAttribute("aria-label", "Reveal answer");
    document.getElementById("subjectPill").textContent = card.subject || card.category || "General";
    document.getElementById("difficultyPill").textContent = (card.difficulty || "Medium").toUpperCase();
    document.getElementById("cardKicker").textContent = "QUESTION";
    document.getElementById("cardTitle").textContent = card.title || "";
    document.getElementById("cardText").textContent = card.question || card.title || "";
    document.getElementById("flipHint").innerHTML = '<i class="fa-solid fa-arrow-rotate-right"></i> Select card to reveal answer';
    document.getElementById("reviewPrompt").textContent = "Try to recall the answer before revealing it.";
    document.getElementById("reviewActions").hidden = true;
    document.getElementById("feedback").textContent = "";
    document.getElementById("position").textContent = `Card ${index + 1} of ${queue.length}`;
    document.getElementById("progressBar").style.width = `${(reviewed / queue.length) * 100}%`;
}

function flipCard() {
    if (revealed || index >= queue.length) return;
    revealed = true;
    const card = queue[index];
    document.getElementById("flashcard").setAttribute("aria-pressed", "true");
    document.getElementById("flashcard").setAttribute("aria-label", "Answer revealed");
    document.getElementById("cardKicker").textContent = "ANSWER";
    document.getElementById("cardText").textContent = card.answer || "";
    document.getElementById("flipHint").innerHTML = card.notes ? `<i class="fa-regular fa-note-sticky"></i> ${escapeHTML(card.notes)}` : "Answer revealed";
    document.getElementById("reviewPrompt").textContent = "How well did you remember it?";
    document.getElementById("reviewActions").hidden = false;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function rateCard(rating) {
    if (!revealed || !queue[index]) return;
    const card = queue[index];
    const allCards = readJSON(CARDS_KEY, []);
    const saved = allCards.find(item => String(item.id) === String(card.id));
    if (!saved) { document.getElementById("feedback").textContent = "This card could not be updated."; return; }
    saved.timesStudied = (Number(saved.timesStudied) || 0) + 1;
    if (rating === "known") saved.correctCount = (Number(saved.correctCount) || 0) + 1;
    else saved.incorrectCount = (Number(saved.incorrectCount) || 0) + 1;
    saved.lastStudiedAt = new Date().toISOString();
    try { localStorage.setItem(CARDS_KEY, JSON.stringify(allCards)); }
    catch (error) { document.getElementById("feedback").textContent = "Could not save your review."; return; }

    reviewed += 1;
    recordStudy(rating);
    document.getElementById("feedback").textContent = rating === "known" ? "Nice work — next review scheduled." : "Added to a future revision session.";
    index += 1;
    window.setTimeout(renderCard, 450);
}

function recordStudy(rating) {
    const stats = readJSON(STATS_KEY, []);
    if (!Array.isArray(stats)) return;
    stats.push({ userId: session.id, date: new Date().toISOString(), cardsStudied: 1, cardsReviewed: 1, knownCount: rating === "known" ? 1 : 0, learningCount: rating === "learning" ? 1 : 0, accuracy: rating === "known" ? 100 : 0 });
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); }
    catch (error) { console.error("Could not save revision stats:", error); }
}

function finishQueue() {
    document.getElementById("revisionPanel").hidden = true;
    document.getElementById("emptyState").hidden = false;
    document.getElementById("emptyTitle").textContent = "Revision session complete!";
    document.getElementById("emptyDescription").textContent = `You reviewed ${reviewed} ${reviewed === 1 ? "card" : "cards"}. Great work keeping your memory fresh.`;
    document.getElementById("progressBar").style.width = "100%";
}

function setupNavigation() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const button = document.getElementById("menuToggle");
    const close = () => { sidebar.classList.remove("open"); overlay.classList.remove("visible"); button.setAttribute("aria-expanded", "false"); };
    button.addEventListener("click", () => { const open = sidebar.classList.toggle("open"); overlay.classList.toggle("visible", open); button.setAttribute("aria-expanded", String(open)); });
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
}

function logout() { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); window.location.replace("../index.html"); }

document.addEventListener("DOMContentLoaded", async () => {
    await (window.firebaseStorageReady || Promise.resolve());
    init();
});
