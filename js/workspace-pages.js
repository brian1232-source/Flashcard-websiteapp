"use strict";

const SESSION_KEY = "flashcardCoachSession";
const FLASHCARDS_KEY = "flashcardCoachFlashcards";
const STUDY_STATS_KEY = "flashcardCoachStudyStats";
const QUIZ_HISTORY_KEY = "flashcardCoachQuizHistory";
const DAILY_GOAL_KEY = "flashcardCoachDailyGoal";

const PAGE_DETAILS = {
    quiz: {
        title: "Quick Quiz",
        eyebrow: "CHECK WHAT YOU REMEMBER",
        description: "Answer multiple-choice questions made from your own flashcards.",
        icon: "fa-circle-question"
    },
    subjects: {
        title: "Subjects",
        eyebrow: "YOUR LEARNING LIBRARY",
        description: "Explore your cards by subject and start a focused study session.",
        icon: "fa-tags"
    },
    revision: {
        title: "Smart Revision",
        eyebrow: "FOCUS ON WHAT NEEDS PRACTICE",
        description: "Review cards you have found difficult and revisit older material.",
        icon: "fa-rotate-right"
    },
    analytics: {
        title: "Analytics",
        eyebrow: "YOUR LEARNING INSIGHTS",
        description: "See your study activity and quiz results, all from this browser.",
        icon: "fa-chart-line"
    },
    progress: {
        title: "My Progress",
        eyebrow: "SMALL STEPS ADD UP",
        description: "Track your daily goal, study streak, and recent activity.",
        icon: "fa-chart-simple"
    },
    settings: {
        title: "Settings",
        eyebrow: "MAKE FLASHCARD COACH YOURS",
        description: "Manage your daily study goal and view your account details.",
        icon: "fa-gear"
    }
};

const NAV_ITEMS = [
    ["dashboard.html", "Dashboard", "fa-gauge-high", "dashboard"],
    ["flashcards.html", "My Flashcards", "fa-layer-group", "flashcards"],
    ["subjects.html", "Subjects", "fa-tags", "subjects"],
    ["create-flashcard.html", "Create Flashcards", "fa-plus", "create"],
    ["study.html", "Study Mode", "fa-book-open", "study"],
    ["quiz.html", "Quick Quiz", "fa-circle-question", "quiz"],
    ["revision.html", "Smart Revision", "fa-rotate-right", "revision"],
    ["analytics.html", "Analytics", "fa-chart-line", "analytics"],
    ["progress.html", "My Progress", "fa-chart-simple", "progress"],
    ["settings.html", "Settings", "fa-gear", "settings"]
];

const pageKey = document.body.dataset.page;
const details = PAGE_DETAILS[pageKey];
let currentUser = null;
let quizState = null;
let toastTimeout = null;

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function readJSON(key, fallback = []) {
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
        const rawSession =
            sessionStorage.getItem(SESSION_KEY) ||
            localStorage.getItem(SESSION_KEY);
        return rawSession ? JSON.parse(rawSession) : null;
    } catch (error) {
        console.error("Unable to read login session:", error);
        return null;
    }
}

function getUserId() {
    return currentUser.id || currentUser.uid || currentUser.email;
}

function getUserRecords(key) {
    const records = readJSON(key, []);
    if (!Array.isArray(records)) {
        console.error(`Saved data for ${key} is not a list.`);
        return [];
    }

    return records.filter(record =>
        record &&
        typeof record === "object" &&
        (!record.userId || record.userId === getUserId())
    );
}

function getUserCards() {
    return getUserRecords(FLASHCARDS_KEY).filter(card =>
        (card.question || card.title || card.front || card.term) &&
        (card.answer || card.back)
    );
}

function getCardSubject(card) {
    return card.subject || card.category || "General";
}

function getCardQuestion(card) {
    return card.question || card.front || card.term || card.title || "Untitled card";
}

function getCardAnswer(card) {
    return card.answer || card.back || "";
}

function getCardDate(card) {
    const date = new Date(card.lastStudiedAt || card.updatedAt || card.createdAt || 0);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Not yet studied";
    }

    return new Intl.DateTimeFormat(undefined, options).format(date);
}

function getLocalDayKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDailyGoal() {
    const goal = Number(localStorage.getItem(DAILY_GOAL_KEY));
    return Number.isInteger(goal) && goal >= 1 && goal <= 500 ? goal : 20;
}

function getTodayStudyCount(stats) {
    const today = getLocalDayKey(new Date());
    return stats.reduce((total, record) => {
        const date = record.date || record.studiedAt || record.createdAt;
        if (!date || getLocalDayKey(date) !== today) {
            return total;
        }

        const count = Number(record.cardsStudied ?? record.cardsReviewed ?? record.count ?? 0);
        return total + (Number.isFinite(count) && count > 0 ? count : 0);
    }, 0);
}

function calculateStreak(stats) {
    const days = new Set(stats
        .map(record => record.date || record.studiedAt || record.createdAt)
        .filter(Boolean)
        .map(getLocalDayKey));
    const today = new Date();

    if (!days.has(getLocalDayKey(today))) {
        today.setDate(today.getDate() - 1);
        if (!days.has(getLocalDayKey(today))) {
            return 0;
        }
    }

    let streak = 0;
    while (days.has(getLocalDayKey(today))) {
        streak++;
        today.setDate(today.getDate() - 1);
    }

    return streak;
}

function averageScore(history) {
    const scores = history.map(quiz => {
        if (quiz.scorePercentage !== undefined) {
            return Number(quiz.scorePercentage);
        }
        if (quiz.percentage !== undefined) {
            return Number(quiz.percentage);
        }
        const score = Number(quiz.score);
        const total = Number(quiz.total);
        return total > 0 ? score / total * 100 : NaN;
    }).filter(score => Number.isFinite(score) && score >= 0 && score <= 100);

    return scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : 0;
}

