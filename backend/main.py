from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel
from datetime import datetime, timezone
import json
import uuid

from extractor import extract_document
from chunking import chunk_text
from embedding import load_embedding_model, embed_chunks
from chromadb_service import add_documents, delete_documents
from query_api import process_query


app = FastAPI()


# Allow requests from the Vite frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Define supported document types and maximum upload size.
ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
    ".csv",
}

MAX_FILE_SIZE = 10 * 1024 * 1024


# Define paths relative to the backend directory.
BASE_DIR = Path(__file__).resolve().parent

UPLOAD_FOLDER = BASE_DIR / "uploads"
METADATA_FOLDER = BASE_DIR / "metadata"
DOCUMENTS_FILE = METADATA_FOLDER / "documents.json"


# Create required folders automatically.
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
METADATA_FOLDER.mkdir(parents=True, exist_ok=True)


# Load document metadata when the backend starts.
if DOCUMENTS_FILE.exists():
    try:
        documents = json.loads(
            DOCUMENTS_FILE.read_text(
                encoding="utf-8"
            )
        )
    except Exception:
        documents = {}
else:
    documents = {}


# Store active upload jobs while the server is running.
processing_jobs = {}


# Save the current document metadata to disk.
def save_documents():
    DOCUMENTS_FILE.write_text(
        json.dumps(
            documents,
            indent=2
        ),
        encoding="utf-8",
    )


# Update the progress of an active upload job.
def update_job(
    job_id,
    *,
    status=None,
    stage=None,
    progress=None,
    message=None,
    chunks_count=None,
    embeddings_count=None,
    vectors_stored=None,
    error=None,
):
    job = processing_jobs.get(job_id)

    if job is None:
        return

    if status is not None:
        job["status"] = status

    if stage is not None:
        job["stage"] = stage

    if progress is not None:
        job["progress"] = progress

    if message is not None:
        job["message"] = message

    if chunks_count is not None:
        job["chunksCount"] = chunks_count

    if embeddings_count is not None:
        job["embeddingsCount"] = embeddings_count

    if vectors_stored is not None:
        job["vectorsStored"] = vectors_stored

    if error is not None:
        job["error"] = error


# Update and persist the document's processing status.
def update_document_status(
    document_id,
    *,
    status=None,
    stage=None,
    progress=None,
    message=None,
    chunks_count=None,
    embeddings_count=None,
    vectors_stored=None,
    error=None,
):
    document = documents.get(document_id)

    if document is None:
        return

    if status is not None:
        document["status"] = status

    if stage is not None:
        document["stage"] = stage

    if progress is not None:
        document["progress"] = progress

    if message is not None:
        document["message"] = message

    if chunks_count is not None:
        document["chunksCount"] = chunks_count

    if embeddings_count is not None:
        document["embeddingsCount"] = embeddings_count

    if vectors_stored is not None:
        document["vectorsStored"] = vectors_stored

    if error is not None:
        document["error"] = error

    save_documents()


