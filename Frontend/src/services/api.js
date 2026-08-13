const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/$/, '');

let useMock = false;

const mockDocuments = [];

export const setMockMode = (enable) => {
  useMock = enable;
};

export const getMockMode = () => useMock;


async function parseResponse(response) {
  let data = {};

  try {
    data = await response.json();
  } catch {
    // Keep an empty object when the server returns no JSON body.
  }

  if (!response.ok) {
    throw new Error(
      data.detail ||
      data.message ||
      `Request failed (${response.status})`
    );
  }

  return data;
}


export async function getDocuments() {
  if (useMock) {
    return [...mockDocuments];
  }

  const response = await fetch(
    `${API_BASE_URL}/documents`
  );

  const data = await parseResponse(response);

  return Array.isArray(data)
    ? data
    : (data.documents || []);
}


export async function uploadDocument(
  file,
  onProgress = () => {}
) {
  if (useMock) {
    onProgress(100);

    const doc = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      status: 'indexed',
      stage: 'completed',
      progress: 100,
      message: 'Document processed successfully.',
      uploadedAt: new Date().toISOString(),
      chunksCount: 0,
      embeddingsCount: 0,
      vectorsStored: 0,
    };

    mockDocuments.unshift(doc);

    return {
      accepted: true,
      jobId: doc.id,
      documentId: doc.id,
      filename: file.name,
    };
  }

  const formData = new FormData();

  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(
      'POST',
      `${API_BASE_URL}/upload`
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round(
          (event.loaded / event.total) * 100
        );

        onProgress(percent);
      }
    };

    xhr.onload = () => {
      let data = {};

      try {
        data = JSON.parse(
          xhr.responseText
        );
      } catch {
        reject(
          new Error(
            'The backend returned an invalid response.'
          )
        );

        return;
      }

      if (
        xhr.status >= 200 &&
        xhr.status < 300 &&
        data.status === 'accepted' &&
        data.jobId
      ) {
        onProgress(100);

        resolve({
          accepted: true,
          jobId: data.jobId,
          documentId: data.documentId,
          filename:
            data.filename || file.name,
          message: data.message,
        });

        return;
      }

      reject(
        new Error(
          data.message ||
          `Upload failed (${xhr.status})`
        )
      );
    };

    xhr.onerror = () => {
      reject(
        new Error(
          'Could not connect to the FastAPI backend.'
        )
      );
    };

    xhr.onabort = () => {
      reject(
        new Error(
          'The upload was cancelled.'
        )
      );
    };

    xhr.send(formData);
  });
}


export async function getUploadStatus(jobId) {
  if (useMock) {
    return {
      jobId,
      documentId: jobId,
      filename: 'Mock document',
      status: 'completed',
      stage: 'completed',
      progress: 100,
      message:
        'Document processed successfully.',
      chunksCount: 0,
      embeddingsCount: 0,
      vectorsStored: 0,
      error: null,
    };
  }

  const response = await fetch(
    `${API_BASE_URL}/upload/status/${encodeURIComponent(jobId)}`
  );

  return parseResponse(response);
}


export async function deleteDocument(id) {
  if (useMock) {
    const index = mockDocuments.findIndex(
      (doc) => doc.id === id
    );

    if (index >= 0) {
      mockDocuments.splice(index, 1);
    }

    return {
      status: 'success',
    };
  }

  const response = await fetch(
    `${API_BASE_URL}/documents/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  );

  return parseResponse(response);
}


export async function sendChatMessage(
  message,
  _history = []
) {
  if (useMock) {
    return {
      text:
        'Mock mode is enabled. Connect the FastAPI backend to retrieve real document context.',
      sources: [],
      timestamp:
        new Date().toISOString(),
    };
  }

  const response = await fetch(
    `${API_BASE_URL}/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        query: message,
        k: 3,
      }),
    }
  );

  const data =
    await parseResponse(response);

  if (!data.success) {
    throw new Error(
      data.message || 'Query failed'
    );
  }

  const sources = (
    data.results || []
  ).map((result, index) => {
    const metadata =
      result.metadata || {};

    return {
      id: `${metadata.document_id || 'result'}-${metadata.chunk_index ?? index}`,
      fileName:
        metadata.filename ||
        'Retrieved document',
      chunkIndex:
        metadata.chunk_index ?? index,
      content:
        result.content || '',
      score: result.distance,
      distance: result.distance,
    };
  });

  const text = sources.length
    ? `I found ${sources.length} relevant document chunk${
        sources.length === 1 ? '' : 's'
      } for your query:\n\n` +
      sources
        .map(
          (source, index) =>
            `[${index + 1}] ${source.content}`
        )
        .join('\n\n')
    : 'No relevant document chunks were found for this query.';

  return {
    text,
    sources,
    timestamp:
      new Date().toISOString(),
  };
}