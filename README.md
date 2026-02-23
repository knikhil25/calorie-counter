# Calorie Counter

A modern, chat-based calorie tracking app powered by Ollama. Log food naturally, get AI-estimated calories, and track your daily intake over time.

## Features

- **Chat-based logging** — Type what you ate (e.g., "2 eggs and toast") and get calorie estimates
- **Photo analysis** — Take or paste a photo of your meal; a vision AI identifies the food, then Ollama estimates calories
- **Daily total** — Ask "calorie count" or "total calories" for today's total
- **Last meal** — Use "Last meal: &lt;food&gt;" to log the final meal, save the day, and reset for tomorrow
- **History & analytics** — Line graph of daily calorie totals over time
- **Persistent storage** — Data survives app restarts

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Ollama](https://ollama.ai/) running locally

### Required models

1. **Text model** (for calorie estimation): `llama3.2` or similar  
2. **Vision model** (for photo analysis): `llava`

```bash
# Text model (required)
ollama pull llama3.2

# Vision model (required for photo analysis)
ollama pull llava

# Optional: verify both work
ollama run llama3.2
ollama run llava
```

**For image support:** LLaVA analyzes the photo and describes what’s in it (e.g., “2 eggs, 1 slice of toast, ~150g”). That description is then sent to the text model for calorie estimation.

## Setup

```bash
cd calorie-counter
npm install
```

## Run

```bash
npm run dev
```

This starts:
- **Backend** at http://localhost:3001 (Express + Ollama proxy)
- **Frontend** at http://localhost:5173 (Vite + React)

Open http://localhost:5173 in your browser.

## Environment (optional)

- `OLLAMA_URL` — Ollama base URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL` — Text model for calorie estimation (default: `llama3.2`)
- `OLLAMA_VISION_MODEL` — Vision model for image analysis (default: `llava`)

## Tech

- **Frontend**: React, Vite, Tailwind CSS, Chart.js
- **Backend**: Express, better-sqlite3
- **AI**: Ollama (local LLM)
