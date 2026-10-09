# NCERT Class 10 Science AI Tutor RAG System
An end-to-end, layout-aware Retrieval-Augmented Generation (RAG) system built in Google Colab. The system takes NCERT Class 10 Science textbooks page-by-page, builds a clean semantic vector database, and generates student-friendly explanations using an interactive AI Tutor persona.


##  Key Implementation Steps

###  Phase 1: Environment Setup
*   Installed critical layout-parsing engines (`pymupdf`) and embedding libraries (`sentence-transformers`).
*   Configured secured notebook API access with Google Gemini using Colab Secrets manager and the Google GenAI SDK.

###  Phase 2: PDF Parsing, Cleaning & Quality Reports
*   Extracted textbook content page-by-page at block levels to maintain structural layouts.
*   Implemented deduplication filters to remove drop-shadow rendering repeats.
*   Cleaned and mapped legacy lowercase `n` font artifacts into clean, formatted bullet points (`•`).
*   Designed an automated **Extraction Quality Report** flagging pages with low-text density or missing blocks.

###  Phase 3: Scaling & Database Assembly
*   Created a modular Python pipeline (`NCERTPdfIngestionPipeline`) that processes and structures all 13 textbook chapters.
*   Serialized the extracted data into a single, light, and portable JSON database (`structured_textbook_master.json`).

###  Phase 4: Semantic Vector Search & Sliding Windows
*   Generated 384-dimensional semantic embeddings for the 3,303 chunks using the CPU-efficient `all-MiniLM-L6-v2` model.
*   Engineered a **Sliding-Window Retriever** that dynamically pulls a target chunk alongside its chronological neighbors to prevent heading-to-body fragmentation.

###  Phase 5: RAG Generation (AI Tutor)
*   Wired retrieved context blocks directly into **`gemini-3.5-flash-lite`** to generate high-accuracy responses relying on friendly analogies.
