import os
import re
import json
import time
import numpy as np
import pymupdf
from sentence_transformers import SentenceTransformer, util

# Check for google genai
GENAI_AVAILABLE = False
try:
    from google import genai
    GENAI_AVAILABLE = True
except ImportError:
    try:
        import google.generativeai as genai_legacy
        GENAI_AVAILABLE = "legacy"
    except ImportError:
        GENAI_AVAILABLE = False


CHAPTER_NAMES = {
    1: "Chemical Reactions and Equations",
    2: "Acids, Bases and Salts",
    3: "Metals and Non-metals",
    4: "Carbon and its Compounds",
    5: "Life Processes",
    6: "Control and Coordination",
    7: "How do Organisms Reproduce?",
    8: "Heredity",
    9: "Light – Reflection and Refraction",
    10: "The Human Eye and the Colourful World",
    11: "Electricity",
    12: "Magnetic Effects of Electric Current",
    13: "Our Environment"
}


def _load_env_files():
    """Loads key=value pairs from backend/.env and project-root .env if not already in os.environ."""
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(backend_dir)
    for env_path in (os.path.join(backend_dir, ".env"), os.path.join(root_dir, ".env")):
        if not os.path.exists(env_path):
            continue
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for raw_line in f:
                    line = raw_line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key and val and val.lower() not in {"paste ur api key", "your_api_key_here"} and key not in os.environ:
                        os.environ[key] = val
        except Exception as e:
            print(f"Warning: failed to read {env_path}: {e}")


