"use strict";

// ======================================================
// FLASHCARD COACH — CREATE FLASHCARD
// Saves flashcards in browser localStorage.
// ======================================================

const STORAGE_KEY = "flashcardCoachFlashcards";
const SESSION_KEY = "flashcardCoachSession";

const $ = (selector) => document.querySelector(selector);

// Form elements
const form = $("#flashcardForm");
const titleInput = $("#cardTitle");
const subjectInput = $("#cardSubject");
const difficultyInput = $("#cardDifficulty");
const questionInput = $("#cardQuestion");
const answerInput = $("#cardAnswer");
const notesInput = $("#cardNotes");
const favoriteInput = $("#cardFavorite");

const clearButton = $("#clearButton");
const previewButton = $("#previewButton");
const flipButton = $("#flipButton");
const saveButton = $("#saveButton");

const formError = $("#formError");
const toast = $("#toast");
const sourceFileInput = $("#sourceFile");
const fileDropZone = $("#fileDropZone");
const importStatus = $("#importStatus");
const extractedContent = $("#extractedContent");
const extractedText = $("#extractedText");

const MAX_IMPORT_FILE_SIZE = 20 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_LENGTH = 10000;
const MAX_PDF_PAGES = 30;

const extractionLibraries = {
    pdf: {
        src: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
        ready: () => Boolean(window.pdfjsLib)
    },
    word: {
        src: "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js",
        ready: () => Boolean(window.mammoth)
    },
    image: {
        src: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
        ready: () => Boolean(window.Tesseract)
    }
};

const extractionLibraryPromises = new Map();

// Preview elements
const flashcardPreview = $("#flashcardPreview");
const previewSubject = $("#previewSubject");
const previewQuestion = $("#previewQuestion");
const previewAnswer = $("#previewAnswer");
const previewType = $("#previewType");
const previewDifficulty = $("#previewDifficulty");
const previewStar = $("#previewStar");

// Other elements
const topUserName = $("#topUserName");
const topAvatar = $("#topAvatar");
const questionCount = $("#questionCount");
const answerCount = $("#answerCount");
const sessionCardCount = $("#sessionCardCount");
const footerYear = $("#footerYear");
const logoutButton = $("#logoutButton");

let createdThisSession = 0;
let toastTimeout;
let showingAnswer = false;
let isExtractingFile = false;

// ======================================================
// SESSION
// ======================================================

function getSession() {
    try {
        const rawSession = localStorage.getItem(SESSION_KEY);

        if (!rawSession) {
            return null;
        }

        return JSON.parse(rawSession);
    } catch (error) {
        console.error("Unable to read session:", error);
        return null;
    }
}

function getCurrentUser() {
    const session = getSession();

    if (!session) {
        return null;
    }

    // Supports several common login-session structures.
    return session.user || session.currentUser || session;
}

function initializeUser() {
    const user = getCurrentUser();

    if (user) {
        const displayName =
            user.name ||
            user.fullName ||
            user.username ||
            user.email?.split("@")[0] ||
            "Student";

        topUserName.textContent = displayName;

        topAvatar.textContent = displayName
            .trim()
            .charAt(0)
            .toUpperCase() || "S";
    } else {
        // This page can be tested without an authentication system.
        // Add a redirect here if your project requires login first.
        topUserName.textContent = "Student";
        topAvatar.textContent = "S";
    }
}

// ======================================================
// LOCAL STORAGE
// ======================================================

function getFlashcards() {
    try {
        const storedCards = localStorage.getItem(STORAGE_KEY);

        if (!storedCards) {
            return [];
        }

        const parsedCards = JSON.parse(storedCards);

        return Array.isArray(parsedCards) ? parsedCards : [];
    } catch (error) {
        console.error("Unable to load flashcards:", error);
        showToast("Could not read your saved flashcards.", "error");
        return [];
    }
}

function saveFlashcards(cards) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
        return true;
    } catch (error) {
        console.error("Unable to save flashcards:", error);

        showToast(
            "Your flashcard could not be saved. Check your browser storage.",
            "error"
        );

        return false;
    }
}

function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return "card-" + Date.now() + "-" +
        Math.random().toString(36).slice(2, 10);
}

function getUserId() {
    const user = getCurrentUser();

    return user?.id || user?.uid || user?.email || "local-student";
}

// ======================================================
// DOCUMENT TEXT IMPORT
// ======================================================

