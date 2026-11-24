# Major UI Elements to Design for BANTAI

**Product Overview:**  
**BANTAI** (*Apna Model. Apna Dimaag. Apna AI.*) is a local-first, self-hosted agentic AI assistant with an authentic Mumbai Tapori personality. All visual direction—colors, typography, themes, layout geometry, spacing, icons, and styling—is completely open for the designer to craft from scratch. Below is the complete list of pages and UI elements required across the platform.

---

## 1. AI Chat Interface (ChatGPT-like)

* **Left Sidebar**
  * BANTAI Logo & Title
  * New Chat Button
  * Chat History List (Conversation title, timestamp, pin / rename / delete options)
  * Search Bar (Filter past conversations)
  * User Profile Quick Menu (Avatar, Name, Settings & Reset Session access)
* **Top Navigation / Status Bar**
  * Current Active Model Indicator (Quick switcher)
  * System Connection Status Badge (Local AI Live / Offline Fallback Mode)
  * Personality Mode Switcher Pills
  * Live Hardware Telemetry Readouts (CPU %, RAM Usage, GPU VRAM Usage)
* **Main Chat Area**
  * Scrollable Message Feed
* **Welcome Screen with Suggested Prompts (Empty State)**
  * Brand Headline (*"Apna Model. Apna Dimaag. Apna AI."*) & Subheading
  * Suggested Prompt Cards (Clickable prompt cards with title & short description)
  * Quick Local Model Cards (`Chhotu 3B`, `Bhai 7B` with brief capabilities & hardware info)
* **User & AI Message Bubbles**
  * Message Sender Label / Personality Tag & Timestamp
  * Rich Text & Markdown Rendering (Headings, bullet lists, inline emphasis)
  * Code Block Container (Language label + Copy Code button)
* **Message Actions**
  * Copy Full Message
  * Voice Readout (Play / Stop audio)
  * Regenerate Response
  * Feedback (Thumbs Up / Thumbs Down + optional text correction)
* **Chat Input Box**
  * Multi-line Text Input Field
  * File Attachment Button (plus attached file preview chip)
  * Voice Input (Microphone button)
  * Code / Monospace Text Mode Toggle
  * Quick Personality Mode Toggle
  * Send Button
* **Model Selector**
  * Active Local Models: **Chhotu (3B)**, **Bhai (7B — Default)** *(plus room to scale if future models are added)*
* **Personality Selector**
  * **Tapori**, **Balanced**, **Professional**, **Developer**, **Academic**
* **Voice Input / Output**
  * Active Listening Indicator & Live Speech-to-Text Preview
  * Audio Playback Indicator for AI Voice Responses
* **Streaming & Loading States**
  * Thinking / Loading Skeleton State
  * Live Streaming Response State & Stop Generating Button
  * Error / Offline Notice State

---

## 2. Personal Dashboard

* **Welcome Header** (User Name, Avatar / Profile Summary, Quick Actions)
* **Total Tokens Used** (Overall cumulative token counter)
* **Remaining Tokens** (Remaining quota / compute budget indicator)
* **Model-wise Token Usage** (Breakdown per model: `Chhotu`, `Bhai`)
* **Input vs Output Token Statistics** (Prompt tokens vs generated response tokens comparison)
* **Models Personally Trained** (Custom trained local model summary: version, base model, accuracy score, training loss, status)
* **Token Usage Progress Bars** (Visual quota / usage meters per model & period)
* **Daily / Weekly / Monthly Usage Charts** (Timeframe toggle + activity & token usage graphs)
* **Total Conversations** (Summary count card)
* **Total Messages** (Summary count card)
* **Most Used AI Model** (Highlighted model card with usage share)
* **Average Response Time** (Latency & generation speed `tok/s` summary)
* **Recent Chat History** (Quick list to resume latest conversations)
* **Model Availability Status** (Loaded / Downloaded / Offline status per model)
* **System Status (Online / Offline)** (Backend API, Local Inference Engine, Database Privacy Status)

---

## 3. Settings

