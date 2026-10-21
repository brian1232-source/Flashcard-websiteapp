import { AZ900_AREAS } from "./az900-question-bank.js";

const ICONS = {
    "dashboard.html": "fa-gauge-high",
    "flashcards.html": "fa-layer-group",
    "revision.html": "fa-rotate-right",
    "quiz.html": "fa-circle-question",
    "mock-exam.html": "fa-clock",
    "analytics.html": "fa-chart-line",
    "settings.html": "fa-gear"
};

function makeLink({ href, label, icon, active, dashboard, className = "" }) {
    const link = document.createElement("a");
    link.href = href;
    link.className = `${dashboard ? "nav-item" : "nav-link"}${active ? " active" : ""}${className ? ` ${className}` : ""}`;
    if (active) link.setAttribute("aria-current", "page");
    const iconElement = document.createElement("i");
    iconElement.className = `fa-solid ${icon}`;
    link.append(iconElement);
    const text = document.createElement("span");
    text.textContent = label;
    link.append(text);
    return link;
}

function renderSidebar() {
    const sidebar = document.querySelector("#sidebar");
    if (!sidebar) return;

    const dashboard = !!sidebar.querySelector(".nav-list");
    const navs = [...sidebar.querySelectorAll(dashboard ? ".nav-list" : ".sidebar-nav")];
    const nav = navs[0];
    if (!nav) return;

    const page = location.pathname.split("/").pop() || "dashboard.html";
    const selectedTopic = new URLSearchParams(location.search).get("topic");
    const topicsOpen = page === "study.html" || (page === "quiz.html" && !!selectedTopic);
    const items = [
        ["dashboard.html", "Dashboard"],
        ["flashcards.html", "My Flashcards"],
        ["revision.html", "Smart Revision"],
        ["quiz.html", "Practice Quiz"],
        ["mock-exam.html", "Mock Exam"],
        ["analytics.html", "My Progress"]
    ];
    nav.replaceChildren();
    navs.slice(1).forEach(extra => extra.remove());
    sidebar.querySelectorAll(".side-label-settings, .secondary-label").forEach(label => label.remove());

    items.slice(0, 2).forEach(([href, label]) => {
        nav.append(makeLink({ href, label, icon: ICONS[href], active: page === href || (href === "flashcards.html" && page === "create-flashcard.html"), dashboard }));
    });

    const topicGroup = document.createElement("div");
    topicGroup.className = "study-topic-group";
    const topicToggle = document.createElement("button");
    topicToggle.type = "button";
    topicToggle.className = `${dashboard ? "nav-item" : "nav-link"} topic-dropdown-toggle${topicsOpen ? " active" : ""}`;
    topicToggle.setAttribute("aria-expanded", topicsOpen ? "true" : "false");
    topicToggle.setAttribute("aria-controls", "studyTopicsSubmenu");
    const topicIcon = document.createElement("i");
    topicIcon.className = "fa-solid fa-book-open";
    const topicText = document.createElement("span");
    topicText.textContent = "Study Topics";
    const caret = document.createElement("i");
    caret.className = "fa-solid fa-chevron-down topic-caret";
    caret.setAttribute("aria-hidden", "true");
    topicToggle.append(topicIcon, topicText, caret);

    const submenu = document.createElement("div");
    submenu.className = "topic-submenu";
    submenu.id = "studyTopicsSubmenu";
    submenu.hidden = !topicsOpen;
    submenu.append(makeLink({ href: "quiz.html?topic=az900:all&start=1", label: "All AZ-900 topics", icon: "fa-book", active: selectedTopic === "az900:all", dashboard, className: "topic-submenu-link" }));
    AZ900_AREAS.forEach((area, areaIndex) => {
        const group = document.createElement("details");
        group.className = "topic-area";
        group.open = selectedTopic === `area:${areaIndex}` || selectedTopic?.startsWith(`topic:${areaIndex}:`) || false;
        const title = document.createElement("summary");
        title.textContent = area.name;
        group.append(title);

        const areaLink = makeLink({
            href: `quiz.html?topic=area:${areaIndex}&start=1`,
            label: "Practice this learning area",
            icon: "fa-circle-play",
            active: selectedTopic === `area:${areaIndex}`,
            dashboard,
            className: "topic-submenu-link area-practice-link"
        });
        group.append(areaLink);
        area.topics.forEach((topic, topicIndex) => {
            const link = makeLink({
                href: `quiz.html?topic=topic:${areaIndex}:${topicIndex}&start=1`,
                label: topic[0],
                icon: "fa-bookmark",
                active: selectedTopic === `topic:${areaIndex}:${topicIndex}`,
                dashboard,
                className: "topic-submenu-link topic-leaf"
            });
            group.append(link);
        });
        submenu.append(group);
    });
    topicToggle.addEventListener("click", () => {
        const opening = submenu.hidden;
        submenu.hidden = !opening;
        topicToggle.setAttribute("aria-expanded", String(opening));
    });
    topicGroup.append(topicToggle, submenu);
    nav.append(topicGroup);

    items.slice(2).forEach(([href, label]) => {
        nav.append(makeLink({ href, label, icon: ICONS[href], active: page === href, dashboard }));
    });

    const settingsLabel = document.createElement("div");
    settingsLabel.className = dashboard ? "side-label side-label-settings" : "sidebar-label secondary-label";
    settingsLabel.textContent = dashboard ? "PREFERENCES" : "PREFERENCES";
    nav.append(settingsLabel, makeLink({ href: "settings.html", label: "Settings", icon: ICONS["settings.html"], active: page === "settings.html", dashboard }));

    const logout = sidebar.querySelector(".logout-button");
    const logoutText = logout?.querySelector("span:last-child");
    if (logoutText) logoutText.textContent = "Log out";
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
        sidebar.classList.remove("open");
        const overlay = document.querySelector("#sidebarOverlay");
        overlay?.classList.remove("active", "show", "visible");
        document.body.classList.remove("sidebar-open");
        const toggle = document.querySelector("#menuToggle");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
    }));
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(renderSidebar, 0), { once: true });
} else {
    renderSidebar();
}
