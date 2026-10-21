/* ==========================================
   FLASHCARD COACH — MY FLASHCARDS
   ========================================== */

"use strict";

// ==========================================
// STORAGE KEYS
// ==========================================

const SESSION_KEY = "flashcardCoachSession";
const FLASHCARDS_KEY = "flashcardCoachFlashcards";

// ==========================================
// DOM HELPERS
// ==========================================

const $ = id => document.getElementById(id);

function readJSON(key, fallback = []) {
    try {
        const value = localStorage.getItem(key);

        return value ? JSON.parse(value) : fallback;

    } catch (error) {
        console.error(`Unable to read ${key}:`, error);

        return fallback;
    }
}

function saveJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));

        return true;

    } catch (error) {
        console.error(`Unable to save ${key}:`, error);

        showToast(
            "Unable to save your changes. Check available browser storage."
        );

        return false;
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

        return savedSession ? JSON.parse(savedSession) : null;

    } catch (error) {
        console.error("Unable to read session:", error);

        return null;
    }
}

let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
    await (window.firebaseStorageReady || Promise.resolve());
    currentUser = getCurrentSession();

    if (
        !currentUser ||
        !currentUser.id ||
        !currentUser.email
    ) {
        window.location.replace("../index.html");

    } else {
        initialiseFlashcardsPage();
    }
});

// ==========================================
// PAGE INITIALISATION
// ==========================================

function initialiseFlashcardsPage() {
    displayUserInformation();

    displayDate();

    displayFooterYear();

    bindSearch();

    bindFilters();

    bindFlashcardForm();

    bindModals();

    bindNavigation();

    bindLogout();

    initializeProfileMenu();

    renderFlashcards();
}

function initializeProfileMenu() {
    const profileButton = document.getElementById("profileMenuToggle");
    const profileDropdown = document.getElementById("profileDropdown");

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

function displayUserInformation() {
    const name = currentUser.name || "Student";

    $("topUserName").textContent = name;

    $("topAvatar").textContent = getInitials(name);
}

function displayDate() {
    $("todayDate").textContent =
        new Intl.DateTimeFormat("en-KE", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(new Date());
}

function displayFooterYear() {
    $("footerYear").textContent = new Date().getFullYear();
}

// ==========================================
// FLASHCARD STORAGE
// ==========================================

function getAllFlashcards() {
    const cards = readJSON(FLASHCARDS_KEY, []);

    return Array.isArray(cards) ? cards : [];
}

function getUserFlashcards() {
    return getAllFlashcards().filter(card => {
        if (!card || typeof card !== "object") {
            return false;
        }

        // Older demo cards without a userId remain visible.
        // New cards are assigned to the current user.
        return (
            !card.userId ||
            card.userId === currentUser.id
        );
    });
}

function saveFlashcardCollection(cards) {
    return saveJSON(FLASHCARDS_KEY, cards);
}

function createId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2)
    );
}

function findUserCard(cardId) {
    return getUserFlashcards().find(
        card => String(card.id) === String(cardId)
    );
}

// ==========================================
// HTML ESCAPING
// ==========================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
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

// ==========================================
// SEARCH AND FILTER STATE
// ==========================================

let activeView = "all";

let searchQuery = "";

let selectedSubject = "all";

let selectedSort = "newest";

let previewCardId = null;

let previewShowingAnswer = false;

let toastTimeout = null;

// ==========================================
// SEARCH
// ==========================================

function bindSearch() {
    const searchInput = $("searchInput");

    const clearButton = $("clearSearch");

    searchInput.addEventListener("input", () => {
        searchQuery = searchInput.value
            .trim()
            .toLowerCase();

        clearButton.hidden = !searchInput.value;

        renderFlashcards();
    });

    clearButton.addEventListener("click", () => {
        searchInput.value = "";

        searchQuery = "";

        clearButton.hidden = true;

        searchInput.focus();

        renderFlashcards();
    });
}

// ==========================================
// FILTERS
// ==========================================

function bindFilters() {
    $("subjectFilter").addEventListener("change", event => {
        selectedSubject = event.target.value;

        renderFlashcards();
    });

    $("sortFilter").addEventListener("change", event => {
        selectedSort = event.target.value;

        renderFlashcards();
    });

    document.querySelectorAll(".filter-tab").forEach(button => {
        button.addEventListener("click", () => {
            activeView = button.dataset.view;

            document.querySelectorAll(".filter-tab").forEach(tab => {
                const isActive = tab === button;

                tab.classList.toggle("active", isActive);

                tab.setAttribute(
                    "aria-pressed",
                    String(isActive)
                );
            });

            renderFlashcards();
        });
    });
}