function loadExtractionLibrary(type) {
    const library = extractionLibraries[type];

    if (library.ready()) {
        return Promise.resolve();
    }

    if (extractionLibraryPromises.has(type)) {
        return extractionLibraryPromises.get(type);
    }

    const promise = new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src = library.src;
        script.async = true;
        script.onload = () => {
            if (library.ready()) {
                resolve();
            } else {
                extractionLibraryPromises.delete(type);
                reject(new Error("The document reader could not be initialized."));
            }
        };
        script.onerror = () => {
            extractionLibraryPromises.delete(type);
            reject(new Error("Could not load the document reader. Check your internet connection and try again."));
        };

        document.head.append(script);
    });

    extractionLibraryPromises.set(type, promise);

    return promise;
}

async function extractPDFText(file) {
    await loadExtractionLibrary("pdf");

    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    const documentData = await window.pdfjsLib.getDocument({
        data: new Uint8Array(await file.arrayBuffer())
    }).promise;

    try {
        const pageCount = Math.min(documentData.numPages, MAX_PDF_PAGES);
        const pageTexts = [];

        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
            importStatus.textContent =
                `Reading PDF page ${pageNumber} of ${pageCount}...`;

            const page = await documentData.getPage(pageNumber);
            const content = await page.getTextContent();
            const pageText = content.items
                .map(item => typeof item.str === "string" ? item.str : "")
                .filter(Boolean)
                .join(" ");

            pageTexts.push(pageText);
        }

        if (documentData.numPages > MAX_PDF_PAGES) {
            importStatus.textContent =
                `Read the first ${MAX_PDF_PAGES} of ${documentData.numPages} PDF pages.`;
        }

        return {
            text: pageTexts.join("\n\n"),
            notice: documentData.numPages > MAX_PDF_PAGES
                ? `Only the first ${MAX_PDF_PAGES} PDF pages were read.`
                : ""
        };
    } finally {
        await documentData.destroy();
    }
}

async function extractWordText(file) {
    await loadExtractionLibrary("word");

    const result = await window.mammoth.extractRawText({
        arrayBuffer: await file.arrayBuffer()
    });

    if (result.messages.length) {
        console.warn("Word document import notices:", result.messages);
    }

    return result.value;
}

async function extractImageText(file) {
    await loadExtractionLibrary("image");

    const worker = await window.Tesseract.createWorker("eng", 1, {
        logger: progress => {
            if (progress.status === "recognizing text") {
                importStatus.textContent =
                    `Reading image text... ${Math.round(progress.progress * 100)}%`;
            }
        }
    });

    try {
        const result = await worker.recognize(file);
        return result.data.text;
    } finally {
        await worker.terminate();
    }
}

function getFileType(file) {
    const extension = file.name.split(".").pop().toLowerCase();

    if (file.type === "application/pdf" || extension === "pdf") {
        return "pdf";
    }

    if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        extension === "docx"
    ) {
        return "word";
    }

    if (file.type.startsWith("image/") || [
        "png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"
    ].includes(extension)) {
        return "image";
    }

    throw new Error("Choose a PDF, Word document (.docx), or image file.");
}

