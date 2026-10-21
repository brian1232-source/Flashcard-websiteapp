/* ==========================================
   FLASHCARD COACH - DASHBOARD JAVASCRIPT
   ========================================== */

"use strict";

// ==========================================
// STORAGE KEYS
// ==========================================

const SESSION_KEY = "flashcardCoachSession";
const ACCOUNTS_KEY = "flashcardCoachAccounts";
const FLASHCARDS_KEY = "flashcardCoachFlashcards";
const STUDY_STATS_KEY = "flashcardCoachStudyStats";
const QUIZ_HISTORY_KEY = "flashcardCoachQuizHistory";
const DAILY_GOAL_KEY = "flashcardCoachDailyGoal";

// ==========================================
// DOM HELPERS
// ==========================================

function getElement(id) {
    return document.getElementById(id);
}

function readJSON(key, fallback = []) {
    try {
        const value = localStorage.getItem(key);

        if (!value) {
            return fallback;
        }

        return JSON.parse(value);

    } catch (error) {
        console.error(`Unable to read ${key}:`, error);

        return fallback;
    }
}

// ==========================================
// AUTHENTICATION
// ==========================================

function getCurrentSession() {
    try {
        const savedSession =
            sessionStorage.getItem(SESSION_KEY) ||
            localStorage.getItem(SESSION_KEY);

        if (!savedSession) {
            return null;
        }

        return JSON.parse(savedSession);

    } catch (error) {
        console.error("Unable to read login session:", error);

        return null;
    }
}

function requireAuthentication() {
    const session = getCurrentSession();

    if (!session || !session.id || !session.email) {
        window.location.replace("../index.html");

        return null;
    }

    return session;
}

let currentUser = null;
document.addEventListener("DOMContentLoaded", async () => {
    await (window.firebaseStorageReady || Promise.resolve());
    currentUser = requireAuthentication();
    if (currentUser) initialiseDashboard();
});

// ==========================================
// INITIALISE DASHBOARD
// ==========================================

function initialiseDashboard() {
    displayUserInformation();

    displayCurrentDate();

    displayStatistics();

    displayDailyProgress();

    displayRecentFlashcards();

    displayFooterYear();

    setupNavigation();

    setupLogout();

    setupProfileDropdown();
}

// ==========================================
// USER INFORMATION
// ==========================================

function getInitials(name) {
    if (!name) {
        return "S";
    }

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("");
}

function getFirstName(name) {
    if (!name) {
        return "Student";
    }

    return name.trim().split(/\s+/)[0];
}

function displayUserInformation() {
    const fullName = currentUser.name || "Student";

    const firstName = getFirstName(fullName);

    const initials = getInitials(fullName);

    const welcomeName = getElement("welcomeName");
    const topUserName = getElement("topUserName");
    const topAvatar = getElement("topAvatar");

    if (welcomeName) {
        welcomeName.textContent = firstName;
    }

    if (topUserName) {
        topUserName.textContent = fullName;
    }

    if (topAvatar) {
        topAvatar.textContent = initials;
    }

    document.title = `Dashboard | Flashcard Coach`;
}

// ==========================================
// CURRENT DATE
// ==========================================