function showToast(message) {
    const toast = document.getElementById("workspaceToast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function renderShell() {
    const name = currentUser.name || currentUser.fullName || currentUser.email.split("@")[0];
    const initials = name.trim().split(/\s+/).slice(0, 2)
        .map(part => part.charAt(0).toUpperCase()).join("") || "S";

    document.title = `${details.title} | Flashcard Coach`;
    document.getElementById("sidebar").innerHTML = `
        <a href="dashboard.html" class="brand">
            <img src="../images/logo.png" alt="Flashcard Coach logo" class="brand-logo">
            <span class="brand-name">Flash<span>card</span></span>
        </a>
        <div class="sidebar-label">WORKSPACE</div>
        <nav class="sidebar-nav" aria-label="Main navigation">
            ${NAV_ITEMS.map(([href, label, icon, key]) => `
                <a href="${href}" class="nav-link ${key === pageKey ? "active" : ""}" ${key === pageKey ? 'aria-current="page"' : ""}>
                    <span class="nav-icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span>
                    <span>${label}</span>
                </a>
            `).join("")}
        </nav>
        <div class="sidebar-bottom">
            <div class="sidebar-tip">
                <h3>Keep learning!</h3>
                <p>Small, regular study sessions help you remember more.</p>
                <a href="study.html">Start studying →</a>
            </div>
            <button type="button" class="logout-button" id="workspaceLogout">
                <span class="nav-icon"><i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i></span>
                <span>Sign out</span>
            </button>
        </div>`;

    document.getElementById("workspaceTopbar").innerHTML = `
        <div class="topbar-left">
            <button type="button" class="menu-toggle" id="workspaceMenuToggle" aria-label="Open navigation menu" aria-expanded="false">
                <i class="fa-solid fa-bars" aria-hidden="true"></i>
            </button>
            <div class="breadcrumb">
                <span>Workspace</span><span class="breadcrumb-separator">/</span>
                <strong>${details.title}</strong>
            </div>
        </div>
        <div class="topbar-right">
            <span class="today-date">${formatDate(new Date(), { weekday: "short", month: "short", day: "numeric" })}</span>
            <a class="profile-button" href="settings.html" aria-label="Settings for ${escapeHTML(name)}">
                <span class="avatar">${escapeHTML(initials)}</span>
                <strong>${escapeHTML(name)}</strong>
            </a>
        </div>`;

    document.getElementById("workspaceMain").innerHTML = `
        <header class="workspace-header">
            <div>
                <span class="eyebrow">${details.eyebrow}</span>
                <h1>${details.title}<span style="color:var(--workspace-primary)">.</span></h1>
                <p>${details.description}</p>
            </div>
            <div class="workspace-header-actions">
                <a class="button-secondary" href="flashcards.html"><i class="fa-solid fa-layer-group" aria-hidden="true"></i> My flashcards</a>
                <a class="button-primary" href="create-flashcard.html"><i class="fa-solid fa-plus" aria-hidden="true"></i> Create card</a>
            </div>
        </header>
        <div id="workspacePageContent"></div>
        <footer class="workspace-footer">
            <span>© ${new Date().getFullYear()} Flashcard Coach. Learn smarter, every day.</span>
            <span>Your learning data stays in this browser.</span>
        </footer>`;
}

function getSubjects(cards) {
    const subjects = new Map();
    cards.forEach(card => {
        const subject = getCardSubject(card);
        subjects.set(subject, [...(subjects.get(subject) || []), card]);
    });
    return [...subjects.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function subjectURL(subject, cardId = "") {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (cardId) params.set("card", cardId);
    return `study.html?${params.toString()}`;
}

function renderSubjects(cards) {
    const subjects = getSubjects(cards);
    const html = `
        <section class="workspace-grid" aria-label="Subject statistics">
            ${[
                ["fa-layer-group", "Total cards", cards.length],
                ["fa-tags", "Subjects", subjects.length],
                ["fa-book-open", "Ready to study", cards.length]
            ].map(([icon, label, value]) => `
                <article class="metric-card">
                    <span class="metric-icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span>
                    <div><span class="metric-label">${label}</span><strong class="metric-value">${value}</strong></div>
                </article>
            `).join("")}
        </section>
        <section class="workspace-panel" style="margin-top:16px">
            <h2>Your subjects</h2>
            <p>Choose a subject to review just those cards.</p>
        </section>
        ${subjects.length ? `
            <div class="subject-grid">
                ${subjects.map(([subject, subjectCards]) => `
                    <article class="subject-card">
                        <div class="subject-card-top">
                            <h2>${escapeHTML(subject)}</h2>
                            <span class="subject-count">${subjectCards.length} card${subjectCards.length === 1 ? "" : "s"}</span>
                        </div>
                        <p>${subjectCards.filter(card => Number(card.incorrectCount) > Number(card.correctCount)).length} cards need more practice</p>
                        <div class="subject-card-actions">
                            <a class="text-link" href="${subjectURL(subject)}">Study subject →</a>
                            <a class="text-link" href="flashcards.html">View collection →</a>
                        </div>
                    </article>
                `).join("")}
            </div>
        ` : `<div class="empty-message">You don’t have any subjects yet. Add a subject while creating a flashcard, and it will appear here.</div>`}`;
    document.getElementById("workspacePageContent").innerHTML = html;
}

function renderRevision(cards) {
    const prioritized = [...cards].sort((a, b) => {
        const weaknessA = (Number(a.incorrectCount) || 0) - (Number(a.correctCount) || 0);
        const weaknessB = (Number(b.incorrectCount) || 0) - (Number(b.correctCount) || 0);
        if (weaknessA !== weaknessB) return weaknessB - weaknessA;
        return (getCardDate(a)?.getTime() || 0) - (getCardDate(b)?.getTime() || 0);
    });

    const content = prioritized.length ? `
        <section class="workspace-panel">
            <h2>Cards to revisit</h2>
            <p>Cards you have missed or have not studied recently appear first.</p>
            <div class="data-list">
                ${prioritized.map(card => `
                    <article class="data-row">
                        <div>
                            <strong>${escapeHTML(getCardQuestion(card))}</strong>
                            <p>${escapeHTML(getCardSubject(card))} · ${Number(card.incorrectCount) || 0} missed · ${escapeHTML(formatDate(getCardDate(card)))}</p>
                        </div>
                        <a class="text-link" href="${subjectURL(getCardSubject(card), String(card.id))}">Review →</a>
                    </article>
                `).join("")}
            </div>
        </section>
    ` : `<div class="empty-message">No cards to revise yet. Create a flashcard and it will show up here.</div>`;

    document.getElementById("workspacePageContent").innerHTML = content;
}

function recentDays(stats) {
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));
        const key = getLocalDayKey(date);
        const count = stats.reduce((total, record) => {
            const recordDate = record.date || record.studiedAt || record.createdAt;
            const amount = Number(record.cardsStudied ?? record.cardsReviewed ?? record.count ?? 0);
            return recordDate && getLocalDayKey(recordDate) === key && amount > 0
                ? total + amount
                : total;
        }, 0);
        return { date, count };
    });
}

