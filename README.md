# Flashcard Coach

Flashcard Coach is a browser-based study app for learning Azure Fundamentals (AZ-900). Create flashcards, practise with original topic-based questions, take timed mock exams, and track study progress.

## Features

- **Dashboard** — learning activity, flashcard totals, revision reminders, and daily study goal.
- **Flashcards** — create, edit, browse, and study cards organized by AZ-900 topic.
- **Study Topics** — navigate the three AZ-900 learning areas and their subtopics.
- **Smart Revision** — review flashcards that are due.
- **Practice Quiz** — practise with original AZ-900 questions or your own flashcards.
- **Mock Exam** — select a learning area or topic, preview a question, and take a timed exam.
- **My Progress** — review study activity, quiz results, and topic progress.
- **Firebase accounts and sync** — Firebase Authentication and Cloud Firestore sync account data.

The AZ-900 question bank is maintained in [`js/az900-question-bank.js`](js/az900-question-bank.js). Its original practice questions are grouped by learning area and topic. The question bank contains no real or recalled exam questions.

## Run the app locally

This project uses browser JavaScript modules, so serve it over HTTP instead of opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000), then sign in or create an account.

## Firebase setup

To run the app with your own Firebase project:

1. Create a Firebase project and register a web app.
2. Enable **Email/Password** under Firebase Authentication sign-in providers.
3. Create a Cloud Firestore database.
4. Replace the web app configuration in [`js/firebase.js`](js/firebase.js) with your project configuration.
5. Add the local app origin (for example, `http://localhost:8000`) to Firebase Authentication's authorized domains.

The Firebase web configuration is client-side app configuration, not a server secret. Protect data with Firebase Authentication and Firestore Security Rules. The included rules scope user documents to the signed-in user's UID.

Flashcards, study statistics, and quiz results use the browser's `localStorage` as a cache and sync to the signed-in user's Firestore data when Firebase is configured and available. Study preferences are stored in the user's Firestore preferences document.

## Hosting and services

- **GitHub** stores the source code and its version history.
- **Vercel** hosts and serves the website. If Vercel is connected to this GitHub repository, commits to its configured deployment branch can trigger a new deployment.
- **Firebase** provides user sign-in with Firebase Authentication and stores account data in Cloud Firestore. Firebase is the app's backend; it does not host the website in this setup.

The site is a static HTML, CSS, and JavaScript app with no build step. A local preview can use the Python web server shown above; the deployed site is served by Vercel.

## Project structure

```text
index.html                     Sign-in and account registration
pages/                         Dashboard, flashcards, study, quiz, mock exam, and settings pages
css/                           Page styles and shared navigation styles
js/                            Page behavior, Firebase integration, and AZ-900 question bank
js/az900-question-bank.js      Topic catalog and original practice questions
images/logo.png                Flashcard Coach logo
```

## AZ-900 study topics

The app organizes study content under these areas:

1. Describe Cloud Concepts
2. Describe Azure Architecture and Services
3. Describe Azure Management and Governance

Exam objectives can change. Check the [official AZ-900 study guide on Microsoft Learn](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900) for the current exam outline and preparation guidance.

## Disclaimer

Flashcard Coach is an independent, unofficial learning project. It is not affiliated with, endorsed by, or sponsored by Microsoft. Microsoft, Azure, and AZ-900 are trademarks of the Microsoft group of companies. This app does not guarantee exam results or replace Microsoft's official study materials. Its practice questions are written for this project and are not actual certification exam questions.
