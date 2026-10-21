"use strict";

// ======================================================
// FLASHCARD COACH — STUDY MODE
// ======================================================

const STORAGE_KEY = "flashcardCoachFlashcards";
const SESSION_KEY = "flashcardCoachSession";
const STUDY_STATS_KEY = "flashcardCoachStudyStats";
const SELECTED_CARD_KEY = "flashcardCoachStudyCardId";

const $ = (selector) => document.querySelector(selector);

// UI elements
const sidebar = $("#sidebar");
const sidebarOverlay = $("#sidebarOverlay");
const menuToggle = $("#menuToggle");

const todayDate = $("#todayDate");
const topUserName = $("#topUserName");
const topAvatar = $("#topAvatar");
const footerYear = $("#footerYear");

const subjectSelect = $("#subjectSelect");
const shuffleToggle = $("#shuffleToggle");
const restartButton = $("#restartButton");

const studyWorkspace = $("#studyWorkspace");
const emptyState = $("#emptyState");
const emptyTitle = $("#emptyTitle");
const emptyDescription = $("#emptyDescription");
const completionState = $("#completionState");

const studyCard = $("#studyCard");
const cardInner = $("#cardInner");
const cardSubject = $("#cardSubject");
const cardSubjectBack = $("#cardSubjectBack");
const cardDifficulty = $("#cardDifficulty");
const cardDifficultyBack = $("#cardDifficultyBack");
const cardTitle = $("#cardTitle");
const cardQuestion = $("#cardQuestion");
const cardAnswer = $("#cardAnswer");
const cardNotes = $("#cardNotes");
const cardNotesContainer = $("#cardNotesContainer");

const speakQuestionButton = $("#speakQuestionButton");
const speakAnswerButton = $("#speakAnswerButton");
const cardFlipActionButton = $("#cardFlipActionButton");

const previousButton = $("#previousButton");
const nextButton = $("#nextButton");
const previousTextButton = $("#previousTextButton");
const nextTextButton = $("#nextTextButton");

const knowButton = $("#knowButton");
const stillLearningButton = $("#stillLearningButton");
const answerActions = $("#answerActions");
const answerMessage = $("#answerMessage");

const finishButton = $("#finishButton");
const studyAgainButton = $("#studyAgainButton");

const toast = $("#toast");

// ======================================================
// STATE
// ======================================================

let allCards = [];
let sessionCards = [];
let currentIndex = 0;

let isFlipped = false;
let isShuffled = false;
let sessionFinished = false;

let toastTimeout;
let autoAdvanceTimeout;

// Records the current session's assessment for each card.
// Values: "known" or "learning".
const reviewedCards = new Map();

// ======================================================
// USER SESSION & AUTHENTICATION
// ======================================================

function getSession() {
    try {
        const raw =
            sessionStorage.getItem(SESSION_KEY) ||
            localStorage.getItem(SESSION_KEY);

        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error("Could not read login session:", error);
        return null;
    }
}

function getCurrentUser() {
    const session = getSession();
    if (!session) return null;
    return session.user || session.currentUser || session;
}

function getUserId() {
    const user = getCurrentUser();
    return user?.id || user?.uid || user?.email || "local-student";
}

function getInitials(name) {
    if (!name) return "S";
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "S";
}

function initializeUser() {
    const user = getCurrentUser();

    const name = user
        ? (
            user.name ||
            user.fullName ||
            user.username ||
            user.email?.split("@")[0] ||
            "Student"
        )
        : "Student";

    if (topUserName) {
        topUserName.textContent = name;
    }

    if (topAvatar) {
        topAvatar.textContent = getInitials(name);
    }
}