// ==========================================
// SUBJECT FILTER OPTIONS
// ==========================================

function updateSubjectFilter(cards) {
    const select = $("subjectFilter");

    const previousValue = selectedSubject;

    const subjects = [
        ...new Set(
            cards
                .map(card => getSubject(card))
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    select.innerHTML = `
        <option value="all">All subjects</option>

        ${subjects.map(subject => `
            <option value="${escapeHTML(subject)}">
                ${escapeHTML(subject)}
            </option>
        `).join("")}
    `;

    const stillExists =
        previousValue === "all" ||
        subjects.includes(previousValue);

    selectedSubject = stillExists ? previousValue : "all";

    select.value = selectedSubject;
}

// ==========================================
// FLASHCARD HELPERS
// ==========================================

function getQuestion(card) {
    return (
        card.question ??
        card.front ??
        card.term ??
        card.title ??
        "Untitled question"
    );
}

function getAnswer(card) {
    return (
        card.answer ??
        card.back ??
        card.definition ??
        ""
    );
}

function getSubject(card) {
    return String(
        card.subject ??
        card.category ??
        "General"
    ).trim() || "General";
}

function isFavourite(card) {
    return Boolean(
        card.isFavorite ??
        card.favorite ??
        false
    );
}

function getCreatedDate(card) {
    const value =
        card.createdAt ??
        card.dateCreated ??
        card.updatedAt;

    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(card) {
    const date = getCreatedDate(card);

    if (!date) {
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-KE", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(date);
}

// ==========================================
// FILTERING
// ==========================================

function getFilteredFlashcards() {
    let cards = [...getUserFlashcards()];

    // Favourites view.
    if (activeView === "favorites") {
        cards = cards.filter(isFavourite);
    }

    // Subject filter.
    if (selectedSubject !== "all") {
        cards = cards.filter(card =>
            getSubject(card) === selectedSubject
        );
    }

    // Search questions, answers, and subjects.
    if (searchQuery) {
        cards = cards.filter(card => {
            const searchableText = [
                getQuestion(card),
                getAnswer(card),
                getSubject(card)
            ].join(" ").toLowerCase();

            return searchableText.includes(searchQuery);
        });
    }

    // Sorting.
    switch (selectedSort) {
        case "oldest":
            cards.sort((a, b) => {
                return (
                    (getCreatedDate(a)?.getTime() || 0) -
                    (getCreatedDate(b)?.getTime() || 0)
                );
            });
            break;

        case "az":
            cards.sort((a, b) =>
                getSubject(a).localeCompare(getSubject(b))
            );
            break;

        case "favorites":
            cards.sort((a, b) =>
                Number(isFavourite(b)) -
                Number(isFavourite(a))
            );
            break;

        case "newest":
        default:
            cards.sort((a, b) => {
                return (
                    (getCreatedDate(b)?.getTime() || 0) -
                    (getCreatedDate(a)?.getTime() || 0)
                );
            });
            break;
    }

    return cards;
}

// ==========================================
// UPDATE STATISTICS
// ==========================================

function updateStatistics(cards) {
    const subjects = new Set(
        cards.map(card => getSubject(card))
    );

    const favourites = cards.filter(isFavourite);

    $("totalCards").textContent = cards.length;

    $("totalSubjects").textContent = subjects.size;

    $("totalFavourites").textContent = favourites.length;

    $("allCount").textContent = cards.length;

    $("favoritesCount").textContent = favourites.length;
}

// ==========================================
// RENDER FLASHCARDS
// ==========================================

function renderFlashcards() {
    const allCards = getUserFlashcards();

    updateStatistics(allCards);

    updateSubjectFilter(allCards);

    const filteredCards = getFilteredFlashcards();

    const grid = $("flashcardGrid");

    const emptyState = $("emptyState");

    $("resultsLabel").textContent =
        `Showing ${filteredCards.length} of ${allCards.length} flashcard${allCards.length === 1 ? "" : "s"}`;

    if (!filteredCards.length) {
        grid.innerHTML = "";

        emptyState.hidden = false;

        if (allCards.length === 0) {
            $("emptyTitle").textContent =
                "Your learning library starts here.";

            $("emptyDescription").textContent =
                "Create your first flashcard to start building your knowledge.";

        } else {
            $("emptyTitle").textContent =
                activeView === "favorites"
                    ? "No favourite flashcards yet."
                    : "No matching flashcards found.";

            $("emptyDescription").textContent =
                activeView === "favorites"
                    ? "Mark a flashcard with a star to add it to your favourites."
                    : "Try another search term or change your subject filter.";
        }

        return;
    }

    emptyState.hidden = true;

    grid.innerHTML = filteredCards.map(card => {
        const id = escapeHTML(card.id);

        const question = escapeHTML(getQuestion(card));

        const answer = escapeHTML(getAnswer(card));

        const subject = escapeHTML(getSubject(card));

        const date = escapeHTML(formatDate(card));

        const favourite = isFavourite(card);

        return `
            <article class="flashcard-item" data-card-id="${id}">

                <div class="flashcard-card-header">

                    <span class="card-subject">
                        ${subject}
                    </span>

                    <button
                        type="button"
                        class="favorite-button ${favourite ? "is-favorite" : ""}"
                        data-action="favorite"
                        data-id="${id}"
                        aria-label="${favourite ? "Remove from favourites" : "Add to favourites"}"
                        aria-pressed="${favourite}"
                        title="${favourite ? "Remove favourite" : "Add favourite"}"
                    >
                        ${favourite ? "★" : "☆"}
                    </button>

                </div>

                <button
                    type="button"
                    class="flashcard-content"
                    data-action="preview"
                    data-id="${id}"
                    aria-label="Preview flashcard question and answer"
                >

                    <span class="card-question-label">
                        QUESTION
                    </span>

                    <span class="card-question">
                        ${question}
                    </span>

                    <span class="card-answer-preview">
                        ${answer || "No answer has been added yet."}
                    </span>

                    <span class="reveal-hint">
                        View flashcard <span aria-hidden="true">→</span>
                    </span>

                </button>

                <div class="flashcard-divider"></div>

                <div class="flashcard-actions">

                    <div class="flashcard-actions-left">

                        <button
                            type="button"
                            class="card-action-button"
                            data-action="edit"
                            data-id="${id}"
                        >
                            ✎ Edit
                        </button>

                        <button
                            type="button"
                            class="card-action-button delete-action"
                            data-action="delete"
                            data-id="${id}"
                        >
                            × Delete
                        </button>

                    </div>

                    <button
                        type="button"
                        class="card-action-button study-action"
                        data-action="study"
                        data-id="${id}"
                        title="Study this flashcard"
                    >
                        ▶ Study
                    </button>

                </div>

            </article>
        `;
    }).join("");
}

// ==========================================
// FLASHCARD ACTIONS
// ==========================================

$("flashcardGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) {
        return;
    }

    const action = button.dataset.action;

    const cardId = button.dataset.id;

    if (!cardId) {
        return;
    }

    switch (action) {
        case "favorite":
            toggleFavourite(cardId);
            break;

        case "preview":
            openPreview(cardId);
            break;

        case "edit":
            openEditModal(cardId);
            break;

        case "delete":
            deleteFlashcard(cardId);
            break;

        case "study":
            startStudying(cardId);
            break;
    }
});

// ==========================================
// ADD FLASHCARD MODAL
// ==========================================

function openCreateModal() {
    $("flashcardForm").reset();

    $("editingCardId").value = "";

    $("modalTitle").textContent = "Create a flashcard";

    $("saveButtonIcon").textContent = "＋";

    $("saveButtonText").textContent = "Save flashcard";

    $("formError").hidden = true;

    $("cardModal").hidden = false;

    document.body.style.overflow = "hidden";

    $("cardSubject").focus();
}

// ==========================================
// EDIT FLASHCARD MODAL
// ==========================================

function openEditModal(cardId) {
    const card = findUserCard(cardId);

    if (!card) {
        showToast("Flashcard not found.");

        return;
    }

    $("flashcardForm").reset();

    $("editingCardId").value = card.id;

    $("cardSubject").value = getSubject(card);

    $("cardQuestion").value = getQuestion(card);

    $("cardAnswer").value = getAnswer(card);

    $("cardFavorite").checked = isFavourite(card);

    $("modalTitle").textContent = "Edit flashcard";

    $("saveButtonIcon").textContent = "✓";

    $("saveButtonText").textContent = "Save changes";

    $("formError").hidden = true;

    $("cardModal").hidden = false;

    document.body.style.overflow = "hidden";

    $("cardSubject").focus();
}

// ==========================================
// CLOSE MODAL
// ==========================================

function closeCreateModal() {
    $("cardModal").hidden = true;

    document.body.style.overflow = "";
}

function bindModals() {
    $("closeModal").addEventListener("click", closeCreateModal);

    $("cancelModal").addEventListener("click", closeCreateModal);

    $("closePreview").addEventListener("click", closePreview);

    $("cardModal").addEventListener("click", event => {
        if (event.target === $("cardModal")) {
            closeCreateModal();
        }
    });

    $("previewModal").addEventListener("click", event => {
        if (event.target === $("previewModal")) {
            closePreview();
        }
    });

    $("previewCard").addEventListener("click", flipPreview);

    $("previewEdit").addEventListener("click", () => {
        if (previewCardId !== null) {
            const cardId = previewCardId;

            closePreview();

            openEditModal(cardId);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") {
            return;
        }

        if (!$("previewModal").hidden) {
            closePreview();

        } else if (!$("cardModal").hidden) {
            closeCreateModal();
        }
    });
}

// ==========================================
// SAVE NEW OR EDITED FLASHCARD
// ==========================================

function bindFlashcardForm() {
    $("flashcardForm").addEventListener("submit", event => {
        event.preventDefault();

        const editingId = $("editingCardId").value;

        const subject = $("cardSubject").value.trim();

        const question = $("cardQuestion").value.trim();

        const answer = $("cardAnswer").value.trim();

        const favorite = $("cardFavorite").checked;

        const errorElement = $("formError");

        errorElement.hidden = true;

        if (!subject || !question || !answer) {
            errorElement.textContent =
                "Please enter a subject, question, and answer.";

            errorElement.hidden = false;

            return;
        }

        const allCards = getAllFlashcards();

        const now = new Date().toISOString();

        if (editingId) {
            const index = allCards.findIndex(card =>
                String(card.id) === String(editingId) &&
                (
                    !card.userId ||
                    card.userId === currentUser.id
                )
            );

            if (index === -1) {
                errorElement.textContent =
                    "This flashcard could not be found.";

                errorElement.hidden = false;

                return;
            }

            allCards[index] = {
                ...allCards[index],
                subject,
                question,
                answer,
                isFavorite: favorite,
                updatedAt: now
            };

            if (!saveFlashcardCollection(allCards)) {
                return;
            }

            closeCreateModal();

            renderFlashcards();

            showToast("Flashcard updated successfully.");

        } else {
            const newCard = {
                id: createId(),
                userId: currentUser.id,
                subject,
                question,
                answer,
                isFavorite: favorite,
                createdAt: now,
                updatedAt: now
            };

            allCards.push(newCard);

            if (!saveFlashcardCollection(allCards)) {
                return;
            }

            closeCreateModal();

            // Show the new card even if a previous search
            // or subject filter would hide it.
            searchQuery = "";

            selectedSubject = "all";

            activeView = "all";

            selectedSort = "newest";

            $("searchInput").value = "";

            $("clearSearch").hidden = true;

            $("sortFilter").value = "newest";

            renderFlashcards();

            document.querySelectorAll(".filter-tab").forEach(tab => {
                const active = tab.dataset.view === "all";

                tab.classList.toggle("active", active);

                tab.setAttribute("aria-pressed", String(active));
            });

            showToast("Flashcard created successfully.");
        }
    });
}

// ==========================================
// FAVOURITES
// ==========================================

function toggleFavourite(cardId) {
    const allCards = getAllFlashcards();

    const card = allCards.find(item =>
        String(item.id) === String(cardId) &&
        (
            !item.userId ||
            item.userId === currentUser.id
        )
    );

    if (!card) {
        showToast("Flashcard not found.");

        return;
    }

    const newValue = !isFavourite(card);

    card.isFavorite = newValue;

    card.updatedAt = new Date().toISOString();

    if (!saveFlashcardCollection(allCards)) {
        return;
    }

    renderFlashcards();

    showToast(
        newValue
            ? "Added to favourites."
            : "Removed from favourites."
    );
}

// ==========================================
// DELETE FLASHCARD
// ==========================================

function deleteFlashcard(cardId) {
    const card = findUserCard(cardId);

    if (!card) {
        showToast("Flashcard not found.");

        return;
    }

    const confirmed = window.confirm(
        `Delete this flashcard?\n\n"${getQuestion(card)}"\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    const allCards = getAllFlashcards();

    const remainingCards = allCards.filter(item => {
        const belongsToUser =
            !item.userId ||
            item.userId === currentUser.id;

        const isTarget =
            String(item.id) === String(cardId);

        return !(belongsToUser && isTarget);
    });

    if (!saveFlashcardCollection(remainingCards)) {
        return;
    }

    renderFlashcards();

    showToast("Flashcard deleted.");
}

// ==========================================
// FLASHCARD PREVIEW
// ==========================================

function openPreview(cardId) {
    const card = findUserCard(cardId);

    if (!card) {
        showToast("Flashcard not found.");

        return;
    }

    previewCardId = card.id;

    previewShowingAnswer = false;

    $("previewSubject").textContent = getSubject(card);

    $("previewPosition").textContent = "Question side";

    renderPreviewContent();

    $("previewModal").hidden = false;

    document.body.style.overflow = "hidden";
}

function renderPreviewContent() {
    const card = findUserCard(previewCardId);

    if (!card) {
        closePreview();

        return;
    }

    const label = $("previewLabel");

    const text = $("previewText");

    const hint = $("previewHint");

    const button = $("previewCard");

    if (previewShowingAnswer) {
        label.textContent = "ANSWER";

        text.textContent = getAnswer(card);

        hint.textContent = "Click to see the question";

        $("previewPosition").textContent = "Answer side";

        button.setAttribute(
            "aria-label",
            "Show flashcard question"
        );

        button.setAttribute("aria-pressed", "true");

    } else {
        label.textContent = "QUESTION";

        text.textContent = getQuestion(card);

        hint.textContent = "Click to reveal the answer";

        $("previewPosition").textContent = "Question side";

        button.setAttribute(
            "aria-label",
            "Reveal flashcard answer"
        );

        button.setAttribute("aria-pressed", "false");
    }
}

function flipPreview() {
    previewShowingAnswer = !previewShowingAnswer;

    renderPreviewContent();
}

function closePreview() {
    $("previewModal").hidden = true;

    document.body.style.overflow = "";

    previewCardId = null;

    previewShowingAnswer = false;
}

// ==========================================
// STUDY A FLASHCARD
// ==========================================

function startStudying(cardId) {
    const card = findUserCard(cardId);

    if (!card) {
        showToast("Flashcard not found.");

        return;
    }

    try {
        sessionStorage.setItem(
            "flashcardCoachStudyCardId",
            String(card.id)
        );
    } catch (error) {
        console.error("Unable to save study selection:", error);
    }

    window.location.href = "study.html";
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

function showToast(message) {
    const toast = $("toast");

    toast.textContent = message;

    toast.classList.add("show");

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ==========================================
// MOBILE NAVIGATION
// ==========================================

function bindNavigation() {
    const sidebar = $("sidebar");

    const menuToggle = $("menuToggle");

    const overlay = $("sidebarOverlay");

    function openSidebar() {
        sidebar.classList.add("open");

        overlay.classList.add("visible");

        menuToggle.setAttribute("aria-expanded", "true");

        menuToggle.setAttribute(
            "aria-label",
            "Close navigation menu"
        );
    }

    function closeSidebar() {
        sidebar.classList.remove("open");

        overlay.classList.remove("visible");

        menuToggle.setAttribute("aria-expanded", "false");

        menuToggle.setAttribute(
            "aria-label",
            "Open navigation menu"
        );
    }

    menuToggle.addEventListener("click", () => {
        if (sidebar.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    overlay.addEventListener("click", closeSidebar);

    sidebar.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 1000) {
                closeSidebar();
            }
        });
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 1000) {
            closeSidebar();
        }
    });
}

// ==========================================
// SIGN OUT
// ==========================================

function bindLogout() {
    $("logoutButton").addEventListener("click", () => {
        const confirmed = window.confirm(
            "Are you sure you want to sign out?"
        );

        if (!confirmed) {
            return;
        }

        localStorage.removeItem(SESSION_KEY);

        sessionStorage.removeItem(SESSION_KEY);

        window.location.replace("../index.html");
    });
}
