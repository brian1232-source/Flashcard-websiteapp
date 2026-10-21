import { auth, signOut } from "./firebase.js";

"use strict";

const SESSION_KEY = "flashcardCoachSession";
const FLASHCARDS_KEY = "flashcardCoachFlashcards";
const STUDY_STATS_KEY = "flashcardCoachStudyStats";
const QUIZ_HISTORY_KEY = "flashcardCoachQuizHistory";
const DAILY_GOAL_KEY = "flashcardCoachDailyGoal";
const DAY = 24 * 60 * 60 * 1000;

const TOPICS = [
    {
        title: "Cloud Concepts",
        description: "Learn cloud computing, cloud models, benefits, and IaaS, PaaS, and SaaS.",
        icon: "fa-cloud",
        matches: /cloud|iaas|paas|saas|benefit/i
    },
    {
        title: "Azure Architecture & Services",
        description: "Study Azure regions, availability zones, compute, networking, storage, and databases.",
        icon: "fa-cubes-stacked",
        matches: /azure architecture|architecture|region|availability|compute|network|storage|database|service/i
    },
    {
        title: "Azure Management & Governance",
        description: "Revise identity, security, cost management, compliance, and governance tools.",
        icon: "fa-shield-halved",
        matches: /management|governance|identity|security|cost|compliance/i
    }
];

let currentUser = null;

function $(id) { return document.getElementById(id); }

function readJSON(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        if (!value) return fallback;
        const parsed = JSON.parse(value);
        return parsed ?? fallback;
    } catch (error) {
        console.error(`Could not read dashboard data (${key}).`, error);
        const notice = $("dashboardNotice");
        if (notice) {
            notice.textContent = "Some saved learning data could not be read. Check your browser storage and refresh the page.";
            notice.hidden = false;
        }
        return fallback;
    }
}

function readSession() {
    try {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || "null");
    } catch (error) {
        console.error("Could not read the current session.", error);
        return null;
    }
}

function userRecords(key) {
    const value = readJSON(key, []);
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && typeof item === "object" && (!item.userId || item.userId === currentUser.id));
}

function getCards() {
    return userRecords(FLASHCARDS_KEY).filter(card => (card.question || card.title) && typeof card.answer === "string" && card.answer.trim());
}

function getSubject(card) { return card.subject || card.category || "General"; }

function initials(name) {
    return String(name || "Student").trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || "").join("") || "S";
}

function formatDate(value, options = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-KE", options).format(date);
}

