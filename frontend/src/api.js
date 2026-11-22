// Central API layer – all backend communication goes through here
// Use relative URLs so this works in BOTH modes:
//   Dev  → http://localhost:5173  (Vite proxies /api/* → http://127.0.0.1:8000)
//   Prod → http://127.0.0.1:8000  (FastAPI serves the React build, same origin)
// Never use an absolute URL here – that triggers Chrome's Private Network Access
// block when the page origin differs from the backend IP/hostname.
const BASE = '';

async function request(method, path, body = null, isForm = false, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const opts = { method, headers: {}, signal: controller.signal };
    if (body) {
      if (isForm) {
        opts.body = body; // FormData – let browser set content-type
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }
    const res = await fetch(`${BASE}${path}`, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The server took too long to respond. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  // Status
  status:       (verifyGemini = false) => request('GET', verifyGemini ? '/api/status?verify_gemini=true' : '/api/status'),
  buildIndex:   ()        => request('POST', '/api/build-index'),

  // Upload
  uploadPDF:    (formData)        => request('POST', '/api/upload-pdf', formData, true),
  uploadBatch:  (formData)        => request('POST', '/api/upload-batch-pdfs', formData, true),
  batchLocal:   (body)            => request('POST', '/api/batch-local-ingest', body),

  // Data exploration
  chunks:       (params = {}) => {
    const q = new URLSearchParams();
    if (params.chapter)  q.set('chapter',  params.chapter);
    if (params.search)   q.set('search',   params.search);
    if (params.limit)    q.set('limit',    params.limit);
    if (params.offset)   q.set('offset',   params.offset);
    return request('GET', `/api/chunks?${q}`);
  },

  // Retrieval
  retrieve:     (body)    => request('POST', '/api/retrieve', body),

  // Chat
  chat:         (body)    => request('POST', '/api/chat', body),
  chatImage:    (formData)=> request('POST', '/api/chat-image', formData, true),

  // Logs
  logs:         ()        => request('GET',  '/api/logs'),
};

