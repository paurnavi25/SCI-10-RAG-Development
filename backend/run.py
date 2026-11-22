import os
import sys
import uvicorn

if __name__ == "__main__":
    # Works whether launched from project root (`python backend/run.py`)
    # or from inside backend (`cd backend && python run.py`)
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(backend_dir)
    if root_dir not in sys.path:
        sys.path.insert(0, root_dir)

    print("=" * 70)
    print("Class 10 NCERT Science Textbook RAG Application")
    print("Starting FastAPI Backend Server on http://127.0.0.1:8000 ...")
    print("Open http://127.0.0.1:8000 in your browser to interact with the pipeline.")
    print("=" * 70)

    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=False)
