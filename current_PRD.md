
# Product Requirement Document: Mindstream
**Version:** 1.1
**Date:** [Current Date]
**Status:** In Development (Phase 2: Habits Integration Complete)
**Author:** AI Assistant

---

## 1. Introduction & Vision

### 1.1. Document Purpose
This document provides a detailed overview of the Mindstream application. It outlines the product's vision, target audience, features, user flows, and technical specifications. It serves as a central source of truth for the development team to ensure alignment with the product goals.

### 1.2. App Vision
To be a private, calm, and intelligent reflection companion that transforms a user's scattered thoughts into clear, actionable insights. Mindstream closes the loop between *feeling* (journaling) and *doing* (habits), acting as a holistic "second brain."

### 1.3. Value Proposition
Mindstream is not just a digital journal for storing notes; it's an active partner in personal growth. It leverages AI to find the signal in the noise of thoughts and correlates internal emotional states with external behaviors (habits), fostering deep self-awareness.

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
    *   Seeks to understand the connection between daily activities (e.g., exercise, reading) and mental well-being.
*   **Pain Points:**
    *   Feels overwhelmed by a constant stream of thoughts, ideas, and tasks.
    *   Struggles to maintain consistency with positive habits.
    *   Often sets goals but forgets the daily systems required to achieve them.
    *   Values privacy and is hesitant to share deep thoughts with standard note-taking apps.

---

## 3. Core Problems & Use Cases

### 3.1. Problem Statement
Individuals often have a constant stream of thoughts and feelings but lack an effective way to connect them to their daily actions. This leads to a disconnect: "Why do I feel anxious?" (Answer: "You haven't exercised in 3 days"). Without tracking behavior alongside sentiment, true insight is limited.

### 3.2. Key Use Cases
*   **Capture a Fleeting Thought:** A user has a sudden idea or feeling and wants to quickly capture it without friction, using either text or voice.
*   **Build Consistency:** A user wants to build specific habits (e.g., "Read 10 pages", "Deep Work") and track adherence without the pressure of aggressive gamification.
*   **Review the Day:** At the end of the day, a user wants to see a summary of their thoughts *and* their productivity.
*   **Understand Cause & Effect:** A user wants the AI to point out, "You tend to feel more 'Grateful' on days where you complete your 'Health' habits."
*   **Explore a Specific Topic:** A user wants to understand their recurring thoughts about a specific topic over time.

---

## 4. App Structure & Core Pillars

### 4.1. Overview
Mindstream is a single-page application (SPA) built around five core pillars, accessible via a main navigation bar. This structure allows users to seamlessly switch between different modes of interaction with their own data.

### 4.2. The Five Pillars
1.  **Stream:** The foundational input layer. A chronological, reverse-sorted feed of all journal entries. It is designed for frictionless thought capture.
2.  **Reflections:** The synthesis layer. An AI-powered engine that condenses journal entries, intentions, and habit logs into daily, weekly, and monthly summaries, revealing patterns and themes.
3.  **Chat:** The exploration layer. A conversational AI interface that allows users to "talk" to their own journal, asking questions and exploring their thoughts in a natural way.
4.  **Intentions:** The goal layer. A task management system where users can define their to-dos and aspirations across various timeframes.
5.  **Habits:** The behavioral layer. A system tracker for recurring actions, categorized by life domain (Health, Career, etc.), designed to measure consistency.

---

## 5. Detailed App Functionality

### 5.1. Onboarding & Authentication
*   **Authentication:** Users sign in exclusively via Google OAuth for simplicity and security.
*   **Privacy Modal:** On first launch, a modal appears to assure the user of the app's privacy-first approach.
*   **Data Fetching:** Upon login, the app fetches all user data (entries, reflections, intentions, habits, logs) from Supabase.

### 5.2. The Stream View
*   **Entry Creation:**
    *   **Text/Voice Input:** Frictionless capture of thoughts.
    *   **Guided Prompts:** Chips to help overcome writer's block.
*   **AI-Powered Processing:** Upon submitting an entry, the Gemini API:
    *   Generates a title.
    *   Generates relevant tags.
    *   Determines a granular sentiment (e.g., "Joyful", "Anxious") and assigns an emoji.
*   **Display:** Chronological cards grouped by day.

### 5.3. Reflections View
*   **Holistic Synthesis:** The Reflection engine now consumes three data sources:
    1.  **Entries:** Qualitative thoughts and feelings.
    2.  **Intentions:** Goal completion status.
    3.  **Habits:** Behavioral consistency and categorical breakdown.