function displayCurrentDate() {
    if (!todayDate) return;

    try {
        todayDate.textContent = new Intl.DateTimeFormat("en-KE", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(new Date());
    } catch {
        todayDate.textContent = new Date().toLocaleDateString();
    }
}

// ======================================================
// FLASHCARD STORAGE
// ======================================================

function loadStoredCards() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];

        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];

        return parsed.filter((card) => {
            return (
                card &&
                typeof card === "object" &&
                (card.question || card.title) &&
                card.answer
            );
        });
    } catch (error) {
        console.error("Unable to load flashcards:", error);
        showToast("Could not load your saved flashcards.", "error");
        return [];
    }
}

function saveStoredCards(cards) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
        return true;
    } catch (error) {
        console.error("Unable to save study results:", error);
        showToast("Your study results could not be saved.", "error");
        return false;
    }
}

function getCardsForCurrentUser(cards) {
    const userId = getUserId();
    return cards.filter((card) => {
        return !card.userId || card.userId === userId;
    });
}

// ======================================================
// SUBJECT FILTER
// ======================================================

function populateSubjects() {
    if (!subjectSelect) return;

    const subjects = [
        ...new Set(
            allCards
                .map((card) => card.subject || card.category || "General")
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    const requestedSubject = new URLSearchParams(window.location.search).get("subject");
    const selectedSubject = requestedSubject && subjects.includes(requestedSubject)
        ? requestedSubject
        : (subjectSelect.value || "all");

    subjectSelect.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All subjects";
    subjectSelect.appendChild(allOption);

    subjects.forEach((subject) => {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
    });

    if (selectedSubject === "all" || subjects.includes(selectedSubject)) {
        subjectSelect.value = selectedSubject;
    } else {
        subjectSelect.value = "all";
    }
}

function applySubjectFilter() {
    stopSpeech();
    window.clearTimeout(autoAdvanceTimeout);

    const selectedSubject = subjectSelect ? subjectSelect.value : "all";

    let filtered = allCards.filter((card) => {
        if (selectedSubject === "all") {
            return true;
        }
        return (card.subject || card.category || "General") === selectedSubject;
    });

    if (isShuffled) {
        filtered = shuffleArray(filtered);
    }

    sessionCards = filtered;
    currentIndex = 0;
    reviewedCards.clear();

    // Check if user came from My Flashcards targeting a specific card
    const requestedId = sessionStorage.getItem(SELECTED_CARD_KEY);
    if (requestedId) {
        const requestedIndex = sessionCards.findIndex(
            (card) => String(card.id) === String(requestedId)
        );
        if (requestedIndex !== -1) {
            currentIndex = requestedIndex;
        }
        sessionStorage.removeItem(SELECTED_CARD_KEY);
    }

    isFlipped = false;
    sessionFinished = false;

    showStudyInterface();
    renderCurrentCard();
    updateStatistics();
}

// ======================================================
// SHUFFLE
// ======================================================

function shuffleArray(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// ======================================================
// SHOW / HIDE INTERFACES
// ======================================================

function showStudyInterface() {
    const hasCards = sessionCards.length > 0;

    if (studyWorkspace) studyWorkspace.hidden = !hasCards;
    if (emptyState) emptyState.hidden = hasCards;
    if (completionState) completionState.hidden = true;

    if (hasCards) return;

    const hasAnyCards = allCards.length > 0;
    if (!hasAnyCards) {
        if (emptyTitle) emptyTitle.textContent = "No flashcards to study yet";
        if (emptyDescription) {
            emptyDescription.textContent =
                "Create your first flashcard to begin practicing active recall.";
        }
    } else {
        if (emptyTitle) emptyTitle.textContent = "No cards for this subject";
        if (emptyDescription) {
            emptyDescription.textContent =
                "Choose another subject or add more flashcards to continue studying.";
        }
    }
}

// ======================================================
// RENDER CURRENT CARD
// ======================================================

function renderCurrentCard() {
    stopSpeech();
    window.clearTimeout(autoAdvanceTimeout);

    if (!sessionCards.length) {
        updateStatistics();
        return;
    }

    const card = sessionCards[currentIndex];
    if (!card) return;

    isFlipped = false;

    if (studyCard) {
        studyCard.classList.remove("flipped");
        studyCard.setAttribute("aria-pressed", "false");
    }

    const subjectText = card.subject || card.category || "General";
    if (cardSubject) cardSubject.textContent = subjectText;
    if (cardSubjectBack) cardSubjectBack.textContent = subjectText;

    const difficulty = (card.difficulty || "Medium").toUpperCase();
    const diffClass = difficulty.toLowerCase();

    if (cardDifficulty) {
        cardDifficulty.textContent = difficulty;
        cardDifficulty.className = `difficulty-pill ${diffClass}`;
    }

    if (cardDifficultyBack) {
        cardDifficultyBack.textContent = difficulty;
        cardDifficultyBack.className = `difficulty-pill ${diffClass}`;
    }

    if (cardTitle) {
        cardTitle.textContent = card.title || "Flashcard";
    }

    if (cardQuestion) {
        cardQuestion.textContent =
            card.question || card.title || "No question available.";
    }

    if (cardAnswer) {
        cardAnswer.textContent = card.answer || "No answer available.";
    }

    const hasNotes = Boolean(card.notes && card.notes.trim());
    if (cardNotes) {
        cardNotes.textContent = card.notes || "";
    }
    if (cardNotesContainer) {
        cardNotesContainer.classList.toggle("visible", hasNotes);
    }

    const previousStatus = reviewedCards.get(String(card.id));
    if (answerMessage) {
        if (previousStatus === "known") {
            answerMessage.textContent = "✓ Marked as known";
            answerMessage.style.color = "var(--green)";
        } else if (previousStatus === "learning") {
            answerMessage.textContent = "↻ Marked for more practice";
            answerMessage.style.color = "var(--orange)";
        } else {
            answerMessage.textContent = "";
        }
    }

    updateNavigation();
    updateStatistics();
}

// ======================================================
// FLIP CARD
// ======================================================

function flipCard() {
    if (!sessionCards.length || sessionFinished) return;

    stopSpeech();
    isFlipped = !isFlipped;

    if (studyCard) {
        studyCard.classList.toggle("flipped", isFlipped);
        studyCard.setAttribute("aria-pressed", String(isFlipped));
        studyCard.setAttribute(
            "aria-label",
            isFlipped
                ? "Flashcard answer. Activate to view the question."
                : "Flashcard question. Activate to reveal the answer."
        );
    }
}

// ======================================================
// TEXT TO SPEECH (AUDIO)
// ======================================================

function stopSpeech() {
    if ("speechSynthesis" in window) {
        try {
            window.speechSynthesis.cancel();
        } catch {
            // Ignore speech synthesis errors
        }
    }
}

function speakText(text) {
    if (!("speechSynthesis" in window)) {
        showToast("Text-to-speech is not supported by your browser.");
        return;
    }

    try {
        stopSpeech();
        if (!text || !text.trim()) return;

        const utterance = new SpeechSynthesisUtterance(text.trim());
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.error("TTS error:", e);
    }
}

// ======================================================
// NAVIGATION
// ======================================================

function goToCard(index) {
    if (!sessionCards.length || sessionFinished) return;
    if (index < 0 || index >= sessionCards.length) return;

    currentIndex = index;
    renderCurrentCard();
}

function nextCard() {
    if (!sessionCards.length || sessionFinished) return;

    if (currentIndex < sessionCards.length - 1) {
        goToCard(currentIndex + 1);
    } else {
        showToast("You have reached the last card in this session.");
    }
}

function previousCard() {
    if (!sessionCards.length || sessionFinished) return;

    if (currentIndex > 0) {
        goToCard(currentIndex - 1);
    } else {
        showToast("You are on the first card.");
    }
}

function updateNavigation() {
    const total = sessionCards.length;
    const position = total ? currentIndex + 1 : 0;

    const cardPosEl = $("#cardPosition");
    if (cardPosEl) cardPosEl.textContent = `Card ${position} of ${total}`;

    const navCounterEl = $("#navigationCounter");
    if (navCounterEl) navCounterEl.textContent = `${position} / ${total}`;

    const atFirst = currentIndex === 0;
    const atLast = currentIndex >= total - 1;

    if (previousButton) previousButton.disabled = atFirst;
    if (previousTextButton) previousTextButton.disabled = atFirst;

    if (nextButton) nextButton.disabled = atLast;
    if (nextTextButton) nextTextButton.disabled = atLast;

    const sessionBadgeEl = $("#sessionBadge");
    if (sessionBadgeEl) {
        sessionBadgeEl.textContent =
            total > 0 ? `Card ${position} of ${total}` : "Ready to learn";
    }
}

// ======================================================
// RATE ANSWER
// ======================================================

function markCard(status) {
    if (!sessionCards.length || sessionFinished) return;

    // If card hasn't been flipped yet, flip it so the user sees the answer first
    if (!isFlipped) {
        flipCard();
        showToast("Card flipped! Click again to confirm your rating.");
        return;
    }

    const card = sessionCards[currentIndex];
    const cardId = String(card.id);

    reviewedCards.set(cardId, status);

    if (answerMessage) {
        if (status === "known") {
            answerMessage.textContent = "✓ Great work! Marked as known.";
            answerMessage.style.color = "var(--green)";
        } else {
            answerMessage.textContent = "↻ Keep practicing! Marked for review.";
            answerMessage.style.color = "var(--orange)";
        }
    }

    updateStatistics();
    persistCardResult(card, status);

    // Auto-advance to the next card after a brief moment
    window.clearTimeout(autoAdvanceTimeout);
    if (currentIndex < sessionCards.length - 1) {
        autoAdvanceTimeout = window.setTimeout(() => {
            if (!sessionFinished) {
                nextCard();
            }
        }, 500);
    } else {
        showToast("All cards reviewed! Finish your session to view results.");
    }
}

function persistCardResult(card, status) {
    const storedCards = loadStoredCards();
    const cardIndex = storedCards.findIndex(
        (item) => String(item.id) === String(card.id)
    );

    if (cardIndex === -1) return;

    const savedCard = { ...storedCards[cardIndex] };
    savedCard.timesStudied = (Number(savedCard.timesStudied) || 0) + 1;

    if (status === "known") {
        savedCard.correctCount = (Number(savedCard.correctCount) || 0) + 1;
    } else {
        savedCard.incorrectCount = (Number(savedCard.incorrectCount) || 0) + 1;
    }

    savedCard.lastStudiedAt = new Date().toISOString();
    storedCards[cardIndex] = savedCard;

    saveStoredCards(storedCards);
}

// ======================================================
// PROGRESS & STATISTICS
// ======================================================

function getReviewCounts() {
    let known = 0;
    let learning = 0;

    reviewedCards.forEach((status) => {
        if (status === "known") {
            known++;
        } else if (status === "learning") {
            learning++;
        }
    });

    const total = sessionCards.length;
    const reviewed = known + learning;
    const remaining = Math.max(0, total - reviewed);

    const progress = total ? Math.round((reviewed / total) * 100) : 0;
    const accuracy = reviewed ? Math.round((known / reviewed) * 100) : 0;

    return {
        total,
        known,
        learning,
        reviewed,
        remaining,
        progress,
        accuracy
    };
}

function updateStatistics() {
    const stats = getReviewCounts();

    const totalCardsEl = $("#totalCards");
    if (totalCardsEl) totalCardsEl.textContent = stats.total;

    const knownCardsEl = $("#knownCards");
    if (knownCardsEl) knownCardsEl.textContent = stats.known;

    const learningCardsEl = $("#learningCards");
    if (learningCardsEl) learningCardsEl.textContent = stats.learning;

    const progressPercentEl = $("#progressPercent");
    if (progressPercentEl) progressPercentEl.textContent = `${stats.progress}%`;

    const progressFillEl = $("#progressFill");
    if (progressFillEl) progressFillEl.style.width = `${stats.progress}%`;

    const progressLabelEl = $("#progressLabel");
    if (progressLabelEl) {
        progressLabelEl.textContent = `${stats.progress}% completed`;
    }

    const summaryPercentEl = $("#summaryPercent");
    if (summaryPercentEl) summaryPercentEl.textContent = `${stats.progress}%`;

    const summaryKnownEl = $("#summaryKnown");
    if (summaryKnownEl) summaryKnownEl.textContent = stats.known;

    const summaryLearningEl = $("#summaryLearning");
    if (summaryLearningEl) summaryLearningEl.textContent = stats.learning;

    const summaryRemainingEl = $("#summaryRemaining");
    if (summaryRemainingEl) summaryRemainingEl.textContent = stats.remaining;

    const summaryCircleEl = $("#summaryCircle");
    if (summaryCircleEl) {
        summaryCircleEl.style.background = `conic-gradient(var(--primary) ${
            stats.progress * 3.6
        }deg, #edf0f6 ${stats.progress * 3.6}deg)`;
    }

    const summaryDescEl = $("#summaryDescription");
    if (summaryDescEl) {
        if (stats.total === 0) {
            summaryDescEl.textContent =
                "Create flashcards to begin tracking your progress.";
        } else if (stats.progress === 100) {
            summaryDescEl.textContent =
                "You have reviewed every card in this session. Excellent work!";
        } else if (stats.reviewed === 0) {
            summaryDescEl.textContent =
                "Start reviewing cards to track your session retention.";
        } else {
            summaryDescEl.textContent = `Reviewed ${stats.reviewed} of ${stats.total} cards. Keep going!`;
        }
    }
}

// ======================================================
// FINISH SESSION & RECORD STATS
// ======================================================

function recordStudySessionStats(stats) {
    try {
        const raw = localStorage.getItem(STUDY_STATS_KEY);
        const existing = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(existing)) return;

        const record = {
            userId: getUserId(),
            date: new Date().toISOString(),
            cardsStudied: stats.reviewed,
            cardsReviewed: stats.reviewed,
            knownCount: stats.known,
            learningCount: stats.learning,
            accuracy: stats.accuracy
        };

        existing.push(record);
        localStorage.setItem(STUDY_STATS_KEY, JSON.stringify(existing));
    } catch (e) {
        console.error("Could not record session stats:", e);
    }
}

function finishSession() {
    if (!sessionCards.length) {
        showToast("There are no cards in this session.", "error");
        return;
    }

    const stats = getReviewCounts();

    const confirmed = window.confirm(
        `Finish this study session?\n\n` +
        `Reviewed: ${stats.reviewed} of ${stats.total}\n` +
        `Know it: ${stats.known}\n` +
        `Still learning: ${stats.learning}\n\n` +
        `Your results will be saved to your dashboard.`
    );

    if (!confirmed) return;

    showCompletionScreen();
}

function showCompletionScreen() {
    stopSpeech();
    window.clearTimeout(autoAdvanceTimeout);
    sessionFinished = true;

    const stats = getReviewCounts();

    // Record to study stats for Dashboard integration
    recordStudySessionStats(stats);

    if (studyWorkspace) studyWorkspace.hidden = true;
    if (emptyState) emptyState.hidden = true;
    if (completionState) completionState.hidden = false;

    const finalTotalEl = $("#finalTotal");
    if (finalTotalEl) finalTotalEl.textContent = stats.reviewed;

    const finalKnownEl = $("#finalKnown");
    if (finalKnownEl) finalKnownEl.textContent = stats.known;

    const finalLearningEl = $("#finalLearning");
    if (finalLearningEl) finalLearningEl.textContent = stats.learning;

    const finalAccuracyEl = $("#finalAccuracy");
    if (finalAccuracyEl) finalAccuracyEl.textContent = `${stats.accuracy}%`;

    const compTitleEl = $("#completionTitle");
    const compDescEl = $("#completionDescription");

    if (stats.reviewed === stats.total) {
        if (compTitleEl) compTitleEl.textContent = "Outstanding work! 🎉";
        if (compDescEl) {
            compDescEl.textContent =
                "You reviewed every single card in this session. Your retention has been recorded.";
        }
    } else {
        if (compTitleEl) compTitleEl.textContent = "Great session! 👏";
        if (compDescEl) {
            compDescEl.textContent = `You reviewed ${stats.reviewed} out of ${stats.total} cards. Practice makes permanent!`;
        }
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ======================================================
// RESTART & STUDY AGAIN
// ======================================================

function restartSession() {
    if (!sessionCards.length) {
        showToast("There are no cards to restart.", "error");
        return;
    }

    const confirmed = window.confirm(
        "Restart this study session? Current session assessments will reset."
    );

    if (!confirmed) return;

    resetSessionState();
    showToast("Study session restarted.", "success");
}

function studyAgain() {
    resetSessionState();
    showToast("New study session started.", "success");
}

function resetSessionState() {
    stopSpeech();
    window.clearTimeout(autoAdvanceTimeout);
    reviewedCards.clear();
    currentIndex = 0;
    isFlipped = false;
    sessionFinished = false;

    if (isShuffled) {
        sessionCards = shuffleArray(sessionCards);
    }

    showStudyInterface();
    renderCurrentCard();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ======================================================
// TOAST NOTIFICATIONS
// ======================================================

function showToast(message, type = "") {
    if (!toast) return;

    window.clearTimeout(toastTimeout);

    toast.textContent = message;
    toast.className = "toast";

    if (type) {
        toast.classList.add(type);
    }

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    toastTimeout = window.setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);
}

// ======================================================
// MOBILE NAVIGATION MENU
// ======================================================

function initializeMobileMenu() {
    if (!menuToggle || !sidebar || !sidebarOverlay) return;

    function closeMenu() {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("show");
        menuToggle.setAttribute("aria-expanded", "false");
    }

    menuToggle.addEventListener("click", () => {
        const willOpen = !sidebar.classList.contains("open");
        sidebar.classList.toggle("open", willOpen);
        sidebarOverlay.classList.toggle("show", willOpen);
        menuToggle.setAttribute("aria-expanded", String(willOpen));
    });

    sidebarOverlay.addEventListener("click", closeMenu);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 950) {
            closeMenu();
        }
    });
}

// ======================================================
// PROFILE DROPDOWN MENU
// ======================================================

function initializeProfileMenu() {
    const profileButton = $("#profileMenuToggle");
    const profileDropdown = $("#profileDropdown");

    if (!profileButton || !profileDropdown) return;

    profileButton.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = profileButton.getAttribute("aria-expanded") === "true";
        profileButton.setAttribute("aria-expanded", String(!isOpen));
        profileDropdown.hidden = isOpen;
    });

    document.addEventListener("click", () => {
        profileButton.setAttribute("aria-expanded", "false");
        profileDropdown.hidden = true;
    });

    profileDropdown.addEventListener("click", (e) => {
        e.stopPropagation();
    });
}

