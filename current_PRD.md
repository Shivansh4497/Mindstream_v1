
# Product Requirement Document: Mindstream
**Version:** 1.0
**Date:** [Current Date]
**Status:** In Development (Phase 1 Complete)
**Author:** AI Assistant

---

## 1. Introduction & Vision

### 1.1. Document Purpose
This document provides a detailed overview of the Mindstream application. It outlines the product's vision, target audience, features, user flows, and technical specifications. It serves as a central source of truth for the development team to ensure alignment with the product goals.

### 1.2. App Vision
To be a private, calm, and intelligent reflection companion that transforms a user's scattered thoughts into clear, actionable insights.

### 1.3. Value Proposition
Mindstream is not just a digital journal for storing notes; it's a "second brain" that actively helps users understand themselves better. It leverages AI to find the signal in the noise of their own thoughts, fostering self-awareness and personal growth.

---

## 2. Target Audience

### 2.1. User Base
Mindstream is for individuals who value self-reflection, personal development, and mental clarity. This includes professionals, creatives, students, and anyone looking to organize their thoughts, track their goals, and understand their emotional patterns in a private, secure environment.

### 2.2. Target User Persona
*   **Name:** Alex, the Ambitious Professional
*   **Age:** 28-35
*   **Occupation:** Product Manager / Software Engineer / Designer
*   **Goals:**
    *   Wants to track career growth and manage work-related stress.
    *   Aims to be more intentional with their time and energy.
    *   Seeks to understand the connection between daily activities and long-term goals.
*   **Pain Points:**
    *   Feels overwhelmed by a constant stream of thoughts, ideas, and tasks.
    *   Traditional journaling feels unstructured and time-consuming.
    *   Struggles to see the "big picture" from daily notes.
    *   Values privacy and is hesitant to share deep thoughts with standard note-taking apps.

---

## 3. Core Problems & Use Cases

### 3.1. Problem Statement
Individuals often have a constant stream of thoughts, feelings, and ideas but lack an effective, private tool to capture, connect, and analyze them. This leads to mental clutter, missed insights, and a disconnect between daily actions and long-term aspirations.

### 3.2. Key Use Cases
*   **Capture a Fleeting Thought:** A user has a sudden idea or feeling and wants to quickly capture it without friction, using either text or voice.
*   **Review the Day:** At the end of the day, a user wants to see a summary of their thoughts and feelings to understand how their day went.
*   **Set and Track Goals:** A user wants to define their daily, weekly, or life goals and track their progress against them.
*   **Explore a Specific Topic:** A user wants to understand their recurring thoughts about a specific topic (e.g., "anxiety," "new project") over time.
*   **Gain Deeper Insight:** A user wants to ask questions about their own thoughts, such as "Why was I feeling so stressed last week?" and receive an intelligent, context-aware answer.

---

## 4. App Structure & Core Pillars

### 4.1. Overview
Mindstream is a single-page application (SPA) built around four core pillars, accessible via a main navigation bar. This structure allows users to seamlessly switch between different modes of interaction with their own data.

### 4.2. The Four Pillars
1.  **Stream:** The foundational input layer. A chronological, reverse-sorted feed of all journal entries. It is designed for frictionless thought capture.
2.  **Reflections:** The synthesis layer. An AI-powered engine that condenses journal entries into daily, weekly, and monthly summaries, revealing patterns and themes.
3.  **Chat:** The exploration layer. A conversational AI interface that allows users to "talk" to their own journal, asking questions and exploring their thoughts in a natural way.
4.  **Intentions:** The action layer. A goal-setting and tracking system where users can define their to-dos and aspirations across various timeframes.

---

## 5. Detailed App Functionality

### 5.1. Onboarding & Authentication
*   **Authentication:** Users sign in exclusively via Google OAuth for simplicity and security.
*   **Privacy Modal:** On first launch, a modal appears to assure the user of the app's privacy-first approach, explaining that their data is private and secure. This must be acknowledged to proceed.
*   **Data Fetching:** Upon login, the app fetches all the user's existing entries, reflections, and intentions from the Supabase backend.

### 5.2. The Stream View
*   **Entry Creation:**
    *   **Text Input:** A primary input bar allows users to type their thoughts. `Enter` sends the message.
    *   **Voice Input:** A microphone button initiates the browser's Speech Recognition API, transcribing spoken words into the input bar.
    *   **Guided Prompts:** A series of clickable prompts (e.g., "What's one thing I'm grateful for?") are available to help users overcome writer's block.
*   **AI-Powered Processing:** Upon submitting an entry, the Gemini API is called to:
    *   Generate a concise, descriptive title (e.g., "Reflecting on the team meeting").
    *   Generate 2-4 relevant tags (e.g., `work`, `anxiety`, `collaboration`).
*   **Display:**
    *   Entries are displayed as cards in a reverse-chronological list.
    *   Entries are grouped by day (e.g., "Today," "Yesterday," "October 25, 2023").
    *   Each `EntryCard` shows the title, time, full text, and clickable tags.

### 5.3. Reflections View
*   **Timeframe Navigation:** Users can switch between 'Daily', 'Weekly', and 'Monthly' views.
*   **Generation Logic:**
    *   Users can generate reflections for any period that contains journal entries.
    *   The AI prompt for **Weekly** and **Monthly** reflections is now context-aware, incorporating the user's stated **Intentions** for that period to analyze progress and alignment.
    *   The "Generate" button shows a loading state and becomes an "Update" button if a reflection for that period already exists.
*   **Display:** Generated summaries are shown in `ReflectionCard` components, grouped under their respective date/week/month headers.

