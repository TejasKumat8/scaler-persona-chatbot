# Scaler Persona Chat 🎓⚡

> Talk to the minds behind Scaler — AI-powered conversations with Anshuman Singh, Abhimanyu Saxena, and Kshitij Mishra.

**Live Demo:** [https://YOUR_DEPLOYED_URL_HERE.vercel.app](https://YOUR_DEPLOYED_URL_HERE.vercel.app)  
*(Replace with your live Vercel/Netlify URL after deployment)*

---

## 📸 Screenshots

| Persona Switcher | Chat in Action |
|---|---|
| ![Sidebar with 3 personas]() | ![Chat conversation]() |

---

## 🚀 Features

- **3 Distinct Personas** — Anshuman Singh, Abhimanyu Saxena, Kshitij Mishra
- **Well-Researched System Prompts** — with few-shot examples, Chain-of-Thought instructions, and strict constraints
- **Persona Switcher** — Switching personas instantly resets the conversation and changes the entire UI theme
- **Suggestion Chips** — 6 quick-start questions per persona to get conversations going
- **Typing Indicator** — Animated dots while the AI processes your message
- **Conversation History** — Multi-turn memory within a session
- **Error Handling** — Friendly error messages for invalid keys, quota limits, network issues
- **Mobile Responsive** — Works seamlessly on phones and desktops
- **API Key Security** — Key stored only in browser `localStorage`, never committed to code

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, Vanilla CSS, Vanilla JavaScript |
| AI API | Google Gemini 2.0 Flash (`gemini-2.0-flash`) |
| Deployment | Vercel / Netlify (static site) |

No build step required — this is a pure static site.

---

## ⚙️ Local Setup

### Prerequisites
- A modern browser (Chrome, Firefox, Safari, Edge)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier available)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/scaler-chatbot.git
cd scaler-chatbot

# 2. Open directly in browser (no build step needed)
# On macOS:
open index.html
# On Windows:
start index.html
# Or use VS Code Live Server extension
```

### Configure API Key

1. Open the app in your browser
2. In the **sidebar footer**, enter your Gemini API key
3. Click **Save** — the key is stored in `localStorage` only (never sent anywhere except Google's API)

> **Note:** The `.env.example` file is provided for reference. Since this is a client-side app, there is no server — the API key is stored securely in your browser's localStorage only. A production version would use a backend proxy to protect the key.

---

## 🚢 Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Follow prompts — it's a static site, so no build settings needed
```

Or drag-and-drop the project folder at [vercel.com/new](https://vercel.com/new).

---

## 📁 Project Structure

```
scaler-chatbot/
├── index.html        # App shell — structure and layout
├── style.css         # All styles — dark theme, personas, responsive
├── prompts.js        # System prompts + persona metadata + chips
├── app.js            # Application logic — API calls, state, UI
├── .env.example      # Environment variable reference
├── README.md         # This file
├── prompts.md        # Annotated system prompts document
└── reflection.md     # Project reflection (300–500 words)
```

---

## 🔐 Security Notes

- ✅ No API keys are hardcoded anywhere in the source code
- ✅ `.env.example` contains only placeholder values
- ✅ API key is stored in browser `localStorage` — never committed to git
- ✅ `.gitignore` excludes any `.env` files

---

## 📖 Documentation

- **[prompts.md](./prompts.md)** — All three system prompts with inline annotations explaining each design decision
- **[reflection.md](./reflection.md)** — Project reflection on what worked, GIGO lessons, and future improvements

---

## 👨‍💻 Built For

Prompt Engineering Assignment — Scaler Academy  
Course: Prompt Engineering | Instructor: Scaler Team