// ======================================================
// LOGOUT
// ======================================================

function handleLogout() {
    const confirmed = window.confirm("Are you sure you want to sign out?");
    if (!confirmed) return;

    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);

    window.location.href = "../index.html";
}

function bindLogoutButtons() {
    const sidebarLogout = $("#sidebarLogoutButton") || $("#logoutButton");
    const profileLogout = $("#profileLogoutButton") || $("#logoutDropdownButton");
    const legacyLogout = $("#logoutButton");

    if (sidebarLogout) sidebarLogout.addEventListener("click", handleLogout);
    if (profileLogout && profileLogout !== sidebarLogout) {
        profileLogout.addEventListener("click", handleLogout);
    }
    if (legacyLogout && legacyLogout !== sidebarLogout && legacyLogout !== profileLogout) {
        legacyLogout.addEventListener("click", handleLogout);
    }

    document.querySelectorAll(".logout-button, .logout-dropdown").forEach((btn) => {
        btn.addEventListener("click", handleLogout);
    });
}

// ======================================================
// KEYBOARD SHORTCUTS
// ======================================================

function initializeKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
        const target = event.target;

        if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            target.isContentEditable
        ) {
            return;
        }

        if (completionState && completionState.hidden === false) {
            return;
        }

        if (event.code === "Space") {
            event.preventDefault();
            flipCard();
        }

        if (event.key === "ArrowRight") {
            nextCard();
        }

        if (event.key === "ArrowLeft") {
            previousCard();
        }

        if (event.key.toLowerCase() === "k") {
            markCard("known");
        }

        if (event.key.toLowerCase() === "l") {
            markCard("learning");
        }

        if (event.key.toLowerCase() === "r" && (event.metaKey || event.ctrlKey)) {
            // allow native refresh
            return;
        }
    });
}