### 5.4. Chat View
*   **Conversational UI:** A familiar chat interface displays a history of messages between the user and the AI.
*   **Context-Aware AI:** The Gemini API is provided with a system prompt that includes a summary of the user's recent journal entries and their full list of intentions. This allows the AI to provide deeply personal and relevant answers.
*   **Loading State:** A typing indicator appears while the AI is generating a response.
*   **Markdown Support:** AI responses are rendered as Markdown, allowing for formatting like lists, bolding, etc.

### 5.5. Intentions View
*   **Timeframe Filtering:** Users can filter their intentions by 'Daily', 'Weekly', 'Monthly', 'Yearly', and 'Life'.
*   **CRUD Functionality:**
    *   **Create:** A dedicated input bar allows adding new intentions for the active timeframe.
    *   **Read:** Intentions are displayed in a list, separated into "Pending" and "Completed" sections.
    *   **Update:** Users can toggle an intention's status between 'pending' and 'completed' via a checkbox.
    *   **Delete:** A trash icon allows for permanent deletion of an intention.

### 5.6. Global & Cross-Pillar Features
*   **Universal Search:**
    *   Accessible from the main header, it opens a full-screen modal.
    *   Users can search the full text of all their entries and reflections.
    *   Results can be filtered by 'All', 'Entries', or 'Reflections'.
    *   The search query is highlighted in the results.
*   **Interactive Tags & Thematic Reflections:**
    *   Tags on `EntryCard` components are clickable.
    *   Clicking a tag opens a `ThematicModal`, offering two choices:
        1.  **View all entries:** Opens the Search modal with the tag pre-filled as the query.
        2.  **Generate a thematic reflection:** Calls the Gemini API to create a unique summary of every entry containing that tag, analyzing the theme's evolution over time.
*   **Explore in Chat:**
    *   Each `ReflectionCard` has an "Explore in Chat" button.
    *   Clicking it switches the user to the Chat view and sends a pre-filled message asking the AI to elaborate on the insights from that specific reflection.

---

## 6. UI & UX Flows

### 6.1. Design Philosophy
*   **Aesthetic:** Dark, calm, and minimalist. The color palette (`brand-indigo`, `dark-surface`, `brand-teal`) is chosen to be easy on the eyes and promote a sense of focus and tranquility.
*   **Font:** A clean sans-serif (`Inter`) is used for body text, with a slightly more stylized sans-serif (`DM Sans`) for display headers.
*   **Interactions:** Animations are subtle (`fade-in`, `fade-in-up`) to provide feedback without being distracting.

### 6.2. Key UX Flows
*   **Flow 1: Capturing a Thought**
    1.  User opens the app, landing on the **Stream** view.
    2.  User types a thought into the `InputBar`.
    3.  User presses `Enter` or clicks the `Send` icon.
    4.  The input is submitted; a loading indicator could briefly appear.
    5.  A new `EntryCard` animates into the top of the Stream, complete with an AI-generated title and tags.

*   **Flow 2: Daily Review & Exploration**
    1.  User navigates to the **Reflections** tab.
    2.  Under the "Daily" view, they see a group for "Today" with a button: "Wanna know how your day was?".
    3.  User clicks the button. It enters a "Generating..." state.
    4.  A new `ReflectionCard` appears, showing the AI-generated summary.
    5.  User reads the reflection and clicks the "Explore in Chat" button.
    6.  The app switches to the **Chat** view, and a new message from the user appears, prompting the AI to discuss the reflection.
    7.  The AI begins generating a response.

*   **Flow 3: Thematic Discovery**
    1.  User is browsing the **Stream** view.
    2.  They notice a recurring tag, `project-launch`, and click on it.
    3.  A `ThematicModal` appears.
    4.  User clicks "Generate thematic reflection".
    5.  The button enters a loading state.
    6.  After a moment, a new section appears within the modal displaying a unique summary of all their thoughts about the project launch.

---

## 7. Technical Stack & Services

*   **Frontend Framework:** React with TypeScript
*   **Styling:** Tailwind CSS
*   **Backend as a Service (BaaS):** Supabase
    *   **Authentication:** Supabase Auth (Google OAuth provider)
    *   **Database:** Supabase PostgreSQL
*   **AI Services:** Google Gemini API (`gemini-2.5-flash` model)
*   **Deployment Environment:** Hosted on a modern frontend platform (e.g., Vercel, Netlify) that supports environment variables.
*   **Local State Management:** React Hooks (`useState`, `useEffect`, `useMemo`).
*   **Browser Storage:** `localStorage` is used via a custom hook to persist simple user preferences (e.g., privacy modal acknowledgment).

---

## 8. Assumptions & Dependencies

*   **User Account:** The user must have a valid Google account to use the application.
*   **Environment Variables:** The application requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_KEY` to be correctly configured in the deployment environment for full functionality. A configuration error screen is shown if they are missing.
*   **Browser APIs:** The voice input feature depends on the browser supporting the Web Speech API (`SpeechRecognition`).

---

## 9. Future Scope (Roadmap Summary)
This PRD describes the current "Unified Brain" state of the application. Future phases may include:
*   **Phase 2 (The Proactive Companion):** Introduce features like proactive insight notifications and mood/sentiment visualization.
*   **Phase 3 (The Holistic Life OS):** Explore integrations with external services like calendars and introduce advanced goal management features.

---

## 10. Document History

*   **v1.0 (Current):** Initial creation of the PRD, reflecting the completion of the "Phase 1: The Unified Brain" roadmap.
