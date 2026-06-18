# Agents4Good — SSD Application Agent

An AI-powered conversational agent that guides individuals through the Social Security Disability (SSD) application process. The agent walks users through each step of the SSA-3373-BK form using natural conversation, extracts structured data from their responses, evaluates eligibility against official SSA criteria, and provides personalized guidance — all in plain, accessible language.

---

## 🎯 What It Does

The agent ("Anna") conducts a multi-step guided interview that mirrors the SSA's 5-Step Sequential Evaluation Process:

| Step | What It Evaluates | How |
|------|-------------------|-----|
| **Step 1 — SGA** | Is the applicant earning above the Substantial Gainful Activity threshold? | Keyword extraction + SGA threshold lookup |
| **Step 2 — Severity** | Does the condition significantly limit basic work activities and last ≥12 months? | Pattern matching + duration analysis |
| **Step 3 — Blue Book** | Does the condition match an SSA Blue Book listing? | Keyword-based listing matcher against 14 body systems |
| **Step 4 — RFC & Past Work** | Can the applicant return to past relevant work? | Residual Functional Capacity assessment + work history comparison |
| **Step 5 — Grid Rules** | Can the applicant adjust to other work? | Medical-Vocational Guidelines (age × education × RFC × skills) |

At the end, the agent computes an overall eligibility likelihood score with strength factors, risk factors, and actionable next steps.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Vercel                            │
│                                                     │
│  ┌──────────────┐    ┌───────────────────────────┐  │
│  │   Frontend    │    │   Serverless Functions     │  │
│  │  React + Vite │◄──►│  /api/session/start       │  │
│  │  TypeScript   │    │  /api/agent/turn          │  │
│  │               │    │  /api/session/[t]/elig.   │  │
│  └──────────────┘    └───────────┬───────────────┘  │
│                                  │                   │
└──────────────────────────────────┼───────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
              │  Supabase  │ │ OpenRouter │ │   Rule    │
              │  Sessions  │ │  LLM API   │ │  Engine   │
              │ (Postgres) │ │ (Nemotron) │ │ (Local)   │
              └───────────┘ └───────────┘ └───────────┘
```

### Frontend (`frontend/`)

- **React 18** + **TypeScript** + **Vite**
- Multi-screen conversational UI with progress tracking
- Voice-ready input architecture
- Real-time synthesis labels showing what was extracted from each response

### Backend (`backend/server/` + `api/`)

- **Vercel Serverless Functions** for production deployment
- **Express.js** server for local development
- Hybrid extraction: fast keyword matching for simple phases, LLM for complex ones
- Deterministic rule engine — no LLM calls for eligibility math

### Key Modules

| Module | Purpose |
|--------|---------|
| `phaseLogic.js` | Phase configuration, progress calculation, synthesis labels, follow-up questions, SGA/severity extractors |
| `ruleEngine.js` | SGA thresholds, Blue Book matching, RFC determination, Grid Rules evaluation, composite eligibility scoring |
| `sessionStore.js` | Supabase-backed session persistence with in-memory fallback |
| `openRouterClient.js` | LLM API client for field extraction and response generation |
| `agentPrompts.js` | System prompts for each conversation phase |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A Google [Gemini API key](https://aistudio.google.com/) (recommended) OR a free [OpenRouter API key](https://openrouter.ai/keys)
- *(Optional)* A [Supabase](https://supabase.com) project for session persistence

### 1. Clone the repository

```bash
git clone https://github.com/brunotager/Agents4Good.git
cd Agents4Good
```

### 2. Set up the backend

```bash
cd backend/server
cp .env.example .env
# Edit .env with your API keys (see Environment Variables below)
npm install
```

### 3. Set up the frontend

```bash
cd frontend
cp .env.example .env
npm install
```

### 4. Run locally

In two separate terminals:

```bash
# Terminal 1 — Backend
cd backend/server
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

The frontend runs at `http://localhost:8080` and the backend at `http://localhost:3001`.

---

## 🌐 Deploying to Vercel

The project is configured for full-stack Vercel deployment (frontend + serverless API functions).

### 1. Connect the repo