// ======================================================
// EVENT LISTENERS
// ======================================================

function initializeEvents() {
    if (studyCard) {
        studyCard.addEventListener("click", flipCard);
        studyCard.addEventListener("keydown", (event) => {
            if (event.target === studyCard && event.key === "Enter") {
                event.preventDefault();
                flipCard();
            }
        });
    }

    if (cardFlipActionButton) {
        cardFlipActionButton.addEventListener("click", (e) => {
            e.stopPropagation();
            flipCard();
        });
    }

    if (speakQuestionButton) {
        speakQuestionButton.addEventListener("click", (e) => {
            e.stopPropagation();
            const card = sessionCards[currentIndex];
            if (card) {
                speakText(card.question || card.title || "");
            }
        });
    }

    if (speakAnswerButton) {
        speakAnswerButton.addEventListener("click", (e) => {
            e.stopPropagation();
            const card = sessionCards[currentIndex];
            if (card) {
                const text = card.notes
                    ? `${card.answer}. Note: ${card.notes}`
                    : card.answer;
                speakText(text || "");
            }
        });
    }

    if (previousButton) previousButton.addEventListener("click", previousCard);
    if (previousTextButton) {
        previousTextButton.addEventListener("click", previousCard);
    }

    if (nextButton) nextButton.addEventListener("click", nextCard);
    if (nextTextButton) nextTextButton.addEventListener("click", nextCard);

    if (knowButton) {
        knowButton.addEventListener("click", () => {
            markCard("known");
        });
    }

    if (stillLearningButton) {
        stillLearningButton.addEventListener("click", () => {
            markCard("learning");
        });
    }

    if (subjectSelect) {
        subjectSelect.addEventListener("change", applySubjectFilter);
    }

    if (shuffleToggle) {
        shuffleToggle.addEventListener("change", () => {
            isShuffled = shuffleToggle.checked;
            applySubjectFilter();
            showToast(
                isShuffled
                    ? "Flashcards shuffled."
                    : "Flashcards returned to default order.",
                "success"
            );
        });
    }

    if (restartButton) restartButton.addEventListener("click", restartSession);
    if (finishButton) finishButton.addEventListener("click", finishSession);
    if (studyAgainButton) studyAgainButton.addEventListener("click", studyAgain);

    bindLogoutButtons();
}

// ======================================================
// INITIALIZATION
// ======================================================

function initializeStudyMode() {
    if (footerYear) {
        footerYear.textContent = new Date().getFullYear();
    }

    initializeUser();
    displayCurrentDate();
    initializeMobileMenu();
    initializeProfileMenu();
    initializeKeyboardShortcuts();
    initializeEvents();

    // Load saved cards belonging to the current user
    allCards = getCardsForCurrentUser(loadStoredCards());

    // Populate subjects and render session
    populateSubjects();
    applySubjectFilter();
}

document.addEventListener("DOMContentLoaded", async () => {
    await (window.firebaseStorageReady || Promise.resolve());
    initializeStudyMode();
});