function renderActivityChart(stats) {
    const days = recentDays(stats);
    const max = Math.max(1, ...days.map(day => day.count));
    return `<div class="weekly-chart">${days.map(day => `
        <div class="chart-row">
            <span>${formatDate(day.date, { weekday: "short", month: "short", day: "numeric" })}</span>
            <div class="chart-track"><div class="chart-fill" style="width:${day.count ? Math.max(3, day.count / max * 100) : 0}%"></div></div>
            <strong>${day.count}</strong>
        </div>
    `).join("")}</div>`;
}

function renderAnalytics(cards) {
    const stats = getUserRecords(STUDY_STATS_KEY);
    const quizzes = getUserRecords(QUIZ_HISTORY_KEY);
    const totalStudied = stats.reduce((sum, record) => {
        const count = Number(record.cardsStudied ?? record.cardsReviewed ?? record.count ?? 0);
        return sum + (Number.isFinite(count) && count > 0 ? count : 0);
    }, 0);
    const averageAccuracy = stats.length
        ? Math.round(stats.reduce((sum, record) => sum + (Number(record.accuracy) || 0), 0) / stats.length)
        : 0;

    document.getElementById("workspacePageContent").innerHTML = `
        <section class="workspace-grid">
            ${[
                ["fa-layer-group", "Cards in library", cards.length],
                ["fa-repeat", "Cards studied", totalStudied],
                ["fa-circle-check", "Average study accuracy", `${averageAccuracy}%`],
                ["fa-circle-question", "Quizzes completed", quizzes.length],
                ["fa-chart-line", "Average quiz score", `${averageScore(quizzes)}%`],
                ["fa-fire", "Current study streak", `${calculateStreak(stats)} days`]
            ].map(([icon, label, value]) => `
                <article class="metric-card">
                    <span class="metric-icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span>
                    <div><span class="metric-label">${label}</span><strong class="metric-value">${value}</strong></div>
                </article>
            `).join("")}
        </section>
        <section class="workspace-panel" style="margin-top:16px">
            <h2>Cards studied this week</h2>
            <p>Your last seven days of recorded study sessions.</p>
            ${renderActivityChart(stats)}
        </section>`;
}

function renderProgress(cards) {
    const stats = getUserRecords(STUDY_STATS_KEY);
    const goal = getDailyGoal();
    const todayCount = getTodayStudyCount(stats);
    const percent = Math.min(100, Math.round(todayCount / goal * 100));

    document.getElementById("workspacePageContent").innerHTML = `
        <section class="workspace-grid">
            <article class="metric-card"><span class="metric-icon"><i class="fa-solid fa-fire" aria-hidden="true"></i></span><div><span class="metric-label">Study streak</span><strong class="metric-value">${calculateStreak(stats)} days</strong></div></article>
            <article class="metric-card"><span class="metric-icon"><i class="fa-solid fa-book-open" aria-hidden="true"></i></span><div><span class="metric-label">Cards studied today</span><strong class="metric-value">${todayCount}</strong></div></article>
            <article class="metric-card"><span class="metric-icon"><i class="fa-solid fa-bullseye" aria-hidden="true"></i></span><div><span class="metric-label">Daily goal</span><strong class="metric-value">${goal} cards</strong></div></article>
        </section>
        <section class="workspace-panel" style="margin-top:16px">
            <h2>${percent >= 100 ? "Daily goal complete!" : "Your daily goal"}</h2>
            <p>${todayCount} of ${goal} cards studied today · ${Math.max(0, goal - todayCount)} remaining</p>
            <div class="goal-track" style="margin-top:14px" role="progressbar" aria-label="Daily goal progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
                <div class="goal-fill" style="width:${percent}%"></div>
            </div>
            <p style="margin-top:12px"><a class="text-link" href="settings.html">Change daily goal →</a></p>
        </section>
        <section class="workspace-panel">
            <h2>Weekly activity</h2>
            <p>Number of flashcards reviewed each day.</p>
            ${renderActivityChart(stats)}
        </section>
        ${cards.length ? "" : `<div class="empty-message">Create your first flashcard to start tracking your progress.</div>`}`;
}