Import the GitHub repository at [vercel.com/new](https://vercel.com/new). Vercel will auto-detect the `vercel.json` configuration.

### 2. Set environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

| Variable | Value | Required |
|----------|-------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | ✅ (If using Gemini) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Optional (defaults to `gemini-2.5-flash`) |
| `OPENROUTER_API_KEY` | Your OpenRouter API key | ✅ (If using OpenRouter) |
| `OPENROUTER_MODEL_AGENT` | `nvidia/nemotron-nano-9b-v2:free` | Optional |
| `OPENROUTER_MODEL_VISION` | `google/gemma-4-31b-it:free` | Optional |
| `SUPABASE_URL` | Your Supabase project URL | Optional* |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public key | Optional* |

> \* Without Supabase credentials, the app falls back to in-memory session storage. Sessions will not persist across serverless function cold starts.

### 3. Deploy

Push to `main` or your deployment branch — Vercel handles the rest.

---

## 📁 Project Structure

```
Agents4Good/
├── api/                          # Vercel Serverless Functions
│   ├── _lib/
│   │   └── cors.js               # Shared CORS middleware
│   ├── agent/
│   │   └── turn.js               # POST /api/agent/turn
│   └── session/
│       ├── start.js              # POST /api/session/start
│       └── [token]/
│           └── eligibility.js    # GET /api/session/:token/eligibility
│
├── backend/server/               # Backend logic (shared by Express + serverless)
│   ├── index.js                  # Express server (local dev only)
│   ├── phaseLogic.js             # Phase config, extractors, helpers
│   ├── ruleEngine.js             # SSA rule evaluation engine
│   ├── sessionStore.js           # Supabase session persistence
│   ├── openRouterClient.js       # OpenRouter LLM API client
│   ├── agentPrompts.js           # System prompts per phase
│   └── data/
│       ├── blue_book_listings.json   # SSA Blue Book conditions
│       ├── grid_rules.json           # Medical-Vocational Guidelines
│       └── sga_thresholds.json       # SGA income thresholds by year
│
├── frontend/                     # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx               # Main application component
│   │   ├── lib/
│   │   │   ├── api.ts            # API client
│   │   │   └── phases.ts         # Phase/flow state definitions
│   │   └── screens/
│   │       ├── OnboardingScreen.tsx
│   │       └── ResultsScreen.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── schema.ts                     # Full SSA-3373-BK TypeScript schema
├── vercel.json                   # Vercel deployment configuration
├── package.json                  # Root dependencies (for serverless)
└── .gitignore
```

---

## 🔌 API Endpoints

### `POST /api/session/start`

Creates a new session and returns the agent's opening message.

**Response:**
```json
{
  "sessionToken": "uuid",
  "agentMessage": "Hi, I'm Anna...",
  "synthesisLabel": "Getting Started",
  "nextPhase": "STEP1_SGA",
  "progressUpdate": { "complete": 0, "partial": 0 },
  "inputHint": { "label": "Your Answer", "placeholder": "...", "disabled": false }
}
```

### `POST /api/agent/turn`

Processes a user message and returns the agent's response with updated state.

**Headers:** `Authorization: Bearer <sessionToken>`

**Body:**
```json
{
  "userMessage": "No, I stopped working last year",
  "currentPhase": "STEP1_SGA"
}
```

### `GET /api/session/:token/eligibility`

Computes and returns the full eligibility assessment for a completed session.

---

## 🔐 Environment Variables

### Backend (`.env` in `backend/server/`)

```env
# Gemini API Configuration (Preferred)
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.5-flash

# OpenRouter — LLM API (Fallback)
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL_AGENT=nvidia/nemotron-nano-9b-v2:free
OPENROUTER_MODEL_VISION=google/gemma-4-31b-it:free

# Supabase — Session persistence (optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Server port (local dev only)
PORT=3001
```

### Frontend (`.env` in `frontend/`)

```env
# Points to local backend in development
VITE_API_BASE_URL=http://localhost:3001

# Set to true to use mock API (no backend needed)
VITE_USE_MOCK_API=false
```

---

## 🧠 How the Rule Engine Works

The rule engine (`ruleEngine.js`) uses **zero LLM calls** — it's entirely deterministic:

- **SGA Evaluation**: Compares monthly earnings against published SSA thresholds (updated annually)
- **Blue Book Matching**: Keyword similarity scoring against a curated dataset of SSA impairment listings across 14 body systems
- **RFC Determination**: Maps reported physical/mental limitations to a functional capacity level (sedentary → very heavy)
- **Grid Rules**: Looks up the SSA Medical-Vocational Guidelines matrix using age category × education × RFC × transferable skills
- **Composite Scoring**: Weighted combination of all 5 steps, producing a 5–95% likelihood score

---

## 📄 License

This project is intended for educational and social good purposes.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve the agent's accuracy, expand the Blue Book listings, or enhance the UI, please open an issue or pull request.
