import { auth, signOut } from "./firebase.js";
import { AZ900_AREAS, labelForTopic, questionsForTopic } from "./az900-question-bank.js";

"use strict";

const SESSION_KEY = "flashcardCoachSession";
const CARDS_KEY = "flashcardCoachFlashcards";
const HISTORY_KEY = "flashcardCoachQuizHistory";
let session = null;
let cards = [];
let questions = [];
let optionSets = [];
let answers = [];
let marked = new Set();
let index = 0;
let endTime = 0;
let startedAt = 0;
let timerId = null;
let finished = false;

const $ = id => document.getElementById(id);

function readJSON(key, fallback) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        return parsed ?? fallback;
    } catch (error) {
        console.error(`Could not read ${key}.`, error);
        showNotice("Some saved data could not be read. Check your browser storage and refresh this page.");
        return fallback;
    }
}

function showNotice(message) {
    const notice = $("examNotice");
    notice.textContent = message;
    notice.hidden = false;
}

function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
}

function subjectOf(card) { return card.subject || card.category || "General"; }

function validCards() {
    const saved = readJSON(CARDS_KEY, []);
    if (!Array.isArray(saved)) return [];
    return saved.filter(card => card && typeof card === "object" && (card.question || card.title) && typeof card.answer === "string" && card.answer.trim() && (!card.userId || card.userId === session.id));
}

function uniqueAnswerPool(source) {
    const pool = new Map();
    source.forEach(card => {
        const answer = card.answer.trim();
        const key = answer.toLocaleLowerCase();
        if (!pool.has(key)) pool.set(key, { card, answer });
    });
    return [...pool.values()];
}

function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function selectedPool() {
    const subject = $("subjectSelect").value;
    if (subject.startsWith("az900:") || subject.startsWith("area:") || subject.startsWith("topic:")) {
        return questionsForTopic(subject).map(question => ({
            card: { question: question.question, answer: question.answer, subject: question.topic },
            answer: question.answer,
            options: question.options
        }));
    }
    const flashcardSubject = subject.startsWith("flash:") ? subject.slice(6) : "all";
    const subjectCards = flashcardSubject === "all" ? cards : cards.filter(card => subjectOf(card) === flashcardSubject);
    return uniqueAnswerPool(subjectCards);
}

function isAZ900Selection() {
    const value = $("subjectSelect").value;
    return value.startsWith("az900:") || value.startsWith("area:") || value.startsWith("topic:");
}

function updateQuestionOptions() {
    const pool = selectedPool();
    const preview = $("topicPreview");
    preview.hidden = !pool.length;
    $("topicPreviewQuestion").textContent = pool.length ? (pool[0].card.question || pool[0].card.title) : "";
    const select = $("questionCount");
    const previous = Number(select.value);
    const available = pool.length;
    const minimum = isAZ900Selection() ? 1 : 4;
    const choices = [5, 10, 15, 20].filter(value => value <= available);
    if (available >= minimum && !choices.includes(available) && available < 20) choices.push(available);
    choices.sort((a, b) => a - b);
    select.replaceChildren();
    choices.forEach(count => {
        const option = document.createElement("option");
        option.value = String(count);
        option.textContent = `${count} questions`;
        select.append(option);
    });
    const ready = available >= minimum;
    $("startExam").disabled = !ready;
    if (!ready) {
        $("setupMessage").textContent = isAZ900Selection()
            ? "There are no practice questions in this selection yet. Choose another topic."
            : "This flashcard topic needs at least four different answers. Choose another topic or add more flashcards.";
        return;
    }
    $("setupMessage").textContent = "";
    const keep = choices.includes(previous) ? previous : choices[0];
    select.value = String(keep);
}

function configurePage() {
    session = readSession();
    if (!session?.id || !session?.email) {
        window.location.replace("../index.html");
        return false;
    }
    const name = session.name || session.displayName || session.email.split("@")[0] || "Student";
    $("topUserName").textContent = name;
    $("topAvatar").textContent = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "S";
    $("todayDate").textContent = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date());
    cards = validCards();
    const select = $("subjectSelect");
    select.replaceChildren();
    const allOption = document.createElement("option");
    allOption.value = "az900:all";
    allOption.textContent = "All AZ-900 topics";
    select.append(allOption);
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
    if (cards.length) {
        const group = document.createElement("optgroup");
        group.label = "My flashcards";
        [...new Set(cards.map(subjectOf))].sort((a, b) => a.localeCompare(b)).forEach(subject => {
            const option = document.createElement("option");
            option.value = `flash:${subject}`;
            option.textContent = subject;
            group.append(option);
        });
        select.append(group);
    }
    const requestedTopic = new URLSearchParams(location.search).get("topic");
    if (requestedTopic && [...select.options].some(option => option.value === requestedTopic)) select.value = requestedTopic;
    updateQuestionOptions();
    select.addEventListener("change", updateQuestionOptions);
    $("startExam").addEventListener("click", startExam);
    $("nextQuestion").addEventListener("click", nextQuestion);
    $("previousQuestion").addEventListener("click", () => moveTo(index - 1));
    $("markQuestion").addEventListener("click", toggleMark);
    $("submitExam").addEventListener("click", () => finishExam(false));
    $("tryAgain").addEventListener("click", resetExam);
    setupNavigation();
    $("logoutButton").addEventListener("click", logout);
    return true;
}

