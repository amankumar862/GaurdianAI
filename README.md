# GuardianAI: Student Forensic Shield

GuardianAI is an AI-powered cybersecurity browser extension and web platform designed to detect phishing attacks, fake internships, scam websites, malicious forms, and suspicious online activity in real time.

It combines:

* Browser extension monitoring
* AI-powered threat analysis
* Real-time webpage scanning
* Firebase reporting system
* Gemini AI integration
* OCR and screenshot analysis support
* Explainable AI threat reasoning

---

# Features

## Real-Time Browser Protection

* Detects phishing pages automatically
* Scans webpages during browsing
* Detects suspicious forms and password fields
* Shows real-time warning overlays
* Displays browser notifications for dangerous websites

## AI Threat Detection

* AI-based risk scoring
* Explainable threat reasoning
* Scam detection pipeline
* Fake internship and scholarship detection
* Gemini AI backend support

## Modular Architecture

* Independent browser extension
* Backend-independent API layer
* Compatible with:

  * Node.js
  * Express
  * Python
  * FastAPI
  * Firebase
  * Gemini API

## Community Reporting System

* Firebase Firestore integration
* Scam reporting
* Threat verification workflow
* Admin moderation support

## Screenshot & OCR Ready

Architecture supports:

* OCR scanning
* Screenshot analysis
* Vision AI integration
* Qwen Vision / Tesseract integration

---

# Tech Stack

## Frontend

* React
* Vite
* TypeScript
* TailwindCSS

## Backend

* Express.js
* Node.js
* Gemini AI API

## Database

* Firebase Firestore

## Browser Extension

* Manifest V3
* Brave Browser
* Chrome Extension APIs

---

# Project Structure

```txt
GuardianAI/
│
├── src/                      # React frontend
├── extension/                # Browser extension
│   ├── manifest.json
│   ├── background.js
│   ├── scanner.js
│   ├── api.js
│   ├── overlay.js
│   ├── config.js
│   ├── popup.html
│   ├── popup.js
│   └── icon.png
│
├── server.js                 # Express backend
├── package.json
├── firestore.rules
└── README.md
```

---

# Installation

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/guardianai-student-forensic-shield.git
cd guardianai-student-forensic-shield
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Start Frontend

```bash
npm run dev
```

Frontend runs at:

```txt
http://localhost:3000
```

---

## 4. Start Backend

Open another terminal:

```bash
npm run server
```

Backend API runs at:

```txt
http://localhost:3001/api/scan
```

---

# Loading the Browser Extension

## Brave Browser / Chrome

1. Open:

```txt
brave://extensions
```

2. Enable:

* Developer Mode

3. Click:

* Load unpacked

4. Select:

```txt
GuardianAI/extension
```

---

# Extension Architecture

The browser extension is modular and reusable.

## Components

### background.js

Handles browser events and scanning triggers.

### scanner.js

Extracts webpage data:

* page text
* forms
* password fields
* buttons

### api.js

Communicates with backend APIs.

### overlay.js

Displays:

* browser warnings
* threat overlays
* notifications

### config.js

Stores configurable backend endpoint.

---

# API Example

## POST /api/scan

### Request

```json
{
  "url": "https://example.com",
  "page_text": "sample text",
  "forms": 1,
  "password_fields": 1,
  "buttons": ["Login"]
}
```

### Response

```json
{
  "status": "Suspicious",
  "risk_score": 78,
  "reasons": [
    "Detected suspicious login form"
  ]
}
```

---

# Firebase Security

The project includes:

* Secure Firestore rules
* User validation
* Admin validation
* Verified-user protections
* Scam report moderation

---

# Future Improvements

* OCR screenshot scanning
* WhatsApp scam detection
* AI-powered screenshot analysis
* Qwen Vision integration
* Tesseract OCR support
* Real-time chat protection
* Advanced phishing classification
* ML-based behavioral analysis
* Threat intelligence feeds

---

# Security Disclaimer

GuardianAI is designed for educational, cybersecurity research, and defensive security purposes only.

Do not use this project for:

* unauthorized monitoring
* malicious scanning
* phishing campaigns
* credential harvesting
* illegal surveillance

---

# Contributing

Contributions are welcome.

Possible contribution areas:

* AI models
* OCR pipelines
* Browser extension improvements
* UI/UX enhancements
* Firebase optimization
* Threat detection logic

---

# License

MIT License

---

# Authors

GuardianAI Team

AI-powered Student Cybersecurity Protection Platform
