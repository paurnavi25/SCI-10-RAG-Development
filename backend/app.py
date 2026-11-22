import os
import glob
import re
import base64
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

try:
    from backend.rag_pipeline import RAGPipeline, CHAPTER_NAMES
except ImportError:
    from rag_pipeline import RAGPipeline, CHAPTER_NAMES

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(BACKEND_DIR, "data")
PDFS_DIR = os.path.join(DATA_DIR, "pdfs")
MASTER_DB_PATH = os.path.join(DATA_DIR, "structured_textbook_master.json")
FRONTEND_DIST_DIR = os.path.join(ROOT_DIR, "frontend", "dist")

app = FastAPI(title="Class 10 NCERT Science RAG Pipeline API", version="1.0.0")

# Enable CORS for all origins, including Chrome Private Network Access (PNA)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_private_network=True,
)

pipeline = RAGPipeline(master_db_path=MASTER_DB_PATH)


class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 3
    context_window: int = 2


class ChatRequest(BaseModel):
    query: str
    top_k: int = 3
    context_window: int = 2
    chapter_filter: Optional[int] = None
    image_base64: Optional[str] = None
    image_mime_type: Optional[str] = "image/jpeg"


class BatchLocalIngestRequest(BaseModel):
    filenames: Optional[List[str]] = None
    ingest_all: bool = False


def find_local_chapter_files():
    """Detects existing textbook PDFs in backend/data/pdfs (plus legacy locations)."""
    candidates = (
        glob.glob(os.path.join(PDFS_DIR, "*.pdf"))
        + glob.glob(os.path.join(DATA_DIR, "*.pdf"))
        + glob.glob(os.path.join(ROOT_DIR, "*.pdf"))
    )
    seen = set()
    items = []
    for f in sorted(candidates):
        base = os.path.basename(f)
        if base in seen:
            continue
        seen.add(base)
        ch_num, title = pipeline.parse_chapter_info(f)
        items.append({
            "filename": base,
            "filepath": f,
            "chapter_number": ch_num,
            "chapter_title": title,
            "size_mb": round(os.path.getsize(f) / (1024 * 1024), 2)
        })
    return items


@app.get("/api/status")
def get_status(verify_gemini: bool = Query(False)):
    import datetime
    local_files = find_local_chapter_files()
    has_embeddings = pipeline.corpus_embeddings is not None
    embedding_dims = int(pipeline.corpus_embeddings.shape[1]) if has_embeddings else 384
    gemini_health = pipeline.check_gemini_connectivity(force=verify_gemini)

    # Count chunks per chapter
    chapter_counts = {}
    for c in pipeline.corpus:
        ch = c.get("chapter", 0)
        chapter_counts[ch] = chapter_counts.get(ch, 0) + 1

    total_chunks = len(pipeline.corpus)
    return {
        "status": "online",
        "backend_api": "Online",
        "total_chunks": total_chunks,
        "indexed": has_embeddings,
        "embedding_model": pipeline.embedding_model_name,
        "embedding_model_status": "Loaded" if pipeline._embedder is not None else "Ready",
        "dimensions": embedding_dims,
        "has_gemini_key": gemini_health["configured"],
        "gemini_configured": gemini_health["configured"],
        "gemini_connectivity": gemini_health["status"],
        "gemini_connectivity_detail": gemini_health["detail"],
        "llm_provider": "Google Gemini",
        "llm_model": pipeline.llm_model,
        "vector_db_type": "In-Memory Cosine Similarity Index",
        "vector_db_status": "Ready" if total_chunks > 0 else "Empty",
        "default_top_k": 3,
        "default_context_window": 2,
        "similarity_method": "Cosine Similarity",
        "checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "chapter_counts": chapter_counts,
        "available_local_pdfs": local_files
    }


