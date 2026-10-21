"use strict";

const CARDS_KEY = "flashcardCoachFlashcards";
const SESSION_KEY = "flashcardCoachSession";
const QUIZ_HISTORY_KEY = "flashcardCoachQuizHistory";
let session;
let cards = [];
let quizCards = [];
let questionIndex = 0;
let score = 0;
let answered = false;

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
    const saved = readJSON(CARDS_KEY, []);
    cards = Array.isArray(saved) ? saved.filter(card => card && (card.question || card.title) && typeof card.answer === "string" && card.answer.trim() && (!card.userId || card.userId === session.id)) : [];
    const subjects = [...new Set(cards.map(card => card.subject || card.category || "General"))].sort((a, b) => a.localeCompare(b));
    const select = document.getElementById("subjectSelect");
    subjects.forEach(subject => { const option = document.createElement("option"); option.value = subject; option.textContent = subject; select.append(option); });
    const uniqueAnswers = new Set(cards.map(card => card.answer.trim().toLowerCase()));
    if (cards.length < 4 || uniqueAnswers.size < 4) {
        document.getElementById("setupPanel").hidden = true;
        document.getElementById("emptyState").hidden = false;
    } else {
        document.getElementById("startQuiz").addEventListener("click", startQuiz);
    }
    document.getElementById("nextQuestion").addEventListener("click", nextQuestion);
    document.getElementById("tryAgain").addEventListener("click", resetQuiz);
    setupNavigation();
    document.getElementById("logoutButton").addEventListener("click", logout);
}

function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function startQuiz() {
    const subject = document.getElementById("subjectSelect").value;
    const filtered = subject === "all" ? cards : cards.filter(card => (card.subject || card.category || "General") === subject);
    const unique = new Map();
    filtered.forEach(card => { const key = card.answer.trim().toLowerCase(); if (!unique.has(key)) unique.set(key, card); });
    const available = [...unique.values()];
    const message = document.getElementById("setupMessage");
    if (available.length < 4) {
        message.textContent = "Choose another subject or add flashcards with at least four different answers.";
        return;
    }
    const requested = Number(document.getElementById("questionCount").value);
    quizCards = shuffle(available).slice(0, Math.min(requested, available.length));
    questionIndex = 0;
    score = 0;
    message.textContent = "";
    document.getElementById("setupPanel").hidden = true;
    document.getElementById("resultPanel").hidden = true;
    document.getElementById("questionPanel").hidden = false;
    renderQuestion();
}

function renderQuestion() {
    answered = false;
    const card = quizCards[questionIndex];
    const alternatives = shuffle(cards.filter(item => item !== card && item.answer.trim().toLowerCase() !== card.answer.trim().toLowerCase())).slice(0, 3).map(item => item.answer.trim());
    const options = shuffle([card.answer.trim(), ...alternatives]);
    document.getElementById("questionPosition").textContent = `Question ${questionIndex + 1} of ${quizCards.length}`;
    document.getElementById("quizProgress").style.width = `${(questionIndex / quizCards.length) * 100}%`;
    document.getElementById("questionSubject").textContent = card.subject || card.category || "General";
    document.getElementById("questionText").textContent = card.question || card.title;
    document.getElementById("answerFeedback").textContent = "";
    const next = document.getElementById("nextQuestion");
    next.disabled = true;
    next.innerHTML = questionIndex === quizCards.length - 1 ? 'See results <i class="fa-solid fa-arrow-right"></i>' : 'Next question <i class="fa-solid fa-arrow-right"></i>';
    const container = document.getElementById("answerOptions");
    container.replaceChildren();
    options.forEach((answer, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-option";
        const letter = document.createElement("span");
        letter.className = "option-letter";
        letter.textContent = String.fromCharCode(65 + i);
        const text = document.createElement("span");
        text.textContent = answer;
        button.append(letter, text);
        button.addEventListener("click", () => chooseAnswer(button, answer, card.answer.trim()));
        container.append(button);
    });
}

function chooseAnswer(button, answer, correctAnswer) {
    if (answered) return;
    answered = true;
    const correct = answer.toLowerCase() === correctAnswer.toLowerCase();
    if (correct) score += 1;
    document.querySelectorAll(".answer-option").forEach(option => {
        option.disabled = true;
        const optionAnswer = option.lastElementChild.textContent;
        if (optionAnswer.toLowerCase() === correctAnswer.toLowerCase()) option.classList.add("correct");
    });
    if (!correct) button.classList.add("wrong");
    const feedback = document.getElementById("answerFeedback");
    feedback.textContent = correct ? "Correct — nice work!" : `Not quite. Correct answer: ${correctAnswer}`;
    feedback.style.color = correct ? "#047857" : "#b91c1c";
    document.getElementById("nextQuestion").disabled = false;
}

function nextQuestion() {
    if (!answered) return;
    questionIndex += 1;
    if (questionIndex < quizCards.length) renderQuestion();
    else showResults();
}

function showResults() {
    document.getElementById("questionPanel").hidden = true;
    document.getElementById("resultPanel").hidden = false;
    const percentage = Math.round((score / quizCards.length) * 100);
    document.getElementById("scoreValue").textContent = `${percentage}%`;
    document.getElementById("scoreRing").style.setProperty("--score", `${percentage}%`);
    document.getElementById("resultTitle").textContent = percentage >= 80 ? "Excellent work!" : percentage >= 50 ? "Good progress!" : "Keep practicing!";
    document.getElementById("resultSummary").textContent = `You answered ${score} of ${quizCards.length} ${quizCards.length === 1 ? "question" : "questions"} correctly.`;
    const history = readJSON(QUIZ_HISTORY_KEY, []);
    if (Array.isArray(history)) {
        history.push({ userId: session.id, date: new Date().toISOString(), score, total: quizCards.length, scorePercentage: percentage, subject: document.getElementById("subjectSelect").value });
        try { localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(history)); }
        catch (error) { console.error("Unable to save quiz result:", error); }
    }
    document.getElementById("quizProgress").style.width = "100%";
}

function resetQuiz() {
    document.getElementById("resultPanel").hidden = true;
    document.getElementById("setupPanel").hidden = false;
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