function dateKey(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function setUserInfo() {
    const name = currentUser.name || currentUser.displayName || currentUser.email?.split("@")[0] || "Student";
    const hour = new Date().getHours();
    $("welcomeName").textContent = name.trim().split(/\s+/)[0];
    $("topUserName").textContent = name;
    $("topAvatar").textContent = initials(name);
    $("greetingLabel").textContent = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    $("todayDate").textContent = formatDate(new Date());
    $("footerYear").textContent = String(new Date().getFullYear());
}

function getReviewInterval(card) {
    const correct = Math.max(0, Number(card.correctCount) || 0);
    if (correct <= 1) return 1;
    if (correct === 2) return 3;
    if (correct === 3) return 7;
    return Math.min(30, 7 * 2 ** (correct - 3));
}

function isDue(card, now) {
    if (!card.lastStudiedAt) return true;
    const studiedAt = Date.parse(card.lastStudiedAt);
    if (!Number.isFinite(studiedAt)) return true;
    if ((Number(card.incorrectCount) || 0) > (Number(card.correctCount) || 0)) return true;
    return now - studiedAt >= getReviewInterval(card) * DAY;
}

function getStreak(records) {
    const days = new Set(records.map(record => dateKey(record.date || record.studiedAt || record.createdAt)).filter(Boolean));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = dateKey(today);
    const previousDay = new Date(today);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousKey = dateKey(previousDay);
    if (!days.has(todayKey) && !days.has(previousKey)) return 0;
    const cursor = new Date(today);
    if (!days.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (days.has(dateKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
    return streak;
}

function renderStatistics(cards, stats) {
    $("totalCards").textContent = cards.length.toLocaleString();
    $("studyStreak").textContent = String(getStreak(stats));
    const due = cards.filter(card => isDue(card, Date.now())).length;
    $("dueCards").textContent = String(due);
    const badge = $("revisionBadge");
    badge.textContent = due > 99 ? "99+" : String(due);
    badge.hidden = due === 0;

    // Review counts are saved, but this app has no defined card mastery threshold.
    $("cardsMastered").textContent = "—";
    $("masteryNote").textContent = "Not available yet";
}

function renderDailyGoal(stats) {
    let configuredGoal = 0;
    try { configuredGoal = Number(localStorage.getItem(DAILY_GOAL_KEY)); }
    catch (error) {
        console.error("Could not read the saved daily goal.", error);
        const notice = $("dashboardNotice");
        notice.textContent = "Your daily goal could not be loaded. Showing the default target.";
        notice.hidden = false;
    }
    const goal = Number.isInteger(configuredGoal) && configuredGoal > 0 ? configuredGoal : 20;
    const today = dateKey(new Date());
    const reviewed = stats.reduce((total, record) => {
        const recordDate = record.date || record.studiedAt || record.createdAt;
        if (!recordDate || dateKey(recordDate) !== today) return total;
        const count = Number(record.cardsStudied ?? record.cardsReviewed ?? record.count ?? 0);
        return Number.isFinite(count) && count > 0 ? total + count : total;
    }, 0);
    const percentage = Math.min(100, Math.round(reviewed / goal * 100));
    const ring = $("goalRing");
    ring.style.setProperty("--goal", `${percentage}%`);
    ring.setAttribute("aria-valuenow", String(percentage));
    $("goalPercent").textContent = `${percentage}%`;
    $("todayCards").textContent = String(reviewed);
    $("dailyGoal").textContent = String(goal);
    const remaining = Math.max(0, goal - reviewed);
    $("remainingCards").textContent = remaining ? `${remaining} card${remaining === 1 ? "" : "s"} to go` : "Daily goal completed";
    $("progressMessage").textContent = percentage >= 100 ? "Excellent work — goal reached!" : percentage >= 50 ? "Great progress. Keep it up!" : reviewed ? "You’re making progress!" : "A short session is a great start.";
}

function cardRecall(cards) {
    const counts = cards.reduce((result, card) => {
        result.correct += Math.max(0, Number(card.correctCount) || 0);
        result.incorrect += Math.max(0, Number(card.incorrectCount) || 0);
        return result;
    }, { correct: 0, incorrect: 0 });
    const rated = counts.correct + counts.incorrect;
    return rated ? Math.round(counts.correct / rated * 100) : null;
}

function renderTopics(cards) {
    const list = $("topicList");
    const otherTopics = $("otherTopics");
    list.replaceChildren();
    const knownSubjects = new Set(TOPICS.flatMap(topic => cards.filter(card => topic.matches.test(getSubject(card))).map(getSubject)));

    TOPICS.forEach(topic => {
        const topicCards = cards.filter(card => topic.matches.test(getSubject(card)));
        const count = topicCards.length;
        const recall = cardRecall(topicCards);
        const progress = recall ?? 0;
        const card = document.createElement("article");
        card.className = "topic-card";

        const top = document.createElement("div");
        top.className = "topic-top";
        const icon = document.createElement("span");
        icon.className = "topic-icon";
        icon.setAttribute("aria-hidden", "true");
        const iconElement = document.createElement("i");
        iconElement.className = `fa-solid ${topic.icon}`;
        icon.append(iconElement);
        const countLabel = document.createElement("span");
        countLabel.className = "topic-count";
        countLabel.textContent = `${count} ${count === 1 ? "card" : "cards"}`;
        top.append(icon, countLabel);

        const title = document.createElement("h3");
        title.textContent = topic.title;
        const description = document.createElement("p");
        description.textContent = topic.description;
        const progressWrap = document.createElement("div");
        progressWrap.className = "topic-progress";
        const progressLabel = document.createElement("div");
        progressLabel.className = "topic-progress-label";
        const label = document.createElement("span");
        label.textContent = recall === null ? (count ? "No review data yet" : "No cards in this topic yet") : "Recall accuracy";
        const value = document.createElement("span");
        value.textContent = recall === null ? "—" : `${recall}%`;
        progressLabel.append(label, value);
        const track = document.createElement("div");
        track.className = "topic-progress-track";
        track.setAttribute("role", "progressbar");
        track.setAttribute("aria-label", `${topic.title} recall accuracy`);
        track.setAttribute("aria-valuemin", "0");
        track.setAttribute("aria-valuemax", "100");
        track.setAttribute("aria-valuenow", String(progress));
        const fill = document.createElement("div");
        fill.className = "topic-progress-fill";
        fill.style.width = `${progress}%`;
        track.append(fill);
        progressWrap.append(progressLabel, track);
        const action = document.createElement("a");
        action.className = "topic-action";
        action.href = "study.html";
        action.setAttribute("aria-label", `Study ${topic.title}`);
        action.append(document.createTextNode("Study topic "));
        const arrow = document.createElement("i");
        arrow.className = "fa-solid fa-arrow-right";
        arrow.setAttribute("aria-hidden", "true");
        action.append(arrow);
        card.append(top, title, description, progressWrap, action);
        list.append(card);
    });

    const extras = [...new Set(cards.map(getSubject))].filter(subject => !knownSubjects.has(subject));
    if (extras.length) {
        otherTopics.hidden = false;
        const heading = document.createElement("strong");
        heading.textContent = "Other subjects:";
        otherTopics.replaceChildren(heading);
        extras.forEach(subject => {
            const pill = document.createElement("span");
            pill.className = "other-topic-pill";
            pill.textContent = subject;
            otherTopics.append(pill);
        });
    } else {
        otherTopics.hidden = true;
        otherTopics.replaceChildren();
    }
}

function latestCard(cards) {
    return [...cards].filter(card => card.lastStudiedAt && Number.isFinite(Date.parse(card.lastStudiedAt)))
        .sort((a, b) => Date.parse(b.lastStudiedAt) - Date.parse(a.lastStudiedAt))[0] || null;
}

function renderContinueLearning(cards, stats, quizzes) {
    const lastQuiz = [...quizzes].filter(item => item.date && Number.isFinite(Date.parse(item.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
    const latestStudy = [...stats].filter(item => item.date && Number.isFinite(Date.parse(item.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];
    const studyCard = latestCard(cards);
    const quizTime = lastQuiz ? Date.parse(lastQuiz.date) : 0;
    const studyTime = latestStudy ? Date.parse(latestStudy.date) : 0;
    const cardTime = studyCard ? Date.parse(studyCard.lastStudiedAt) : 0;
    const latestTime = Math.max(quizTime, studyTime, cardTime);
    const title = $("continueTitle");
    const description = $("continueDescription");
    const meta = $("continueMeta");
    const button = $("continueButton");

    if (!cards.length) {
        title.textContent = "Your first cards are a great start";
        description.textContent = "Create a flashcard collection, then come back here to keep learning.";
        button.href = "create-flashcard.html";
        button.textContent = "Create your first flashcards";
        const icon = document.createElement("i");
        icon.className = "fa-solid fa-arrow-right";
        button.append(" ", icon);
        return;
    }

    if (!latestTime) {
        title.textContent = "Start your first study session";
        description.textContent = `${cards.length} flashcards are ready whenever you are.`;
        meta.hidden = false;
        $("continueCardCount").textContent = `${cards.length} cards available`;
        $("continueProgress").textContent = "No study history yet";
        return;
    }

    let subject = lastQuiz && quizTime === latestTime ? lastQuiz.subject : "";
    if (!subject && studyCard && cardTime === latestTime) subject = getSubject(studyCard);
    if (!subject && studyCard) subject = getSubject(studyCard);
    const subjectCards = subject ? cards.filter(card => getSubject(card) === subject) : cards;
    title.textContent = subject || "Your flashcard collection";
    description.textContent = latestStudy && studyTime === latestTime
        ? `Your latest study session was ${formatDate(latestStudy.date, { day: "numeric", month: "short" })}. Pick up your practice with this collection.`
        : lastQuiz && quizTime === latestTime
            ? `You last studied ${formatDate(lastQuiz.date, { day: "numeric", month: "short" })}. Continue practicing with your flashcards.`
            : "Continue strengthening your recall with your flashcards.";
    const recall = cardRecall(subjectCards);
    meta.hidden = false;
    $("continueCardCount").textContent = `${subjectCards.length} ${subjectCards.length === 1 ? "card" : "cards"} in this topic`;
    $("continueProgress").textContent = recall === null ? "Progress not available yet" : `${recall}% recall accuracy`;
    button.href = "study.html";
}

function renderActivity(stats, quizzes) {
    const container = $("recentActivity");
    const activities = [
        ...stats.map(record => ({ type: "study", date: record.date || record.studiedAt || record.createdAt, count: Number(record.cardsStudied ?? record.cardsReviewed ?? record.count), accuracy: Number(record.accuracy), subject: record.subject || record.topic })),
        ...quizzes.map(record => ({ type: "quiz", date: record.date || record.createdAt, count: Number(record.total), accuracy: Number(record.scorePercentage ?? record.percentage ?? (Number(record.total) > 0 ? Number(record.score) / Number(record.total) * 100 : NaN)), subject: record.subject }))
    ].filter(item => item.date && Number.isFinite(Date.parse(item.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 5);
    container.replaceChildren();
    if (!activities.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        const title = document.createElement("strong");
        title.textContent = "Your study history will appear here";
        const text = document.createElement("p");
        text.textContent = "Complete a study session or quiz to see your recent activity.";
        const link = document.createElement("a");
        link.href = "study.html";
        link.textContent = "Start studying";
        empty.append(title, text, link);
        container.append(empty);
        return;
    }
    activities.forEach(activity => {
        const row = document.createElement("div");
        row.className = "activity-item";
        const icon = document.createElement("span");
        icon.className = `activity-icon${activity.type === "quiz" ? " quiz" : ""}`;
        icon.setAttribute("aria-hidden", "true");
        const iconElement = document.createElement("i");
        iconElement.className = `fa-solid ${activity.type === "quiz" ? "fa-circle-question" : "fa-book-open"}`;
        icon.append(iconElement);
        const copy = document.createElement("span");
        copy.className = "activity-copy";
        const name = document.createElement("strong");
        name.textContent = activity.type === "quiz" ? `Quiz${activity.subject ? ` · ${activity.subject}` : " completed"}` : `${activity.subject || "Study session"}`;
        const detail = document.createElement("span");
        detail.textContent = `${formatDate(activity.date, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}${Number.isFinite(activity.count) && activity.count > 0 ? ` · ${activity.count} cards` : ""}`;
        copy.append(name, detail);
        const result = document.createElement("span");
        result.className = "activity-result";
        result.textContent = Number.isFinite(activity.accuracy) && activity.accuracy >= 0 && activity.accuracy <= 100 ? `${Math.round(activity.accuracy)}%` : "";
        row.append(icon, copy, result);
        container.append(row);
    });
}

function setupNavigation() {
    const sidebar = $("sidebar");
    const scrim = $("sidebarOverlay");
    const toggle = $("menuToggle");
    const close = () => {
        sidebar.classList.remove("open");
        scrim.classList.remove("visible");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open navigation");
    };
    toggle.addEventListener("click", () => {
        const open = sidebar.classList.toggle("open");
        scrim.classList.toggle("visible", open);
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });
    scrim.addEventListener("click", close);
    sidebar.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
        if (window.innerWidth <= 850) close();
    }));
    document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
    window.addEventListener("resize", () => { if (window.innerWidth > 850) close(); });
}

function setupLogout() {
    $("logoutButton").addEventListener("click", async () => {
        if (!window.confirm("Are you sure you want to log out?")) return;
        const button = $("logoutButton");
        button.disabled = true;
        try {
            await signOut(auth);
            localStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_KEY);
            window.location.replace("../index.html");
        } catch (error) {
            console.error("Could not sign out.", error);
            button.disabled = false;
            const notice = $("dashboardNotice");
            notice.textContent = "Could not log out right now. Please try again.";
            notice.hidden = false;
        }
    });
}

async function initialiseDashboard() {
    await (window.firebaseStorageReady || Promise.resolve());
    currentUser = readSession();
    if (!currentUser?.id || !currentUser?.email) {
        window.location.replace("../index.html");
        return;
    }
    const syncStatus = await Promise.resolve(window.firebaseStorageReady).catch(() => null);
    const notice = $("dashboardNotice");
    if (syncStatus?.synced === false) {
        notice.textContent = "Could not sync with the online data store. Showing data saved on this device.";
        notice.hidden = false;
    } else notice.hidden = true;
    setUserInfo();
    const cards = getCards();
    const stats = userRecords(STUDY_STATS_KEY);
    const quizzes = userRecords(QUIZ_HISTORY_KEY);
    renderStatistics(cards, stats);
    renderDailyGoal(stats);
    renderTopics(cards);
    renderContinueLearning(cards, stats, quizzes);
    renderActivity(stats, quizzes);
    setupNavigation();
    setupLogout();
    $("dashboardNotice").setAttribute("aria-live", "polite");
}

document.addEventListener("DOMContentLoaded", initialiseDashboard);
