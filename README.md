# MedBridge AI - Healthcare Doctor–Patient Translation

**MedBridge AI** is a real-time, AI-powered communication bridge designed to eliminate language barriers in healthcare. It enables doctors and patients to communicate effortlessly through speech and text, ensuring accurate medical consultations regardless of the languages spoken.

## ✨ Features

### 1. Real-Time Translation [MANDATORY]
- **Dual Role Support**: Professional interfaces for both **Doctors** and **Patients**.
- **Instant Bridge**: Near real-time translation of medical dialogue using advanced LLMs (`gpt-5-nano`).
- **Medical Accuracy**: Prompt-engineered to preserve clinical terminology (dosages, symptoms, anatomy).

### 2. Audio & Voice Bridge [MANDATORY]
- **In-Browser Recording**: capture audio directly via the browser.
- **Voice-to-Voice Flow**: Automatic STT (Speech-to-Text) followed by translation.
- **Persistent Playback**: Recorded audio clips are saved to the cloud and can be replayed anytime.

### 3. Full-Stack Persistence & Auth [MANDATORY]
- **Puter.js Integration**: Uses Puter as a robust cloud backend (Auth, KV Store, AI).
- **Secure Authentication**: Conversations are locked behind a HIPAA-ready secure login.
- **Cloud History**: Conversations persist across devices and sessions via cloud Key-Value storage.

### 4. Healthcare Intelligence
- **Dual-Role AI Summary**: Generates two distinct clinical summaries: a highly technical one for the doctor's records, and a warm, plain-language breakdown for the patient.
- **Conversation Search**: Global search across logs with high-performance text highlighting.
- **Document Analysis**: Securely upload and summarize medical documents (PDFs, text files) directly within the chat interface.

---

## 🛠 Tech Stack

- **Frontend**: React.js, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Backend/Infrastructure**: [Puter.js](https://js.puter.com) (Auth, Cloud Functions, KV Storage)
- **AI Models**: GPT-series (via Puter AI)
- **Voice**: Web Speech API (Recognition) & MediaRecorder API

---

## 🛠 AI Tools & Resources Leveraged
- **Puter AI**: Used for high-fidelity translation and clinical summarization.
- **Lucide Icons**: For medical-grade iconography.
- **Tailwind CSS**: For a premium, responsive glassmorphism UI.

---

## 🔒 Security & Compliance
- **HIPAA Ready**: Designed with privacy in mind.
- **Encryption**: Data is encrypted via Puter's secure cloud infrastructure.
- **Private Sessions**: No data is shared with third parties; history is strictly user-controlled.

---

## 🚧 Known Limitations & Trade-offs
- **Speech API**: Web Speech API performs best in Chromium-based browsers (Chrome/Edge).
- **Audio Size**: Currently uses Base64 for audio persistence in KV store; for production, direct file system storage with Puter's `fs` would be more scalable.
- **Multi-Turn Context**: Summaries currently look at the last session's logs; long-term patient history analysis is a planned feature.

---

## 📂 Project Structure
```text
/
├── components/          # Reusable UI components
│   ├── MessageItem.tsx  # Optimized chat bubbles
│   └── SummaryModal.tsx # AI Clinical Summary view
├── types.ts             # Strict TypeScript definitions
├── puterService.ts      # Backend abstraction layer (Auth, KV, AI)
├── App.tsx              # Main Application Logic & Auth State
└── index.html           # PWA & Design System config
```
