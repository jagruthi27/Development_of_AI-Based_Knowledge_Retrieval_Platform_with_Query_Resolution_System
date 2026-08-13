# AI Knowledge Retrieval Platform with Query Resolution System

An AI-powered knowledge retrieval platform that allows users to upload knowledge-base documents and query them using natural language.

The system combines document ingestion, text extraction, chunking, embedding generation, ChromaDB vector storage, hybrid retrieval, and a React-based conversational interface.

---

## 1. Project Overview

Organizations maintain large volumes of knowledge across documents, policies, manuals, FAQs, process guides, and structured datasets. Finding the right information quickly can be difficult when users have to manually search through these sources.

This project provides a domain-agnostic knowledge retrieval platform where users can:

- Upload PDF, DOCX, TXT, and CSV files.
- Automatically extract and process document content.
- Split extracted content into chunks.
- Generate embeddings for the chunks.
- Store vectors in ChromaDB.
- Query the uploaded knowledge base using natural language.
- Retrieve relevant document chunks.

---

## 2. Milestone 1 Scope

The current implementation focuses on the Knowledge Base Ingestion and RAG retrieval functionality required for Milestone 1.

### Milestone 1 (Week 1-2)

1. Study RAG architecture, multi-agent query resolution patterns, and Web Speech API integration.
2. Design system architecture, agent roles, orchestration flow, and data models.
3. Develop Knowledge Base Ingestion Module supporting:
   - PDF
   - DOCX
   - TXT
   - CSV
   - Chunking
   - Embedding generation
   - Vector store indexing
4. Validate RAG pipeline retrieval accuracy using sample knowledge-base documents across two different domains.

The current project therefore provides the ingestion, chunking, embedding, vector storage, retrieval, and frontend demonstration needed for the current Milestone 1 implementation.

---

## 3. Key Features

### Document Ingestion

Supported file formats:

- PDF
- DOCX
- TXT
- CSV

The backend validates uploaded files, extracts their content, creates chunks, generates embeddings, and stores the resulting vectors in ChromaDB.

### Chunking

Extracted document text is divided into smaller searchable chunks so that relevant sections can be retrieved instead of processing an entire document for every query.

### Embeddings

Each chunk is converted into a numerical vector representation using the configured sentence-transformer embedding model.

### Vector Storage

Embeddings and their corresponding chunks and metadata are stored persistently in ChromaDB.

### Hybrid Retrieval

The query pipeline combines:

- Semantic/vector retrieval for natural-language questions.
- Exact identifier matching for structured values such as `Name_1`, `Name_7`, and email addresses.
- Result reranking.
- Duplicate chunk removal.

This allows queries such as:

```text
What are the objectives of the project?
```

and:

```text
Provide me details of Name_7
```

to use appropriate retrieval behavior.

### Retrieval Transparency

The frontend can display:

- Retrieved document chunks.
- Source filenames.
- Chunk information.
- Relevance/retrieval scores.
- Matched terms where applicable.

> Retrieval relevance scores are ranking scores used by the system. They should not be interpreted as guaranteed probability or confidence percentages.

---

## 4. Technology Stack

### Frontend

- React
- Vite
- JavaScript
- CSS

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic

### AI / Retrieval

- Sentence Transformers
- Embeddings
- ChromaDB
- RAG-style retrieval pipeline

### Document Processing

- PDF extraction
- DOCX extraction
- TXT processing
- CSV processing

---

## 5. Project Structure

```text
AI Knowledge Retrieval System/
│
├── README.md
│
├── backend/
│   ├── main.py
│   ├── extractor.py
│   ├── chunking.py
│   ├── embedding.py
│   ├── chromadb_service.py
│   ├── query_api.py
│   ├── requirements.txt
│   ├── metadata/
│   │   └── documents.json
│   ├── uploads/
│   └── chroma_db/
│
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── index.html
    ├── vite.config.js
    ├── public/
    │   └── ...
    └── src/
        ├── assets/
        ├── components/
        │   ├── FileUploader.jsx
        │   └── ...
        ├── pages/
        │   └── ...
        ├── services/
        │   └── ...
        ├── App.jsx
        ├── main.jsx
        └── ...
```

`chroma_db/`, generated metadata, uploads, and virtual-environment files are runtime/development data and should normally not be committed to the repository unless the team specifically requires them.

---

# 6. Backend Setup

## Requirements

Before running the backend, make sure you have:

- Python 3.11 or a compatible Python version.
- Git.
- Internet access for the first model download.
- The project repository available locally.

---

## Step 1: Open the Backend Folder

From the project directory:

```bash
cd "AI Knowledge Retrieval System/backend"
```

Use the actual project folder name if it differs on your machine.

---

## Step 2: Create a Virtual Environment

Create the backend virtual environment:

```bash
python -m venv .venv
```

---

## Step 3: Activate the Virtual Environment

### Windows Command Prompt

```cmd
.venv\Scripts\activate.bat
```

### Windows PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

After activation, the terminal should show something similar to:

```text
(.venv) C:\...\backend>
```

---

## Step 4: Install Backend Dependencies

With the virtual environment activated:

```bash
pip install -r requirements.txt
```

---

## Step 5: Start FastAPI

The current application entry point is `main.py`.

From the backend directory:

```bash
uvicorn main:app --reload
```

If `uvicorn` is not recognized, use:

```bash
python -m uvicorn main:app --reload
```

The backend should be available at:

```text
http://127.0.0.1:8000
```

---

## Step 6: Open Swagger API Documentation

Open:

```text
http://127.0.0.1:8000/docs
```

Swagger UI can be used to test the backend endpoints.

---

# 7. Frontend Setup

