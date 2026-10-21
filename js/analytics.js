"use strict";

const SESSION_KEY = "flashcardCoachSession";
const CARDS_KEY = "flashcardCoachFlashcards";
const STUDY_KEY = "flashcardCoachStudyStats";
const QUIZ_KEY = "flashcardCoachQuizHistory";
let session = null;

function readJSON(key, fallback = []) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        console.error(`Unable to read ${key}:`, error);
        return fallback;
    }
}

function init() {
    try {
        session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || "null");
    } catch { session = null; }
    if (!session || !session.id || !session.email) {
        window.location.replace("../index.html");
        return;
    }

    const name = session.name || "Student";
    document.getElementById("topUserName").textContent = name;
    document.getElementById("topAvatar").textContent = getInitials(name);
    document.getElementById("todayDate").textContent = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date());
    bindNavigation();
    bindProfileMenu();
    document.getElementById("dateRange").addEventListener("change", renderAnalytics);
    document.getElementById("logoutButton").addEventListener("click", signOut);
    document.getElementById("dropdownLogout").addEventListener("click", signOut);
    renderAnalytics();
}

function getInitials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0].toUpperCase()).join("") || "S";
}

function belongsToUser(record) {
    return record && (!record.userId || record.userId === session.id);
}

function getData() {
    const cards = readJSON(CARDS_KEY).filter(card => belongsToUser(card) && (card.question || card.title));
    const study = readJSON(STUDY_KEY).filter(belongsToUser);
    const quizzes = readJSON(QUIZ_KEY).filter(belongsToUser);
    return { cards, study, quizzes };
}

function recordDate(record) {
    const value = record.date || record.studiedAt || record.createdAt || record.completedAt;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function selectedRange() {
    const value = document.getElementById("dateRange").value;
    if (value === "all") return { days: null, label: "all time" };
    const days = Number(value) || 30;
    return { days, label: `in the last ${days} days` };
}

function inRange(record, range, now = new Date()) {
    if (!range.days) return true;
    const date = recordDate(record);
    if (!date) return false;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - range.days + 1);
    return date >= start && date <= now;
}

function getQuizScore(quiz) {
    if (quiz.scorePercentage !== undefined) return Number(quiz.scorePercentage);
    if (quiz.percentage !== undefined) return Number(quiz.percentage);
    const score = Number(quiz.score);
    const total = Number(quiz.total);
    return total > 0 ? (score / total) * 100 : null;
}

function renderAnalytics() {
    const { cards, study, quizzes } = getData();
    const range = selectedRange();
    const scopedStudy = study.filter(item => inRange(item, range));
    const scopedQuizzes = quizzes.filter(item => inRange(item, range));
    const reviewed = scopedStudy.reduce((sum, item) => sum + Math.max(0, Number(item.cardsStudied ?? item.cardsReviewed ?? item.count ?? 0) || 0), 0);
    const studyDays = new Set(scopedStudy.map(recordDate).filter(Boolean).map(localDateKey));
    const quizScores = scopedQuizzes.map(getQuizScore).filter(score => Number.isFinite(score) && score >= 0 && score <= 100);
    const average = quizScores.length ? Math.round(quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length) : 0;

    document.getElementById("metricTotalCards").textContent = cards.length;
    document.getElementById("metricReviewed").textContent = reviewed.toLocaleString();
    document.getElementById("metricStudyDays").textContent = studyDays.size;
    document.getElementById("metricQuizAverage").textContent = average;
    document.getElementById("reviewedPeriod").textContent = range.label;
    document.getElementById("studyDaysPeriod").textContent = range.label;
    document.getElementById("quizCountLabel").textContent = quizScores.length ? `${quizScores.length} ${quizScores.length === 1 ? "quiz" : "quizzes"} ${range.label.replace("in the ", "in ")}` : "No quizzes in this period";

    renderActivity(scopedStudy, range);
    renderMastery(cards);
    renderQuizzes(scopedQuizzes);
    renderInsight(reviewed, studyDays.size, average, quizScores.length);
}

function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function renderActivity(records, range) {
    const chart = document.getElementById("activityChart");
    const empty = document.getElementById("activityEmpty");
    chart.replaceChildren();
    const now = new Date();
    let days = range.days;
    if (!days) {
        const dates = records.map(recordDate).filter(Boolean);
        days = dates.length ? Math.max(7, Math.ceil((now - Math.min(...dates.map(date => date.getTime()))) / 86400000) + 1) : 7;
    }
    const bucketCount = days <= 7 ? 7 : days <= 30 ? 10 : days <= 90 ? 13 : 12;
    const bucketSize = Math.max(1, Math.ceil(days / bucketCount));
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - days + 1 + index * bucketSize);
        return { start, count: 0 };
    });
    records.forEach(record => {
        const date = recordDate(record);
        if (!date) return;
        const age = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);
        if (age < 0 || age >= days) return;
        const bucketIndex = Math.min(bucketCount - 1, Math.floor((days - 1 - age) / bucketSize));
        buckets[bucketIndex].count += Math.max(0, Number(record.cardsStudied ?? record.cardsReviewed ?? record.count ?? 0) || 0);
    });
    const maxCount = Math.max(1, ...buckets.map(bucket => bucket.count));
    buckets.forEach((bucket, index) => {
        const day = document.createElement("div");
        day.className = "activity-day";
        const area = document.createElement("div");
        area.className = "activity-bar-area";
        const bar = document.createElement("div");
        bar.className = "activity-bar";
        bar.dataset.count = String(bucket.count);
        bar.style.height = `${Math.max(3, (bucket.count / maxCount) * 100)}%`;
        bar.title = `${bucket.count} cards reviewed`;
        const count = document.createElement("span");
        count.className = "activity-count";
        count.textContent = bucket.count || "";
        bar.append(count);
        area.append(bar);
        const label = document.createElement("span");
        label.className = "activity-label";
        label.textContent = bucket.start.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
        day.setAttribute("aria-label", `${label.textContent}: ${bucket.count} cards reviewed`);
        day.append(area, label);
        chart.append(day);
    });
    const hasActivity = buckets.some(bucket => bucket.count > 0);
    chart.hidden = !hasActivity;
    empty.hidden = hasActivity;
}

