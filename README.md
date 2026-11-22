# Science AI Tutor — NCERT Class 10 Science RAG Platform

A full-fledged, production-ready Retrieval-Augmented Generation (RAG) educational application designed to help Class 10 students master NCERT Science through intuitive conversational explanations, multimodal diagram analysis, and interactive study tools.

---

## Key Features

- **Grounded Conversational Tutor:** Answers questions strictly grounded in 1,112 indexed textbook chunks across all 13 Class 10 NCERT Science chapters, supplemented by intuitive real-world analogies.
- **Multimodal Image & Camera Analysis:** Students can capture photos using their device camera or upload textbook diagrams, circuit schematics, ray diagrams, or handwritten problems for step-by-step AI explanation.
- **Interactive Learning Tools:**
  - **Quiz Mode:** Generates contextual multiple-choice questions from any chapter with instant answer evaluation and explanations.
  - **Flashcards:** Active recall cards categorized into "Understood" and "Needs Revision".
  - **Smart Notes:** High-yield chapter summaries, key scientific laws, chemical formulas, and definitions.
  - **Study Progress Tracker:** Real-time metrics on chapters completed, quiz scores, and saved explanations.
- **Full RAG Pipeline Explorer:** 9 interactive inspection tools exploring the inner workings of RAG (Document Processing, Text Extraction, Chunk Explorer, Embeddings, Vector Similarity Search, Retrieval Inspector, and Live Pipeline Logs).
- **Curated Design & Dual Theme:** Thoughtfully designed with a warm cream / forest-green light theme and dark slate mode, paired with Google Fonts (Sora, DM Sans, Playfair Display, and Dancing Script).
- **Backend-Managed Security:** API keys and environment variables are strictly managed on the FastAPI backend — never exposed to client-side bundles.

---

## Tech Stack

- **Backend:** Python 3.10+, FastAPI, Uvicorn, Sentence-Transformers (`all-MiniLM-L6-v2`), PyPDF / PyMuPDF.
- **LLM & Multimodal Vision:** Google Gemini API (`gemini-3.5-flash-lite`, `gemini-2.5-flash`).
- **Frontend:** React 18, Vite, Tailwind CSS v3, Lucide Icons, KaTeX for math and chemical formulas.
- **Vector Search:** Cosine similarity with sliding-window adjacent chunk expansion.

---

## Project Structure

```text
ScienceRAG-Frontend/
├── backend/
│   ├── app.py                   # FastAPI server & static SPA serving
│   ├── rag_pipeline.py          # Extraction, chunking, embeddings, retrieval & Gemini prompt logic
│   ├── run.py                   # Uvicorn entry point (runs on 127.0.0.1:8000)
│   ├── requirements.txt         # Python dependencies
│   ├── .env.example             # Template for backend environment variables
│   └── data/
│       ├── structured_textbook_master.json  # 1,112 pre-indexed NCERT chunks
│       └── pdfs/                # Class 10 NCERT Science PDF chapters (jesc101-jesc113, jesc1ps)
├── frontend/                    # Modern React + Vite application
│   ├── src/
│   │   ├── components/          # Reusable UI widgets (AttachmentMenu, CameraModal, etc.)
│   │   ├── context/             # Unified state (conversations, progress, theme)
│   │   ├── pages/               # ChatHome, QuizMode, Flashcards, Settings, Pipeline Explorer
│   │   ├── api.js               # Central API layer with timeout and error handling
│   │   └── App.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js           # Vite dev server with proxy to backend
├── .gitignore                   # Excludes .env, node_modules, dist, __pycache__
└── README.md
```

---

## Quick Start Guide

### 1. Configure the Backend

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Add your Gemini API key inside `backend/.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```
   *(Obtain a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)).*

4. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 2. Configure the Frontend

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   ```

---

## Running the Application

### Option A: Development Mode (Recommended for development)

1. **Start Backend Server:**
   ```bash
   python backend/run.py
   ```
   *Runs at `http://127.0.0.1:8000` (API documentation at `/docs`).*

2. **Start Frontend Dev Server:**
   ```bash
   cd frontend
   npm run dev
   ```
   *Access the application at `http://localhost:5173`.*

### Option B: Production Mode (Single Process)

1. Build the React frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Launch FastAPI to serve both the backend API and frontend bundle:
   ```bash
   python backend/run.py
   ```
3. Open `http://127.0.0.1:8000` in your web browser.

---

## License & Attribution

- Textbook content is sourced from NCERT Class 10 Science under standard educational fair use.
- Designed and built as a full-stack Retrieval-Augmented Generation (RAG) platform.
