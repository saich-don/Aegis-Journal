# Aegis Journal 🛡️🧠

> An authenticated, multi-modal personal AI companion featuring semantic memory recall, cognitive synthesis, and zero-trust data isolation. Built with **Google AI Studio**, **Gemini 2.5 Flash**, **Firebase Auth**, **Firestore**, and **Google Cloud Secret Manager**.

---

## 🌟 Key Features

### 🎙️ Multi-Modal Spoken Journaling
- **Real-Time Voice Dictation:** Speak directly to your journal; Aegis transcribes and processes spoken entries seamlessly.
- **Empathetic Processing:** Powered by Gemini 2.5 Flash to provide empathetic, contextual feedback and structured reflection prompts.

### 🔍 "Ask My Past Self" Memory Recall Engine
- **Semantic Cross-Entry Querying:** Search across historical journal logs using natural language to uncover patterns, retrospectives, and behavioral trends.
- **Interactive Citations:** Direct tracebacks and citations referencing specific past journal entries.

### 📈 Weekly Cognitive & Growth Digest
- **Automated Synthesis:** Generates executive summaries of emotional trajectories, personal wins, and growth areas over customizable timeframes.
- **Actionable Directives:** Offers tailored recommendations to foster long-term mental clarity and personal development.

---

## 🔒 Architecture & Security

Aegis Journal follows enterprise security practices to guarantee privacy and zero-trust data boundaries:
[ Client Interface ] ──(Firebase Auth)──► [ Firestore: users/{userId}/journal_entries ]
│                                                      │
└───────────► [ Server / Proxy ] ──────────────────────┘
│
(Secret Manager API Key Fetch)
▼
[ Gemini 2.5 Flash API ]

* **Firebase Authentication:** Secures user identity across sessions with strict client/server authorization checks.
* **Granular Firestore Isolation:** All personal journal records reside exclusively in isolated `users/{userId}/journal_entries` subcollections governed by strict Firestore Security Rules.
* **Server-Side Secret Management:** The Gemini API key is retrieved via Google Cloud Secret Manager proxying on backend routines, ensuring zero client-side key exposure.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, Modern CSS, TypeScript / JavaScript, Firebase Web SDK
* **AI Model:** Gemini 2.5 Flash via Google AI Studio / Gemini API
* **Database & Auth:** Google Firebase Authentication & Cloud Firestore
* **Security & Infrastructure:** Google Cloud Secret Manager, Cloud Run target architecture

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* Firebase Project with Auth and Firestore enabled
* Google Cloud Project with Secret Manager enabled

### Installation

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/saich-don/Aegis-Journal.git](https://github.com/saich-don/Aegis-Journal.git)
   cd Aegis-Journal
Install Dependencies:

Bash
npm install
Configure Firebase:
Ensure your Firebase web configuration is present in firebase-applet-config.json:

JSON
{
  "projectId": "YOUR_PROJECT_ID",
  "appId": "YOUR_APP_ID",
  "apiKey": "YOUR_FIREBASE_WEB_KEY",
  "authDomain": "YOUR_AUTH_DOMAIN",
  "firestoreDatabaseId": "(default)"
}
Set Up Secret Manager:
Store your Gemini API Key in Google Cloud Secret Manager under GEMINI_API_KEY.

Run Locally:

Bash
npm run dev