@app.post("/api/upload-pdf")
async def upload_pdf(
    file: Optional[UploadFile] = File(None),
    local_filename: Optional[str] = Form(None),
    chapter_number: Optional[int] = Form(None),
    chapter_title: Optional[str] = Form(None)
):
    """
    Ingests a single PDF either uploaded dynamically or chosen from existing local files.
    """
    try:
        if file is not None and file.filename:
            ch_num = chapter_number or pipeline.parse_chapter_info(file.filename)[0]
            title = chapter_title or pipeline.parse_chapter_info(file.filename)[1]
            content = await file.read()
            if not content:
                raise HTTPException(status_code=400, detail="Uploaded file is empty.")
            extraction_result = pipeline.extract_from_pdf(content, chapter_number=ch_num, chapter_title=title)
            source_name = file.filename
        elif local_filename:
            candidate_paths = [
                local_filename,
                os.path.join(PDFS_DIR, local_filename),
                os.path.join(DATA_DIR, local_filename),
                os.path.join(ROOT_DIR, local_filename),
            ]
            target_path = next((p for p in candidate_paths if os.path.exists(p)), None)
            if not target_path:
                raise HTTPException(status_code=404, detail=f"Local PDF file '{local_filename}' not found.")
            ch_num = chapter_number or pipeline.parse_chapter_info(target_path)[0]
            title = chapter_title or pipeline.parse_chapter_info(target_path)[1]
            extraction_result = pipeline.extract_from_pdf(target_path, chapter_number=ch_num, chapter_title=title)
            source_name = local_filename
        else:
            raise HTTPException(status_code=400, detail="Either a file or local_filename must be provided.")

        index_stats = pipeline.build_index()

        return {
            "success": True,
            "source_name": source_name,
            "chapter_number": ch_num,
            "chapter_title": title,
            "total_pages": extraction_result["total_pages"],
            "total_chunks_extracted": extraction_result["total_chunks_extracted"],
            "total_master_chunks": len(pipeline.corpus),
            "quality_report": extraction_result["quality_report"],
            "page_extractions": extraction_result["page_extractions"],
            "new_chunks_preview": extraction_result["chunks"][:15],
            "index_stats": index_stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


@app.post("/api/upload-batch-pdfs")
async def upload_batch_pdfs(
    files: List[UploadFile] = File(...)
):
    """
    Ingests MULTIPLE uploaded PDF files simultaneously.
    Automatically parses each chapter number, extracts blocks, updates master DB,
    and updates the vector index.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    processed_chapters = []
    last_extraction_result = None

    for f in files:
        if not f.filename:
            continue
        ch_num, ch_title = pipeline.parse_chapter_info(f.filename)
        content = await f.read()
        if not content:
            continue

        res = pipeline.extract_from_pdf(content, chapter_number=ch_num, chapter_title=ch_title, save_db=False)
        last_extraction_result = res
        processed_chapters.append({
            "filename": f.filename,
            "chapter_number": ch_num,
            "chapter_title": ch_title,
            "pages": res["total_pages"],
            "chunks": res["total_chunks_extracted"]
        })

    # Save to disk and build index
    pipeline._save_master_db()
    index_stats = pipeline.build_index()

    return {
        "success": True,
        "processed_count": len(processed_chapters),
        "chapters": processed_chapters,
        "total_master_chunks": len(pipeline.corpus),
        "last_extraction": last_extraction_result,
        "index_stats": index_stats
    }


@app.post("/api/batch-local-ingest")
def batch_local_ingest(req: BatchLocalIngestRequest):
    """
    Batch ingests local chapter PDFs found on disk.
    If req.ingest_all is True, ingests all chapter files (e.g. Chapters 1 to 13).
    """
    local_files = find_local_chapter_files()
    targets = []

    if req.ingest_all:
        # Ingest all chapters with known numbers
        targets = [f["filepath"] for f in local_files if f.get("chapter_number")]
    elif req.filenames:
        targets = [f["filepath"] for f in local_files if f["filename"] in req.filenames]

    if not targets:
        raise HTTPException(status_code=400, detail="No matching local files to ingest.")

    processed = []
    last_res = None
    for filepath in sorted(targets):
        ch_num, ch_title = pipeline.parse_chapter_info(filepath)
        res = pipeline.extract_from_pdf(filepath, chapter_number=ch_num, chapter_title=ch_title, save_db=False)
        last_res = res
        processed.append({
            "filename": os.path.basename(filepath),
            "chapter_number": ch_num,
            "chapter_title": ch_title,
            "pages": res["total_pages"],
            "chunks": res["total_chunks_extracted"]
        })

    pipeline._save_master_db()
    index_stats = pipeline.build_index()

    return {
        "success": True,
        "processed_count": len(processed),
        "chapters": processed,
        "total_master_chunks": len(pipeline.corpus),
        "last_extraction": last_res,
        "index_stats": index_stats
    }


@app.post("/api/build-index")
def trigger_index_build():
    if not pipeline.corpus:
        raise HTTPException(status_code=400, detail="Master corpus is empty. Ingest at least one chapter PDF first.")
    stats = pipeline.build_index()
    return stats


@app.get("/api/chunks")
def get_chunks(
    chapter: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Allows exploring stored chunks with filtering and pagination."""
    items = pipeline.corpus

    if chapter is not None:
        items = [c for c in items if c.get("chapter") == chapter]

    if search:
        search_lower = search.lower()
        items = [c for c in items if search_lower in c.get("text", "").lower() or search_lower in c.get("chunk_id", "").lower()]

    total_matched = len(items)
    paginated = items[offset: offset + limit]

    return {
        "total": total_matched,
        "offset": offset,
        "limit": limit,
        "chunks": paginated
    }


@app.post("/api/retrieve")
def search_textbook(req: RetrieveRequest):
    """
    Retrieves chunks with cosine similarity scores and sliding window expansion.
    """
    if not pipeline.corpus:
        raise HTTPException(status_code=400, detail="No chunks in corpus. Please ingest a chapter first.")

    try:
        result = pipeline.retrieve(query=req.query, top_k=req.top_k, context_window=req.context_window)
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat")
def chat_with_tutor(req: ChatRequest):
    """
    Runs the full RAG pipeline:
    1. Retrieval via SentenceTransformers + sliding window
    2. Context construction
    3. LLM generation with Gemini science teacher prompt (supports optional base64 image)
    """
    if not pipeline.corpus:
        raise HTTPException(status_code=400, detail="No textbook chunks found. Please ingest a chapter first.")

    try:
        retrieval_res = pipeline.retrieve(query=req.query, top_k=req.top_k, context_window=req.context_window)
        context_text = retrieval_res["expanded_context"]

        images_payload = None
        if req.image_base64:
            try:
                raw_bytes = base64.b64decode(req.image_base64)
                images_payload = [{"data": raw_bytes, "mime_type": req.image_mime_type or "image/jpeg"}]
            except Exception as e:
                print(f"Failed to decode image_base64: {e}")

        llm_res = pipeline.generate_answer(query=req.query, context_text=context_text, images=images_payload)

        return {
            "query": req.query,
            "retrieval": retrieval_res,
            "context_passed_to_llm": context_text,
            "llm": llm_res
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat-image")
async def chat_with_image(
    file: UploadFile = File(...),
    query: Optional[str] = Form(""),
    chapter_filter: Optional[int] = Form(None),
    top_k: int = Form(3),
    context_window: int = Form(2)
):
    """
    Multimodal Chat endpoint:
    Accepts an uploaded image file (diagram, formula, apparatus, textbook question)
    plus student's question and optional chapter filter, retrieves relevant textbook context,
    and runs Gemini multimodal analysis.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No image file provided.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    if ext and ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported image type '{ext}'. Please upload JPG, PNG, WEBP, or GIF.")

    mime = file.content_type
    if not mime or mime == "application/octet-stream":
        ext_to_mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}
        mime = ext_to_mime.get(ext, "image/jpeg")

    clean_query = (query or "").strip()
    effective_query = clean_query or "Please analyze this textbook diagram/question and explain the key science concepts step by step."

    retrieval_res = {"top_results": [], "expanded_context": ""}
    context_text = ""
    if pipeline.corpus:
        try:
            retrieval_res = pipeline.retrieve(query=effective_query, top_k=top_k, context_window=context_window)
            context_text = retrieval_res.get("expanded_context", "")
        except Exception as e:
            print(f"Retrieval warning: {e}")

    images_payload = [{"data": content, "mime_type": mime}]
    llm_res = pipeline.generate_answer(
        query=effective_query,
        context_text=context_text,
        images=images_payload
    )

    return {
        "query": clean_query,
        "retrieval": retrieval_res,
        "context_passed_to_llm": context_text,
        "llm": llm_res,
        "image": {
            "filename": file.filename,
            "content_type": mime,
            "size_bytes": len(content)
        }
    }


# Serve React production build from frontend/dist (mounted at root AFTER all /api routes)
if os.path.exists(FRONTEND_DIST_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST_DIR, html=True), name="frontend")
else:
    @app.get("/")
    def serve_missing_build():
        return {"message": "Frontend build not found. Run 'npm run build' in frontend/ or use 'npm run dev'."}