function renderSettings() {
    const name = currentUser.name || currentUser.fullName || currentUser.email.split("@")[0];
    document.getElementById("workspacePageContent").innerHTML = `
        <section class="setting-card">
            <h2>Study goal</h2>
            <p>Choose how many cards you want to review each day. Your dashboard progress will use this goal.</p>
            <form class="workspace-form" id="goalForm">
                <label for="dailyGoalInput">Cards per day
                    <input type="number" id="dailyGoalInput" name="goal" min="1" max="500" step="1" value="${getDailyGoal()}" required>
                </label>
                <button class="button-primary" type="submit">Save study goal</button>
            </form>
        </section>
        <section class="setting-card" style="margin-top:16px">
            <h2>Account</h2>
            <p>Your demo account is stored in this browser.</p>
            <div class="data-list">
                <div class="data-row"><div><strong>Name</strong></div><span class="data-row-value">${escapeHTML(name)}</span></div>
                <div class="data-row"><div><strong>Email</strong></div><span class="data-row-value">${escapeHTML(currentUser.email)}</span></div>
            </div>
        </section>`;

    document.getElementById("goalForm").addEventListener("submit", event => {
        event.preventDefault();
        const input = document.getElementById("dailyGoalInput");
        const goal = Number(input.value);
        if (!Number.isInteger(goal) || goal < 1 || goal > 500) {
            input.setCustomValidity("Enter a whole number between 1 and 500.");
            input.reportValidity();
            return;
        }

        input.setCustomValidity("");
        try {
            localStorage.setItem(DAILY_GOAL_KEY, String(goal));
            showToast("Daily study goal saved.");
        } catch (error) {
            console.error("Unable to save daily study goal:", error);
            showToast("Could not save your goal. Check browser storage.");
        }
    });
}

function renderQuizSetup(cards) {
    const subjects = getSubjects(cards);
    const quizzes = getUserRecords(QUIZ_HISTORY_KEY);

    document.getElementById("workspacePageContent").innerHTML = `
        <section class="workspace-grid">
            <article class="metric-card"><span class="metric-icon"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></span><div><span class="metric-label">Available cards</span><strong class="metric-value">${cards.length}</strong></div></article>
            <article class="metric-card"><span class="metric-icon"><i class="fa-solid fa-circle-question" aria-hidden="true"></i></span><div><span class="metric-label">Quizzes completed</span><strong class="metric-value">${quizzes.length}</strong></div></article>
            <article class="metric-card"><span class="metric-icon"><i class="fa-solid fa-chart-line" aria-hidden="true"></i></span><div><span class="metric-label">Average score</span><strong class="metric-value">${averageScore(quizzes)}%</strong></div></article>
        </section>
        <section class="workspace-panel" style="margin-top:16px" id="quizSetupPanel">
            <h2>Set up a quick quiz</h2>
            <p>Each question is based on one of your saved flashcards.</p>
            ${cards.length < 2 ? `<div class="empty-message" style="margin-top:14px">Add at least two flashcards with different answers to make a quiz.</div>` : `
                <form class="workspace-form" id="quizSetupForm">
                    <label for="quizSubject">Subject
                        <select id="quizSubject">
                            <option value="all">All subjects</option>
                            ${subjects.map(([subject]) => `<option value="${escapeHTML(subject)}">${escapeHTML(subject)}</option>`).join("")}
                        </select>
                    </label>
                    <label for="quizCount">Number of questions
                        <select id="quizCount">
                            <option value="5">5 questions</option>
                            <option value="10" selected>10 questions</option>
                            <option value="20">20 questions</option>
                        </select>
                    </label>
                    <button class="button-primary" type="submit"><i class="fa-solid fa-play" aria-hidden="true"></i> Start quiz</button>
                </form>
            `}
        </section>
        <section id="quizStage" hidden></section>`;

    const form = document.getElementById("quizSetupForm");
    if (form) {
        form.addEventListener("submit", event => {
            event.preventDefault();
            startQuiz(cards);
        });
    }
}