* **Personal Information:** Profile Picture, Full Name, Username, Email
* **Account & Security:** Change Password, Manage Active Sessions, Connected OAuth Status, Sign Out / Reset Session
* **AI Preferences:** Default Model, Default Personality (with mode descriptions), Default Language (`Hinglish`, `Hindi`, `English`)
* **Model Settings:** Local Inference Engine Choice, Daemon Server URL Input, Generation Preferences, Voice Synthesis Settings (Enable Voice Output, Voice Gender, Speech Speed, Voice Provider)
* **Appearance:** Dark / Light / System Theme, Accent Color, Font Size
* **Chat Preferences:** Enter-to-Send Toggle, Save Chat History Toggle, Response Formatting Settings, Sound Effects Toggle
* **Token & Usage:** Usage Limits, Token Quotas, Show Token Telemetry Toggle
* **Notifications:** Reminder & Task Notifications, Hardware / System Alerts, Notification Delivery Channels
* **Privacy:** Personal Memory Extraction Toggle, Local-Only Storage / Air-Gap Verification Status, Opt-In Model Training Consent Toggle, Clear All Memories, Export Data, Permanent Account & Data Wipe Action
* **About BANTAI:** Version, Documentation Links, Open-Source License, Credits

---

## 4. Autonomous Agent Workspace

* **Agent Queue Sidebar**
  * New Agent Goal Input & Launch Button
  * Task List Cards (Task Name, Goal Preview, Step Count, Timestamp, Status: Running / Done / Needs Permission / Failed)
* **Agent Execution Log**
  * Selected Task Header & Overall Status
  * Step-by-Step Execution Cards (Step Number, Tool Name, Input Parameters, Execution Output, Step Status)
  * Permission Trigger Button on Sensitive Steps
* **Tool Authorization Gate Modal**
  * Warning Header (Human-in-the-loop approval prompt)
  * Tool Name, Action Description, and Parameters Preview
  * Reject & Abort Button + Authorize / Approve Button

---

## 5. Personal Memory & Knowledge Base

* **Header & Controls**
  * Search / Filter Input
  * Add Memory Button & Clear All Action
* **Add Memory Form**
  * Category Selector (`Preference`, `Fact`, `Code`, `Context`), Memory Text Input, Save & Cancel Buttons
* **Memory Cards Grid**
  * Category Badge, Saved Memory Content, Timestamp, Delete Button, Empty State Message
* **Knowledge Base / Document RAG**
  * Document Upload Control, Uploaded Documents List (Filename, File Size, Chunk Count), Semantic Search Test Box & Matched Passages Preview

---

## 6. Local Model Fine-Tuning Studio

* **Studio Header & Run Training Button**
* **Summary Metric Cards**
  * Training Opt-In Consent Toggle Card
  * Curated Feedback Samples Count & Baseline Loss Card
  * Dataset Split Summary Card (`Train / Validation / Test`)
* **Training Output Log Console**
  * Live Terminal Log Stream displaying Epochs, Loss, and Hardware Progress
* **Trained Adapters Registry Table**
  * Adapter Version, Base Model, Evaluation Score, Final Loss, Status (`Active` / `Archived`), Date, Export & Rollback Actions

---

## 7. Authentication, Onboarding & System Dialogs

* **Sign In & Sign Up Screen / Modal**
  * Brand Logo & Tagline
  * Sign In / Create Account Switcher
  * Full Name, Username, Email, Password Inputs (with Show/Hide Password toggle), Submit Button, Optional Google Sign-In Button
* **App Startup Loading State**
  * Loading Indicator & Runtime Initialization Status Message
* **Confirmation Modals**
  * Confirmation Prompts for *Reset Session*, *Clear All Memories*, and *Delete All Data*

---

## 8. Mobile App Screens (Android Companion)

* **Mobile Login / Sign Up Screen**
* **Mobile Header** (App Title, Active Model & Personality Switcher)
* **Chat Screen** (Message List + Input Bar + Send Button)
* **Tasks Screen** (Add Task Input + Task Items with Status Label)
* **Settings Screen** (Memory & Training Status Summary + Sign Out Button)
* **Bottom Tab Navigation** (`Chat`, `Tasks`, `Settings`)