*   **Context-Aware Analysis:** The AI analyzes the correlation between these sources.
    *   *Example:* "I noticed you felt 'Anxious' today, which might be related to missing your 'Meditation' habit, despite completing your work tasks."
*   **Timeframes:** Daily, Weekly, and Monthly generation.
*   **Actionable Suggestions:** The AI suggests 1-2 new intentions based on the reflection.

### 5.4. Chat View
*   **Conversational UI:** A familiar chat interface.
*   **RAG (Retrieval Augmented Generation):** The AI context includes recent journal entries, pending intentions, and habit performance to answer user queries deeply.

### 5.5. Intentions View
*   **Timeframe Filtering:** Filter by 'Daily', 'Weekly', 'Monthly', 'Yearly', 'Life'.
*   **Management:** Create, Toggle (Pending/Completed), and Delete.
*   **Differentiation:** Intentions are for *finite* goals (e.g., "Buy a car"), whereas Habits are for *infinite* systems (e.g., "Save 10% of income").

### 5.6. Habits View
*   **Creation & Classification:**
    *   User inputs a name (e.g., "Go for a run") and selects a frequency (Daily, Weekly, Monthly).
    *   **AI Processing:** Gemini analyzes the text to assign:
        1.  **Emoji:** A visual representation (e.g., 🏃).
        2.  **Category:** One of 6 fixed tags: **Health, Growth, Career, Finance, Connection, System**.
*   **Tracking & Logic:**
    *   **Daily:** Resets every midnight. Streak increases if done consecutively.
    *   **Weekly:** Resets every Monday. Streak increases if done at least once per ISO week.
    *   **Monthly:** Resets on the 1st. Streak increases if done at least once per month.
*   **Visual Feedback:**
    *   **Progress Bar:** A daily completion bar shows percentage of "active" habits done today.
    *   **Streaks:** A subtle "Flame" icon appears for streaks > 2.
    *   **Categories:** Habits are color-coded based on their AI-assigned category (e.g., Health = Red, Finance = Green).

---

## 6. UI & UX Flows

### 6.1. Design Philosophy
*   **Aesthetic:** Dark, calm, and minimalist.
*   **Palette:** `brand-indigo` (Background), `brand-teal` (Accents), `dark-surface` (Cards).
*   **Interactions:** Subtle animations (`fade-in-up`, `ripple`) reward user actions without over-stimulating.

### 6.2. Key UX Flows
*   **Flow 1: Capturing a Thought (Stream)**
    *   User types/speaks -> Entry added -> AI enriches with tags/sentiment -> Appears in feed.

*   **Flow 2: Building a Habit (Habits)**
    *   User types "Read a book" -> Selects "Daily" -> Clicks Add.
    *   AI assigns "📖" and category "Growth" (Amber color).
    *   Habit appears in "Daily Rituals" list.
    *   User taps circle -> Ripple animation -> Circle fills teal -> Progress bar advances.

*   **Flow 3: Daily Review (Reflections)**
    *   User navigates to Reflections.
    *   Clicks "Generate Daily Reflection".
    *   AI reads: "User felt 'Proud', wrote about coding, finished 5/5 'Career' habits".
    *   AI Output: "It was a productive day. Your consistency in Career habits is driving a sense of Pride..."

---

## 7. Technical Stack & Services

*   **Frontend:** React, TypeScript, Tailwind CSS, Vite.
*   **Backend:** Supabase (Auth, PostgreSQL, RLS).
*   **AI:** Google Gemini API (`gemini-2.5-flash`).
*   **Data Model Additions:**
    *   `habits`: Stores name, frequency, category, streak.
    *   `habit_logs`: Stores timestamps of completions for history tracking.

---

## 8. Assumptions & Dependencies

*   **Gemini 2.5:** The app relies on the reasoning capabilities of Gemini 2.5 Flash for accurate sentiment analysis and habit categorization.
*   **Billing:** The Google Cloud project must have billing enabled for the API to function.

---

## 9. Future Scope
*   **Visualization:** Charts showing mood vs. habit completion over time.
*   **Calendar Integration:** Syncing Intentions with Google Calendar.
*   **Proactive Insights:** Push notifications when the AI detects a negative spiral.

---

## 10. Document History

*   **v1.0:** Initial Release (Stream, Reflections, Chat, Intentions).
*   **v1.1 (Current):** Added Habits, AI Categorization, and Frequency logic.
