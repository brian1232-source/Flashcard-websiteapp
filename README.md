
> ⚠️ **DISCLAIMER — UNOFFICIAL AZ-900 STUDY TOOL**
>
> Flashcard Coach is an independent, unofficial educational project designed to help learners prepare for the Microsoft Azure Fundamentals (AZ-900) certification exam. It is **not affiliated with, endorsed by, or sponsored by Microsoft**.
>
> All practice questions created for Flashcard Coach are original learning materials based on publicly available AZ-900 study objectives. The application does not reproduce actual or recalled certification exam questions and does not guarantee exam success.
>
> Microsoft, Azure, and AZ-900 are trademarks of their respective owners. Flashcard Coach is intended to supplement, not replace, Microsoft's official documentation and learning resources.
>
> For the latest exam objectives, consult the [official Microsoft AZ-900 Study Guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900).

---

# 🎓 Flashcard Coach

### Learn Smarter. Remember Longer.

**Flashcard Coach** is a browser-based learning application designed to help learners prepare for the Microsoft Azure Fundamentals (AZ-900) certification exam.

The platform brings flashcard creation, topic-based practice questions, timed mock exams, revision activities, and learning progress tracking together in one place.

Whether you are beginning your cloud computing journey or preparing for your certification exam, Flashcard Coach helps you organize your learning, reinforce important concepts, and practise at your own pace.

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Project Objectives](#-project-objectives)
- [Features](#-features)
- [AZ-900 Study Areas](#-az-900-study-areas)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Firebase Configuration](#-firebase-configuration)
- [Project Structure](#-project-structure)
- [Data and Security](#-data-and-security)
- [Future Improvements](#-future-improvements)
- [Official Study Resources](#-official-study-resources)
- [Acknowledgements](#-acknowledgements)

---

## 📖 About the Project

Preparing for a certification exam requires consistent revision, practice, and a good understanding of important concepts.

Flashcard Coach provides a structured environment where learners can create their own flashcards, explore AZ-900 study topics, answer original practice questions, take timed mock exams, and review their learning progress.

The application organizes its study content around the three main learning areas of the AZ-900 certification exam.

### 🎯 Project Objectives

- Make cloud computing concepts easier to understand and revise.
- Organize AZ-900 study content into manageable topics.
- Encourage active recall through flashcards.
- Provide opportunities to practise with original questions.
- Help learners identify areas that require additional revision.
- Encourage consistent study habits through progress tracking.

---

## ✨ Features

### 1. 📊 Student Dashboard

A central dashboard for accessing learning activities and reviewing study progress.

- Overview of flashcard totals.
- Study activity and progress statistics.
- Revision reminders.
- Daily study goals.
- Quick access to important learning features.

### 2. 🗂️ My Flashcards

Create and manage personalized study cards.

- Create flashcards with questions and answers.
- Edit and organize saved flashcards.
- Group cards by AZ-900 topic.
- Browse and study saved cards.
- Reinforce learning through active recall.

### 3. 📚 Study Topics

Explore AZ-900 content through structured learning areas and subtopics.

- Browse the three main AZ-900 study areas.
- Navigate individual topics.
- Access related learning materials and practice questions.
- Organize revision by subject area.

### 4. 🔄 Smart Revision

Review flashcards that require additional practice.

- Identify cards due for revision.
- Revisit previously studied concepts.
- Reinforce understanding through repeated review.
- Support consistent study habits.

### 5. 📝 Practice Quiz

Test your understanding with practice questions.

- Practise original AZ-900 topic-based questions.
- Review your understanding of cloud concepts.
- Use saved flashcards as additional study material.
- Identify topics that need further attention.

### 6. ⏱️ Mock Exam

Practise answering questions in a timed exam-style environment.

- Select a learning area or topic.
- Preview a question before starting, where supported.
- Answer questions within the available time.
- Review your results after completing an exam.

Mock exams are educational practice activities and are not replicas of the actual Microsoft certification exam.

### 7. 📈 My Progress

Monitor your study activity and performance.

- Review quiz results.
- Track topic-level progress.
- Monitor completed learning activities.
- Identify strengths and areas for improvement.

### 8. 🔐 Authentication and Cloud Synchronization

Firebase integration supports user authentication and cloud data storage.

- User registration and sign-in through Firebase Authentication.
- Cloud Firestore integration for storing application data.
- User-specific access controls through Firestore Security Rules.
- Browser storage for supported local caching.

Authentication and synchronization require valid Firebase configuration and an available network connection.

---

## ☁️ AZ-900 Study Areas

Flashcard Coach organizes study materials into three main learning areas based on the AZ-900 exam outline.

### 1. Describe Cloud Concepts

Understand the fundamental principles of cloud computing.

Topics include:

- Introduction to cloud computing.
- Benefits of cloud computing.
- Public, private, and hybrid cloud models.
- Infrastructure as a Service (IaaS).
- Platform as a Service (PaaS).
- Software as a Service (SaaS).
- Shared responsibility model.
- Consumption-based model.
- Cloud scalability, reliability, and availability.

### 2. Describe Azure Architecture and Services

Explore Azure infrastructure and its core services.

Topics include:

- Azure regions and region pairs.
- Availability zones.
- Azure resources and resource groups.
- Subscriptions and management groups.
- Azure virtual machines.
- Azure virtual networks.
- Azure storage services.
- Azure database services.
- Azure App Service.
- Azure Functions.
- Container services.
- Microsoft Entra ID.
- Azure networking solutions.

### 3. Describe Azure Management and Governance

Learn how Azure resources are managed, secured, and monitored.

Topics include:

- Azure pricing and cost management.
- Azure Pricing Calculator.
- Total Cost of Ownership (TCO) Calculator.
- Azure tags.
- Azure Policy.
- Resource locks.
- Microsoft Purview.
- Role-Based Access Control (RBAC).
- Microsoft Defender for Cloud.
- Service-level agreements (SLAs).
- Azure portal.
- Azure Cloud Shell.
- Azure CLI.
- Azure PowerShell.

**Important:** These topics provide a study structure, not a guarantee of the exact content appearing on the exam. Microsoft may update the exam objectives. Always consult the official study guide for the latest requirements.

### Question Bank

The AZ-900 question bank is maintained in:

[`js/az900-question-bank.js`](js/az900-question-bank.js)

It organizes original practice questions by learning area and topic.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure and web pages |
| CSS3 | Styling, layouts, and responsive interfaces |
| JavaScript | Application functionality and interactions |
| Firebase Authentication | User registration and authentication |
| Cloud Firestore | Cloud data storage and synchronization |
| Browser localStorage | Supported local caching and data storage |
| Python HTTP Server | Local development and testing |
| Git | Version control |
| GitHub | Source code hosting |
| Vercel | Website deployment and hosting |

Flashcard Coach uses standard HTML, CSS, and JavaScript without requiring a frontend build process.

---

## 🚀 Getting Started

Follow these steps to run Flashcard Coach on your local computer.

### Prerequisites

Make sure you have:

- Git installed.
- Python 3 installed.
- A modern web browser.
- A Firebase project if you want to use authentication and cloud synchronization.

### Step 1: Clone the Repository

Open your terminal and run:

```bash
git clone https://github.com/brian1232-source/Flashcard-websiteapp.git
```

### Step 2: Enter the Project Directory

```bash
cd Flashcard-websiteapp
```

### Step 3: Start the Local Web Server

Run the following command:

```bash
python3 -m http.server 8000
```

The application uses browser JavaScript modules, so it should be served over HTTP rather than opened directly as a local HTML file.

### Step 4: Open the Application

Visit:

**http://localhost:8000**

Register or sign in to access the application.

**Note:** Firebase-dependent features require a valid Firebase configuration. Without it, authentication and cloud synchronization may not work.

To stop the local server, press `Ctrl + C` in the terminal.

---

## 🔥 Firebase Configuration

Flashcard Coach uses Firebase Authentication and Cloud Firestore for account authentication and cloud data storage.

To configure the application with your own Firebase project, follow these steps.

### 1. Create a Firebase Project

Visit the [Firebase Console](https://console.firebase.google.com/) and create a project.

### 2. Register a Web Application

Register a web application within your Firebase project and obtain its Firebase configuration.

### 3. Enable Authentication

Open Firebase Authentication and enable the **Email/Password** sign-in provider.

### 4. Create a Cloud Firestore Database

Create a Cloud Firestore database and configure appropriate security rules.

### 5. Configure the Application

Open:

[`js/firebase.js`](js/firebase.js)

Replace the existing Firebase web configuration with the configuration for your project.

Preserve the existing initialization logic and application structure.

### 6. Configure Authorized Domains

Add the appropriate hostname to Firebase Authentication's authorized domains.

For local development, this may include:

`localhost`

For a deployed application, configure the actual hostname as required.

### 7. Verify Security Rules

Make sure your Firestore Security Rules restrict access to authorized users and their own data.

**Security reminder:** Never publish Firebase Admin SDK credentials, service-account private keys, or other server-side secrets in frontend code. Firebase web configuration is designed for client-side use, but appropriate Firestore Security Rules are essential.

---

## 📁 Project Structure

The application separates its pages, styles, and JavaScript functionality into dedicated files.

```text
Flashcard-websiteapp/
│
├── index.html
│
├── pages/
│   ├── dashboard.html
│   ├── flashcards.html
│   ├── create-flashcard.html
│   ├── study.html
│   ├── quiz.html
│   ├── mock-exam.html
│   ├── revision.html
│   ├── analytics.html
│   └── settings.html
│
├── css/
│   ├── dashboard.css
│   ├── sidebar-navigation.css
│   ├── mock-exam.css
│   └── ...
│
├── js/
│   ├── firebase.js
│   ├── dashboard.js
│   ├── create-flashcard.js
│   ├── study.js
│   ├── quiz.js
│   ├── mock-exam.js
│   ├── az900-question-bank.js
│   ├── sidebar-navigation.js
│   └── ...
│
├── images/
│   └── logo.png
│
└── README.md
```

*This is an overview of the main application files. The actual structure may include additional files and folders.*

---

## 🔒 Data and Security

Flashcard Coach uses browser storage and Firebase services, depending on the feature and configuration.

Application data may include:

- User account information managed through Firebase Authentication.
- Flashcards and study materials.
- Quiz results and study statistics.
- User preferences.
- Learning progress.

Security considerations:

- Use Firestore Security Rules to protect user data.
- Restrict users to accessing only the information they are authorized to access.
- Never store passwords or private credentials in browser storage.
- Avoid committing secrets or sensitive configuration files to GitHub.
- Test authentication and synchronization before deploying changes.

Browser `localStorage` is stored on the user's device and should not be treated as a secure storage location for sensitive information.

---

## 🌱 Future Improvements

Potential future enhancements include:

- AI-assisted flashcard generation.
- Personalized revision recommendations.
- Additional AZ-900 practice questions.
- Enhanced performance analytics.
- Study reminders and learning streaks.
- Improved offline learning support.
- Additional accessibility improvements.
- Expanded mobile and tablet support.

These are potential improvements rather than a statement that every feature is currently implemented.

---

## 📖 Official Study Resources

Use Microsoft's official learning materials alongside Flashcard Coach.

- **[AZ-900 Study Guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900)** — official exam skills outline.
- **[Azure Fundamentals Learning Path](https://learn.microsoft.com/en-us/training/paths/az-900-describe-cloud-concepts/)** — cloud concepts learning materials.
- **[Microsoft Azure Documentation](https://learn.microsoft.com/en-us/azure/)** — documentation for Azure services.

Check the official study guide regularly because certification objectives can change.

---

## 🙌 Acknowledgements

Flashcard Coach is built around the goal of making cloud learning more organized, accessible, and practical for students and aspiring cloud professionals.

Thanks to the learning resources provided through Microsoft Learn, which help learners understand Azure concepts and prepare for certification.

---

## 👨‍💻 Developer

**Brian Kasyuma Ndanu**

ICT Technician Level 6 Student  
Baringo National Polytechnic

### Flashcard Coach

**Learn Smarter. Remember Longer.**

An independent educational project for AZ-900 learning and practice.