function startExam() {
    const pool = selectedPool();
    if (!pool.length || (!isAZ900Selection() && pool.length < 4)) {
        $("setupMessage").textContent = "Choose a topic with enough questions or add more flashcards.";
        return;
    }
    const requested = Number($("questionCount").value) || Math.min(5, pool.length);
    questions = shuffle(pool).slice(0, Math.min(requested, pool.length));
    optionSets = questions.map(item => {
        if (item.options) return shuffle(item.options);
        const correctKey = item.answer.toLocaleLowerCase();
        const sourceCards = cards.filter(card => subjectOf(card) === subjectOf(item.card));
        let distractors = shuffle(uniqueAnswerPool(sourceCards).filter(entry => entry.answer.toLocaleLowerCase() !== correctKey)).slice(0, 3).map(entry => entry.answer);
        if (distractors.length < 3) distractors = shuffle(uniqueAnswerPool(cards).filter(entry => entry.answer.toLocaleLowerCase() !== correctKey)).slice(0, 3).map(entry => entry.answer);
        return shuffle([item.answer, ...distractors]);
    });
    answers = Array(questions.length).fill(null);
    marked = new Set();
    index = 0;
    finished = false;
    startedAt = Date.now();
    endTime = startedAt + Number($("durationSelect").value) * 60 * 1000;
    $("setupPanel").hidden = true;
    $("resultPanel").hidden = true;
    $("examPanel").hidden = false;
    $("examNotice").hidden = true;
    renderQuestionMap();
    renderQuestion();
    updateTimer();
    timerId = window.setInterval(updateTimer, 1000);
}

function renderQuestionMap() {
    const map = $("questionMap");
    map.replaceChildren();
    questions.forEach((_, questionIndex) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "question-number";
        button.textContent = String(questionIndex + 1);
        button.setAttribute("aria-label", `Go to question ${questionIndex + 1}`);
        button.addEventListener("click", () => moveTo(questionIndex));
        map.append(button);
    });
    refreshQuestionMap();
}

function refreshQuestionMap() {
    [...$("questionMap").children].forEach((button, questionIndex) => {
        button.classList.toggle("current", questionIndex === index);
        button.classList.toggle("answered", answers[questionIndex] !== null);
        button.classList.toggle("marked", marked.has(questionIndex));
        if (questionIndex === index) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
    });
    const count = answers.filter(answer => answer !== null).length;
    $("answeredCount").textContent = `${count} of ${questions.length} answered`;
    $("examProgress").style.width = `${((index + 1) / questions.length) * 100}%`;
}

function renderQuestion() {
    const item = questions[index];
    const card = item.card;
    $("questionPosition").textContent = `Question ${index + 1} of ${questions.length}`;
    $("questionSubject").textContent = subjectOf(card);
    $("questionText").textContent = card.question || card.title;
    $("selectionHint").textContent = answers[index] === null ? "Select one answer. You can change it before submitting." : "Answer saved. You can still change it before submitting.";
    $("previousQuestion").disabled = index === 0;
    $("nextQuestion").innerHTML = index === questions.length - 1 ? 'Submit exam <i class="fa-solid fa-arrow-right"></i>' : 'Next <i class="fa-solid fa-arrow-right"></i>';
    $("markQuestion").setAttribute("aria-pressed", String(marked.has(index)));
    $("markQuestion").innerHTML = marked.has(index) ? '<i class="fa-solid fa-flag"></i> Marked for review' : '<i class="fa-regular fa-flag"></i> Mark for review';

    const options = optionSets[index];
    const container = $("answerOptions");
    container.replaceChildren();
    options.forEach((answer, optionIndex) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `answer-option${answers[index] === answer ? " selected" : ""}`;
        button.setAttribute("aria-pressed", String(answers[index] === answer));
        const letter = document.createElement("span");
        letter.className = "option-letter";
        letter.textContent = String.fromCharCode(65 + optionIndex);
        const text = document.createElement("span");
        text.textContent = answer;
        button.append(letter, text);
        button.addEventListener("click", () => chooseAnswer(answer));
        container.append(button);
    });
    refreshQuestionMap();
}

function chooseAnswer(answer) {
    answers[index] = answer;
    renderQuestion();
}

function moveTo(nextIndex) {
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    index = nextIndex;
    renderQuestion();
}

function nextQuestion() {
    if (index < questions.length - 1) moveTo(index + 1);
    else {
        const unanswered = answers.filter(answer => answer === null).length;
        if (unanswered) {
            const firstUnanswered = answers.indexOf(null);
            moveTo(firstUnanswered);
            $("selectionHint").textContent = `${unanswered} question${unanswered === 1 ? " is" : "s are"} unanswered. Review or answer them before submitting.`;
        } else finishExam(false);
    }
}

