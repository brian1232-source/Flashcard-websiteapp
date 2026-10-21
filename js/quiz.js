import { AZ900_AREAS, labelForTopic, questionsForTopic } from "./az900-question-bank.js";

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

function subjectOf(card) { return card.subject || card.category || "General"; }
function isAZ900() { return ["az900:", "area:", "topic:"].some(prefix => document.getElementById("subjectSelect").value.startsWith(prefix)); }
function selectedPool() {
    const selection = document.getElementById("subjectSelect").value;
    if (isAZ900()) return questionsForTopic(selection).map(item => ({ ...item, subject: item.topic }));
    const subject = selection.startsWith("flash:") ? selection.slice(6) : "all";
    const source = subject === "all" ? cards : cards.filter(card => subjectOf(card) === subject);
    const unique = new Map();
    source.forEach(card => {
        const answer = card.answer.trim().toLocaleLowerCase();
        if (!unique.has(answer)) unique.set(answer, card);
    });
    return [...unique.values()].map(card => ({ ...card, question: card.question || card.title, options: null }));
}

function populateTopics() {
    const select = document.getElementById("subjectSelect");
    select.replaceChildren();
    const all = document.createElement("option");
    all.value = "az900:all";
    all.textContent = "All AZ-900 topics";
    select.append(all);
    AZ900_AREAS.forEach((area, areaIndex) => {
        const group = document.createElement("optgroup");
        group.label = area.name;
        const areaOption = document.createElement("option");
        areaOption.value = `area:${areaIndex}`;
        areaOption.textContent = `All ${area.name}`;
        group.append(areaOption);
        area.topics.forEach((topic, topicIndex) => {
            const option = document.createElement("option");
            option.value = `topic:${areaIndex}:${topicIndex}`;
            option.textContent = topic[0];
            group.append(option);
        });
        select.append(group);
    });
    const subjects = [...new Set(cards.map(subjectOf))].sort((a, b) => a.localeCompare(b));
    if (subjects.length) {
        const group = document.createElement("optgroup");
        group.label = "My flashcards";
        subjects.forEach(subject => {
            const option = document.createElement("option");
            option.value = `flash:${subject}`;
            option.textContent = subject;
            group.append(option);
        });
        select.append(group);
    }
    const requested = new URLSearchParams(location.search).get("topic");
    if (requested && [...select.options].some(option => option.value === requested)) select.value = requested;
}

function updateQuestionCount() {
    const select = document.getElementById("questionCount");
    const previous = Number(select.value);
    const pool = selectedPool();
    const minimum = isAZ900() ? 1 : 4;
    const choices = [5, 10, 15].filter(count => count <= pool.length);
    if (pool.length >= minimum && !choices.includes(pool.length)) choices.push(pool.length);
    choices.sort((a, b) => a - b);
    select.replaceChildren();
    choices.forEach(count => {
        const option = document.createElement("option");
        option.value = String(count);
        option.textContent = `${count} ${count === 1 ? "question" : "questions"}`;
        select.append(option);
    });
    const ready = pool.length >= minimum;
    document.getElementById("startQuiz").disabled = !ready;
    document.getElementById("setupMessage").textContent = ready ? "" : (isAZ900()
        ? "No questions are available for this selection yet."
        : "This flashcard subject needs at least four different answers. Choose another subject or add flashcards.");
    if (ready) select.value = String(choices.includes(previous) ? previous : choices[0]);
}