Open a second terminal and move to the frontend folder:

```bash
cd "AI Knowledge Retrieval System/frontend"
```

Install the frontend dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

or:

```text
http://127.0.0.1:5173
```

The frontend must be able to communicate with the FastAPI backend running on port `8000`.

---

# 8. Running the Complete Project

The complete local development setup uses two terminals.

### Terminal 1 — Backend

```bash
cd "AI Knowledge Retrieval System/backend"
.venv\Scripts\activate
uvicorn main:app --reload
```

### Terminal 2 — Frontend

```bash
cd "AI Knowledge Retrieval System/frontend"
npm run dev
```

Then open the frontend URL provided by Vite.

The basic application flow is:

```text
Frontend
   │
   │ Upload / Query
   ▼
FastAPI Backend
   │
   ├── Document Extraction
   ├── Chunking
   ├── Embedding Generation
   └── ChromaDB Storage
          │
          ▼
      Retrieval
          │
          ▼
      FastAPI Response
          │
          ▼
       Frontend UI
```

---

# 9. Document Upload Flow

When a supported document is uploaded:

```text
File Upload
    ↓
File Validation
    ↓
Document Extraction
    ↓
Text Chunking
    ↓
Embedding Generation
    ↓
Vector Storage in ChromaDB
    ↓
Document Metadata Registration
    ↓
Processed Document
```

The frontend provides visual feedback during the processing stages.

---

# 10. Query / RAG Flow

When a user submits a query:

```text
User Query
    ↓
FastAPI /query
    ↓
Query Embedding
    ↓
Semantic Retrieval
    +
Exact Identifier Retrieval
    ↓
Merge Results
    ↓
Remove Duplicate Chunks
    ↓
Rerank Results
    ↓
Top-k Relevant Chunks
    ↓
Frontend
```

For example:

```text
Provide me details of Name_7
```

can use exact matching to identify the chunk containing:

```text
Name: Name_7
```

while a question such as:

```text
What are the objectives of the project?
```

uses semantic retrieval.

---

# 11. API Endpoints

## GET `/`

Checks whether the backend API is running.

Example:

```text
GET http://127.0.0.1:8000/
```

---

## GET `/documents`

Returns the documents registered in the backend document repository.

```text
GET http://127.0.0.1:8000/documents
```

---

## POST `/upload`

Uploads and processes a knowledge-base document.

Supported formats:

```text
.pdf
.docx
.txt
.csv
```

---

## DELETE `/documents/{document_id}`

Deletes a document and its associated indexed vectors.

Example:

```text
DELETE /documents/<document_id>
```

---

## POST `/query`

Queries the indexed knowledge base.

Example:

```json
{
  "query": "Provide me details of Name_7?",
  "k": 3
}
```

The response contains retrieved content, metadata, retrieval distance, and ranking information.

---

# 12. Example Query Tests

### Structured Data Query

```json
{
  "query": "details of Name_7",
  "k": 3
}
```

Expected behavior:

- The chunk containing `Name_7` should receive priority.
- Exact identifier matching should be reflected in the matched-term information.

### Knowledge Document Query

```json
{
  "query": "details of milestone 1?",
  "k": 3
}
```

Expected behavior:

- Relevant chunks from the project document should be retrieved.
- The chunk containing Milestone 1 should be included among the retrieved results.

### General Semantic Query

```json
{
  "query": "What are the main objectives of the project?",
  "k": 3
}
```

This uses semantic retrieval to find relevant project-document chunks.

---

# 13. Testing the Backend

The backend can be tested through Swagger:

```text
http://127.0.0.1:8000/docs
```

You can also test the query endpoint with cURL.

### Windows Command Prompt

```cmd
curl -X POST "http://127.0.0.1:8000/query" ^
-H "accept: application/json" ^
-H "Content-Type: application/json" ^
-d "{\"query\":\"Provide me details of Name_7?\",\"k\":3}"
```

---

# 14. ChromaDB and Runtime Data

ChromaDB is stored locally under:

```text
backend/chroma_db/
```

The document registry is stored under:

```text
backend/metadata/documents.json
```

Uploaded files may temporarily exist under:

```text
backend/uploads/
```

These are generated/runtime data.

If the team needs to perform a clean local retrieval test, stop the backend and clear the generated vector/metadata data before re-uploading the test documents.

---

# 15. Model Loading

The embedding model may be downloaded the first time the backend starts.

You may see model-loading output during startup.

This is expected behavior.

The first startup can take longer because the model must be downloaded and initialized.

---

# 16. Frontend and Backend Communication

The FastAPI backend allows the Vite development server to communicate with it through CORS configuration.

The local development origins include:

```text
http://localhost:5173
http://127.0.0.1:5173
```

The backend should be running before performing upload or query operations from the frontend.

---

# 17. Development Notes

### Backend

Always run backend commands from:

```text
backend/
```

and activate `.venv` before starting the API.

### Frontend

Run frontend commands from:

```text
frontend/
```

and use:

```bash
npm install
npm run dev
```

### Security

Do not commit:

```text
.env
.venv/
```

if they contain secrets or local environment data.

Do not expose API keys or other credentials in the frontend source code.

---

# 18. Quick Start

### Backend

```bash
cd "AI Knowledge Retrieval System/backend"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

Open another terminal:

```bash
cd "AI Knowledge Retrieval System/frontend"
npm install
npm run dev
```

Then open the frontend URL shown by Vite.

Backend API:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

Frontend:

```text
http://localhost:5173
```

---

## Project Status

The current project combines the React/Vite frontend with the FastAPI backend and implements the Milestone 1 knowledge-base ingestion and retrieval pipeline.