function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
        const target = Math.floor(Math.random() * (index + 1));
        [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
}

function startQuiz(cards) {
    const subject = document.getElementById("quizSubject").value;
    const requestedCount = Number(document.getElementById("quizCount").value);
    const pool = cards.filter(card =>
        subject === "all" || getCardSubject(card) === subject
    );
    const distinctAnswers = new Set(pool.map(card => getCardAnswer(card).trim().toLocaleLowerCase()));

    if (distinctAnswers.size < 2) {
        showToast("Choose a subject with at least two different flashcard answers.");
        return;
    }

    quizState = {
        cards: shuffle(pool).slice(0, requestedCount),
        pool,
        subject,
        current: 0,
        score: 0,
        answered: false
    };
    renderQuizQuestion();
}

function renderQuizQuestion() {
    const stage = document.getElementById("quizStage");
    const setup = document.getElementById("quizSetupPanel");

    if (quizState.current >= quizState.cards.length) {
        finishQuiz();
        return;
    }

    const card = quizState.cards[quizState.current];
    const correct = getCardAnswer(card);
    const options = new Map([[correct.trim().toLocaleLowerCase(), correct]]);

    shuffle(quizState.pool).forEach(candidate => {
        const answer = getCardAnswer(candidate);
        const key = answer.trim().toLocaleLowerCase();
        if (key && key !== correct.trim().toLocaleLowerCase() && options.size < 4) {
            options.set(key, answer);
        }
    });

    const answers = shuffle([...options.values()]);
    quizState.correctAnswer = correct;
    quizState.answered = false;
    setup.hidden = true;
    stage.hidden = false;
    stage.innerHTML = `
        <section class="workspace-panel">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
                <span class="eyebrow">${escapeHTML(quizState.subject === "all" ? "ALL SUBJECTS" : quizState.subject)}</span>
                <span class="metric-label">Question ${quizState.current + 1} of ${quizState.cards.length}</span>
            </div>
            <div class="quiz-progress-track" style="margin-top:13px" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="${quizState.cards.length}" aria-valuenow="${quizState.current}">
                <div class="quiz-progress-fill" style="width:${quizState.current / quizState.cards.length * 100}%"></div>
            </div>
            <h2 style="margin-top:22px">${escapeHTML(getCardQuestion(card))}</h2>
            <div class="quiz-options" role="group" aria-label="Answer choices">
                ${answers.map((answer, index) => `
                    <button type="button" class="quiz-option" data-answer-index="${index}">
                        <span class="subject-count">${String.fromCharCode(65 + index)}</span>
                        <span>${escapeHTML(answer)}</span>
                    </button>
                `).join("")}
            </div>
            <p class="quiz-feedback" id="quizFeedback" aria-live="polite"></p>
            <button type="button" class="button-primary" id="quizNext" disabled>
                ${quizState.current + 1 === quizState.cards.length ? "See results" : "Next question"} →
            </button>
        </section>`;

    stage.querySelectorAll(".quiz-option").forEach((button, index) => {
        button.addEventListener("click", () => answerQuizQuestion(button, answers, index));
    });
    document.getElementById("quizNext").addEventListener("click", () => {
        quizState.current++;
        renderQuizQuestion();
    });
}