class RAGPipeline:
    def __init__(self, master_db_path="data/structured_textbook_master.json", embedding_model_name="all-MiniLM-L6-v2"):
        _load_env_files()
        self.master_db_path = master_db_path
        self.embedding_model_name = embedding_model_name
        self._embedder = None
        self.corpus = self._load_master_db()
        self.corpus_embeddings = None
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
        self.llm_model = os.environ.get("GEMINI_MODEL") or "gemini-3.5-flash-lite"
        self._gemini_connectivity_cache = {"checked_at": 0.0, "connected": False, "status": "Unknown", "detail": ""}

    def _load_master_db(self):
        """Loads the existing master corpus if it exists, otherwise returns empty list."""
        if os.path.exists(self.master_db_path):
            try:
                with open(self.master_db_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading master DB: {e}")
                return []
        return []

    def _save_master_db(self):
        """Saves current corpus to the master JSON file."""
        os.makedirs(os.path.dirname(self.master_db_path) or ".", exist_ok=True)
        with open(self.master_db_path, "w", encoding="utf-8") as f:
            json.dump(self.corpus, f, indent=2)

    @property
    def embedder(self):
        """Lazy loads the SentenceTransformer model to keep startup snappy."""
        if self._embedder is None:
            print(f"Loading embedding model: {self.embedding_model_name}...")
            self._embedder = SentenceTransformer(self.embedding_model_name)
        return self._embedder

    @staticmethod
    def parse_chapter_info(filename: str, fallback_ch: int = 1):
        """Extracts chapter number and title from filename."""
        m = re.search(r'jesc1(\d{2})', filename)
        if m:
            ch_num = int(m.group(1))
            return ch_num, CHAPTER_NAMES.get(ch_num, f"Chapter {ch_num}")
        m2 = re.search(r'(?:ch|chapter)[\s_-]*(\d+)', filename, re.IGNORECASE)
        if m2:
            ch_num = int(m2.group(1))
            return ch_num, CHAPTER_NAMES.get(ch_num, f"Chapter {ch_num}")
        return fallback_ch, CHAPTER_NAMES.get(fallback_ch, f"Chapter {fallback_ch}")

    def clean_text_block(self, text: str) -> str:
        """
        Deduplicates lines caused by PDF drop-shadows and normalizes bullet point artifacts.
        Preserves original notebook logic exactly.
        """
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        seen = set()
        unique_lines = []
        for line in lines:
            if line not in seen:
                unique_lines.append(line)
                seen.add(line)

        cleaned_text = "\n".join(unique_lines)
        # Clean up the legacy 'n' bullet characters
        cleaned_text = re.sub(r'^(n\s*\n|n\s+)', '• ', cleaned_text)
        cleaned_text = re.sub(r'\n(n\s*\n|n\s+)', '\n• ', cleaned_text)
        return cleaned_text

    def extract_from_pdf(self, pdf_path_or_bytes, chapter_number: int, chapter_title: str = None, save_db: bool = True):
        """
        Extracts raw text, quality reports, and chunked blocks from a PDF.
        """
        if isinstance(pdf_path_or_bytes, (bytes, bytearray)):
            doc = pymupdf.open(stream=pdf_path_or_bytes, filetype="pdf")
        else:
            doc = pymupdf.open(pdf_path_or_bytes)

        new_chunks = []
        page_extractions = []
        quality_report = {}

        for page_idx in range(len(doc)):
            page_num = page_idx + 1
            page = doc[page_idx]
            raw_text = page.get_text()
            raw_text_length = len(raw_text)
            images = page.get_images(full=True)
            num_images = len(images)

            blocks = page.get_text("blocks")
            page_chunks = []

            for block_idx, block in enumerate(blocks):
                # block layout: (x0, y0, x1, y1, text, block_no, block_type)
                text = block[4].strip()
                if not text:
                    continue

                cleaned = self.clean_text_block(text)

                # Skip header/footer noise like Page numbers or 'Reprint' or 'Science'
                if re.match(r'^\d+$', cleaned) or "Reprint" in cleaned or cleaned == "Science":
                    continue

                chunk_id = f"ch{chapter_number}_p{page_num}_b{block_idx}"
                chunk_data = {
                    "chunk_id": chunk_id,
                    "chapter": chapter_number,
                    "chapter_title": chapter_title or CHAPTER_NAMES.get(chapter_number, f"Chapter {chapter_number}"),
                    "page": page_num,
                    "block_id": block_idx,
                    "text": cleaned
                }
                page_chunks.append(chunk_data)

            # Evaluate page quality metrics (same criteria as notebook)
            status = "PASS"
            issues = []
            if raw_text_length < 200:
                status = "WARNING"
                issues.append("Very low text content (Possible illustration/blank cover page)")
            if len(page_chunks) == 0:
                status = "FAILED"
                issues.append("No textbook text extracted")

            quality_report[f"Page_{page_num}"] = {
                "page": page_num,
                "status": status,
                "char_count": raw_text_length,
                "chunks_extracted": len(page_chunks),
                "images_found": num_images,
                "issues": issues
            }

            page_extractions.append({
                "page": page_num,
                "char_count": raw_text_length,
                "images_found": num_images,
                "raw_text": raw_text,
                "chunks_count": len(page_chunks)
            })

            new_chunks.extend(page_chunks)

        # Update in-memory corpus and persist
        self.corpus = [c for c in self.corpus if c.get("chapter") != chapter_number]
        self.corpus.extend(new_chunks)
        if save_db:
            self._save_master_db()

        # Invalidate index since corpus changed
        self.corpus_embeddings = None

        return {
            "chapter_number": chapter_number,
            "chapter_title": chapter_title or CHAPTER_NAMES.get(chapter_number, f"Chapter {chapter_number}"),
            "total_pages": len(doc),
            "total_chunks_extracted": len(new_chunks),
            "page_extractions": page_extractions,
            "quality_report": quality_report,
            "chunks": new_chunks
        }

    def build_index(self):
        """
        Embeds the entire master corpus using SentenceTransformer.
        Returns embedding statistics including dimensions, chunk count, and sample values.
        """
        if not self.corpus:
            return {
                "success": False,
                "message": "No chunks found in corpus. Please ingest at least one PDF first."
            }

        start_time = time.time()
        corpus_texts = [chunk['text'] for chunk in self.corpus]
        embeddings = self.embedder.encode(corpus_texts, convert_to_tensor=True)
        self.corpus_embeddings = embeddings
        elapsed_sec = round(time.time() - start_time, 3)

        # Compute sample stats
        sample_chunk = self.corpus[0]
        sample_tensor = embeddings[0].cpu().numpy()
        dimensions = int(sample_tensor.shape[0])

        return {
            "success": True,
            "total_chunks": len(self.corpus),
            "embedding_model": self.embedding_model_name,
            "dimensions": dimensions,
            "indexing_time_seconds": elapsed_sec,
            "sample_chunk_id": sample_chunk["chunk_id"],
            "sample_chunk_page": sample_chunk["page"],
            "sample_chunk_chapter": sample_chunk.get("chapter", 1),
            "sample_chunk_text": sample_chunk["text"][:150] + ("..." if len(sample_chunk["text"]) > 150 else ""),
            "sample_vector_preview": [round(float(v), 5) for v in sample_tensor[:12]],
            "vector_norm": round(float(np.linalg.norm(sample_tensor)), 4),
            "vector_min": round(float(np.min(sample_tensor)), 4),
            "vector_max": round(float(np.max(sample_tensor)), 4),
            "vector_mean": round(float(np.mean(sample_tensor)), 4)
        }

    def ensure_index_ready(self):
        """Helper to ensure embeddings are loaded."""
        if self.corpus_embeddings is None:
            if not self.corpus:
                return False
            self.build_index()
        return True

    def retrieve(self, query: str, top_k: int = 3, context_window: int = 2):
        """
        Retrieves top relevant chunks using cosine similarity and sliding window.
        """
        if not self.ensure_index_ready() or self.corpus_embeddings is None:
            raise ValueError("Corpus is empty or index is not built.")

        query_embedding = self.embedder.encode(query, convert_to_tensor=True)
        cos_scores = util.cos_sim(query_embedding, self.corpus_embeddings)[0]
        scores_np = cos_scores.cpu().numpy()

        # Top k indices sorted descending
        top_k_indices = np.argsort(scores_np)[-top_k:][::-1]

        retrieved_results = []
        for idx in top_k_indices:
            idx = int(idx)
            chunk = self.corpus[idx]
            retrieved_results.append({
                "index": idx,
                "score": round(float(scores_np[idx]), 4),
                "chunk_id": chunk["chunk_id"],
                "chapter": chunk.get("chapter"),
                "chapter_title": chunk.get("chapter_title", f"Chapter {chunk.get('chapter', 1)}"),
                "page": chunk["page"],
                "text": chunk["text"]
            })

        # Sliding window retrieval around the single best match (Cell 34)
        best_match_idx = int(top_k_indices[0])
        start_idx = max(0, best_match_idx - context_window)
        end_idx = min(len(self.corpus), best_match_idx + context_window + 1)

        window_chunks = []
        expanded_context_lines = []
        for idx in range(start_idx, end_idx):
            chunk = self.corpus[idx]
            is_target = (idx == best_match_idx)
            prefix = "⭐ " if is_target else "  "
            window_chunks.append({
                "index": idx,
                "is_target": is_target,
                "chunk_id": chunk["chunk_id"],
                "chapter": chunk.get("chapter"),
                "page": chunk["page"],
                "text": chunk["text"]
            })
            expanded_context_lines.append(
                f"{prefix}[Chapter {chunk.get('chapter')}, Page {chunk['page']}]: {chunk['text']}"
            )

        expanded_context_text = "\n\n".join(expanded_context_lines)

        return {
            "query": query,
            "top_results": retrieved_results,
            "best_match_index": best_match_idx,
            "context_window_size": context_window,
            "window_chunks": window_chunks,
            "expanded_context": expanded_context_text
        }

    def check_gemini_connectivity(self, force: bool = False):
        """
        Verifies actual Gemini API connectivity without exposing secrets.
        Caches successful/recent checks for 60 seconds unless force=True.
        """
        if not self.gemini_api_key or len(self.gemini_api_key.strip()) <= 5:
            return {"configured": False, "connected": False, "status": "Not Configured", "detail": "GEMINI_API_KEY is missing."}

        now = time.time()
        if not force and (now - self._gemini_connectivity_cache["checked_at"] < 60):
            return {
                "configured": True,
                "connected": self._gemini_connectivity_cache["connected"],
                "status": self._gemini_connectivity_cache["status"],
                "detail": self._gemini_connectivity_cache["detail"],
            }

        try:
            if GENAI_AVAILABLE is True:
                client = genai.Client(api_key=self.gemini_api_key)
                client.models.get(model=self.llm_model)
                res = {"configured": True, "connected": True, "status": "Connected", "detail": f"Model {self.llm_model} reachable"}
            elif GENAI_AVAILABLE == "legacy":
                import google.generativeai as genai_legacy
                genai_legacy.configure(api_key=self.gemini_api_key)
                genai_legacy.get_model(f"models/{self.llm_model}")
                res = {"configured": True, "connected": True, "status": "Connected", "detail": f"Model {self.llm_model} reachable"}
            else:
                res = {"configured": True, "connected": False, "status": "Unavailable", "detail": "Google GenAI SDK not installed"}
        except Exception as e:
            err_str = str(e)
            res = {"configured": True, "connected": False, "status": "Disconnected", "detail": err_str[:200]}

        self._gemini_connectivity_cache = {
            "checked_at": now,
            "connected": res["connected"],
            "status": res["status"],
            "detail": res["detail"],
        }
        return res

    def generate_answer(self, query: str, context_text: str = None, api_key: str = None, images: list = None):
        """
        Calls Gemini using the science teacher prompt aligned with the user requirements:
        1. Explains textbook topics clearly with analogies
        2. Open and encouraging to topics outside the textbook that help understanding
        3. Supports multimodal diagram and figure analysis when images are attached
        """
        key_to_use = api_key or self.gemini_api_key
        if not key_to_use:
            return {
                "success": False,
                "error_code": "not_configured",
                "error": "AI service configuration is incomplete. Please contact the administrator."
            }

        if images:
            prompt = f"""You are a warm, encouraging, and highly effective science teacher teaching Class 10 NCERT Science.

YOUR CORE TEACHING PRINCIPLES:
1. Multimodal & Diagram Analysis: Carefully inspect the attached science image (diagram, circuit diagram, ray diagram, chemical reaction apparatus, biological illustration, equation, handwritten problem, or textbook question). Read all labels, numbers, chemical formulas, and notations shown in the image.
2. Clear & Engaging Explanations: Explain what the diagram or problem shows using intuitive step-by-step logic, everyday analogies, and clear scientific terminology.
3. Ground in the Textbook: Whenever the student's question or diagram relates to topics covered in the Class 10 textbook, connect your explanation to fundamental principles.
4. Encourage Curiosity: If the student asks something beyond the textbook, explain it warmly and clearly.
5. Welcoming Teacher Tone: Keep your tone friendly, supportive, and engaging.

TEXTBOOK CONTEXT RETRIEVED:
{context_text or "General NCERT Class 10 Science"}

STUDENT'S QUESTION ABOUT THE IMAGE:
{query or "Please analyze this image, explain what it shows, and answer any questions depicted."}

TEACHER'S EXPLANATION:"""
        else:
            prompt = f"""You are a warm, encouraging, and highly effective science teacher teaching Class 10 NCERT Science.

YOUR CORE TEACHING PRINCIPLES:
1. Clear & Engaging Explanations: Make the student truly understand concepts using intuitive step-by-step logic and everyday analogies.
2. Ground in the Textbook: Whenever the student's question relates to topics covered in the Class 10 textbook, base your core answer on the textbook context provided below.
3. Encourage Curiosity Beyond the Book: If the student asks about something outside or beyond the textbook (e.g. advanced physics, astronomy, black holes, human anatomy nuances, or modern technology), DO NOT refuse to answer! Welcome their curiosity, explain it simply in age-appropriate terms, and gently link it back to fundamental science concepts from the textbook where helpful.
4. Welcoming Teacher Tone: Keep your tone friendly, supportive, and engaging.

TEXTBOOK CONTEXT RETRIEVED:
{context_text}

STUDENT'S QUESTION:
{query}

TEACHER'S EXPLANATION:"""

        # Build ordered list of models to try, primary first then safe fallbacks
        candidate_models = [self.llm_model, "gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash"]
        # Remove duplicates preserving order
        models_to_try = list(dict.fromkeys(candidate_models))
        last_error = ""

        for model_name in models_to_try:
            try:
                if GENAI_AVAILABLE is True:
                    from google.genai import types
                    client = genai.Client(api_key=key_to_use)
                    contents_payload = []
                    if images:
                        for img in images:
                            if isinstance(img, dict) and "data" in img:
                                m_type = img.get("mime_type") or "image/jpeg"
                                contents_payload.append(types.Part.from_bytes(data=img["data"], mime_type=m_type))
                    contents_payload.append(prompt)

                    response = client.models.generate_content(
                        model=model_name,
                        contents=contents_payload
                    )
                    return {
                        "success": True,
                        "prompt": prompt,
                        "context_used": context_text,
                        "answer": response.text,
                        "model": model_name
                    }
                elif GENAI_AVAILABLE == "legacy":
                    import google.generativeai as genai_legacy
                    genai_legacy.configure(api_key=key_to_use)
                    model_obj = genai_legacy.GenerativeModel(model_name)
                    contents_payload = []
                    if images:
                        for img in images:
                            if isinstance(img, dict) and "data" in img:
                                contents_payload.append({"mime_type": img.get("mime_type") or "image/jpeg", "data": img["data"]})
                    contents_payload.append(prompt)

                    resp = model_obj.generate_content(contents_payload)
                    return {
                        "success": True,
                        "prompt": prompt,
                        "context_used": context_text,
                        "answer": resp.text,
                        "model": model_name
                    }
            except Exception as e:
                err_msg = str(e)
                last_error = err_msg
                err_lower = err_msg.lower()
                # Only bail on genuine authentication failures (401 / API key invalid).
                # Do NOT bail on 404 model-not-found, 429 rate-limit, or general
                # server errors – those should fall through to the next candidate model.
                is_auth_failure = (
                    ("api key not valid" in err_lower or "invalid api key" in err_lower)
                    or ("status 401" in err_lower or "code 401" in err_lower or "unauthenticated" in err_lower)
                    or ("permission_denied" in err_lower and "api_key" in err_lower)
                )
                if is_auth_failure:
                    return {
                        "success": False,
                        "error_code": "auth_failed",
                        "error": "Gemini API authentication failed. Please contact the administrator.",
                        "prompt": prompt
                    }
                # 404 / model not found → try next candidate
                continue

        return {
            "success": False,
            "error_code": "unavailable",
            "error": f"The AI service is temporarily unavailable. Please try again later.",
            "prompt": prompt
        }