function renderMastery(cards) {
    const container = document.getElementById("masteryList");
    container.replaceChildren();
    const groups = new Map();
    cards.forEach(card => {
        const subject = card.subject || card.category || "General";
        if (!groups.has(subject)) groups.set(subject, { total: 0, known: 0, learning: 0, reviewed: 0 });
        const group = groups.get(subject);
        group.total += 1;
        group.known += Math.max(0, Number(card.correctCount) || 0);
        group.learning += Math.max(0, Number(card.incorrectCount) || 0);
        group.reviewed += Math.max(0, Number(card.correctCount) || 0) + Math.max(0, Number(card.incorrectCount) || 0);
    });
    const ranked = [...groups.entries()].sort((a, b) => (b[1].reviewed ? b[1].known / b[1].reviewed : -1) - (a[1].reviewed ? a[1].known / a[1].reviewed : -1)).slice(0, 6);
    ranked.forEach(([subject, data]) => {
        const score = data.reviewed ? Math.round((data.known / data.reviewed) * 100) : 0;
        const item = document.createElement("div");
        item.className = "mastery-item";
        const top = document.createElement("div");
        top.className = "mastery-top";
        const name = document.createElement("span");
        name.className = "mastery-subject";
        name.textContent = subject;
        const value = document.createElement("span");
        value.className = "mastery-score";
        value.textContent = data.reviewed ? `${score}%` : "—";
        top.append(name, value);
        const progress = document.createElement("div");
        progress.className = "mastery-progress";
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-label", `${subject} mastery`);
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", "100");
        progress.setAttribute("aria-valuenow", String(score));
        const fill = document.createElement("span");
        fill.style.width = `${score}%`;
        progress.append(fill);
        const detail = document.createElement("span");
        detail.className = "mastery-detail";
        detail.textContent = data.reviewed ? `${data.total} cards · ${data.reviewed} ratings` : `${data.total} cards · not rated yet`;
        item.append(top, progress, detail);
        container.append(item);
    });
    document.getElementById("masteryEmpty").hidden = ranked.length > 0;
}

function renderQuizzes(quizzes) {
    const body = document.getElementById("quizHistoryRows");
    body.replaceChildren();
    const sorted = [...quizzes].sort((a, b) => (recordDate(b)?.getTime() || 0) - (recordDate(a)?.getTime() || 0)).slice(0, 6);
    sorted.forEach(quiz => {
        const row = document.createElement("tr");
        const subject = document.createElement("td");
        subject.textContent = !quiz.subject || quiz.subject === "all" ? "All subjects" : quiz.subject;
        const date = document.createElement("td");
        const taken = recordDate(quiz);
        date.textContent = taken ? taken.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";
        const scoreCell = document.createElement("td");
        const score = getQuizScore(quiz);
        const badge = document.createElement("span");
        badge.className = `score-badge${Number.isFinite(score) && score < 50 ? " low" : ""}`;
        badge.textContent = Number.isFinite(score) ? `${Math.round(score)}%` : "—";
        scoreCell.append(badge);
        row.append(subject, date, scoreCell);
        body.append(row);
    });
    document.getElementById("quizEmpty").hidden = sorted.length > 0;
    document.querySelector(".quiz-table-wrap").hidden = sorted.length === 0;
}

function renderInsight(reviewed, days, average, quizCount) {
    const title = document.getElementById("insightTitle");
    const text = document.getElementById("insightText");
    if (!reviewed && !quizCount) {
        title.textContent = "Your learning journey starts here";
        text.textContent = "Study a few flashcards or take a quiz to see personalized progress insights.";
    } else if (days >= 5) {
        title.textContent = "You’re building a steady habit";
        text.textContent = `You studied on ${days} different days in this period. Regular practice is helping your knowledge stick.`;
    } else if (quizCount && average >= 80) {
        title.textContent = "Strong quiz performance";
        text.textContent = `Your average quiz score is ${average}%. Keep reviewing to maintain your momentum.`;
    } else {
        title.textContent = "Keep your practice consistent";
        text.textContent = `${reviewed} cards reviewed so far. A short study session today can keep your progress moving.`;
    }
}

function bindNavigation() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const toggle = document.getElementById("menuToggle");
    const close = () => { sidebar.classList.remove("open"); overlay.classList.remove("visible"); toggle.setAttribute("aria-expanded", "false"); };
    toggle.addEventListener("click", () => {
        const open = sidebar.classList.toggle("open");
        overlay.classList.toggle("visible", open);
        toggle.setAttribute("aria-expanded", String(open));
    });
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
}

function bindProfileMenu() {
    const button = document.getElementById("profileMenuToggle");
    const dropdown = document.getElementById("profileDropdown");
    button.addEventListener("click", event => {
        event.stopPropagation();
        const open = button.getAttribute("aria-expanded") !== "true";
        button.setAttribute("aria-expanded", String(open));
        dropdown.hidden = !open;
    });
    document.addEventListener("click", event => {
        if (!dropdown.contains(event.target) && !button.contains(event.target)) {
            dropdown.hidden = true;
            button.setAttribute("aria-expanded", "false");
        }
    });
}

function signOut() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    window.location.replace("../index.html");
}

document.addEventListener("DOMContentLoaded", async () => {
    await (window.firebaseStorageReady || Promise.resolve());
    init();
});