# Run extraction, chunking, embedding and vector storage in sequence.
def process_uploaded_document(
    job_id,
    document_id,
    file_path,
    original_filename,
):
    try:
        # Extract text from the uploaded document.
        update_job(
            job_id,
            status="processing",
            stage="extracting",
            progress=20,
            message="Extracting text from document...",
        )

        update_document_status(
            document_id,
            status="processing",
            stage="extracting",
            progress=20,
            message="Extracting text from document...",
        )

        extracted_text = extract_document(
            str(file_path)
        )

        if not extracted_text:
            raise ValueError(
                "No text could be extracted from the file"
            )

        # Split extracted text into retrieval chunks.
        update_job(
            job_id,
            stage="chunking",
            progress=40,
            message="Creating document chunks...",
        )

        update_document_status(
            document_id,
            stage="chunking",
            progress=40,
            message="Creating document chunks...",
        )

        chunks = chunk_text(
            extracted_text
        )

        if not chunks:
            raise ValueError(
                "No chunks could be created from the file"
            )

        chunks_count = len(chunks)

        update_job(
            job_id,
            stage="chunking",
            progress=50,
            message=f"Created {chunks_count} document chunks.",
            chunks_count=chunks_count,
        )

        update_document_status(
            document_id,
            stage="chunking",
            progress=50,
            message=f"Created {chunks_count} document chunks.",
            chunks_count=chunks_count,
        )

        # Generate vector embeddings for the chunks.
        update_job(
            job_id,
            stage="embedding",
            progress=60,
            message="Generating embeddings...",
        )

        update_document_status(
            document_id,
            stage="embedding",
            progress=60,
            message="Generating embeddings...",
        )

        model = load_embedding_model()
        embeddings = embed_chunks(
            model,
            chunks
        )

        if not embeddings:
            raise ValueError(
                "No embeddings could be generated"
            )

        embeddings_count = len(embeddings)

        update_job(
            job_id,
            stage="embedding",
            progress=75,
            message=f"Generated {embeddings_count} embeddings.",
            embeddings_count=embeddings_count,
        )

        update_document_status(
            document_id,
            stage="embedding",
            progress=75,
            message=f"Generated {embeddings_count} embeddings.",
            embeddings_count=embeddings_count,
        )

        # Attach document and chunk information to each vector.
        metadatas = [
            {
                "document_id": document_id,
                "filename": original_filename,
                "chunk_index": index,
            }
            for index in range(
                len(chunks)
            )
        ]

        # Store chunks and embeddings in ChromaDB.
        update_job(
            job_id,
            stage="storing",
            progress=85,
            message="Storing vectors in ChromaDB...",
        )

        update_document_status(
            document_id,
            stage="storing",
            progress=85,
            message="Storing vectors in ChromaDB...",
        )

        add_documents(
            chunks,
            embeddings,
            metadatas=metadatas,
            document_id=document_id,
        )

        vectors_stored = len(chunks)

        update_job(
            job_id,
            stage="storing",
            progress=95,
            message=f"Stored {vectors_stored} vectors in ChromaDB.",
            vectors_stored=vectors_stored,
        )

        update_document_status(
            document_id,
            stage="storing",
            progress=95,
            message=f"Stored {vectors_stored} vectors in ChromaDB.",
            vectors_stored=vectors_stored,
        )

        # Mark the document as successfully processed.
        completed_at = datetime.now(
            timezone.utc
        ).isoformat()

        document = documents.get(
            document_id
        )

        if document:
            document["status"] = "indexed"
            document["stage"] = "completed"
            document["progress"] = 100
            document["message"] = (
                "Document processed successfully"
            )
            document["chunksCount"] = chunks_count
            document["embeddingsCount"] = embeddings_count
            document["vectorsStored"] = vectors_stored
            document["processedAt"] = completed_at

            save_documents()

        update_job(
            job_id,
            status="completed",
            stage="completed",
            progress=100,
            message="Document processed successfully.",
            chunks_count=chunks_count,
            embeddings_count=embeddings_count,
            vectors_stored=vectors_stored,
        )

    except Exception as error:
        # Store the processing error for the frontend.
        error_message = str(error)

        update_job(
            job_id,
            status="failed",
            stage="error",
            progress=100,
            message="Document processing failed.",
            error=error_message,
        )

        update_document_status(
            document_id,
            status="failed",
            stage="error",
            progress=100,
            message="Document processing failed.",
            error=error_message,
        )

    finally:
        # Remove the temporary uploaded file.
        if file_path.exists():
            file_path.unlink()


class QueryRequest(BaseModel):
    query: str
    k: int = 3


# Health check endpoint.
@app.get("/")
def home():
    return {
        "status": "success",
        "message": "AI Query Resolution System API is running",
    }


# Return all documents stored in the metadata registry.
@app.get("/documents")
def get_documents():
    return list(
        documents.values()
    )


