<div align="center">
  <h1 align="center">
    Debate Arena
  </h1>
  <p align="center">
    An AI-powered multi-LLM debate platform with 3D courtroom visualization, live scoring, fact-checking, and bias auditing.
  </p>

  <div align="center">
    <img src="https://img.shields.io/badge/Python-3.11+-blue.svg?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/React-18.2+-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Three.js-r160+-000000.svg?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
    <img src="https://img.shields.io/badge/License-Apache_2.0-green.svg?style=for-the-badge" alt="License" />
  </div>

<br />


</div>


## 🏛️ Overview

**Debate Arena** is a sophisticated platform that stages live, multi-round debates between multiple AI language models. It moves beyond simple Q&A by creating a dynamic, adversarial environment where AIs challenge, rebut, and respond to each other's arguments in real-time.

The entire process is visualized in a live 3D courtroom, judged by an independent AI, and enriched with layers of intelligent analysis including live fact-checking, consistency tracking, and judicial bias auditing.

### The Problem It Solves

> People rarely see both sides of a debatable question argued with equal effort and rigor. Existing AI chatbots give one quietly-biased 'balanced' answer with no visible reasoning. There is no accessible tool that shows two strong, opposing AI arguments actively responding to each other, visualizes the judgment process, and exposes whether that judgment itself might be biased — all in an experience compelling enough that people want to watch it happen, not just read a transcript.

## ✨ Core Features

Debate Arena is built with a rich, tiered feature set:

- **🤖 Multi-LLM Debates:** Pit different AI models (e.g., Gemini, GPT-4o, Claude 3.5) against each other on any topic.
- **🏛️ Live 3D Courtroom:** A `React Three Fiber` scene visualizes the debate, with podiums that glow for the active speaker and a dramatic camera move to crown the winner.
- **⚖️ Independent AI Judge:** A separate AI model evaluates the full transcript and provides a reasoned verdict, declaring a winner.
- **📊 Live Strength Scoring:** Each argument receives a strength score, visualized on a graph as the debate unfolds.
- **✅ Automated Fact-Checking:** The system automatically flags claims made during the debate and attempts to verify them against external sources.
- **🧠 Consistency Tracking:** An intelligence layer detects when a debater contradicts its own previous arguments.
- **🕵️ Judicial Bias Auditing:** After a verdict, the system can re-run the judgment with the speaker roles swapped to detect if the judge has a positional bias (e.g., favoring the first speaker).
- **👥 Multi-Persona Jury:** See how different audience archetypes (e.g., *Skeptic, Professor, Optimist*) would vote, providing a spectrum of perspectives on the outcome.
- **🚀 Chained Debates:** The conclusion of one debate can be used to seed the topic for the next, creating a logical follow-on discussion.
- **⚙️ Full Configuration:** Users can control the debate topic, number of rounds, argumentative tone, and which AI model to use for each role (For, Against, Judge).

## 🛠️ Technology Stack & Architecture

The project is a layered monolith with a clear separation between the frontend and backend.

### System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                      │
│   React + Vite + TailwindCSS + React Three Fiber +        │
│   Framer Motion                                            │
└───────────────────────┬────────────────────────────────────┘
                         │ HTTPS / REST + polling
┌───────────────────────▼────────────────────────────────────┐
│                   APPLICATION SERVER                        │
│                   FastAPI (Python, async)                   │
│ ┌────────────┬──────────┬────────────┬──────────┬────────┐  │
│ │Orchestrator│  Judge   │ Fact-Check │ Bias/    │Persona │  │
│ │ (turns)    │  Engine  │  Engine    │Consist.  │Voting  │  │
│ └────────────┴──────────┴────────────┴──────────┴────────┘  │
└──────┬─────────────────┬──────────────────┬─────────────────┘
       │                 │                  │
  LLM APIs          SQLite DB          Web Search API
  (Gemini, etc.)    (7 tables)         (fact-check)
```

### Frontend

- **Framework:** React 18 (with Vite)
- **3D Rendering:** React Three Fiber & Drei
- **Styling:** TailwindCSS
- **Animation:** Framer Motion
- **State Management:** React Hooks & Context
- **API Communication:** Fetch API with polling

### Backend

- **Framework:** FastAPI (Python, async)
- **Database:** aiosqlite (Async SQLite)
- **LLM SDKs:** `google-generativeai`, `openai`, `anthropic`
- **Validation:** Pydantic

## 🚀 Getting Started

Follow these instructions to get the full application running on your local machine.

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **API Keys** for the LLM providers you wish to use (e.g., Google AI Studio for Gemini).

### 1. Backend Setup

First, navigate to the `backend` directory and set up the Python environment.

```bash
# 1. Go to the backend directory
cd ../backend

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Set up your environment variables
#    - Copy the example file
cp .env.example .env
#    - Edit the .env file and add your API keys
nano .env

# 5. Initialize the database
#    The database and all tables will be created automatically on first run.

# 6. Run the backend server
uvicorn app.main:app --reload --port 8000
```

The backend API will now be running at `http://localhost:8000`.

### 2. Frontend Setup

In a new terminal, navigate to the `frontend` directory.

```bash
# 1. Go to the frontend directory (this directory)
cd .


1. Install dependencies:
   `npm install`

2. Run the app (Vite will handle proxying API requests to the backend):
   `npm run dev`