function init() {
    try { session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || "null"); }
    catch { session = null; }
    if (!session?.id || !session?.email) { window.location.replace("../index.html"); return; }
    const name = session.name || "Student";
    document.getElementById("topUserName").textContent = name;
    document.getElementById("topAvatar").textContent = name.trim().split(/\s+/).slice(0, 2).map(part => part[0].toUpperCase()).join("");
    document.getElementById("todayDate").textContent = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date());
    const saved = readJSON(CARDS_KEY, []);
    cards = Array.isArray(saved) ? saved.filter(card => card && (card.question || card.title) && typeof card.answer === "string" && card.answer.trim() && (!card.userId || card.userId === session.id)) : [];
    populateTopics();
    updateQuestionCount();
    document.getElementById("subjectSelect").addEventListener("change", updateQuestionCount);
    document.getElementById("startQuiz").addEventListener("click", startQuiz);
    document.getElementById("nextQuestion").addEventListener("click", nextQuestion);
    document.getElementById("tryAgain").addEventListener("click", resetQuiz);
    setupNavigation();
    document.getElementById("logoutButton").addEventListener("click", logout);
    if (new URLSearchParams(location.search).get("start") === "1") startQuiz();
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
    const pool = selectedPool();
    if (!pool.length || (!isAZ900() && pool.length < 4)) {
        document.getElementById("setupMessage").textContent = "Choose a topic with available questions or add more flashcards.";
        return;
    }
    quizCards = shuffle(pool).slice(0, Math.min(Number(document.getElementById("questionCount").value) || 1, pool.length));
    questionIndex = 0;
    score = 0;
    document.getElementById("setupMessage").textContent = "";
    document.getElementById("setupPanel").hidden = true;
    document.getElementById("resultPanel").hidden = true;
    document.getElementById("questionPanel").hidden = false;
    renderQuestion();
}

function renderQuestion() {
    answered = false;
    const card = quizCards[questionIndex];
    const distractorAnswers = new Map();
    cards.forEach(item => {
        const answer = item.answer.trim();
        const key = answer.toLocaleLowerCase();
        if (key !== card.answer.toLocaleLowerCase() && !distractorAnswers.has(key)) distractorAnswers.set(key, answer);
    });
    const alternatives = shuffle([...distractorAnswers.values()]).slice(0, 3);
    const choices = card.options ? shuffle(card.options) : shuffle([card.answer.trim(), ...alternatives]);
    document.getElementById("questionPosition").textContent = `Question ${questionIndex + 1} of ${quizCards.length}`;
    document.getElementById("quizProgress").style.width = `${(questionIndex / quizCards.length) * 100}%`;
    document.getElementById("questionSubject").textContent = card.topic || subjectOf(card);
    document.getElementById("questionText").textContent = card.question;
    document.getElementById("answerFeedback").textContent = "";
    const next = document.getElementById("nextQuestion");
    next.disabled = true;
    next.innerHTML = questionIndex === quizCards.length - 1 ? 'See results <i class="fa-solid fa-arrow-right"></i>' : 'Next question <i class="fa-solid fa-arrow-right"></i>';
    const container = document.getElementById("answerOptions");
    container.replaceChildren();
    choices.forEach((answer, i) => {
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
    if (answer.toLocaleLowerCase() === correctAnswer.toLocaleLowerCase()) score += 1;
    document.querySelectorAll(".answer-option").forEach(option => {
        option.disabled = true;
        if (option.lastElementChild.textContent.toLocaleLowerCase() === correctAnswer.toLocaleLowerCase()) option.classList.add("correct");
    });
    if (answer.toLocaleLowerCase() !== correctAnswer.toLocaleLowerCase()) button.classList.add("wrong");
    const feedback = document.getElementById("answerFeedback");
    feedback.textContent = answer.toLocaleLowerCase() === correctAnswer.toLocaleLowerCase() ? "Correct — nice work!" : `Not quite. Correct answer: ${correctAnswer}`;
    feedback.style.color = answer.toLocaleLowerCase() === correctAnswer.toLocaleLowerCase() ? "#047857" : "#b91c1c";
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
    const percentage = Math.round(score / quizCards.length * 100);
    document.getElementById("scoreValue").textContent = `${percentage}%`;
    document.getElementById("scoreRing").style.setProperty("--score", `${percentage}%`);
    document.getElementById("resultTitle").textContent = percentage >= 80 ? "Excellent work!" : percentage >= 50 ? "Good progress!" : "Keep practicing!";
    document.getElementById("resultSummary").textContent = `You answered ${score} of ${quizCards.length} ${quizCards.length === 1 ? "question" : "questions"} correctly.`;
    const subject = isAZ900() ? labelForTopic(document.getElementById("subjectSelect").value) : document.getElementById("subjectSelect").value.replace(/^flash:/, "");
    const history = readJSON(QUIZ_HISTORY_KEY, []);
    if (Array.isArray(history)) {
        history.push({ userId: session.id, date: new Date().toISOString(), score, total: quizCards.length, scorePercentage: percentage, subject });
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