async function readSourceFile(file) {
    if (file.size > MAX_IMPORT_FILE_SIZE) {
        throw new Error("This file is larger than 20 MB. Choose a smaller file.");
    }

    const fileType = getFileType(file);
    importStatus.textContent = `Preparing to read ${file.name}...`;

    let text;
    let extractionNotice = "";

    if (fileType === "pdf") {
        const pdfResult = await extractPDFText(file);
        text = pdfResult.text;
        extractionNotice = pdfResult.notice;
    } else if (fileType === "word") {
        text = await extractWordText(file);
    } else {
        text = await extractImageText(file);
    }

    const cleanedText = text
        .split(/\r?\n/)
        .map(line => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n\n")
        .trim();

    if (!cleanedText) {
        throw new Error("No selectable text was found. For scanned PDFs, upload a clear image of the page instead.");
    }

    const wasTruncated = cleanedText.length > MAX_EXTRACTED_TEXT_LENGTH;
    extractedText.value = cleanedText.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
    extractedContent.hidden = false;

    const notices = [];

    if (wasTruncated) {
        notices.push(`showing the first ${MAX_EXTRACTED_TEXT_LENGTH.toLocaleString()} characters`);
    }

    if (extractionNotice) {
        notices.push(extractionNotice);
    }

    importStatus.textContent =
        `Text extracted from ${file.name}${notices.length ? ` (${notices.join("; ")})` : ""}. Choose where to use it below.`;
}

function handleSourceFile(file) {
    if (!file || isExtractingFile) {
        return;
    }

    isExtractingFile = true;
    sourceFileInput.disabled = true;
    extractedContent.hidden = true;

    readSourceFile(file)
        .catch(error => {
            console.error("Unable to extract text from the selected file:", error);
            importStatus.textContent = error.message ||
                "Could not read this file. Please try a different file.";
            showToast(importStatus.textContent, "error");
        })
        .finally(() => {
            isExtractingFile = false;
            sourceFileInput.disabled = false;
            sourceFileInput.value = "";
        });
}

function useExtractedText(targetId) {
    const target = document.getElementById(targetId);
    const text = extractedText.value.trim();

    if (!target || !text) {
        return;
    }

    const combinedText = target.value.trim()
        ? `${target.value.trim()}\n\n${text}`
        : text;
    const maxLength = Number(target.maxLength);
    const wasTruncated = maxLength > -1 && combinedText.length > maxLength;

    target.value = maxLength > -1
        ? combinedText.slice(0, maxLength)
        : combinedText;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.focus();

    if (wasTruncated) {
        const fieldName = targetId === "cardQuestion"
            ? "question"
            : targetId === "cardAnswer" ? "answer" : "notes";
        showToast(`Text added, but shortened to fit the ${fieldName} field.`, "info");
    } else {
        showToast("Extracted text added to your flashcard.", "success");
    }
}

function initializeDocumentImport() {
    sourceFileInput.addEventListener("change", () => {
        handleSourceFile(sourceFileInput.files[0]);
    });

    fileDropZone.addEventListener("dragover", event => {
        event.preventDefault();
        fileDropZone.classList.add("dragging");
    });

    fileDropZone.addEventListener("dragleave", event => {
        if (!fileDropZone.contains(event.relatedTarget)) {
            fileDropZone.classList.remove("dragging");
        }
    });

    fileDropZone.addEventListener("drop", event => {
        event.preventDefault();
        fileDropZone.classList.remove("dragging");
        handleSourceFile(event.dataTransfer.files[0]);
    });

    extractedContent.querySelectorAll("[data-import-target]").forEach(button => {
        button.addEventListener("click", () => {
            useExtractedText(button.dataset.importTarget);
        });
    });
}

// ======================================================
// LIVE PREVIEW
// ======================================================

function updatePreview() {
    const title = titleInput.value.trim();
    const subject = subjectInput.value;
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();
    const difficulty = difficultyInput.value;
    const favorite = favoriteInput.checked;

    previewSubject.textContent = subject || "SELECT A SUBJECT";

    previewQuestion.textContent =
        question || title || "Your question will appear here.";

    previewAnswer.textContent =
        answer || "Your answer will appear here when you turn the card over.";

    previewDifficulty.textContent = difficulty.toUpperCase();

    previewStar.textContent = favorite ? "★" : "☆";

    previewType.textContent = showingAnswer ? "ANSWER" : "QUESTION";

    flashcardPreview.classList.toggle("flipped", showingAnswer);

    questionCount.textContent = `${questionInput.value.length} / 1000`;
    answerCount.textContent = `${answerInput.value.length} / 2000`;
}

function flipPreview() {
    showingAnswer = !showingAnswer;
    updatePreview();
}

function previewCard() {
    updatePreview();

    flashcardPreview.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

    showToast("Your live preview has been updated.", "success");
}

// ======================================================
// VALIDATION
// ======================================================

function displayError(message) {
    formError.textContent = message;
    formError.classList.add("show");
}

function clearError() {
    formError.textContent = "";
    formError.classList.remove("show");
}

function validateForm() {
    const title = titleInput.value.trim();
    const subject = subjectInput.value;
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();

    if (!title) {
        displayError("Please enter a title for your flashcard.");
        titleInput.focus();
        return false;
    }

    if (!subject) {
        displayError("Please choose a subject.");
        subjectInput.focus();
        return false;
    }

    if (!question) {
        displayError("Please enter the question for your flashcard.");
        questionInput.focus();
        return false;
    }

    if (!answer) {
        displayError("Please enter the answer for your flashcard.");
        answerInput.focus();
        return false;
    }

    if (question.toLowerCase() === answer.toLowerCase()) {
        displayError(
            "Your question and answer are identical. Please enter a meaningful answer."
        );

        answerInput.focus();
        return false;
    }

    clearError();
    return true;
}

// ======================================================
// SAVE FLASHCARD
// ======================================================

function handleFormSubmit(event) {
    event.preventDefault();

    clearError();

    if (!validateForm()) {
        return;
    }

    const cards = getFlashcards();
    const now = new Date().toISOString();

    const newCard = {
        id: createId(),
        userId: getUserId(),

        title: titleInput.value.trim(),
        subject: subjectInput.value,
        difficulty: difficultyInput.value,

        question: questionInput.value.trim(),
        answer: answerInput.value.trim(),
        notes: notesInput.value.trim(),

        favorite: favoriteInput.checked,

        createdAt: now,
        updatedAt: now,

        timesStudied: 0,
        correctCount: 0,
        incorrectCount: 0
    };

    cards.unshift(newCard);

    if (!saveFlashcards(cards)) {
        return;
    }

    createdThisSession++;
    sessionCardCount.textContent = createdThisSession;

    form.reset();

    difficultyInput.value = "Medium";
    showingAnswer = false;

    clearError();
    updatePreview();

    showToast("Flashcard created successfully!", "success");

    // Return to the flashcard collection after a short delay.
    window.setTimeout(() => {
        window.location.href = "flashcards.html";
    }, 1000);
}

// ======================================================
// CLEAR FORM
// ======================================================

function clearForm() {
    const hasContent =
        titleInput.value.trim() ||
        subjectInput.value ||
        questionInput.value.trim() ||
        answerInput.value.trim() ||
        notesInput.value.trim() ||
        favoriteInput.checked;

    if (!hasContent) {
        showToast("The form is already empty.");
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to clear the form? Your unsaved changes will be lost."
    );

    if (!confirmed) {
        return;
    }

    form.reset();
    difficultyInput.value = "Medium";

    showingAnswer = false;

    clearError();
    updatePreview();

    showToast("Form cleared.");
}

// ======================================================
// TOAST NOTIFICATIONS
// ======================================================

function showToast(message, type = "") {
    if (!toast) {
        return;
    }

    window.clearTimeout(toastTimeout);

    toast.textContent = message;
    toast.className = "toast";

    if (type) {
        toast.classList.add(type);
    }

    // Trigger transition
    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    toastTimeout = window.setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ======================================================
// HELP
// ======================================================

function showHelp() {
    showToast(
        "Enter a title, subject, question and answer. Optionally import a PDF, Word (.docx), or image and use its extracted text in your card."
    );
}

// ======================================================
// MOBILE SIDEBAR
// ======================================================

function initializeMobileMenu() {
    const menuToggle = $("#menuToggle");
    const sidebar = $("#sidebar");
    const sidebarOverlay = $("#sidebarOverlay");

    if (!menuToggle || !sidebar || !sidebarOverlay) {
        return;
    }

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
}

// ======================================================
// LOGOUT
// ======================================================

function handleLogout() {
    const confirmed = window.confirm("Do you want to log out?");

    if (!confirmed) {
        return;
    }

    // Remove only the login session.
    // Saved flashcards remain in the browser.
    localStorage.removeItem(SESSION_KEY);

    window.location.href = "../index.html";
}

// ======================================================
// INITIALIZATION
// ======================================================

function initializePage() {
    footerYear.textContent = new Date().getFullYear();

    initializeUser();
    initializeMobileMenu();
    initializeProfileMenu();
    initializeDocumentImport();
    updatePreview();

    form.addEventListener("submit", handleFormSubmit);

    [
        titleInput,
        subjectInput,
        difficultyInput,
        questionInput,
        answerInput,
        favoriteInput
    ].forEach((element) => {
        element.addEventListener("input", () => {
            clearError();
            updatePreview();
        });

        element.addEventListener("change", () => {
            clearError();
            updatePreview();
        });
    });

    notesInput.addEventListener("input", clearError);

    clearButton.addEventListener("click", clearForm);
    previewButton.addEventListener("click", previewCard);
    flipButton.addEventListener("click", flipPreview);

    $("#helpButton").addEventListener("click", showHelp);

    logoutButton.addEventListener("click", handleLogout);
}

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

document.addEventListener("DOMContentLoaded", async () => {
    await (window.firebaseStorageReady || Promise.resolve());
    initializePage();
});
