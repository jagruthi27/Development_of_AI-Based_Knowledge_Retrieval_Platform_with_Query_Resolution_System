from pathlib import Path
import re
import uuid

import chromadb


# Keep ChromaDB storage relative to the backend directory.
BASE_DIR = Path(__file__).resolve().parent
CHROMA_DB_PATH = BASE_DIR / "chroma_db"

client = chromadb.PersistentClient(
    path=str(CHROMA_DB_PATH)
)

collection = client.get_or_create_collection(
    name="ai_query_resolution"
)


def add_documents(
    chunks,
    embeddings,
    metadatas=None,
    document_id=None,
):
    # Validate that chunks and embeddings are available.
    if not chunks:
        print("No chunks to store.")
        return

    if not embeddings:
        print("No embeddings to store.")
        return

    # Each chunk must have one corresponding embedding.
    if len(chunks) != len(embeddings):
        raise ValueError(
            "Number of chunks and embeddings must be the same."
        )

    # Create empty metadata when none is provided.
    if metadatas is None:
        metadatas = [{} for _ in chunks]

    if len(metadatas) != len(chunks):
        raise ValueError(
            "Number of chunks and metadata entries must be the same."
        )

    # Create a unique ID for every stored chunk.
    ids = [
        f"{document_id or uuid.uuid4().hex}_{i}"
        for i in range(len(chunks))
    ]

    # Store chunks, embeddings and metadata together.
    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    print(
        f"{len(chunks)} chunks and embeddings "
        "stored successfully in ChromaDB."
    )


def delete_documents(document_id):
    # Delete all vectors belonging to the document.
    collection.delete(
        where={
            "document_id": document_id
        }
    )


def search_documents(
    query_embedding,
    k=3,
):
    # Perform semantic vector search.
    return collection.query(
        query_embeddings=[
            query_embedding
        ],
        n_results=k,
    )


def _contains_exact_term(
    content,
    term,
):
    """
    Check for a complete identifier instead of a substring.

    This prevents Name_1 from matching Name_10 or Name_11.
    """

    normalized_content = content.lower()
    normalized_term = term.lower()

    pattern = (
        r"(?<![\w@.-])"
        + re.escape(normalized_term)
        + r"(?![\w@.-])"
    )

    return re.search(
        pattern,
        normalized_content,
    ) is not None


def search_exact_documents(
    terms,
):
    """
    Search stored chunks for exact identifier matches.

    Useful for values such as Name_1, Name_7 or email addresses.
    """

    if not terms:
        return []

    # Read stored chunks and metadata from ChromaDB.
    stored_data = collection.get(
        include=[
            "documents",
            "metadatas",
        ]
    )

    documents = (
        stored_data.get(
            "documents",
            []
        )
        or []
    )

    metadatas = (
        stored_data.get(
            "metadatas",
            []
        )
        or []
    )

    ids = (
        stored_data.get(
            "ids",
            []
        )
        or []
    )

    matches = []

    for index, content in enumerate(
        documents
    ):
        if not content:
            continue

        matched_terms = []

        for term in terms:
            if _contains_exact_term(
                content,
                term,
            ):
                matched_terms.append(term)

        if not matched_terms:
            continue

        metadata = (
            metadatas[index]
            if index < len(metadatas)
            else {}
        )

        document_id = (
            ids[index]
            if index < len(ids)
            else f"exact_{index}"
        )

        matches.append(
            {
                "id": document_id,
                "content": content,
                "metadata": metadata or {},
                "matched_terms": matched_terms,
                "distance": None,
            }
        )

    return matches


def format_results(
    query,
    results,
):
    # Convert ChromaDB results into the API response format.
    documents = (
        results.get(
            "documents",
            [[]]
        )[0]
        if results.get("documents")
        else []
    )

    metadatas = (
        results.get(
            "metadatas",
            [[]]
        )[0]
        if results.get("metadatas")
        else []
    )

    distances = (
        results.get(
            "distances",
            [[]]
        )[0]
        if results.get("distances")
        else []
    )

    formatted_results = []

    for index, content in enumerate(
        documents
    ):
        metadata = (
            metadatas[index]
            if index < len(metadatas)
            else {}
        )

        distance = (
            distances[index]
            if index < len(distances)
            else None
        )

        formatted_results.append(
            {
                "content": content,
                "metadata": metadata or {},
                "distance": distance,
            }
        )

    return {
        "success": True,
        "query": query,
        "results": formatted_results,
        "count": len(formatted_results),
    }


if __name__ == "__main__":
    # Run a simple storage check when this file is executed directly.
    print("ChromaDB service check")
    print(f"Database path: {CHROMA_DB_PATH}")
    print(f"Collection: {collection.name}")
    print(f"Stored vectors: {collection.count()}")