function answerQuizQuestion(selectedButton, answers, selectedIndex) {
    if (!quizState || quizState.answered) return;
    quizState.answered = true;
    const isCorrect = answers[selectedIndex].trim().toLocaleLowerCase() ===
        quizState.correctAnswer.trim().toLocaleLowerCase();
    const buttons = [...document.querySelectorAll(".quiz-option")];

    buttons.forEach((button, index) => {
        button.disabled = true;
        if (answers[index].trim().toLocaleLowerCase() === quizState.correctAnswer.trim().toLocaleLowerCase()) {
            button.classList.add("correct");
        }
    });

    if (isCorrect) {
        quizState.score++;
        selectedButton.classList.add("correct");
        document.getElementById("quizFeedback").textContent = "Correct! Nice work.";
        document.getElementById("quizFeedback").style.color = "#047857";
    } else {
        selectedButton.classList.add("incorrect");
        document.getElementById("quizFeedback").textContent = `Not quite. The answer is: ${quizState.correctAnswer}`;
        document.getElementById("quizFeedback").style.color = "#b42318";
    }

    document.getElementById("quizNext").disabled = false;
}

function finishQuiz() {
    const percentage = Math.round(quizState.score / quizState.cards.length * 100);
    const record = {
        userId: getUserId(),
        date: new Date().toISOString(),
        subject: quizState.subject,
        score: quizState.score,
        total: quizState.cards.length,
        scorePercentage: percentage
    };

    const allResults = readJSON(QUIZ_HISTORY_KEY, []);
    if (!Array.isArray(allResults)) {
        showToast("Quiz finished, but saved quiz history is invalid.");
        return;
    }

    try {
        allResults.push(record);
        localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(allResults));
    } catch (error) {
        console.error("Unable to save quiz results:", error);
        showToast("Quiz finished, but your results could not be saved.");
    }

    const stage = document.getElementById("quizStage");
    stage.innerHTML = `
        <section class="workspace-panel" style="text-align:center;padding:38px 22px">
            <span class="metric-icon" style="margin:0 auto 14px"><i class="fa-solid ${percentage >= 70 ? "fa-trophy" : "fa-book-open"}" aria-hidden="true"></i></span>
            <span class="eyebrow">QUIZ COMPLETE</span>
            <h2 style="margin-top:9px;font-size:28px">${percentage}%</h2>
            <p style="color:var(--workspace-muted)">You got ${quizState.score} out of ${quizState.cards.length} questions right.</p>
            <button type="button" class="button-primary" id="quizAgain" style="margin-top:18px">Take another quiz</button>
        </section>`;
    document.getElementById("quizAgain").addEventListener("click", () => {
        quizState = null;
        renderQuizSetup(getUserCards());
    });
}

function setupNavigation() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const toggle = document.getElementById("workspaceMenuToggle");

    const closeMenu = () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("visible");
        toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
        const open = !sidebar.classList.contains("open");
        sidebar.classList.toggle("open", open);
        overlay.classList.toggle("visible", open);
        toggle.setAttribute("aria-expanded", String(open));
    });
    overlay.addEventListener("click", closeMenu);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMenu();
    });
    window.addEventListener("resize", () => {
        if (window.innerWidth > 850) closeMenu();
    });
    document.getElementById("workspaceLogout").addEventListener("click", () => {
        try {
            localStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_KEY);
            window.location.replace("../index.html");
        } catch (error) {
            console.error("Unable to sign out:", error);
            showToast("Could not sign out. Check browser storage.");
        }
    });
}

function initializeWorkspacePage() {
    currentUser = getSession();
    if (!currentUser || !currentUser.email || !(currentUser.id || currentUser.uid)) {
        window.location.replace("../index.html");
        return;
    }

    if (!details) {
        console.error(`Unknown workspace page: ${pageKey}`);
        window.location.replace("dashboard.html");
        return;
    }

    renderShell();
    setupNavigation();

    const cards = getUserCards();
    switch (pageKey) {
        case "quiz":
            renderQuizSetup(cards);
            break;
        case "subjects":
            renderSubjects(cards);
            break;
        case "revision":
            renderRevision(cards);
            break;
        case "analytics":
            renderAnalytics(cards);
            break;
        case "progress":
            renderProgress(cards);
            break;
        case "settings":
            renderSettings();
            break;
    }
}

document.addEventListener("DOMContentLoaded", initializeWorkspacePage);