# Accept an upload and process it in the background.
@app.post("/upload", status_code=202)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    if not file.filename:
        return {
            "status": "failed",
            "message": "No file selected",
        }

    # Validate the file extension.
    extension = Path(
        file.filename
    ).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        return {
            "status": "failed",
            "message": (
                "Unsupported file type. "
                "Use PDF, DOCX, TXT or CSV."
            ),
        }

    # Read the uploaded file into memory.
    file_data = await file.read()

    if len(file_data) == 0:
        return {
            "status": "failed",
            "message": "Uploaded file is empty",
        }

    if len(file_data) > MAX_FILE_SIZE:
        return {
            "status": "failed",
            "message": "File size exceeds 10 MB",
        }

    # Create separate IDs for the document and processing job.
    document_id = uuid.uuid4().hex
    job_id = uuid.uuid4().hex

    unique_filename = (
        f"{document_id}{extension}"
    )

    file_path = (
        UPLOAD_FOLDER / unique_filename
    )

    try:
        # Save the file temporarily for background processing.
        with open(
            file_path,
            "wb"
        ) as output_file:
            output_file.write(
                file_data
            )

        uploaded_at = datetime.now(
            timezone.utc
        ).isoformat()

        # Create the initial document state.
        document = {
            "id": document_id,
            "jobId": job_id,
            "name": file.filename,
            "size": len(file_data),
            "status": "processing",
            "stage": "uploaded",
            "progress": 10,
            "message": "File uploaded successfully.",
            "uploadedAt": uploaded_at,
            "chunksCount": 0,
            "embeddingsCount": 0,
            "vectorsStored": 0,
        }

        documents[
            document_id
        ] = document

        save_documents()

        # Keep the active job state in memory.
        processing_jobs[job_id] = {
            "jobId": job_id,
            "documentId": document_id,
            "filename": file.filename,
            "status": "processing",
            "stage": "uploaded",
            "progress": 10,
            "message": "File uploaded successfully.",
            "chunksCount": 0,
            "embeddingsCount": 0,
            "vectorsStored": 0,
            "error": None,
        }

        # Start document processing without blocking the upload response.
        background_tasks.add_task(
            process_uploaded_document,
            job_id,
            document_id,
            file_path,
            file.filename,
        )

        return {
            "status": "accepted",
            "message": "File uploaded successfully.",
            "jobId": job_id,
            "documentId": document_id,
            "filename": file.filename,
        }

    except Exception as error:
        # Remove the temporary file if upload setup fails.
        if file_path.exists():
            file_path.unlink()

        return {
            "status": "failed",
            "message": str(error),
        }


# Return the current processing state for an upload job.
@app.get("/upload/status/{job_id}")
def get_upload_status(
    job_id: str
):
    job = processing_jobs.get(
        job_id
    )

    if job is not None:
        return job

    # Fall back to persisted document metadata after a restart.
    for document in documents.values():
        if document.get(
            "jobId"
        ) == job_id:
            return {
                "jobId": job_id,
                "documentId": document["id"],
                "filename": document["name"],
                "status": document.get(
                    "status",
                    "unknown"
                ),
                "stage": document.get(
                    "stage",
                    "unknown"
                ),
                "progress": document.get(
                    "progress",
                    0
                ),
                "message": document.get(
                    "message",
                    ""
                ),
                "chunksCount": document.get(
                    "chunksCount",
                    0
                ),
                "embeddingsCount": document.get(
                    "embeddingsCount",
                    0
                ),
                "vectorsStored": document.get(
                    "vectorsStored",
                    0
                ),
                "error": document.get(
                    "error"
                ),
            }

    raise HTTPException(
        status_code=404,
        detail="Upload job not found",
    )


# Delete a document from both metadata and ChromaDB.
@app.delete("/documents/{document_id}")
def delete_document(
    document_id: str
):
    if document_id not in documents:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    # Remove the document's vectors.
    delete_documents(
        document_id
    )

    # Remove the document's metadata.
    del documents[
        document_id
    ]

    save_documents()

    # Remove any remaining in-memory job state.
    document_job_ids = [
        job_id
        for job_id, job in processing_jobs.items()
        if job.get(
            "documentId"
        ) == document_id
    ]

    for job_id in document_job_ids:
        processing_jobs.pop(
            job_id,
            None
        )

    return {
        "status": "success",
        "message": "Document deleted successfully",
        "id": document_id,
    }


# Run retrieval for a user query.
@app.post("/query")
def query_documents(
    request: QueryRequest
):
    if request.k < 1:
        raise HTTPException(
            status_code=400,
            detail="k must be at least 1",
        )

    return process_query(
        request.query,
        request.k,
    )