function displayCurrentDate() {
    const dateElement = getElement("todayDate");

    if (!dateElement) {
        return;
    }

    const now = new Date();

    dateElement.textContent = new Intl.DateTimeFormat("en-KE", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(now);
}

// ==========================================
// USER-SPECIFIC DATA
// ==========================================

// Filter records belonging to the logged-in user.
// The userId field should be added by future pages
// when creating flashcards, study records and quizzes.

function belongsToCurrentUser(record) {
    if (!record || typeof record !== "object") {
        return false;
    }

    // Keep older records without a userId for this
    // single-browser demonstration.
    if (!record.userId) {
        return true;
    }

    return record.userId === currentUser.id;
}

function getUserFlashcards() {
    const flashcards = readJSON(FLASHCARDS_KEY, []);

    if (!Array.isArray(flashcards)) {
        return [];
    }

    return flashcards.filter(belongsToCurrentUser);
}

function getUserStudyStats() {
    const stats = readJSON(STUDY_STATS_KEY, []);

    if (!Array.isArray(stats)) {
        return [];
    }

    return stats.filter(belongsToCurrentUser);
}

function getUserQuizHistory() {
    const history = readJSON(QUIZ_HISTORY_KEY, []);

    if (!Array.isArray(history)) {
        return [];
    }

    return history.filter(belongsToCurrentUser);
}

// ==========================================
// FLASHCARD HELPERS
// ==========================================

function getFlashcardDate(card) {
    const dateValue =
        card.createdAt ||
        card.dateCreated ||
        card.updatedAt;

    if (!dateValue) {
        return null;
    }

    const date = new Date(dateValue);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getFlashcardTitle(card) {
    return (
        card.title ||
        card.question ||
        card.front ||
        card.term ||
        "Untitled flashcard"
    );
}

function getFlashcardSubject(card) {
    return card.subject || card.category || "General";
}

// ==========================================
// STATISTICS
// ==========================================

function displayStatistics() {
    const flashcards = getUserFlashcards();

    const studyStats = getUserStudyStats();

    const quizHistory = getUserQuizHistory();

    // Total flashcards in the user's collection.
    getElement("totalCards").textContent = flashcards.length;

    // Count the number of recorded study events.
    // Study pages should store records with:
    // { userId, date, cardsStudied }

    let cardsStudied = 0;

    studyStats.forEach(record => {
        const count = Number(
            record.cardsStudied ??
            record.cardsReviewed ??
            record.count ??
            0
        );

        if (Number.isFinite(count) && count > 0) {
            cardsStudied += count;
        }
    });

    getElement("cardsStudied").textContent = cardsStudied;

    // Calculate consecutive study days.
    const streak = calculateStudyStreak(studyStats);

    getElement("studyStreak").textContent = streak;

    // Calculate average quiz score.
    const averageScore = calculateAverageQuizScore(quizHistory);

    getElement("averageScore").textContent = averageScore;
}

// ==========================================
// QUIZ AVERAGE
// ==========================================

function calculateAverageQuizScore(history) {
    if (!history.length) {
        return 0;
    }

    const scores = history
        .map(quiz => {
            if (quiz.scorePercentage !== undefined) {
                return Number(quiz.scorePercentage);
            }

            if (quiz.percentage !== undefined) {
                return Number(quiz.percentage);
            }

            if (
                Number.isFinite(Number(quiz.score)) &&
                Number.isFinite(Number(quiz.total)) &&
                Number(quiz.total) > 0
            ) {
                return (
                    Number(quiz.score) /
                    Number(quiz.total)
                ) * 100;
            }

            return null;
        })
        .filter(score =>
            score !== null &&
            Number.isFinite(score) &&
            score >= 0 &&
            score <= 100
        );

    if (!scores.length) {
        return 0;
    }

    const total = scores.reduce(
        (sum, score) => sum + score,
        0
    );

    return Math.round(total / scores.length);
}

// ==========================================
// STUDY STREAK
// ==========================================

function getLocalDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function calculateStudyStreak(studyStats) {
    if (!studyStats.length) {
        return 0;
    }

    const studyDays = new Set();

    studyStats.forEach(record => {
        const dateValue =
            record.date ||
            record.studiedAt ||
            record.createdAt;

        if (!dateValue) {
            return;
        }

        const dateKey = getLocalDateKey(dateValue);

        if (dateKey) {
            studyDays.add(dateKey);
        }
    });

    if (!studyDays.size) {
        return 0;
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const todayKey = getLocalDateKey(today);

    const yesterday = new Date(today);

    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayKey = getLocalDateKey(yesterday);

    // A streak can continue from today or yesterday.
    // If neither day contains study activity, it is zero.
    if (
        !studyDays.has(todayKey) &&
        !studyDays.has(yesterdayKey)
    ) {
        return 0;
    }

    let streak = 0;

    const currentDay = new Date(today);

    if (!studyDays.has(todayKey)) {
        currentDay.setDate(currentDay.getDate() - 1);
    }

    while (studyDays.has(getLocalDateKey(currentDay))) {
        streak++;

        currentDay.setDate(currentDay.getDate() - 1);
    }

    return streak;
}

// ==========================================
// DAILY STUDY PROGRESS
// ==========================================

function getDailyGoal() {
    const savedGoal = Number(
        localStorage.getItem(DAILY_GOAL_KEY)
    );

    if (Number.isFinite(savedGoal) && savedGoal > 0) {
        return Math.floor(savedGoal);
    }

    return 20;
}

function getCardsStudiedToday(studyStats) {
    const todayKey = getLocalDateKey(new Date());

    return studyStats.reduce((total, record) => {
        const dateValue =
            record.date ||
            record.studiedAt ||
            record.createdAt;

        if (!dateValue) {
            return total;
        }

        if (getLocalDateKey(dateValue) !== todayKey) {
            return total;
        }

        const count = Number(
            record.cardsStudied ??
            record.cardsReviewed ??
            record.count ??
            0
        );

        if (!Number.isFinite(count) || count <= 0) {
            return total;
        }

        return total + count;

    }, 0);
}

function displayDailyProgress() {
    const studyStats = getUserStudyStats();

    const dailyGoal = getDailyGoal();

    const todayCards = getCardsStudiedToday(studyStats);

    const percentage = Math.min(
        100,
        Math.round((todayCards / dailyGoal) * 100)
    );

    const remaining = Math.max(
        0,
        dailyGoal - todayCards
    );

    getElement("todayCards").textContent = todayCards;

    getElement("dailyGoal").textContent = dailyGoal;

    getElement("progressPercentage").textContent = `${percentage}%`;

    getElement("remainingCards").textContent =
        remaining === 0
            ? "Daily goal completed!"
            : `${remaining} card${remaining === 1 ? "" : "s"} to go`;

    const progressFill = getElement("dailyProgressFill");

    const progressTrack = getElement("dailyProgressTrack");

    progressFill.style.width = `${percentage}%`;

    progressTrack.setAttribute("aria-valuenow", percentage);

    const progressMessage = getElement("progressMessage");

    if (percentage >= 100) {
        progressMessage.textContent = "Amazing! Goal completed.";
    } else if (percentage >= 50) {
        progressMessage.textContent = "Great progress! Keep going.";
    } else if (todayCards > 0) {
        progressMessage.textContent = "You're making progress!";
    } else {
        progressMessage.textContent = "Let's get started!";
    }
}

// ==========================================
// RECENT FLASHCARDS
// ==========================================

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

function formatCardDate(card) {
    const date = getFlashcardDate(card);

    if (!date) {
        return "Ready to study";
    }

    return new Intl.DateTimeFormat("en-KE", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(date);
}

function displayRecentFlashcards() {
    const container = getElement("recentFlashcards");

    const flashcards = getUserFlashcards();

    if (!flashcards.length) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>Your learning journey starts here.</strong>

                <p>
                    You haven't created any flashcards yet.
                    Create your first card and start learning.
                </p>

                <a href="create-flashcard.html">
                    + Create your first flashcard
                </a>
            </div>
        `;

        return;
    }

    const sortedCards = [...flashcards].sort((a, b) => {
        const dateA = getFlashcardDate(a)?.getTime() || 0;

        const dateB = getFlashcardDate(b)?.getTime() || 0;

        return dateB - dateA;
    });

    const recentCards = sortedCards.slice(0, 4);

    container.innerHTML = recentCards.map(card => {
        const title = escapeHTML(getFlashcardTitle(card));

        const subject = escapeHTML(getFlashcardSubject(card));

        const date = escapeHTML(formatCardDate(card));

        return `
            <article class="recent-card">

                <div class="recent-card-icon" aria-hidden="true">
                    ▤
                </div>

                <div class="recent-card-content">
                    <h3>${title}</h3>
                    <p>Added ${date}</p>
                </div>

                <span class="subject-tag">${subject}</span>

            </article>
        `;
    }).join("");
}

// ==========================================
// FOOTER
// ==========================================

function displayFooterYear() {
    const footerYear = getElement("footerYear");

    if (footerYear) {
        footerYear.textContent = new Date().getFullYear();
    }
}

// ==========================================
// MOBILE SIDEBAR
// ==========================================

function setupNavigation() {
    const sidebar = getElement("sidebar");

    const menuToggle = getElement("menuToggle");

    const overlay = getElement("sidebarOverlay");

    if (!sidebar || !menuToggle || !overlay) {
        return;
    }

    function openSidebar() {
        sidebar.classList.add("open");

        overlay.classList.add("visible");

        menuToggle.setAttribute("aria-expanded", "true");

        menuToggle.setAttribute("aria-label", "Close navigation menu");
    }

    function closeSidebar() {
        sidebar.classList.remove("open");

        overlay.classList.remove("visible");

        menuToggle.setAttribute("aria-expanded", "false");

        menuToggle.setAttribute("aria-label", "Open navigation menu");
    }

    menuToggle.addEventListener("click", () => {
        const isOpen = sidebar.classList.contains("open");

        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    overlay.addEventListener("click", closeSidebar);

    sidebar.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 950) {
                closeSidebar();
            }
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 950) {
            closeSidebar();
        }
    });
}

// ==========================================
// SIGN OUT
// ==========================================

function setupLogout() {
    const logoutButton = getElement("logoutButton");

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", () => {
        const confirmed = window.confirm(
            "Are you sure you want to sign out?"
        );

        if (!confirmed) {
            return;
        }

        // Clear the session, but keep the user's demo account
        // and saved learning materials.
        localStorage.removeItem(SESSION_KEY);

        sessionStorage.removeItem(SESSION_KEY);

        window.location.replace("../index.html");
    });
}

// ==========================================
// PROFILE DROPDOWN
// ==========================================

function setupProfileDropdown() {
    const profileToggle = getElement("profileMenuToggle");
    const profileDropdown = getElement("profileDropdown");

    if (!profileToggle || !profileDropdown) {
        return;
    }

    // Toggle dropdown
    profileToggle.addEventListener("click", event => {
        event.stopPropagation();

        const isHidden = profileDropdown.hidden;

        profileDropdown.hidden = !isHidden;

        profileToggle.setAttribute(
            "aria-expanded",
            String(!isHidden)
        );
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", event => {
        if (!profileDropdown.hidden && !profileDropdown.contains(event.target) && event.target !== profileToggle) {
            profileDropdown.hidden = true;

            profileToggle.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    });

    // Close dropdown on escape
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !profileDropdown.hidden) {
            profileDropdown.hidden = true;

            profileToggle.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    });
}