function toggleMark() {
    if (marked.has(index)) marked.delete(index);
    else marked.add(index);
    renderQuestion();
}

function updateTimer() {
    if (finished) return;
    const seconds = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    const minutesText = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secondsText = String(seconds % 60).padStart(2, "0");
    $("timeRemaining").textContent = `${minutesText}:${secondsText}`;
    $("examTimer").classList.toggle("warning", seconds > 0 && seconds <= 60);
    if (seconds === 0) {
        $("examTimer").classList.add("expired");
        finishExam(true);
    }
}

function finishExam(timeExpired) {
    if (finished) return;
    const unanswered = answers.filter(answer => answer === null).length;
    if (!timeExpired && unanswered && !window.confirm(`Submit with ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}?`)) return;
    finished = true;
    window.clearInterval(timerId);
    const correct = questions.reduce((sum, item, i) => sum + (answers[i]?.toLocaleLowerCase() === item.answer.toLocaleLowerCase() ? 1 : 0), 0);
    const scorePercentage = Math.round(correct / questions.length * 100);
    const elapsedSeconds = Math.max(0, Math.min(Number($("durationSelect").value) * 60, Math.floor((Date.now() - startedAt) / 1000)));
    saveResult({ correct, unanswered, scorePercentage, elapsedSeconds, timeExpired });
    showResults(correct, unanswered, scorePercentage, elapsedSeconds, timeExpired);
}

function saveResult(result) {
    const history = readJSON(HISTORY_KEY, []);
    if (!Array.isArray(history)) {
        $("saveMessage").textContent = "The result could not be saved because your quiz history is invalid.";
        return;
    }
    const selected = $("subjectSelect").value;
    const subject = selected.startsWith("az900:") || selected.startsWith("area:") || selected.startsWith("topic:")
        ? labelForTopic(selected)
        : (selected.startsWith("flash:") ? selected.slice(6) : "All topics");
    history.push({
        userId: session.id,
        date: new Date().toISOString(),
        score: result.correct,
        total: questions.length,
        scorePercentage: result.scorePercentage,
        subject
    });
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        $("saveMessage").textContent = "Result saved to your quiz history.";
    } catch (error) {
        console.error("Could not save the mock exam result.", error);
        $("saveMessage").textContent = "Your result is shown below, but it could not be saved. Check your browser storage.";
    }
}

function showResults(correct, unanswered, percentage, elapsedSeconds, timeExpired) {
    $("examPanel").hidden = true;
    $("resultPanel").hidden = false;
    $("resultTitle").textContent = timeExpired ? "Time is up" : percentage >= 80 ? "Excellent work!" : percentage >= 50 ? "Good effort — keep practising." : "Keep practising";
    $("resultSummary").textContent = `You answered ${correct} of ${questions.length} questions correctly.`;
    $("scoreValue").textContent = `${percentage}%`;
    $("scoreRing").style.setProperty("--score", `${percentage}%`);
    $("correctCount").textContent = String(correct);
    $("unansweredCount").textContent = String(unanswered);
    $("timeUsed").textContent = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;
    renderReview();
}

function renderReview() {
    const container = $("resultReview");
    container.replaceChildren();
    questions.forEach((item, i) => {
        const selected = answers[i];
        const correct = selected?.toLocaleLowerCase() === item.answer.toLocaleLowerCase();
        const row = document.createElement("article");
        row.className = `review-answer ${correct ? "correct" : "incorrect"}`;
        const question = document.createElement("h3");
        question.textContent = `${i + 1}. ${item.card.question || item.card.title}`;
        const chosen = document.createElement("p");
        chosen.textContent = `Your answer: ${selected || "Not answered"}`;
        const expected = document.createElement("p");
        expected.textContent = `Correct answer: ${item.answer}`;
        row.append(question, chosen, expected);
        container.append(row);
    });
}

function resetExam() {
    window.clearInterval(timerId);
    finished = false;
    $("resultPanel").hidden = true;
    $("examPanel").hidden = true;
    $("setupPanel").hidden = false;
    $("setupMessage").textContent = "";
    $("examNotice").hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupNavigation() {
    const sidebar = $("sidebar");
    const overlay = $("sidebarOverlay");
    const button = $("menuToggle");
    const close = () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("visible");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Open navigation menu");
    };
    button.addEventListener("click", () => {
        const open = sidebar.classList.toggle("open");
        overlay.classList.toggle("visible", open);
        button.setAttribute("aria-expanded", String(open));
        button.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    });
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
}

async function logout() {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    try {
        await signOut(auth);
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        window.location.replace("../index.html");
    } catch (error) {
        console.error("Could not sign out.", error);
        showNotice("Could not sign out right now. Please try again.");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await (window.firebaseStorageReady || Promise.resolve());
    if (configurePage()) {
        const sync = await Promise.resolve(window.firebaseStorageReady).catch(() => null);
        if (sync?.synced === false) showNotice("Could not sync with the online data store. Using data saved on this device.");
    }
});
